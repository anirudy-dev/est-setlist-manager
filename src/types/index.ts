// ─────────────────────────────────────────────────────────────────────────────
// Core song / setlist / gig
// ─────────────────────────────────────────────────────────────────────────────

export interface Song {
  id: string;
  title: string;
  artist: string;
  decade: string;
  year: number;
  duration: number; // in seconds
  mood: string;
  moodColor: string;
  energy: 'low' | 'medium' | 'high';
}

/** Six legitimate banter moments. One per song max — enforced. */
export type BanterPosition =
  | 'intro'
  | 'pre_solo'
  | 'post_solo'
  | 'outro'
  | 'breakdown'
  | 'tag';

export interface BanterSlot {
  position: BanterPosition;
  duration_seconds: number;
  notes?: string;
}

/** Mini-set assignment within a parent set. 'A' | 'B' | 'C' | 'D'. */
export type MiniSet = 'A' | 'B' | 'C' | 'D';

export interface SetlistSong {
  instanceId: string; // unique per drag (allows duplicates)
  songId: string;
  position: number;
  /** Optional grouping inside a Set. e.g. Set 1A vs Set 1B. */
  mini_set?: MiniSet | null;
  /** Optional banter slot scheduled in this song. Max one per song. */
  banter_slot?: BanterSlot | null;
}

export interface Setlist {
  id: string;
  gig_id: string;
  name: string;
  order_num: number;
  songs: SetlistSong[];
  created_at: string;
}

export interface Gig {
  id: string;
  name: string;
  date: string;
  venue: string;
  notes: string;
  created_at: string;
  setlists?: Setlist[];
}


// ─────────────────────────────────────────────────────────────────────────────
// Set Generator Foundation (migration 003)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A crowd model captures the physics of a particular kind of gig — the arc,
 * the BPM bands, the lifeline frequency, the openers and closers.
 */
export interface CrowdModel {
  id: string;
  name: string;
  description: string | null;
  set_count: number;
  total_duration_minutes: number;
  break_duration_minutes: number | null;
  config: CrowdModelConfig;
  created_at: string;
  updated_at: string;
}

export interface CrowdModelConfig {
  phases: CrowdModelPhase[];
  global_rules: Record<string, unknown>;
  peak_window?: {
    start_minutes_from_door: number;
    end_minutes_from_door: number;
    description?: string;
  };
  philosophy?: string;
}

export interface CrowdModelPhase {
  set_index: number;
  name: string;
  wall_clock: string;
  duration_minutes: number;
  energy_arc: number[];
  bpm_range: [number, number];
  open_rules?: Record<string, unknown>;
  close_rules?: Record<string, unknown>;
  ban?: string[];
  max_unknown_in_row?: number;
  lifeline_max_gap?: number;
  glue_density?: string;
  last_n_songs_required?: { n: number; must_have: string[] };
}

export interface VenueProfile {
  id: string;
  venue_name: string;
  city: string | null;
  default_crowd_model_id: string | null;
  observed_peak_time: string | null;
  typical_crowd_age_range: string | null;
  capacity_estimate: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Per-song generator inputs. song_id matches Song.id from src/data/songs.ts
 * (hardcoded) OR `custom-<uuid>` for songs added via the + ADD SONG form.
 */
export interface SongAttributes {
  song_id: string;
  singalong_score: number | null;
  dance_pull_score: number | null;
  bar_pull_score: number | null;
  lifeline_strength: number | null;
  opener_capable: boolean;
  closer_capable: boolean;
  peak_eligible: boolean;
  glue_song: boolean;
  singalong_anchor: boolean;
  bpm_felt: number | null;
  /** Key root note (A-G, optionally with # / b). */
  key_root?: string | null;
  /** Key mode. */
  key_mode?: 'major' | 'minor' | null;
  created_at: string;
  updated_at: string;
}

export interface GigOutcome {
  id: string;
  gig_id: string;
  overall_score: number | null;
  rebook_signal: boolean | null;
  notes: string | null;
  weather: string | null;
  competing_events: string | null;
  estimated_attendance: number | null;
  recorded_at: string;
  created_at: string;
}

export interface SongOutcome {
  id: string;
  gig_outcome_id: string;
  song_id: string;
  set_position: number | null;
  song_position: number | null;
  floor_density: number | null;
  singalong_heat: number | null;
  bar_pull: number | null;
  created_at: string;
}


// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Human-readable label for a banter position. */
export function banterPositionLabel(p: BanterPosition): string {
  switch (p) {
    case 'intro': return 'Intro';
    case 'pre_solo': return 'Pre-solo';
    case 'post_solo': return 'Post-solo';
    case 'outro': return 'Outro';
    case 'breakdown': return 'Breakdown';
    case 'tag': return 'Tag';
  }
}

/** "Set 1A" given parent set name and mini-set letter, or "Set 1" if no mini-set. */
export function formatSetLabel(parentSetName: string, miniSet: MiniSet | null | undefined): string {
  // Strip a trailing "Set 1" / "Set 2" and append letter if mini-set present.
  // Falls back to original name if no recognizable pattern.
  const match = parentSetName.match(/^(.*?)(\d+)\s*$/);
  if (!miniSet) return parentSetName;
  if (match) {
    return `${match[1].trim()}${match[2]}${miniSet}`;
  }
  return `${parentSetName} ${miniSet}`;
}

/** Format key: "E major" -> "E maj", "F# minor" -> "F#m". */
export function formatKey(root?: string | null, mode?: 'major' | 'minor' | null): string | null {
  if (!root) return null;
  if (mode === 'minor') return `${root}m`;
  return root;
}
