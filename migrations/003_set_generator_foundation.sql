-- ============================================================
-- Migration 003 — Set Generator Foundation
-- ============================================================
-- Adds the data layer for the set generator. Five new tables. No changes
-- to existing tables. Safe to re-run (all CREATE statements are guarded).
--
--   crowd_models      — stored configs for different gig types (late-night
--                       bar, wedding, festival patio, etc).
--   venue_profiles    — what we have learned about a specific venue.
--   song_attributes   — extended per-song scoring used by the generator.
--   gig_outcomes      — post-gig debrief — overall score, rebook signal.
--   song_outcomes     — per-song debrief inside a gig — the labels the
--                       learning loop trains on later.
--
-- Seeds the first crowd model: late_night_bar_3set_10to2.
-- ============================================================


-- ── crowd_models ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crowd_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  set_count INTEGER NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  break_duration_minutes INTEGER DEFAULT 15,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── venue_profiles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_name TEXT NOT NULL,
  city TEXT,
  default_crowd_model_id TEXT REFERENCES crowd_models(id),
  observed_peak_time TIME,
  typical_crowd_age_range TEXT,
  capacity_estimate INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── song_attributes ─────────────────────────────────────────────────────────
-- song_id matches Song.id from src/data/songs.ts (hardcoded), or 'custom-<uuid>'.
CREATE TABLE IF NOT EXISTS song_attributes (
  song_id TEXT PRIMARY KEY,
  singalong_score INTEGER,
  dance_pull_score INTEGER,
  bar_pull_score INTEGER,
  lifeline_strength INTEGER,
  opener_capable BOOLEAN DEFAULT FALSE,
  closer_capable BOOLEAN DEFAULT FALSE,
  peak_eligible BOOLEAN DEFAULT FALSE,
  glue_song BOOLEAN DEFAULT FALSE,
  singalong_anchor BOOLEAN DEFAULT FALSE,
  bpm_felt INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── gig_outcomes ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gig_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  overall_score INTEGER,
  rebook_signal BOOLEAN,
  notes TEXT,
  weather TEXT,
  competing_events TEXT,
  estimated_attendance INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── song_outcomes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS song_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_outcome_id UUID REFERENCES gig_outcomes(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  set_position INTEGER,
  song_position INTEGER,
  floor_density INTEGER,
  singalong_heat INTEGER,
  bar_pull INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE crowd_models    ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_outcomes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_outcomes   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all crowd_models"    ON crowd_models    FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all venue_profiles"  ON venue_profiles  FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all song_attributes" ON song_attributes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all gig_outcomes"    ON gig_outcomes    FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all song_outcomes"   ON song_outcomes   FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_venue_profiles_default_model ON venue_profiles(default_crowd_model_id);
CREATE INDEX IF NOT EXISTS idx_gig_outcomes_gig_id          ON gig_outcomes(gig_id);
CREATE INDEX IF NOT EXISTS idx_song_outcomes_outcome_id     ON song_outcomes(gig_outcome_id);
CREATE INDEX IF NOT EXISTS idx_song_outcomes_song_id        ON song_outcomes(song_id);


-- ============================================================
-- Seed: Late Night Bar Crowd Model
-- ============================================================
-- 10pm-2am. Three sets. Warm-Up → Engine Room → Closer.
-- Encodes the room physics: slow build, peak 12-1, hold through last call.
-- Lifeline every 3-4 songs. Heavy-rock "glue" between anthem stacks.
-- ============================================================

INSERT INTO crowd_models (id, name, description, set_count, total_duration_minutes, break_duration_minutes, config)
VALUES (
  'late_night_bar_3set_10to2',
  'Late Night Bar — 10pm to 2am',
  'Three-set 10pm-2am model. Warm-up builds the room. Engine Room hooks them. Closer holds them through last call. Lifelines every 3-4 songs. Heavy-rock glue between anthems.',
  3,
  240,
  15,
  $$
  {
    "phases": [
      {
        "set_index": 0,
        "name": "Warm-Up",
        "wall_clock": "10:00-10:55",
        "duration_minutes": 55,
        "energy_arc": [3, 4, 4, 5, 5, 6, 6, 7],
        "bpm_range": [100, 140],
        "open_rules": {
          "must_be": ["recognizable", "mid_tempo"],
          "should_be": ["opener_capable"],
          "ban": ["ballad", "above_165_bpm"]
        },
        "close_rules": {
          "must_be": ["singalong_anchor_or_lifeline_8"],
          "ban": ["below_115_bpm"]
        },
        "ban": ["high_octane_above_165_bpm", "ballad"],
        "max_unknown_in_row": 1,
        "lifeline_max_gap": 4
      },
      {
        "set_index": 1,
        "name": "Engine Room",
        "wall_clock": "11:10-12:05",
        "duration_minutes": 55,
        "energy_arc": [6, 7, 8, 8, 8, 8, 7, 7],
        "bpm_range": [120, 165],
        "open_rules": {
          "must_be": ["energetic", "opener_capable"],
          "ban": ["slow_build", "below_120_bpm"]
        },
        "close_rules": {
          "must_be": ["emotional_breather_or_anthem"],
          "ban": ["below_110_bpm"]
        },
        "ban": ["ballad", "below_100_bpm"],
        "max_unknown_in_row": 1,
        "lifeline_max_gap": 4,
        "glue_density": "1_every_3"
      },
      {
        "set_index": 2,
        "name": "Closer",
        "wall_clock": "12:20-1:20",
        "duration_minutes": 60,
        "energy_arc": [7, 8, 9, 9, 9, 8, 8, 9, 9, 10],
        "bpm_range": [115, 175],
        "open_rules": {
          "must_be": ["banger", "peak_eligible"],
          "ban": ["ballad", "slow_build"]
        },
        "close_rules": {
          "must_be": ["closer_capable", "singalong_anchor"],
          "should_be": ["universal_recognition"]
        },
        "ban": ["ballad_unless_last_3"],
        "max_unknown_in_row": 0,
        "lifeline_max_gap": 3,
        "glue_density": "1_every_4",
        "last_n_songs_required": {
          "n": 3,
          "must_have": ["closer_capable", "singalong_anchor"]
        }
      }
    ],
    "global_rules": {
      "lifeline_max_gap": 4,
      "max_consecutive_below_bpm_110": 2,
      "max_consecutive_above_bpm_160": 2,
      "alternate_vibes": true,
      "no_song_repeat_across_gig": true,
      "sandwich_pattern": "singalong_anthem -> glue/heavy_rock -> high_octane_dance",
      "glue_purpose": "fill_time_between_anthems_while_holding_peak_engagement"
    },
    "peak_window": {
      "start_minutes_from_door": 120,
      "end_minutes_from_door": 180,
      "description": "12am-1am wall clock. Highest-recognition anthems land here."
    },
    "philosophy": "Build slow. Peak late. Hold through last call. The best song does not lead — it lands when the room is ready for it."
  }
  $$::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config = EXCLUDED.config,
  updated_at = NOW();
