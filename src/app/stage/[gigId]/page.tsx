'use client';

/**
 * /stage/[gigId] — phone-first stage mode v2.
 *
 * Heads-up display for live performance. Big current song, KEY + BPM,
 * banter chip with position + duration, mini-set in the eyebrow
 * ("SET 1A · 2/4"), set-transition + mini-set-transition cues,
 * ▶▶ skip-to-next-mini-set button, mini-set overview sheet.
 *
 * Pure client render. Pulls gigs / setlists / custom_songs / song_attributes
 * from Supabase, builds a flat ordered list of positions, renders the one
 * at the current index.
 */

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  type CSSProperties,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { useRouter, useParams } from 'next/navigation';
import type {
  Gig,
  Setlist,
  Song,
  SongAttributes,
  SetlistSong,
  MiniSet,
} from '@/types';
import {
  banterPositionLabel,
  formatKey,
  formatSetLabel,
} from '@/types';
import { SONGS, formatDuration } from '@/data/songs';
import {
  getGigs,
  getSetlistsForGig,
  getCustomSongs,
  getSongAttributes,
} from '@/lib/supabase';

// ── data shapes ──────────────────────────────────────────────────────────────

type StagePosition = {
  setIndex: number;
  setName: string;
  miniSet: MiniSet | null;
  /** Position within the CURRENT mini-set (1-indexed). If no mini-set, position within the whole set. */
  miniSetSongIndex: number;
  miniSetLength: number;
  /** Position within the parent set (1-indexed). */
  setSongIndex: number;
  setLength: number;
  song: Song;
  attributes: SongAttributes | null;
  banter: SetlistSong['banter_slot'] | null;
};

interface WakeLockSentinelLike { release: () => Promise<void>; }

const COLORS = {
  bg: '#0A0A0B',
  ink: '#F5F2EE',
  ink70: 'rgba(245, 242, 238, 0.70)',
  ink55: 'rgba(245, 242, 238, 0.55)',
  ink45: 'rgba(245, 242, 238, 0.45)',
  ink35: 'rgba(245, 242, 238, 0.35)',
  ink20: 'rgba(245, 242, 238, 0.20)',
  hairline: 'rgba(255, 255, 255, 0.07)',
  banter: '#FFD93D',
  miniSet: '#4ECDC4',
};

const FONT_BODY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif';
const FONT_MONO =
  'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace';

// ── page ─────────────────────────────────────────────────────────────────────

export default function StagePage() {
  const router = useRouter();
  const params = useParams<{ gigId: string }>();
  const gigId = params?.gigId ?? '';

  const [gig, setGig] = useState<Gig | null>(null);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [customSongs, setCustomSongs] = useState<Song[]>([]);
  const [attrsById, setAttrsById] = useState<Map<string, SongAttributes>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState<Date>(() => new Date());
  const [overviewOpen, setOverviewOpen] = useState(false);

  // Auth gate.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('est-auth')) router.push('/');
  }, [router]);

  // Load gig + setlists + custom songs + song attributes.
  useEffect(() => {
    if (!gigId) return;
    let cancelled = false;

    Promise.all([
      getGigs(),
      getSetlistsForGig(gigId),
      getCustomSongs(),
      getSongAttributes().catch(() => []),
    ])
      .then(([gigsData, setlistsData, customSongsData, attrsData]) => {
        if (cancelled) return;
        const foundGig = (gigsData as Gig[] | null)?.find((g) => g.id === gigId) ?? null;
        if (!foundGig) { setErrorMsg('Gig not found'); return; }
        setGig(foundGig);

        const parsedSetlists: Setlist[] = ((setlistsData as Array<Record<string, unknown>>) ?? []).map((s) => ({
          ...(s as unknown as Setlist),
          songs: (Array.isArray(s.songs) ? s.songs : JSON.parse((s.songs as string) || '[]')) as Setlist['songs'],
        }));
        setSetlists(parsedSetlists);

        const mappedCustom: Song[] = ((customSongsData as Array<Record<string, unknown>>) ?? []).map((s) => ({
          id: `custom-${s.id as string}`,
          title: s.title as string,
          artist: s.artist as string,
          decade: s.decade as string,
          year: s.year as number,
          duration: s.duration as number,
          mood: s.mood as string,
          moodColor: s.mood_color as string,
          energy: (s.energy as 'low' | 'medium' | 'high' | undefined) ?? 'medium',
        }));
        setCustomSongs(mappedCustom);

        const map = new Map<string, SongAttributes>();
        for (const row of ((attrsData ?? []) as SongAttributes[])) {
          map.set(row.song_id, row);
        }
        setAttrsById(map);
      })
      .catch(() => { if (!cancelled) setErrorMsg('Failed to load gig'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [gigId]);

  const allSongs = useMemo(() => [...SONGS, ...customSongs], [customSongs]);

  // Flat positions with mini-set bookkeeping.
  const positions: StagePosition[] = useMemo(() => {
    const out: StagePosition[] = [];

    setlists.forEach((sl, setIdx) => {
      const songs = sl.songs ?? [];
      const setLength = songs.length;

      // Compute mini-set groupings within this set.
      // If a song has mini_set=null, it forms its own implicit "group" of one.
      // Track running indices for each mini-set encountered.
      const miniGroupIndices = new Map<string, number>(); // groupKey -> running count
      const miniGroupLengths = new Map<string, number>();

      // First pass: count songs per group.
      songs.forEach((item, i) => {
        const key = item.mini_set ?? `__none_${i}`;
        miniGroupLengths.set(key, (miniGroupLengths.get(key) ?? 0) + 1);
      });

      // Second pass: emit positions.
      songs.forEach((item, setSongIdx) => {
        const song = allSongs.find((s) => s.id === item.songId);
        if (!song) return;

        const groupKey = item.mini_set ?? `__none_${setSongIdx}`;
        const runningIdx = (miniGroupIndices.get(groupKey) ?? 0) + 1;
        miniGroupIndices.set(groupKey, runningIdx);

        out.push({
          setIndex: setIdx,
          setName: sl.name,
          miniSet: item.mini_set ?? null,
          miniSetSongIndex: runningIdx,
          miniSetLength: miniGroupLengths.get(groupKey) ?? 1,
          setSongIndex: setSongIdx + 1,
          setLength,
          song,
          attributes: attrsById.get(song.id) ?? null,
          banter: item.banter_slot ?? null,
        });
      });
    });

    return out;
  }, [setlists, allSongs, attrsById]);

  const current = positions[index] ?? null;
  const next = positions[index + 1] ?? null;

  const isMiniSetChange =
    !!current && !!next &&
    next.setIndex === current.setIndex &&
    next.miniSet !== current.miniSet &&
    next.miniSet !== null;
  const isSetChange = !!current && !!next && next.setIndex !== current.setIndex;

  // Index of the next mini-set's first song (across the current and next set).
  const nextMiniSetIndex = useMemo(() => {
    if (!current) return -1;
    for (let i = index + 1; i < positions.length; i++) {
      const p = positions[i];
      if (p.setIndex !== current.setIndex || p.miniSet !== current.miniSet) {
        return i;
      }
    }
    return -1;
  }, [positions, index, current]);

  const advance = useCallback(() => {
    setIndex((i) => Math.min(i + 1, Math.max(0, positions.length - 1)));
  }, [positions.length]);

  const goBack = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const skipMiniSet = useCallback(() => {
    if (nextMiniSetIndex >= 0) setIndex(nextMiniSetIndex);
  }, [nextMiniSetIndex]);

  const jumpTo = useCallback((targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < positions.length) {
      setIndex(targetIndex);
      setOverviewOpen(false);
    }
  }, [positions.length]);

  // Keyboard nav.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.code === 'Space') { e.preventDefault(); advance(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); skipMiniSet(); }
      else if (e.key === 'Escape') router.push('/dashboard');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, goBack, skipMiniSet, router]);

  // Touch swipe (horizontal nav, vertical opens overview).
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t?.clientX ?? 0, y: t?.clientY ?? 0 };
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = (t?.clientX ?? touchStart.current.x) - touchStart.current.x;
    const dy = (t?.clientY ?? touchStart.current.y) - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -60) advance();
      else if (dx > 60) goBack();
    } else {
      if (dy < -80) setOverviewOpen(true);
      else if (dy > 80) setOverviewOpen(false);
    }
    touchStart.current = null;
  };

  // Wake lock.
  useEffect(() => {
    const nav = navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } };
    if (!nav.wakeLock) return;
    let lock: WakeLockSentinelLike | null = null;
    let released = false;
    const acquire = async () => { try { lock = await nav.wakeLock!.request('screen'); } catch {} };
    acquire();
    const onVisibility = () => { if (document.visibilityState === 'visible' && !released) acquire(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      released = true;
      lock?.release().catch(() => undefined);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Live clock.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // ── render ────────────────────────────────────────────────────────────────

  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (loading) {
    return <main style={shellStyle}><div style={loadingStyle}>Loading</div></main>;
  }

  if (errorMsg || !gig || positions.length === 0 || !current) {
    return (
      <main style={shellStyle}>
        <div style={emptyStyle}>
          <div style={emptyEyebrowStyle}>Stage mode</div>
          <div style={emptyTitleStyle}>{errorMsg ?? 'No songs in this gig yet'}</div>
          <button type="button" onClick={() => router.push('/dashboard')} style={emptyButtonStyle}>
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  const setLabel = formatSetLabel(current.setName, current.miniSet);
  const positionLabel = current.miniSet
    ? `${setLabel} · ${current.miniSetSongIndex}/${current.miniSetLength}`
    : `${current.setName} · ${current.setSongIndex}/${current.setLength}`;
  const keyStr = formatKey(current.attributes?.key_root, current.attributes?.key_mode);
  const bpm = current.attributes?.bpm_felt ?? null;

  // Songs in the current mini-set (or whole set if no mini-set).
  const overviewMembers = positions
    .map((p, i) => ({ ...p, globalIndex: i }))
    .filter((p) =>
      p.setIndex === current.setIndex &&
      ((current.miniSet === null && p.miniSet === null) || p.miniSet === current.miniSet)
    );

  return (
    <main onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={pageStyle}>
      {/* Status row */}
      <div style={statusRowStyle}>
        <span style={timeStyle}>{timeStr}</span>
        <button
          type="button"
          onClick={() => setOverviewOpen((v) => !v)}
          style={positionPillStyle}
          aria-label="Show mini-set"
        >
          {positionLabel}
        </button>
        <button type="button" onClick={() => router.push('/dashboard')} style={exitButtonStyle}>
          Exit
        </button>
      </div>

      {/* Set label eyebrow */}
      <div style={eyebrowStyle}>{setLabel}</div>

      {/* Current song hero */}
      <h1 style={titleStyle}>{current.song.title}</h1>
      <p style={artistStyle}>{current.song.artist}</p>

      <div style={metaRowStyle}>
        {keyStr && <span style={keyStyle}>♪ {keyStr}</span>}
        {bpm && <span style={bpmStyle}>♥ {bpm}</span>}
        <span style={durationStyle}>{formatDuration(current.song.duration)}</span>
      </div>

      {/* Banter chip */}
      {current.banter && (
        <div style={banterBlockStyle}>
          <div style={banterChipStyle}>
            <span style={banterPosLabelStyle}>{banterPositionLabel(current.banter.position).toUpperCase()}</span>
            <span style={banterDotStyle} />
            <span style={banterDurationStyle}>{current.banter.duration_seconds}s</span>
          </div>
          {current.banter.notes && (
            <p style={banterNotesStyle}>"{current.banter.notes}"</p>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Up next */}
      {next ? (
        <div style={nextBlockStyle}>
          <p style={nextEyebrowStyle}>Up next</p>
          <p style={nextTitleStyle}>{next.song.title}</p>
          <p style={nextArtistStyle}>
            {next.song.artist}
            {next.attributes?.key_root && (
              <>
                <span style={nextSepStyle}> · </span>
                <span style={nextKeyStyle}>{formatKey(next.attributes.key_root, next.attributes.key_mode)}</span>
              </>
            )}
            {next.attributes?.bpm_felt && (
              <>
                <span style={nextSepStyle}> · </span>
                <span style={nextBpmStyle}>{next.attributes.bpm_felt}</span>
              </>
            )}
          </p>
          {next.banter && (
            <p style={nextBanterCueStyle}>
              ◉ Banter · {banterPositionLabel(next.banter.position)} · {next.banter.duration_seconds}s
            </p>
          )}
          {isMiniSetChange && (
            <p style={transitionCueStyle}>
              {formatSetLabel(next.setName, next.miniSet)} begins
            </p>
          )}
          {isSetChange && (
            <p style={transitionCueStyle}>
              {next.setName} begins
            </p>
          )}
        </div>
      ) : (
        <div style={endOfNightStyle}>
          <p style={endOfNightTextStyle}>Last song — close it out</p>
        </div>
      )}

      {/* Footer controls */}
      <div style={footerRowStyle}>
        <button onClick={goBack} disabled={index === 0} aria-label="Previous song" style={{ ...arrowButtonStyle, color: index === 0 ? COLORS.ink20 : COLORS.ink45 }}>‹</button>
        <span style={hintStyle}>Swipe · ↑ overview</span>
        <button onClick={advance} disabled={index >= positions.length - 1} aria-label="Next song" style={{ ...arrowButtonStyle, color: index >= positions.length - 1 ? COLORS.ink20 : COLORS.ink55 }}>›</button>
        {nextMiniSetIndex >= 0 && (
          <button onClick={skipMiniSet} aria-label="Skip to next mini-set" style={skipBtnStyle}>
            ▶▶ {positions[nextMiniSetIndex]?.miniSet
              ? formatSetLabel(positions[nextMiniSetIndex].setName, positions[nextMiniSetIndex].miniSet)
              : positions[nextMiniSetIndex]?.setName}
          </button>
        )}
      </div>

      {/* Overview sheet (mini-set) */}
      {overviewOpen && (
        <div style={overviewBackdropStyle} onClick={() => setOverviewOpen(false)}>
          <div style={overviewSheetStyle} onClick={(e) => e.stopPropagation()}>
            <div style={overviewEyebrowStyle}>{setLabel} · {overviewMembers.length} songs</div>
            {overviewMembers.map((p) => {
              const isCurrent = p.globalIndex === index;
              const k = formatKey(p.attributes?.key_root, p.attributes?.key_mode);
              return (
                <button
                  key={p.globalIndex}
                  onClick={() => jumpTo(p.globalIndex)}
                  style={isCurrent ? overviewRowCurrentStyle : overviewRowStyle}
                >
                  <span style={overviewIdxStyle}>{p.miniSetSongIndex}.</span>
                  <span style={overviewTitleStyle}>{p.song.title}</span>
                  <span style={overviewMetaStyle}>
                    {k ? `${k} · ` : ''}{formatDuration(p.song.duration)}
                  </span>
                </button>
              );
            })}
            <button onClick={() => setOverviewOpen(false)} style={overviewCloseStyle}>Close</button>
          </div>
        </div>
      )}
    </main>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const shellStyle: CSSProperties = {
  background: COLORS.bg, minHeight: '100vh',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: COLORS.ink, fontFamily: FONT_BODY,
};

const loadingStyle: CSSProperties = {
  color: COLORS.ink45, fontSize: 11,
  letterSpacing: '0.2em', textTransform: 'uppercase',
};

const emptyStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  textAlign: 'center', padding: 24,
};

const emptyEyebrowStyle: CSSProperties = {
  fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
  color: COLORS.ink45, marginBottom: 12,
};

const emptyTitleStyle: CSSProperties = {
  fontSize: 18, fontWeight: 500, color: COLORS.ink, marginBottom: 22,
};

const emptyButtonStyle: CSSProperties = {
  background: 'transparent', border: `0.5px solid ${COLORS.ink35}`,
  color: COLORS.ink, padding: '10px 20px',
  fontSize: 11, fontFamily: FONT_BODY,
  letterSpacing: '0.16em', textTransform: 'uppercase',
  borderRadius: 8, cursor: 'pointer',
};

const pageStyle: CSSProperties = {
  background: COLORS.bg, minHeight: '100vh',
  display: 'flex', flexDirection: 'column',
  padding: '22px 22px 18px',
  color: COLORS.ink, fontFamily: FONT_BODY,
  overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none',
};

const statusRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  fontSize: 11.5, color: COLORS.ink45,
  paddingBottom: 18, borderBottom: `0.5px solid ${COLORS.hairline}`,
};

const timeStyle: CSSProperties = {
  fontFamily: FONT_MONO, color: COLORS.ink70, minWidth: 60,
};

const positionPillStyle: CSSProperties = {
  background: 'rgba(78,205,196,0.08)',
  border: `0.5px solid rgba(78,205,196,0.35)`,
  color: COLORS.miniSet,
  padding: '4px 10px', borderRadius: 999,
  fontSize: 11, letterSpacing: '0.06em',
  fontFamily: FONT_BODY, cursor: 'pointer',
};

const exitButtonStyle: CSSProperties = {
  background: 'none', border: 'none', color: COLORS.ink45,
  cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 11,
  letterSpacing: '0.18em', textTransform: 'uppercase',
  padding: 0, minWidth: 60, textAlign: 'right',
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11, fontWeight: 500,
  letterSpacing: '0.22em', textTransform: 'uppercase',
  color: COLORS.ink45, margin: '24px 0 10px',
};

const titleStyle: CSSProperties = {
  fontSize: 'clamp(36px, 8vw, 64px)', fontWeight: 500,
  color: COLORS.ink, margin: 0,
  letterSpacing: '-0.024em', lineHeight: 1.02,
};

const artistStyle: CSSProperties = {
  fontSize: 16, color: COLORS.ink70, margin: '10px 0 0',
};

const metaRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 16, flexWrap: 'wrap',
};

const keyStyle: CSSProperties = {
  fontSize: 14, color: COLORS.ink, fontFamily: FONT_MONO,
  fontWeight: 500,
};

const bpmStyle: CSSProperties = {
  fontSize: 14, color: COLORS.ink70, fontFamily: FONT_MONO,
};

const durationStyle: CSSProperties = {
  fontSize: 13, color: COLORS.ink55, fontFamily: FONT_MONO,
};

const banterBlockStyle: CSSProperties = {
  marginTop: 14,
};

const banterChipStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '4px 10px',
  background: `rgba(255,217,61,0.10)`,
  border: `0.5px solid rgba(255,217,61,0.45)`,
  borderRadius: 999,
  color: COLORS.banter,
  fontSize: 11, letterSpacing: '0.1em', fontWeight: 600,
  fontFamily: FONT_BODY,
};

const banterPosLabelStyle: CSSProperties = {
  textTransform: 'uppercase',
};

const banterDotStyle: CSSProperties = {
  width: 3, height: 3, borderRadius: '50%',
  background: 'rgba(255,217,61,0.5)',
};

const banterDurationStyle: CSSProperties = {
  fontFamily: FONT_MONO, letterSpacing: 0,
};

const banterNotesStyle: CSSProperties = {
  margin: '8px 0 0', fontStyle: 'italic',
  fontSize: 13, color: COLORS.ink70,
  paddingLeft: 4,
};

const nextBlockStyle: CSSProperties = {
  padding: '16px 0 6px',
  borderTop: `0.5px solid ${COLORS.hairline}`,
};

const nextEyebrowStyle: CSSProperties = {
  fontSize: 10, fontWeight: 500,
  letterSpacing: '0.22em', textTransform: 'uppercase',
  color: COLORS.ink35, margin: '0 0 10px',
};

const nextTitleStyle: CSSProperties = {
  fontSize: 22, fontWeight: 500,
  color: COLORS.ink70, margin: 0,
  letterSpacing: '-0.018em', lineHeight: 1.1,
};

const nextArtistStyle: CSSProperties = {
  fontSize: 13, color: COLORS.ink45, margin: '4px 0 0',
};

const nextSepStyle: CSSProperties = { color: COLORS.ink20 };
const nextKeyStyle: CSSProperties = {
  fontFamily: FONT_MONO, color: COLORS.ink70, fontWeight: 500,
};
const nextBpmStyle: CSSProperties = {
  fontFamily: FONT_MONO, color: COLORS.ink55,
};

const nextBanterCueStyle: CSSProperties = {
  fontSize: 10, fontWeight: 500,
  letterSpacing: '0.16em', textTransform: 'uppercase',
  color: COLORS.banter, margin: '10px 0 0',
};

const transitionCueStyle: CSSProperties = {
  fontSize: 10, fontWeight: 500,
  letterSpacing: '0.2em', textTransform: 'uppercase',
  color: COLORS.miniSet, margin: '10px 0 0',
};

const endOfNightStyle: CSSProperties = {
  padding: '16px 0',
  borderTop: `0.5px solid ${COLORS.hairline}`,
  textAlign: 'center',
};

const endOfNightTextStyle: CSSProperties = {
  fontSize: 11, fontWeight: 500,
  letterSpacing: '0.2em', textTransform: 'uppercase',
  color: COLORS.ink55, margin: 0,
};

const footerRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 12, paddingTop: 14, flexWrap: 'wrap',
};

const arrowButtonStyle: CSSProperties = {
  background: 'none', border: 'none', fontSize: 22,
  padding: '4px 8px', fontFamily: FONT_BODY, cursor: 'pointer',
};

const hintStyle: CSSProperties = {
  fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
  color: COLORS.ink35,
};

const skipBtnStyle: CSSProperties = {
  background: 'rgba(78,205,196,0.08)',
  border: `0.5px solid rgba(78,205,196,0.35)`,
  color: COLORS.miniSet,
  padding: '4px 10px', borderRadius: 999,
  fontSize: 10, letterSpacing: '0.12em',
  textTransform: 'uppercase', fontWeight: 600,
  fontFamily: FONT_BODY, cursor: 'pointer',
};

const overviewBackdropStyle: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 10_000,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const overviewSheetStyle: CSSProperties = {
  background: '#0F0F11',
  width: '100%', maxWidth: 520,
  borderTopLeftRadius: 16, borderTopRightRadius: 16,
  padding: 20,
  display: 'flex', flexDirection: 'column', gap: 6,
};

const overviewEyebrowStyle: CSSProperties = {
  fontSize: 10, fontWeight: 500,
  letterSpacing: '0.22em', textTransform: 'uppercase',
  color: COLORS.ink45, marginBottom: 10,
};

const overviewRowBase: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '24px 1fr auto',
  gap: 10, padding: '10px 8px',
  border: '0.5px solid rgba(255,255,255,0.05)',
  borderRadius: 8,
  background: 'transparent', color: COLORS.ink,
  fontFamily: FONT_BODY, fontSize: 13,
  textAlign: 'left', cursor: 'pointer',
  alignItems: 'baseline',
};

const overviewRowStyle: CSSProperties = { ...overviewRowBase };
const overviewRowCurrentStyle: CSSProperties = {
  ...overviewRowBase,
  background: 'rgba(78,205,196,0.08)',
  borderColor: 'rgba(78,205,196,0.4)',
};

const overviewIdxStyle: CSSProperties = {
  color: COLORS.ink45, fontFamily: FONT_MONO, fontSize: 11,
};

const overviewTitleStyle: CSSProperties = {
  color: COLORS.ink, fontWeight: 500, overflow: 'hidden',
  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const overviewMetaStyle: CSSProperties = {
  fontSize: 11, color: COLORS.ink55, fontFamily: FONT_MONO,
};

const overviewCloseStyle: CSSProperties = {
  marginTop: 10,
  background: 'transparent', border: `0.5px solid ${COLORS.ink35}`,
  color: COLORS.ink, padding: '8px',
  fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
  cursor: 'pointer', borderRadius: 8, fontFamily: FONT_BODY,
};
