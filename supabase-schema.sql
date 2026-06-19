-- ============================================================
-- Every Second Tuesday — Setlist Manager
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Gigs table
CREATE TABLE IF NOT EXISTS gigs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT DEFAULT '',
  venue TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setlists table (songs stored as JSONB array)
CREATE TABLE IF NOT EXISTS setlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Set 1',
  order_num INTEGER DEFAULT 0,
  songs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom songs added through the + ADD SONG form (merged with src/data/songs.ts at runtime)
CREATE TABLE IF NOT EXISTS custom_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  decade TEXT NOT NULL,
  year INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  mood TEXT NOT NULL,
  mood_color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_songs ENABLE ROW LEVEL SECURITY;

-- Allow all operations (band internal tool — password protected at app level)
CREATE POLICY "Allow all gigs" ON gigs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all setlists" ON setlists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all custom_songs" ON custom_songs FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_setlists_gig_id ON setlists(gig_id);
CREATE INDEX IF NOT EXISTS idx_gigs_created_at ON gigs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_songs_created_at ON custom_songs(created_at DESC);


-- ============================================================
-- Migration 003 — Set Generator Foundation
-- (See migrations/003_set_generator_foundation.sql for the canonical
--  version with seed data. This file is just the table shapes for a
--  fresh-install Supabase setup.)
-- ============================================================

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

ALTER TABLE crowd_models    ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_outcomes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_outcomes   ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_venue_profiles_default_model ON venue_profiles(default_crowd_model_id);
CREATE INDEX IF NOT EXISTS idx_gig_outcomes_gig_id          ON gig_outcomes(gig_id);
CREATE INDEX IF NOT EXISTS idx_song_outcomes_outcome_id     ON song_outcomes(gig_outcome_id);
CREATE INDEX IF NOT EXISTS idx_song_outcomes_song_id        ON song_outcomes(song_id);
