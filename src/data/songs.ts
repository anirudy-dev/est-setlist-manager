import { Song } from '@/types';

export const SONGS: Song[] = [
  // 1960s
  { id: '60-01', title: 'Born to Be Wild', artist: 'Steppenwolf', decade: '1960s', year: 1968, duration: 208, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '60-02', title: 'Paint It Black', artist: 'The Rolling Stones', decade: '1960s', year: 1966, duration: 224, mood: 'Dark & Moody', moodColor: '#8844cc', energy: 'high' },
  { id: '60-03', title: 'Break On Through', artist: 'The Doors', decade: '1960s', year: 1967, duration: 149, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '60-04', title: 'Love Me Two Times', artist: 'The Doors', decade: '1960s', year: 1967, duration: 199, mood: 'Blues Rock', moodColor: '#4488ff', energy: 'medium' },
  { id: '60-05', title: 'Fire', artist: 'Jimi Hendrix', decade: '1960s', year: 1967, duration: 167, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '60-06', title: 'White Room', artist: 'Cream', decade: '1960s', year: 1968, duration: 297, mood: 'Dark & Moody', moodColor: '#8844cc', energy: 'high' },
  { id: '60-07', title: 'Norwegian Wood', artist: 'The Beatles', decade: '1960s', year: 1965, duration: 125, mood: 'Mellow', moodColor: '#44aa88', energy: 'low' },
  { id: '60-08', title: "Oh! Darling", artist: 'The Beatles', decade: '1960s', year: 1969, duration: 206, mood: 'Powerful', moodColor: '#ffaa00', energy: 'high' },
  { id: '60-09', title: "I Want You (She's So Heavy)", artist: 'The Beatles', decade: '1960s', year: 1969, duration: 467, mood: 'Heavy', moodColor: '#cc4444', energy: 'high' },
  { id: '60-10', title: 'Whipping Post', artist: 'The Allman Brothers Band', decade: '1960s', year: 1969, duration: 320, mood: 'Blues Intense', moodColor: '#4488ff', energy: 'high' },
  { id: '60-11', title: 'Johnny B. Goode', artist: 'Chuck Berry', decade: '1960s', year: 1958, duration: 162, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },

  // 1970s
  { id: '70-01', title: 'Money', artist: 'Pink Floyd', decade: '1970s', year: 1973, duration: 382, mood: 'Dark & Groovy', moodColor: '#8844cc', energy: 'medium' },
  { id: '70-02', title: 'Rock and Roll', artist: 'Led Zeppelin', decade: '1970s', year: 1971, duration: 220, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '70-03', title: 'Highway Star', artist: 'Deep Purple', decade: '1970s', year: 1972, duration: 365, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '70-04', title: 'Sweet Emotion', artist: 'Aerosmith', decade: '1970s', year: 1975, duration: 274, mood: 'Groovy', moodColor: '#ffaa00', energy: 'medium' },
  { id: '70-05', title: 'Carry On Wayward Son', artist: 'Kansas', decade: '1970s', year: 1976, duration: 324, mood: 'Anthemic', moodColor: '#ff7700', energy: 'high' },
  { id: '70-06', title: 'War Pigs', artist: 'Black Sabbath', decade: '1970s', year: 1970, duration: 474, mood: 'Heavy', moodColor: '#cc4444', energy: 'high' },
  { id: '70-07', title: "It's a Long Way to the Top", artist: 'AC/DC', decade: '1970s', year: 1976, duration: 316, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '70-08', title: 'Time', artist: 'Pink Floyd', decade: '1970s', year: 1973, duration: 413, mood: 'Epic', moodColor: '#4488ff', energy: 'medium' },
  { id: '70-09', title: 'Breathe', artist: 'Pink Floyd', decade: '1970s', year: 1973, duration: 169, mood: 'Mellow', moodColor: '#44aa88', energy: 'low' },
  { id: '70-10', title: 'The Ocean', artist: 'Led Zeppelin', decade: '1970s', year: 1973, duration: 271, mood: 'Heavy', moodColor: '#cc4444', energy: 'high' },
  { id: '70-11', title: 'All Right Now', artist: 'Free', decade: '1970s', year: 1970, duration: 331, mood: 'Groovy', moodColor: '#ffaa00', energy: 'high' },
  { id: '70-12', title: 'Funk #49', artist: 'James Gang', decade: '1970s', year: 1970, duration: 206, mood: 'Funky', moodColor: '#ff7700', energy: 'medium' },
  { id: '70-13', title: "Ramblin' Man", artist: 'The Allman Brothers Band', decade: '1970s', year: 1973, duration: 284, mood: 'Southern Rock', moodColor: '#ffcc00', energy: 'medium' },
  { id: '70-14', title: 'Shakedown Street', artist: 'Grateful Dead', decade: '1970s', year: 1978, duration: 317, mood: 'Funky', moodColor: '#ff7700', energy: 'medium' },
  { id: '70-15', title: 'They Love Each Other', artist: 'Grateful Dead', decade: '1970s', year: 1973, duration: 320, mood: 'Mellow', moodColor: '#44aa88', energy: 'low' },
  { id: '70-16', title: 'Night by Night', artist: 'Steely Dan', decade: '1970s', year: 1974, duration: 371, mood: 'Smooth', moodColor: '#44aacc', energy: 'medium' },

  // 1980s
  { id: '80-01', title: "Don't Stop Believin'", artist: 'Journey', decade: '1980s', year: 1981, duration: 251, mood: 'Anthemic', moodColor: '#ff7700', energy: 'high' },
  { id: '80-02', title: "Livin' on a Prayer", artist: 'Bon Jovi', decade: '1980s', year: 1986, duration: 249, mood: 'Anthemic', moodColor: '#ff7700', energy: 'high' },
  { id: '80-03', title: 'You Shook Me All Night Long', artist: 'AC/DC', decade: '1980s', year: 1980, duration: 210, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '80-04', title: 'Rock You Like a Hurricane', artist: 'Scorpions', decade: '1980s', year: 1984, duration: 251, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '80-05', title: "Burnin' for You", artist: 'Blue Öyster Cult', decade: '1980s', year: 1981, duration: 273, mood: 'Melodic', moodColor: '#4488ff', energy: 'medium' },
  { id: '80-06', title: "Rockin' in the Free World", artist: 'Neil Young', decade: '1980s', year: 1989, duration: 277, mood: 'Anthemic', moodColor: '#ff7700', energy: 'high' },

  // 1990s
  { id: '90-01', title: 'Learn to Fly', artist: 'Foo Fighters', decade: '1990s', year: 1999, duration: 239, mood: 'Uplifting', moodColor: '#ffcc00', energy: 'high' },
  { id: '90-02', title: 'Closing Time', artist: 'Semisonic', decade: '1990s', year: 1998, duration: 268, mood: 'Mellow', moodColor: '#44aa88', energy: 'low' },
  { id: '90-03', title: 'All the Small Things', artist: 'Blink-182', decade: '1990s', year: 1999, duration: 169, mood: 'Fun', moodColor: '#ffcc00', energy: 'high' },
  { id: '90-04', title: 'Song 2', artist: 'Blur', decade: '1990s', year: 1997, duration: 122, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '90-05', title: 'Californication', artist: 'Red Hot Chili Peppers', decade: '1990s', year: 1999, duration: 321, mood: 'Mellow', moodColor: '#44aa88', energy: 'low' },
  { id: '90-06', title: 'All Star', artist: 'Smash Mouth', decade: '1990s', year: 1999, duration: 238, mood: 'Fun', moodColor: '#ffcc00', energy: 'high' },

  // 2000s
  { id: '00-01', title: 'Mr. Brightside', artist: 'The Killers', decade: '2000s', year: 2003, duration: 222, mood: 'Anthemic', moodColor: '#ff7700', energy: 'high' },
  { id: '00-02', title: 'Sex on Fire', artist: 'Kings of Leon', decade: '2000s', year: 2008, duration: 202, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '00-03', title: 'Seven Nation Army', artist: 'The White Stripes', decade: '2000s', year: 2003, duration: 232, mood: 'Anthemic', moodColor: '#ff7700', energy: 'high' },
  { id: '00-04', title: 'Vertigo', artist: 'U2', decade: '2000s', year: 2004, duration: 217, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '00-05', title: 'Take Me Out', artist: 'Franz Ferdinand', decade: '2000s', year: 2004, duration: 239, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '00-06', title: 'Somebody Told Me', artist: 'The Killers', decade: '2000s', year: 2004, duration: 188, mood: 'Fun', moodColor: '#ffcc00', energy: 'high' },
  { id: '00-07', title: 'Are You Gonna Be My Girl', artist: 'Jet', decade: '2000s', year: 2003, duration: 213, mood: 'Explosive', moodColor: '#ff4444', energy: 'high' },
  { id: '00-08', title: 'Hash Pipe', artist: 'Weezer', decade: '2000s', year: 2001, duration: 219, mood: 'Heavy', moodColor: '#cc4444', energy: 'high' },
];

export const DECADES = ['1960s', '1970s', '1980s', '1990s', '2000s'];

export const MOODS = [...new Set(SONGS.map(s => s.mood))].sort();

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function totalDuration(songIds: string[]): number {
  return songIds.reduce((acc, id) => {
    const song = SONGS.find(s => s.id === id);
    return acc + (song?.duration ?? 0);
  }, 0);
}

export function formatTotalDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export function getSongById(id: string): Song | undefined {
  return SONGS.find(s => s.id === id);
}
