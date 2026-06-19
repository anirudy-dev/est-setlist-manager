// songs.ts — utility functions only.
// The authoritative song list now lives in Supabase (songs table, migration 007).
// Use getSongs() from @/lib/supabase to load songs at runtime.

export const DECADES = ['1960s', '1970s', '1980s', '1990s', '2000s'];

export const MOODS = [
  'Anthemic',
  'Blues Intense',
  'Blues Rock',
  'Dark & Groovy',
  'Dark & Moody',
  'Epic',
  'Explosive',
  'Fun',
  'Funky',
  'Groovy',
  'Heavy',
  'Mellow',
  'Melodic',
  'Powerful',
  'Smooth',
  'Southern Rock',
  'Uplifting',
];

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatTotalDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}
