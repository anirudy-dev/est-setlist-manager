'use client';
import { useState, useMemo, type CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { formatDuration, formatTotalDuration } from '@/data/songs';
import { Song } from '@/types';

function SongRow({ song, onAdd, activeSetlistId }: { song: Song; onAdd: (songId: string) => void; activeSetlistId: string | null; }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `master-${song.id}`, data: { type: 'master', songId: song.id } });
  const [hover, setHover] = useState(false);

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ opacity: isDragging ? 0.3 : 1, display: 'flex', alignItems: 'center', gap: 0, background: hover ? 'var(--bg-subtle)' : 'transparent', borderRadius: 'var(--radius-sm)', transition: 'background 0.12s' }}>
      <div ref={setNodeRef} {...listeners} {...attributes} onDoubleClick={() => onAdd(song.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'grab', minWidth: 0 }} title="Drag to a set, or double-click to add">
        <span style={{ color: 'var(--ink-4)', fontSize: 12, opacity: hover ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>⣿</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--ink-1)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ background: song.moodColor + '18', color: song.moodColor, border: `0.5px solid ${song.moodColor}33`, fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 500 }}>{song.mood}</span>
          <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{formatDuration(song.duration)}</span>
        </div>
      </div>
      {activeSetlistId && (
        <button onClick={() => onAdd(song.id)} title="Add to active setlist" style={{ flexShrink: 0, width: 36, alignSelf: 'stretch', background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-pink)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}>+</button>
      )}
    </div>
  );
}

interface Props { activeSetlistId: string | null; onDoubleClickAdd: (songId: string) => void; allSongs: Song[]; onOpenAddSong?: () => void; }

export default function MasterSongList({ activeSetlistId, onDoubleClickAdd, allSongs, onOpenAddSong }: Props) {
  const [search, setSearch] = useState('');
  const [selectedDecade, setSelectedDecade] = useState<string>('All');
  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'duration' | 'year'>('year');

  const moods = useMemo(() => { const seen: Record<string, boolean> = {}; const unique: string[] = []; allSongs.forEach(s => { if (!seen[s.mood]) { seen[s.mood] = true; unique.push(s.mood); } }); return ['All', ...unique.sort()]; }, [allSongs]);
  const allDecades = useMemo(() => { const seen: Record<string, boolean> = {}; const unique: string[] = []; allSongs.forEach(s => { if (!seen[s.decade]) { seen[s.decade] = true; unique.push(s.decade); } }); return ['All', ...unique.sort()]; }, [allSongs]);
  const filtered = useMemo(() => {
    let list = [...allSongs];
    if (selectedDecade !== 'All') list = list.filter(s => s.decade === selectedDecade);
    if (selectedMood !== 'All') list = list.filter(s => s.mood === selectedMood);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)); }
    list.sort((a, b) => { if (sortBy === 'title') return a.title.localeCompare(b.title); if (sortBy === 'artist') return a.artist.localeCompare(b.artist); if (sortBy === 'duration') return a.duration - b.duration; return a.year - b.year; });
    return list;
  }, [search, selectedDecade, selectedMood, sortBy, allSongs]);
  const totalSecs = filtered.reduce((a, s) => a + (Number(s.duration) || 0), 0);
  const grouped = useMemo(() => { const map: Record<string, Song[]> = {}; filtered.forEach(s => { if (!map[s.decade]) map[s.decade] = []; map[s.decade].push(s); }); return map; }, [filtered]);
  const decadeOrder = ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', 'Custom'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface)' }}>
      <div style={{ padding: '20px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div className="label-eyebrow">Library</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2, letterSpacing: '-0.01em' }}>Song library</div>
          </div>
          {onOpenAddSong && (
            <button onClick={onOpenAddSong} style={{ fontSize: 12, fontWeight: 600, background: 'var(--bg-surface)', color: 'var(--ink-1)', border: '0.5px solid var(--border-medium)', cursor: 'pointer', padding: '7px 14px', borderRadius: 'var(--radius-pill)', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}>+ Add song</button>
          )}
        </div>
        <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Search title or artist…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: 6 }}>
          <select style={selectStyle} value={selectedDecade} onChange={e => setSelectedDecade(e.target.value)}>{allDecades.map(d => <option key={d} value={d}>{d}</option>)}</select>
          <select style={selectStyle} value={selectedMood} onChange={e => setSelectedMood(e.target.value)}>{moods.map(m => <option key={m} value={m}>{m === 'All' ? 'All moods' : m}</option>)}</select>
          <select style={selectStyle} value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
            <option value="year">Sort: Year</option><option value="title">Sort: Title</option><option value="artist">Sort: Artist</option><option value="duration">Sort: Duration</option>
          </select>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px' }}>
        {decadeOrder.map(decade => {
          const songs = grouped[decade];
          if (!songs || songs.length === 0) return null;
          return (
            <div key={decade} style={{ marginBottom: 14 }}>
              <div style={{ padding: '10px 8px 6px', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="label-eyebrow">{decade}</span>
                <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{songs.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {songs.map(song => (<SongRow key={song.id} song={song} onAdd={onDoubleClickAdd} activeSetlistId={activeSetlistId} />))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '12px 20px', borderTop: '0.5px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)', fontSize: 12, background: 'var(--bg-surface)' }}>
        <span>{filtered.length} songs</span>
        <span>{formatTotalDuration(totalSecs)}</span>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = { background: 'var(--bg-app)', border: '0.5px solid var(--border-soft)', color: 'var(--ink-1)', fontSize: 13, padding: '8px 12px', borderRadius: 'var(--radius-sm)', outline: 'none', width: '100%' };
const selectStyle: CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'none', paddingRight: 24, backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'><path d='M2 4l3 3 3-3' stroke='%237A7A7A' stroke-width='1.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' };
