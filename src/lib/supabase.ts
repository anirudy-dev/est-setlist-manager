import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default supabase;

// ── Gigs ──────────────────────────────────────────────────────────────────────

export async function getGigs() {
  const { data, error } = await supabase
    .from('gigs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createGig({
  name,
  date,
  venue,
  notes,
}: {
  name: string;
  date: string;
  venue: string;
  notes: string;
}) {
  const { data, error } = await supabase
    .from('gigs')
    .insert([{ name, date, venue, notes }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGig(
  id: string,
  updates: { name?: string; date?: string; venue?: string; notes?: string }
) {
  const { data, error } = await supabase
    .from('gigs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGig(id: string) {
  const { error } = await supabase.from('gigs').delete().eq('id', id);
  if (error) throw error;
}

// ── Setlists ──────────────────────────────────────────────────────────────────

export async function getSetlistsForGig(gigId: string) {
  const { data, error } = await supabase
    .from('setlists')
    .select('*')
    .eq('gig_id', gigId)
    .order('order_num', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createSetlist({
  gig_id,
  name,
  order_num,
}: {
  gig_id: string;
  name: string;
  order_num: number;
}) {
  const { data, error } = await supabase
    .from('setlists')
    .insert([{ gig_id, name, order_num, songs: [] }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSetlist(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('setlists')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSetlist(id: string) {
  const { error } = await supabase.from('setlists').delete().eq('id', id);
  if (error) throw error;
}

// ── Custom Songs ──────────────────────────────────────────────────────────────

export async function getCustomSongs() {
  const { data, error } = await supabase
    .from('custom_songs')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

// Converts "M:SS" or "MM:SS" string to total seconds
function parseDuration(duration: string): number {
  const parts = duration.split(':');
  if (parts.length !== 2) return 0;
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  if (isNaN(minutes) || isNaN(seconds)) return 0;
  return minutes * 60 + seconds;
}

export async function addCustomSong(song: {
  title: string;
  artist: string;
  decade: string;
  year: number;
  duration: string;
  mood: string;
  mood_color: string;
}) {
  const { data, error } = await supabase
    .from('custom_songs')
    .insert([{
      title: song.title,
      artist: song.artist,
      decade: song.decade,
      year: song.year,
      duration: parseDuration(song.duration), // ← converts "4:32" to 272
      mood: song.mood,
      mood_color: song.mood_color,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}


// ── Set Generator (migration 003 + 004) ─────────────────────────────────────

/** Fetch all available crowd models (Late Night Bar, etc). */
export async function getCrowdModels() {
  const { data, error } = await supabase
    .from('crowd_models')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return data;
}

/** Fetch song_attributes for every scored song. */
export async function getSongAttributes() {
  const { data, error } = await supabase
    .from('song_attributes')
    .select('*');
  if (error) throw error;
  return data;
}

/**
 * Replace a gig's setlists with new ones built from a generator candidate.
 * Deletes existing setlists for the gig (cascade is per-setlist row), then
 * inserts the new ones in order.
 */
export async function replaceSetlistsForGig(
  gigId: string,
  sets: Array<{ name: string; songs: Array<{ instanceId: string; songId: string; position: number }> }>,
) {
  // Wipe existing setlists for this gig.
  const { error: delErr } = await supabase
    .from('setlists')
    .delete()
    .eq('gig_id', gigId);
  if (delErr) throw delErr;

  // Insert new ones with order_num matching their position in the array.
  const toInsert = sets.map((s, i) => ({
    gig_id: gigId,
    name: s.name,
    order_num: i,
    songs: s.songs,
  }));
  const { data, error } = await supabase
    .from('setlists')
    .insert(toInsert)
    .select();
  if (error) throw error;
  return data;
}
