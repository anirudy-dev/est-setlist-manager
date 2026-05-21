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
    .insert([song])
    .select()
    .single();
  if (error) throw error;
  return data;
}
