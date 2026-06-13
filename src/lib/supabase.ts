import { createClient } from '@supabase/supabase-js';
import { Song } from '@/types';

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

/**
 * Returns custom songs from Supabase, normalized to the same `Song` shape
 * used by the hardcoded library so MasterSongList can merge both arrays
 * with no special-casing.
 */
export async function getCustomSongs(): Promise<Song[]> {
  const { data, error } = await supabase
    .from('custom_songs')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: {
    id: string;
    title: string;
    artist: string;
    decade: string;
    year: number;
    duration: number;
    mood: string;
    mood_color: string;
  }): Song => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    decade: row.decade,
    year: row.year,
    duration: row.duration,
    mood: row.mood,
    moodColor: row.mood_color,
    energy: 'high',
  }));
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
