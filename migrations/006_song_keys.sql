-- ============================================================
-- Migration 006 — Song Keys
-- ============================================================
-- Adds key_root + key_mode to song_attributes and seeds the 47 base
-- songs from src/data/songs.ts with their commonly-played keys.
--
-- Why this matters: on stage, the key is the single most important
-- piece of info between songs. Capos move, patches change, basses
-- restring. The generator and the new stage-mode view both read this.
--
-- Custom songs (added via + ADD SONG) get null keys until edited.
-- Idempotent — ON CONFLICT updates.
-- ============================================================

ALTER TABLE song_attributes
  ADD COLUMN IF NOT EXISTS key_root TEXT,
  ADD COLUMN IF NOT EXISTS key_mode TEXT;

-- Seed: 47 base songs. Live-performance key (often a half-step from studio
-- for vocal range), best guess for each.

INSERT INTO song_attributes (song_id, key_root, key_mode) VALUES
  -- 1960s
  ('60-01', 'E',  'major'),  -- Born to Be Wild
  ('60-02', 'E',  'minor'),  -- Paint It Black
  ('60-03', 'E',  'minor'),  -- Break On Through
  ('60-04', 'E',  'major'),  -- Love Me Two Times
  ('60-05', 'A',  'major'),  -- Fire (Hendrix)
  ('60-06', 'D',  'major'),  -- White Room (modal, D ionian feel)
  ('60-07', 'E',  'major'),  -- Norwegian Wood
  ('60-08', 'A',  'major'),  -- Oh! Darling
  ('60-09', 'D',  'minor'),  -- I Want You (She''s So Heavy)
  ('60-10', 'A',  'minor'),  -- Whipping Post
  ('60-11', 'A',  'major'),  -- Johnny B. Goode (live-friendly transposition)

  -- 1970s
  ('70-01', 'B',  'minor'),  -- Money
  ('70-02', 'A',  'major'),  -- Rock and Roll
  ('70-03', 'G',  'minor'),  -- Highway Star
  ('70-04', 'A',  'major'),  -- Sweet Emotion
  ('70-05', 'C',  'major'),  -- Carry On Wayward Son
  ('70-06', 'E',  'minor'),  -- War Pigs
  ('70-07', 'G',  'major'),  -- It''s a Long Way to the Top
  ('70-08', 'F#', 'minor'),  -- Time
  ('70-09', 'E',  'minor'),  -- Breathe
  ('70-10', 'E',  'major'),  -- The Ocean
  ('70-11', 'A',  'major'),  -- All Right Now
  ('70-12', 'E',  'major'),  -- Funk #49
  ('70-13', 'G',  'major'),  -- Ramblin'' Man
  ('70-14', 'F#', 'minor'),  -- Shakedown Street
  ('70-15', 'D',  'major'),  -- They Love Each Other
  ('70-16', 'D',  'minor'),  -- Night by Night

  -- 1980s
  ('80-01', 'E',  'major'),  -- Don''t Stop Believin''
  ('80-02', 'E',  'minor'),  -- Livin'' on a Prayer
  ('80-03', 'G',  'major'),  -- You Shook Me All Night Long
  ('80-04', 'A',  'major'),  -- Rock You Like a Hurricane
  ('80-05', 'A',  'major'),  -- Burnin'' for You
  ('80-06', 'E',  'minor'),  -- Rockin'' in the Free World

  -- 1990s
  ('90-01', 'B',  'minor'),  -- Learn to Fly
  ('90-02', 'G',  'major'),  -- Closing Time
  ('90-03', 'C',  'major'),  -- All the Small Things
  ('90-04', 'E',  'major'),  -- Song 2
  ('90-05', 'A',  'minor'),  -- Californication
  ('90-06', 'F#', 'major'),  -- All Star

  -- 2000s
  ('00-01', 'D',  'major'),  -- Mr. Brightside
  ('00-02', 'E',  'major'),  -- Sex on Fire
  ('00-03', 'E',  'minor'),  -- Seven Nation Army
  ('00-04', 'E',  'major'),  -- Vertigo
  ('00-05', 'A',  'minor'),  -- Take Me Out
  ('00-06', 'A',  'minor'),  -- Somebody Told Me
  ('00-07', 'D',  'major'),  -- Are You Gonna Be My Girl
  ('00-08', 'F#', 'minor')   -- Hash Pipe
ON CONFLICT (song_id) DO UPDATE SET
  key_root  = EXCLUDED.key_root,
  key_mode  = EXCLUDED.key_mode,
  updated_at = NOW();
