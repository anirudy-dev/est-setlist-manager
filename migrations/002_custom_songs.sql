-- ============================================================
-- Every Second Tuesday — Setlist Manager
-- Migration 002: custom_songs table
--
-- Adds a Supabase-backed table for songs added through the in-app
-- + ADD SONG form. The original src/data/songs.ts file stays as the
-- canonical seed set; custom_songs is merged on top at runtime.
--
-- Run in Supabase SQL Editor.
-- ============================================================

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

ALTER TABLE custom_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all custom_songs"
  ON custom_songs FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_custom_songs_created_at
  ON custom_songs(created_at DESC);
