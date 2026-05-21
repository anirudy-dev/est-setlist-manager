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

-- Enable Row Level Security
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;

-- Allow all operations (band internal tool — password protected at app level)
CREATE POLICY "Allow all gigs" ON gigs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all setlists" ON setlists FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_setlists_gig_id ON setlists(gig_id);
CREATE INDEX IF NOT EXISTS idx_gigs_created_at ON gigs(created_at DESC);
