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

export interface SetlistSong {
  instanceId: string; // unique per drag (allows duplicates)
  songId: string;
  position: number;
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


// ── Set Generator Foundation (migration 003) ────────────────────────────────
// Mirror of the schema in migrations/003_set_generator_foundation.sql.
// Snake_case is preserved because that's what Supabase returns.

/**
 * A crowd model captures the physics of a particular kind of gig — the arc,
 * the BPM bands, the lifeline frequency, the openers and closers. The
 * generator reads this to build set lists that fit the room.
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

/** What we've learned about a specific venue over time. */
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
  created_at: string;
  updated_at: string;
}

/** One row per gig — the post-gig debrief. */
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

/** One row per song played at a gig — the training signal for the model. */
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
