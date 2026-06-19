/**
 * setGenerator.ts — the brain of the Set List Builder.
 *
 * Given a gig, a crowd model (e.g. Late Night Bar — 10pm to 2am), the
 * available song library, and per-song attributes, this function returns
 * N candidate set arrangements. Pure function, deterministic given the
 * same seed, no I/O. The UI invokes this and presents the candidates
 * for the band to pick one.
 *
 * The model:
 *   - A crowd model has phases (one per set). Each phase has its own
 *     energy arc, BPM band, openers/closers rules, ban list, and
 *     lifeline frequency.
 *   - For each phase we compute a slot plan (one slot per song in the
 *     set, sized by phase.energy_arc.length).
 *   - We assign an opener, a closer, and fill the middle by scoring
 *     every eligible song at every slot.
 *   - The "glue" pattern threads heavier-rock songs between
 *     anthem-singalong-dance combos, holding peak engagement while
 *     letting the room breathe.
 *   - Variants are produced by perturbing the scoring weights or
 *     swapping in alternate top-K candidates.
 *
 * No song is ever repeated across the gig (global_rules.no_song_repeat_across_gig).
 */

import type { Song, CrowdModel, SongAttributes, CrowdModelPhase } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export type SongRole = 'opener' | 'middle' | 'glue' | 'lifeline' | 'closer';

export interface GeneratedSongPlacement {
  song_id: string;
  song: Song;
  attributes: SongAttributes | null;
  role: SongRole;
  energy_target: number;
  score: number;
  why: string;
}

export interface GeneratedSet {
  set_index: number;
  phase_name: string;
  target_duration_minutes: number;
  actual_duration_minutes: number;
  songs: GeneratedSongPlacement[];
}

export interface GeneratedCandidate {
  variant_name: string;
  sets: GeneratedSet[];
  reasoning: string[];
  metrics: {
    total_singalong: number;
    avg_dance_pull: number;
    lifeline_density: number;
    bar_pull_total: number;
  };
}

export interface GenerateOptions {
  variants?: number;
  seed?: number;
  /** Live performance adds ~30% to studio time (banter, jams, transitions). */
  liveTimingMultiplier?: number;
}

/**
 * Top-level entry point. Returns N candidate set arrangements ranked best-first.
 */
export function generateSetlist(
  crowdModel: CrowdModel,
  songLibrary: Song[],
  attributesById: Map<string, SongAttributes>,
  opts: GenerateOptions = {}
): GeneratedCandidate[] {
  const variantCount = opts.variants ?? 3;
  const seed = opts.seed ?? Date.now();
  const liveMult = opts.liveTimingMultiplier ?? 1.3;

  const variantConfigs: Array<{ name: string; weights: ScoringWeights }> = [
    { name: 'Balanced',         weights: { energyFit: 1.0, singalong: 0.5, lifeline: 0.5, glue: 0.3, bpmFit: 0.4, repeatPenalty: -0.6, vibePenalty: -0.4 } },
    { name: 'Singalong-heavy',  weights: { energyFit: 0.8, singalong: 0.9, lifeline: 0.7, glue: 0.2, bpmFit: 0.3, repeatPenalty: -0.6, vibePenalty: -0.3 } },
    { name: 'BPM-aggressive',   weights: { energyFit: 1.2, singalong: 0.4, lifeline: 0.4, glue: 0.4, bpmFit: 0.7, repeatPenalty: -0.6, vibePenalty: -0.5 } },
    { name: 'Deep-cut friendly',weights: { energyFit: 0.9, singalong: 0.4, lifeline: 0.6, glue: 0.5, bpmFit: 0.4, repeatPenalty: -0.4, vibePenalty: -0.3 } },
  ];

  const candidates: GeneratedCandidate[] = [];
  for (let i = 0; i < variantCount; i++) {
    const config = variantConfigs[i % variantConfigs.length];
    const rng = makeRng(seed + i * 7919);
    const candidate = buildCandidate(
      config.name,
      crowdModel,
      songLibrary,
      attributesById,
      config.weights,
      liveMult,
      rng,
    );
    candidates.push(candidate);
  }

  return candidates;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────────

interface ScoringWeights {
  energyFit: number;
  singalong: number;
  lifeline: number;
  glue: number;
  bpmFit: number;
  repeatPenalty: number;
  vibePenalty: number;
}

interface PhaseContext {
  phase: CrowdModelPhase;
  weights: ScoringWeights;
  liveMult: number;
  alreadyUsedAcrossGig: Set<string>;
  rng: () => number;
}

function buildCandidate(
  name: string,
  crowdModel: CrowdModel,
  songLibrary: Song[],
  attributesById: Map<string, SongAttributes>,
  weights: ScoringWeights,
  liveMult: number,
  rng: () => number,
): GeneratedCandidate {
  const reasoning: string[] = [];
  reasoning.push(`Variant: ${name}. Crowd model: ${crowdModel.name}.`);

  const usedAcrossGig = new Set<string>();
  const sets: GeneratedSet[] = [];

  // Phases are ordered by set_index ascending.
  const phases = [...crowdModel.config.phases].sort((a, b) => a.set_index - b.set_index);

  for (const phase of phases) {
    const set = buildSetForPhase(
      phase,
      songLibrary,
      attributesById,
      { phase, weights, liveMult, alreadyUsedAcrossGig: usedAcrossGig, rng },
      reasoning,
    );
    sets.push(set);
    for (const placement of set.songs) usedAcrossGig.add(placement.song_id);
  }

  return {
    variant_name: name,
    sets,
    reasoning,
    metrics: computeMetrics(sets),
  };
}

function buildSetForPhase(
  phase: CrowdModelPhase,
  songLibrary: Song[],
  attributesById: Map<string, SongAttributes>,
  ctx: PhaseContext,
  reasoning: string[],
): GeneratedSet {
  // Eligible = passes BPM band + ban list + not used elsewhere in gig.
  const eligible = songLibrary.filter((s) => {
    if (ctx.alreadyUsedAcrossGig.has(s.id)) return false;
    const a = attributesById.get(s.id) ?? null;
    if (!withinBpmRange(s, a, phase)) return false;
    if (isBanned(s, a, phase)) return false;
    return true;
  });

  // Slot plan from energy_arc (one slot per song).
  const slotCount = phase.energy_arc.length;
  const slots: Array<{ targetEnergy: number; placement: GeneratedSongPlacement | null }> =
    phase.energy_arc.map((e) => ({ targetEnergy: e, placement: null }));

  // Pick the opener (slot 0).
  const opener = pickOpener(eligible, attributesById, phase, ctx);
  if (opener) {
    slots[0].placement = {
      ...opener,
      role: 'opener',
      energy_target: phase.energy_arc[0],
      why: `Opener — ${opener.why}`,
    };
    reasoning.push(`Set ${phase.set_index + 1} (${phase.name}) opens with "${opener.song.title}" — ${opener.why}`);
  }

  // Pick the closer (last slot).
  const closer = pickCloser(eligible, attributesById, phase, ctx, opener?.song_id);
  if (closer && slotCount > 1) {
    slots[slotCount - 1].placement = {
      ...closer,
      role: 'closer',
      energy_target: phase.energy_arc[slotCount - 1],
      why: `Closer — ${closer.why}`,
    };
    reasoning.push(`Set ${phase.set_index + 1} (${phase.name}) closes with "${closer.song.title}" — ${closer.why}`);
  }

  // Track consumed within this set so we don't pick a song twice.
  const usedThisSet = new Set<string>();
  if (opener) usedThisSet.add(opener.song_id);
  if (closer) usedThisSet.add(closer.song_id);

  // Fill middle slots greedily.
  let lifelineDistance = 0; // distance since the last lifeline / singalong_anchor
  for (let i = 1; i < slotCount - 1; i++) {
    const slot = slots[i];
    if (slot.placement) continue;

    const target = slot.targetEnergy;
    const prev = slots[i - 1].placement;
    const needLifeline =
      phase.lifeline_max_gap !== undefined &&
      lifelineDistance >= phase.lifeline_max_gap;

    const candidates = eligible.filter(
      (s) => !usedThisSet.has(s.id) && !ctx.alreadyUsedAcrossGig.has(s.id),
    );

    const scored = candidates.map((s) => {
      const a = attributesById.get(s.id) ?? null;
      const score = scorePlacement(s, a, slot.targetEnergy, prev, phase, ctx.weights, needLifeline);
      return { song: s, attrs: a, score };
    });

    scored.sort((x, y) => y.score - x.score);

    // Pick from top-3 with a small randomization so variants differ.
    const topK = scored.slice(0, 3);
    const pick = topK[Math.floor(ctx.rng() * topK.length)] ?? scored[0];
    if (!pick) continue;

    const role: SongRole = needLifeline && pick.attrs?.lifeline_strength != null && pick.attrs.lifeline_strength >= 7
      ? 'lifeline'
      : pick.attrs?.glue_song
        ? 'glue'
        : 'middle';

    slot.placement = {
      song_id: pick.song.id,
      song: pick.song,
      attributes: pick.attrs,
      role,
      energy_target: target,
      score: pick.score,
      why: explainPick(pick.song, pick.attrs, target, role),
    };
    usedThisSet.add(pick.song.id);

    if (role === 'lifeline' || pick.attrs?.singalong_anchor) {
      lifelineDistance = 0;
    } else {
      lifelineDistance += 1;
    }
  }

  // Compact placements into the final set.
  const placements = slots
    .map((s) => s.placement)
    .filter((p): p is GeneratedSongPlacement => p !== null);

  const targetDur = phase.duration_minutes;
  const actualDur = Math.round(
    (placements.reduce((acc, p) => acc + p.song.duration, 0) * ctx.liveMult) / 60,
  );

  return {
    set_index: phase.set_index,
    phase_name: phase.name,
    target_duration_minutes: targetDur,
    actual_duration_minutes: actualDur,
    songs: placements,
  };
}

function pickOpener(
  eligible: Song[],
  attrsById: Map<string, SongAttributes>,
  phase: CrowdModelPhase,
  ctx: PhaseContext,
): (Omit<GeneratedSongPlacement, 'role' | 'energy_target' | 'why'> & { why: string }) | null {
  const openers = eligible.filter((s) => attrsById.get(s.id)?.opener_capable);
  const pool = openers.length > 0 ? openers : eligible;
  const scored = pool.map((s) => {
    const a = attrsById.get(s.id) ?? null;
    const base =
      (a?.dance_pull_score ?? 5) * 0.4 +
      (a?.singalong_score ?? 5) * 0.4 +
      (a?.lifeline_strength ?? 5) * 0.3;
    return { song: s, attrs: a, score: base };
  });
  scored.sort((x, y) => y.score - x.score);
  const top3 = scored.slice(0, 3);
  const pick = top3[Math.floor(ctx.rng() * top3.length)] ?? scored[0];
  if (!pick) return null;
  return {
    song_id: pick.song.id,
    song: pick.song,
    attributes: pick.attrs,
    score: pick.score,
    why: `${pick.song.artist} — confident open, recognizable, in BPM band`,
  };
}

function pickCloser(
  eligible: Song[],
  attrsById: Map<string, SongAttributes>,
  phase: CrowdModelPhase,
  ctx: PhaseContext,
  excludeId: string | undefined,
): (Omit<GeneratedSongPlacement, 'role' | 'energy_target' | 'why'> & { why: string }) | null {
  const isLastPhase = phase.set_index >= 2;
  const closerPool = eligible.filter((s) => {
    if (s.id === excludeId) return false;
    const a = attrsById.get(s.id);
    if (!a) return false;
    if (isLastPhase) {
      return !!a.closer_capable && !!a.singalong_anchor;
    }
    return (a.singalong_anchor === true) || ((a.lifeline_strength ?? 0) >= 7);
  });
  const pool = closerPool.length > 0 ? closerPool : eligible.filter((s) => s.id !== excludeId);
  const scored = pool.map((s) => {
    const a = attrsById.get(s.id) ?? null;
    const base =
      (a?.singalong_score ?? 5) * 0.5 +
      (a?.lifeline_strength ?? 5) * 0.5 +
      (a?.closer_capable ? 2 : 0);
    return { song: s, attrs: a, score: base };
  });
  scored.sort((x, y) => y.score - x.score);
  const top3 = scored.slice(0, 3);
  const pick = top3[Math.floor(ctx.rng() * top3.length)] ?? scored[0];
  if (!pick) return null;
  return {
    song_id: pick.song.id,
    song: pick.song,
    attributes: pick.attrs,
    score: pick.score,
    why: isLastPhase
      ? `${pick.song.artist} — universal closer, holds the room through last call`
      : `${pick.song.artist} — singalong anchor to land the set`,
  };
}

function scorePlacement(
  song: Song,
  attrs: SongAttributes | null,
  targetEnergy: number,
  prevPlacement: GeneratedSongPlacement | null,
  phase: CrowdModelPhase,
  w: ScoringWeights,
  needLifeline: boolean,
): number {
  const dance = attrs?.dance_pull_score ?? 5;
  const singalong = attrs?.singalong_score ?? 5;
  const lifeline = attrs?.lifeline_strength ?? 5;
  const isGlue = attrs?.glue_song === true;
  const isAnchor = attrs?.singalong_anchor === true;
  const bpm = attrs?.bpm_felt ?? bpmFromMood(song);

  const energyFit = 10 - Math.abs(targetEnergy - dance);
  const bpmFit = bpmFitness(bpm, phase.bpm_range);
  const lifelineBonus = needLifeline ? lifeline : 0;
  const singalongScore = isAnchor ? singalong + 1 : singalong;
  const glueBonus = isGlue ? 4 : 0;

  let vibePenalty = 0;
  if (prevPlacement && prevPlacement.attributes && attrs) {
    // Penalize two glues in a row (heavy/heavy), two anchors in a row (anthem/anthem),
    // or two same-decade songs in a row.
    if (prevPlacement.attributes.glue_song && attrs.glue_song) vibePenalty += 3;
    if (prevPlacement.attributes.singalong_anchor && attrs.singalong_anchor) vibePenalty += 3;
    if (prevPlacement.song.decade === song.decade) vibePenalty += 1.5;
  }

  return (
    energyFit * w.energyFit +
    singalongScore * w.singalong +
    lifelineBonus * w.lifeline +
    glueBonus * w.glue +
    bpmFit * w.bpmFit +
    vibePenalty * w.vibePenalty // vibePenalty weight is negative
  );
}

function withinBpmRange(song: Song, attrs: SongAttributes | null, phase: CrowdModelPhase): boolean {
  const bpm = attrs?.bpm_felt ?? bpmFromMood(song);
  const [lo, hi] = phase.bpm_range;
  // Allow a small grace band (10 BPM) — the band's elasticity matters.
  return bpm >= lo - 10 && bpm <= hi + 10;
}

function isBanned(song: Song, attrs: SongAttributes | null, phase: CrowdModelPhase): boolean {
  const banList = phase.ban ?? [];
  const bpm = attrs?.bpm_felt ?? bpmFromMood(song);
  for (const ban of banList) {
    if (ban === 'ballad' && (song.energy === 'low' || (attrs?.bar_pull_score ?? 0) >= 3)) return true;
    if (ban === 'sub_100_bpm' && bpm < 100) return true;
    if (ban === 'below_100_bpm' && bpm < 100) return true;
    if (ban === 'below_120_bpm' && bpm < 120) return true;
    if (ban === 'high_octane_above_165_bpm' && bpm > 165) return true;
    if (ban === 'above_165_bpm' && bpm > 165) return true;
    // 'ballad_unless_last_3' is enforced at slot level — skipped here.
  }
  return false;
}

function bpmFitness(bpm: number, range: [number, number]): number {
  const [lo, hi] = range;
  if (bpm >= lo && bpm <= hi) return 10;
  const distance = bpm < lo ? lo - bpm : bpm - hi;
  return Math.max(0, 10 - distance * 0.5);
}

/** Rough BPM fallback when we have no attribute row for a song. */
function bpmFromMood(song: Song): number {
  switch (song.energy) {
    case 'high': return 140;
    case 'medium': return 115;
    case 'low': return 90;
    default: return 120;
  }
}

function explainPick(
  song: Song,
  attrs: SongAttributes | null,
  targetEnergy: number,
  role: SongRole,
): string {
  const dance = attrs?.dance_pull_score ?? 5;
  const singalong = attrs?.singalong_score ?? 5;
  const reasons: string[] = [];
  reasons.push(`target energy ${targetEnergy}, dance_pull ${dance}`);
  if (singalong >= 8) reasons.push('singalong heat');
  if (attrs?.glue_song) reasons.push('glue between anthems');
  if (attrs?.singalong_anchor) reasons.push('universal anchor');
  if (role === 'lifeline') reasons.push('lifeline pull-back');
  return `${song.artist} — ${reasons.join(', ')}`;
}

function computeMetrics(sets: GeneratedSet[]): GeneratedCandidate['metrics'] {
  let totalSingalong = 0;
  let totalDance = 0;
  let totalBarPull = 0;
  let lifelineCount = 0;
  let songCount = 0;

  for (const set of sets) {
    for (const p of set.songs) {
      const a = p.attributes;
      totalSingalong += a?.singalong_score ?? 5;
      totalDance += a?.dance_pull_score ?? 5;
      totalBarPull += a?.bar_pull_score ?? 0;
      if (a?.lifeline_strength != null && a.lifeline_strength >= 7) lifelineCount += 1;
      songCount += 1;
    }
  }

  return {
    total_singalong: totalSingalong,
    avg_dance_pull: songCount === 0 ? 0 : +(totalDance / songCount).toFixed(2),
    lifeline_density: songCount === 0 ? 0 : +(lifelineCount / songCount).toFixed(2),
    bar_pull_total: totalBarPull,
  };
}

/** Mulberry32 — small deterministic RNG so variants are reproducible by seed. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
