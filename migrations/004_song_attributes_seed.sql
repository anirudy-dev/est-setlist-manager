-- ============================================================
-- Migration 004 — Song Attributes Seed
-- ============================================================
-- Seeds song_attributes for every song hardcoded in src/data/songs.ts.
-- Scoring framework comes from the EST band-manager:
--   singalong_score (0-10)    — can a drunk 28-year-old sing along
--   dance_pull_score (0-10)   — fills the floor
--   bar_pull_score (-5..+5)   — negative = floor packed, positive = bar packed
--   lifeline_strength (0-10)  — universal recognition + re-engagement power
--   bpm_felt                  — clap-along tempo (often half/double technical)
--
-- Role flags:
--   opener_capable     — can confidently open a set
--   closer_capable     — universal closer-fodder
--   peak_eligible      — belongs in 12-1am peak window
--   glue_song          — classic-rock heavy jam that bridges anthem stacks
--   singalong_anchor   — the whole-room-screaming songs
--
-- This migration is idempotent — ON CONFLICT updates existing rows so we
-- can iterate on scoring without breaking anything.
-- ============================================================

INSERT INTO song_attributes (
  song_id, singalong_score, dance_pull_score, bar_pull_score, lifeline_strength,
  opener_capable, closer_capable, peak_eligible, glue_song, singalong_anchor, bpm_felt
) VALUES
  -- 1960s
  ('60-01', 9, 8, -3,  9, TRUE,  FALSE, TRUE,  FALSE, TRUE,  145),  -- Born to Be Wild
  ('60-02', 6, 5,  1,  7, FALSE, FALSE, FALSE, TRUE,  FALSE, 116),  -- Paint It Black
  ('60-03', 5, 6,  0,  6, TRUE,  FALSE, FALSE, TRUE,  FALSE,  91),  -- Break On Through
  ('60-04', 7, 7,  0,  6, TRUE,  FALSE, FALSE, TRUE,  FALSE, 133),  -- Love Me Two Times
  ('60-05', 5, 6,  1,  5, FALSE, FALSE, FALSE, TRUE,  FALSE, 155),  -- Fire (Hendrix)
  ('60-06', 5, 5,  2,  6, FALSE, FALSE, FALSE, TRUE,  FALSE, 110),  -- White Room
  ('60-07', 6, 2,  3,  6, FALSE, FALSE, FALSE, FALSE, FALSE,  89),  -- Norwegian Wood (ballad-ish)
  ('60-08', 6, 3,  3,  5, FALSE, FALSE, FALSE, FALSE, FALSE,  87),  -- Oh! Darling (slow blues)
  ('60-09', 4, 6,  2,  4, FALSE, FALSE, FALSE, TRUE,  FALSE, 143),  -- I Want You She's So Heavy (long)
  ('60-10', 5, 5,  1,  5, FALSE, FALSE, FALSE, TRUE,  FALSE,  98),  -- Whipping Post
  ('60-11', 7, 8, -2,  7, TRUE,  TRUE,  TRUE,  FALSE, FALSE, 168),  -- Johnny B. Goode

  -- 1970s
  ('70-01', 5, 5,  2,  6, FALSE, FALSE, FALSE, TRUE,  FALSE, 126),  -- Money (Floyd)
  ('70-02', 7, 9, -3,  8, FALSE, TRUE,  TRUE,  FALSE, FALSE, 172),  -- Rock and Roll (Zep)
  ('70-03', 5, 8,  1,  5, FALSE, FALSE, TRUE,  FALSE, FALSE, 172),  -- Highway Star
  ('70-04', 6, 5,  1,  7, FALSE, FALSE, FALSE, TRUE,  FALSE, 100),  -- Sweet Emotion
  ('70-05', 9, 7, -2,  9, TRUE,  TRUE,  TRUE,  FALSE, TRUE,  127),  -- Carry On Wayward Son
  ('70-06', 6, 5,  2,  6, FALSE, FALSE, FALSE, TRUE,  FALSE,  90),  -- War Pigs
  ('70-07', 7, 8, -1,  7, FALSE, TRUE,  TRUE,  FALSE, FALSE, 136),  -- It's a Long Way to the Top
  ('70-08', 4, 4,  3,  4, FALSE, FALSE, FALSE, FALSE, FALSE, 121),  -- Time
  ('70-09', 3, 2,  4,  3, FALSE, FALSE, FALSE, FALSE, FALSE,  64),  -- Breathe
  ('70-10', 5, 5,  1,  6, FALSE, FALSE, FALSE, TRUE,  FALSE,  89),  -- The Ocean
  ('70-11', 8, 7, -1,  7, FALSE, FALSE, TRUE,  FALSE, FALSE, 132),  -- All Right Now
  ('70-12', 4, 5,  1,  4, FALSE, FALSE, FALSE, TRUE,  FALSE,  93),  -- Funk #49
  ('70-13', 6, 5,  2,  6, FALSE, FALSE, FALSE, FALSE, FALSE,  90),  -- Ramblin' Man
  ('70-14', 5, 6,  0,  5, FALSE, FALSE, FALSE, TRUE,  FALSE, 109),  -- Shakedown Street
  ('70-15', 4, 5,  1,  3, FALSE, FALSE, FALSE, FALSE, FALSE, 119),  -- They Love Each Other
  ('70-16', 4, 6,  2,  4, FALSE, FALSE, FALSE, FALSE, FALSE, 156),  -- Night by Night

  -- 1980s
  ('80-01',10, 8, -4, 10, TRUE,  TRUE,  TRUE,  FALSE, TRUE,  119),  -- Don't Stop Believin'
  ('80-02',10, 9, -4, 10, TRUE,  TRUE,  TRUE,  FALSE, TRUE,  123),  -- Livin' on a Prayer
  ('80-03', 9, 9, -3,  9, FALSE, TRUE,  TRUE,  FALSE, TRUE,  127),  -- You Shook Me All Night Long
  ('80-04', 8, 8, -2,  8, FALSE, FALSE, TRUE,  FALSE, FALSE, 138),  -- Rock You Like a Hurricane
  ('80-05', 6, 6,  0,  5, FALSE, FALSE, FALSE, TRUE,  FALSE, 135),  -- Burnin' for You
  ('80-06', 8, 7, -2,  8, FALSE, FALSE, TRUE,  FALSE, FALSE, 132),  -- Rockin' in the Free World

  -- 1990s
  ('90-01', 8, 7, -2,  8, TRUE,  FALSE, FALSE, FALSE, FALSE, 136),  -- Learn to Fly
  ('90-02',10, 5, -3, 10, FALSE, TRUE,  FALSE, FALSE, TRUE,  132),  -- Closing Time
  ('90-03', 9, 8, -3,  9, FALSE, FALSE, TRUE,  FALSE, FALSE, 148),  -- All the Small Things
  ('90-04', 8, 9, -3,  8, FALSE, FALSE, TRUE,  FALSE, FALSE, 130),  -- Song 2
  ('90-05', 6, 4,  2,  6, FALSE, FALSE, FALSE, FALSE, FALSE,  97),  -- Californication
  ('90-06',10, 6, -2, 10, FALSE, FALSE, TRUE,  FALSE, TRUE,  104),  -- All Star

  -- 2000s
  ('00-01',10,10, -5, 10, TRUE,  TRUE,  TRUE,  FALSE, TRUE,  148),  -- Mr. Brightside
  ('00-02', 9, 9, -3,  9, FALSE, FALSE, TRUE,  FALSE, FALSE, 153),  -- Sex on Fire
  ('00-03',10, 8, -3, 10, TRUE,  TRUE,  TRUE,  FALSE, TRUE,  123),  -- Seven Nation Army
  ('00-04', 8, 8, -2,  8, FALSE, FALSE, TRUE,  FALSE, FALSE, 140),  -- Vertigo
  ('00-05', 8, 8, -2,  8, FALSE, FALSE, FALSE, FALSE, FALSE, 105),  -- Take Me Out
  ('00-06', 8, 8, -2,  8, FALSE, FALSE, TRUE,  FALSE, FALSE, 137),  -- Somebody Told Me
  ('00-07', 7, 8, -2,  8, TRUE,  FALSE, FALSE, FALSE, FALSE, 105),  -- Are You Gonna Be My Girl
  ('00-08', 6, 7,  0,  5, FALSE, FALSE, FALSE, FALSE, FALSE, 110)   -- Hash Pipe
ON CONFLICT (song_id) DO UPDATE SET
  singalong_score   = EXCLUDED.singalong_score,
  dance_pull_score  = EXCLUDED.dance_pull_score,
  bar_pull_score    = EXCLUDED.bar_pull_score,
  lifeline_strength = EXCLUDED.lifeline_strength,
  opener_capable    = EXCLUDED.opener_capable,
  closer_capable    = EXCLUDED.closer_capable,
  peak_eligible     = EXCLUDED.peak_eligible,
  glue_song         = EXCLUDED.glue_song,
  singalong_anchor  = EXCLUDED.singalong_anchor,
  bpm_felt          = EXCLUDED.bpm_felt,
  updated_at        = NOW();
