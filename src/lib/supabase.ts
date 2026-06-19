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


// ── Debrief ─────────────────────────────────────────────────────────────────

interface DebriefPayload {
  gig_id: string;
  overall_score: number | null;
  rebook_signal: boolean | null;
  notes: string;
  song_outcomes: Array<{
    song_id: string;
    set_position: number;
    song_position: number;
    floor_density: number;
    singalong_heat: number;
    bar_pull: number;
  }>;
}

/**
 * Save a post-gig debrief: inserts one gig_outcomes row and N song_outcomes
 * rows. The gig_outcomes row is the parent for cascade delete safety.
 */
export async function saveGigDebrief(payload: DebriefPayload) {
  const { data: outcome, error: outErr } = await supabase
    .from('gig_outcomes')
    .insert([{
      gig_id: payload.gig_id,
      overall_score: payload.overall_score,
      rebook_signal: payload.rebook_signal,
      notes: payload.notes || null,
    }])
    .select()
    .single();
  if (outErr) throw outErr;
  if (!outcome) throw new Error('Failed to create gig_outcomes row');

  const songRows = payload.song_outcomes.map((s) => ({
    gig_outcome_id: outcome.id,
    song_id: s.song_id,
    set_position: s.set_position,
    song_position: s.song_position,
    floor_density: s.floor_density,
    singalong_heat: s.singalong_heat,
    bar_pull: s.bar_pull,
  }));

  if (songRows.length > 0) {
    const { error: songErr } = await supabase
      .from('song_outcomes')
      .insert(songRows);
    if (songErr) throw songErr;
  }

  return outcome;
}


// ── Venue Profiles ──────────────────────────────────────────────────────────

export async function getVenueProfileByName(venueName: string) {
  const { data, error } = await supabase
    .from('venue_profiles')
    .select('*')
    .ilike('venue_name', venueName.trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertVenueProfile(profile: {
  venue_name: string;
  city?: string | null;
  default_crowd_model_id?: string | null;
  observed_peak_time?: string | null;
  typical_crowd_age_range?: string | null;
  capacity_estimate?: number | null;
  notes?: string | null;
}) {
  // Try to find an existing row by name (case-insensitive), then update or insert.
  const existing = await getVenueProfileByName(profile.venue_name);
  if (existing) {
    const { data, error } = await supabase
      .from('venue_profiles')
      .update({
        city: profile.city ?? existing.city,
        default_crowd_model_id: profile.default_crowd_model_id ?? existing.default_crowd_model_id,
        observed_peak_time: profile.observed_peak_time ?? existing.observed_peak_time,
        typical_crowd_age_range: profile.typical_crowd_age_range ?? existing.typical_crowd_age_range,
        capacity_estimate: profile.capacity_estimate ?? existing.capacity_estimate,
        notes: profile.notes ?? existing.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('venue_profiles')
    .insert([{
      venue_name: profile.venue_name.trim(),
      city: profile.city ?? null,
      default_crowd_model_id: profile.default_crowd_model_id ?? null,
      observed_peak_time: profile.observed_peak_time ?? null,
      typical_crowd_age_range: profile.typical_crowd_age_range ?? null,
      capacity_estimate: profile.capacity_estimate ?? null,
      notes: profile.notes ?? null,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}
