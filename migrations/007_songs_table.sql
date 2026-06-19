-- ============================================================
-- Migration 007 — Unified Songs Table
-- ============================================================
-- Replaces the dual-source pattern (hardcoded songs.ts + custom_songs table)
-- with a single authoritative songs table. All 47 base songs are seeded here.
-- Custom songs added via the app use is_custom = TRUE with a UUID id.
--
-- Field notes:
--   duration   INTEGER (seconds) — eliminates the TEXT coercion bug
--   energy     TEXT ('low' | 'medium' | 'high')
--   mood_color TEXT — hex string
--   is_custom  BOOLEAN — FALSE for base songs, TRUE for band-added songs
--
-- The custom_songs table is left in place for now (data safety) but the app
-- no longer reads from it. Can be dropped after confirming migration.
--
-- Idempotent — ON CONFLICT updates base song fields on re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS songs (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  decade      TEXT NOT NULL,
  year        INTEGER NOT NULL,
  duration    INTEGER NOT NULL,
  mood        TEXT NOT NULL,
  mood_color  TEXT NOT NULL,
  energy      TEXT NOT NULL DEFAULT 'medium',
  is_custom   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all songs" ON songs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_songs_decade    ON songs(decade);
CREATE INDEX IF NOT EXISTS idx_songs_is_custom ON songs(is_custom);


-- ── Seed: 47 base songs ──────────────────────────────────────────────────────

INSERT INTO songs (id, title, artist, decade, year, duration, mood, mood_color, energy, is_custom) VALUES

  -- 1960s
  ('60-01', 'Born to Be Wild',           'Steppenwolf',              '1960s', 1968, 208, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('60-02', 'Paint It Black',            'The Rolling Stones',        '1960s', 1966, 224, 'Dark & Moody',   '#8844cc', 'high',   FALSE),
  ('60-03', 'Break On Through',          'The Doors',                 '1960s', 1967, 149, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('60-04', 'Love Me Two Times',         'The Doors',                 '1960s', 1967, 199, 'Blues Rock',     '#4488ff', 'medium', FALSE),
  ('60-05', 'Fire',                      'Jimi Hendrix',              '1960s', 1967, 167, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('60-06', 'White Room',                'Cream',                     '1960s', 1968, 297, 'Dark & Moody',   '#8844cc', 'high',   FALSE),
  ('60-07', 'Norwegian Wood',            'The Beatles',               '1960s', 1965, 125, 'Mellow',         '#44aa88', 'low',    FALSE),
  ('60-08', 'Oh! Darling',              'The Beatles',               '1960s', 1969, 206, 'Powerful',       '#ffaa00', 'high',   FALSE),
  ('60-09', 'I Want You (She''s So Heavy)', 'The Beatles',            '1960s', 1969, 467, 'Heavy',          '#cc4444', 'high',   FALSE),
  ('60-10', 'Whipping Post',             'The Allman Brothers Band',  '1960s', 1969, 320, 'Blues Intense',  '#4488ff', 'high',   FALSE),
  ('60-11', 'Johnny B. Goode',           'Chuck Berry',               '1960s', 1958, 162, 'Explosive',      '#ff4444', 'high',   FALSE),

  -- 1970s
  ('70-01', 'Money',                     'Pink Floyd',                '1970s', 1973, 382, 'Dark & Groovy',  '#8844cc', 'medium', FALSE),
  ('70-02', 'Rock and Roll',             'Led Zeppelin',              '1970s', 1971, 220, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('70-03', 'Highway Star',              'Deep Purple',               '1970s', 1972, 365, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('70-04', 'Sweet Emotion',             'Aerosmith',                 '1970s', 1975, 274, 'Groovy',         '#ffaa00', 'medium', FALSE),
  ('70-05', 'Carry On Wayward Son',      'Kansas',                    '1970s', 1976, 324, 'Anthemic',       '#ff7700', 'high',   FALSE),
  ('70-06', 'War Pigs',                  'Black Sabbath',             '1970s', 1970, 474, 'Heavy',          '#cc4444', 'high',   FALSE),
  ('70-07', 'It''s a Long Way to the Top', 'AC/DC',                  '1970s', 1976, 316, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('70-08', 'Time',                      'Pink Floyd',                '1970s', 1973, 413, 'Epic',           '#4488ff', 'medium', FALSE),
  ('70-09', 'Breathe',                   'Pink Floyd',                '1970s', 1973, 169, 'Mellow',         '#44aa88', 'low',    FALSE),
  ('70-10', 'The Ocean',                 'Led Zeppelin',              '1970s', 1973, 271, 'Heavy',          '#cc4444', 'high',   FALSE),
  ('70-11', 'All Right Now',             'Free',                      '1970s', 1970, 331, 'Groovy',         '#ffaa00', 'high',   FALSE),
  ('70-12', 'Funk #49',                  'James Gang',                '1970s', 1970, 206, 'Funky',          '#ff7700', 'medium', FALSE),
  ('70-13', 'Ramblin'' Man',             'The Allman Brothers Band',  '1970s', 1973, 284, 'Southern Rock',  '#ffcc00', 'medium', FALSE),
  ('70-14', 'Shakedown Street',          'Grateful Dead',             '1970s', 1978, 317, 'Funky',          '#ff7700', 'medium', FALSE),
  ('70-15', 'They Love Each Other',      'Grateful Dead',             '1970s', 1973, 320, 'Mellow',         '#44aa88', 'low',    FALSE),
  ('70-16', 'Night by Night',            'Steely Dan',                '1970s', 1974, 371, 'Smooth',         '#44aacc', 'medium', FALSE),

  -- 1980s
  ('80-01', 'Don''t Stop Believin''',   'Journey',                   '1980s', 1981, 251, 'Anthemic',       '#ff7700', 'high',   FALSE),
  ('80-02', 'Livin'' on a Prayer',      'Bon Jovi',                  '1980s', 1986, 249, 'Anthemic',       '#ff7700', 'high',   FALSE),
  ('80-03', 'You Shook Me All Night Long', 'AC/DC',                  '1980s', 1980, 210, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('80-04', 'Rock You Like a Hurricane', 'Scorpions',                '1980s', 1984, 251, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('80-05', 'Burnin'' for You',         'Blue Öyster Cult',          '1980s', 1981, 273, 'Melodic',        '#4488ff', 'medium', FALSE),
  ('80-06', 'Rockin'' in the Free World', 'Neil Young',              '1980s', 1989, 277, 'Anthemic',       '#ff7700', 'high',   FALSE),

  -- 1990s
  ('90-01', 'Learn to Fly',             'Foo Fighters',              '1990s', 1999, 239, 'Uplifting',      '#ffcc00', 'high',   FALSE),
  ('90-02', 'Closing Time',             'Semisonic',                 '1990s', 1998, 268, 'Mellow',         '#44aa88', 'low',    FALSE),
  ('90-03', 'All the Small Things',     'Blink-182',                 '1990s', 1999, 169, 'Fun',            '#ffcc00', 'high',   FALSE),
  ('90-04', 'Song 2',                   'Blur',                      '1990s', 1997, 122, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('90-05', 'Californication',          'Red Hot Chili Peppers',     '1990s', 1999, 321, 'Mellow',         '#44aa88', 'low',    FALSE),
  ('90-06', 'All Star',                 'Smash Mouth',               '1990s', 1999, 238, 'Fun',            '#ffcc00', 'high',   FALSE),

  -- 2000s
  ('00-01', 'Mr. Brightside',           'The Killers',               '2000s', 2003, 222, 'Anthemic',       '#ff7700', 'high',   FALSE),
  ('00-02', 'Sex on Fire',              'Kings of Leon',             '2000s', 2008, 202, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('00-03', 'Seven Nation Army',        'The White Stripes',         '2000s', 2003, 232, 'Anthemic',       '#ff7700', 'high',   FALSE),
  ('00-04', 'Vertigo',                  'U2',                        '2000s', 2004, 217, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('00-05', 'Take Me Out',              'Franz Ferdinand',           '2000s', 2004, 239, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('00-06', 'Somebody Told Me',         'The Killers',               '2000s', 2004, 188, 'Fun',            '#ffcc00', 'high',   FALSE),
  ('00-07', 'Are You Gonna Be My Girl', 'Jet',                       '2000s', 2003, 213, 'Explosive',      '#ff4444', 'high',   FALSE),
  ('00-08', 'Hash Pipe',                'Weezer',                    '2000s', 2001, 219, 'Heavy',          '#cc4444', 'high',   FALSE)

ON CONFLICT (id) DO UPDATE SET
  title      = EXCLUDED.title,
  artist     = EXCLUDED.artist,
  decade     = EXCLUDED.decade,
  year       = EXCLUDED.year,
  duration   = EXCLUDED.duration,
  mood       = EXCLUDED.mood,
  mood_color = EXCLUDED.mood_color,
  energy     = EXCLUDED.energy,
  updated_at = NOW();
