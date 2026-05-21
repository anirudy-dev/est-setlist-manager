import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Gigs ──────────────────────────────────────────────────────────────────────

export async function getGigs() {
  const { data, error } = await supabase
    .from('gigs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createGig(gig: { name: string; date: string; venue: string; notes: string }) {
  const { data, error } = await supabase.from('gigs').insert(gig).select().single();
  if (error) throw error;
  return data;
}

export async function updateGig(id: string, updates: Partial<{ name: string; date: string; venue: string; notes: string }>) {
  const { data, error } = await supabase.from('gigs').update(updates).eq('id', id).select().single();
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

export async function createSetlist(setlist: { gig_id: string; name: string; order_num: number }) {
  const { data, error } = await supabase
    .from('setlists')
    .insert({ ...setlist, songs: [] })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSetlist(id: string, updates: Partial<{ name: string; songs: unknown[]; order_num: number }>) {
  const { data, error } = await supabase.from('setlists').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSetlist(id: string) {
  const { error } = await supabase.from('setlists').delete().eq('id', id);
  if (error) throw error;
}

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
