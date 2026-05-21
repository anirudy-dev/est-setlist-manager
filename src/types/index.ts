export interface Song {
  id: string;
  title: string;
  artist: string;
  decade: string;
  year: number;
  duration: number; // in seconds
  mood: string;
  moodColor: string;
  energy: 'low' | 'medium' | 'high';
}

export interface SetlistSong {
  instanceId: string; // unique per drag (allows duplicates)
  songId: string;
  position: number;
}

export interface Setlist {
  id: string;
  gig_id: string;
  name: string;
  order_num: number;
  songs: SetlistSong[];
  created_at: string;
}

export interface Gig {
  id: string;
  name: string;
  date: string;
  venue: string;
  notes: string;
  created_at: string;
  setlists?: Setlist[];
}
