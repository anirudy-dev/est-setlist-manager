'use client';
import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { SONGS, DECADES, formatDuration } from '@/data/songs';
import { Song } from '@/types';

function DraggableSongRow({ song, onDoubleClick }: { song: Song; onDoubleClick: (song: Song) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `master-${song.id}`,
    data: { type: 'master', songId: song.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onDoubleClick={() => onDoubleClick(song)}
      className="song-row flex items-center gap-3 px-3 py-2 select-none"
      style={{
        opacity: isDragging ? 0.3 : 1,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        cursor: 'grab',
      }}
      title="Drag to setlist · Double-click to add to active setlist"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm truncate" style={{ fontFamily: 'var(--font-body)', color: '#fff' }}>
            {song.title}
          </span>
        </div>
        <div className="text-xs truncate mt-0.5" style={{ color: '#666', fontFamily: 'var(--font-body)' }}>
          {song.artist}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className="mood-badge"
          style={{ background: song.moodColor + '22', color: song.moodColor, border: `1px solid ${song.moodColor}44` }}
        >
          {song.mood}
        </span>
        <span className="text-xs tabular-nums" style={{ color: '#555', fontFamily: 'var(--font-body)' }}>
          {formatDuration(song.duration)}
        </span>
      </div>
    </div>
  );
}

interface Props {
  activeSetlistId: string | null;
  onDoubleClickAdd: (songId: string) => void;
}

export default function MasterSongList({ activeSetlistId, onDoubleClickAdd }: Props) {
  const [search, setSearch] = useState('');
  const [selectedDecade, setSelectedDecade] = useState<string>('All');
  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'duration' | 'year'>('year');

   const moods = useMemo(() => {
    const seen: Record<string, boolean> = {};
    const unique: string[] = [];
    SONGS.forEach(s => { if (!seen[s.mood]) { seen[s.mood] = true; unique.push(s.mood); } });
    return ['All', ...unique.sort()];
  }, []);

  const filtered = useMemo(() => {
    let list = [...SONGS];
    if (selectedDecade !== 'All') list = list.filter(s => s.decade === selectedDecade);
    if (selectedMood !== 'All') list = list.filter(s => s.mood === selectedMood);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      if (sortBy === 'duration') return a.duration - b.duration;
      return a.year - b.year;
    });
    return list;
  }, [search, selectedDecade, selectedMood, sortBy]);

  const totalSecs = filtered.reduce((a, s) => a + s.duration, 0);

  const inputStyle = {
    background: '#0f0f0f',
    border: '1px solid #252525',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    padding: '5px 8px',
    outline: 'none',
    width: '100%',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none' as const,
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0d0d0d', borderRight: '1px solid #1e1e1e' }}>
      {/* Header */}
      <div className="p-3" style={{ borderBottom: '1px solid #1e1e1e' }}>
        <div className="flex items-baseline justify-between mb-2">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.1em', color: '#fff' }}>
            SONG CATALOGUE
          </span>
          <span className="text-xs" style={{ color: '#555', fontFamily: 'var(--font-body)' }}>
            {filtered.length} songs
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search songs or artists..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
          className="mb-2"
        />

        {/* Filters row */}
        <div className="grid grid-cols-2 gap-1 mb-2">
          <select value={selectedDecade} onChange={e => setSelectedDecade(e.target.value)} style={selectStyle}>
            <option value="All">All Decades</option>
            {DECADES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={selectedMood} onChange={e => setSelectedMood(e.target.value)} style={selectStyle}>
            <option value="All">All Moods</option>
            {moods.filter(m => m !== 'All').map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Sort */}
        <div className="flex gap-1">
          {(['year', 'title', 'artist', 'duration'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className="flex-1 py-1 text-center uppercase"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '9px',
                letterSpacing: '0.05em',
                background: sortBy === s ? '#fff' : '#1a1a1a',
                color: sortBy === s ? '#000' : '#666',
                border: '1px solid #252525',
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner */}
      {!activeSetlistId && (
        <div className="px-3 py-2 text-xs text-center" style={{ background: '#0f0f0f', color: '#555', borderBottom: '1px solid #1a1a1a', fontFamily: 'var(--font-body)' }}>
          ← Select or create a setlist to add songs
        </div>
      )}
      {activeSetlistId && (
        <div className="px-3 py-2 text-xs text-center" style={{ background: '#0a1a0a', color: '#00e676', borderBottom: '1px solid #1a1a1a', fontFamily: 'var(--font-body)' }}>
          Drag songs → setlist &nbsp;|&nbsp; Double-click to add
        </div>
      )}

      {/* Decade groups */}
      <div className="flex-1 overflow-y-auto">
        {DECADES.filter(d => selectedDecade === 'All' || d === selectedDecade).map(decade => {
          const songs = filtered.filter(s => s.decade === decade);
          if (!songs.length) return null;
          return (
            <div key={decade}>
              <div
                className="px-3 py-1 sticky top-0 flex items-center justify-between"
                style={{ background: '#0d0d0d', borderBottom: '1px solid #1e1e1e', zIndex: 1 }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.15em', color: '#555' }}>
                  {decade}
                </span>
                <span className="text-xs" style={{ color: '#333', fontFamily: 'var(--font-body)' }}>
                  {songs.length}
                </span>
              </div>
              {songs.map(song => (
                <DraggableSongRow
                  key={song.id}
                  song={song}
                  onDoubleClick={s => onDoubleClickAdd(s.id)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex justify-between text-xs" style={{ borderTop: '1px solid #1e1e1e', color: '#444', fontFamily: 'var(--font-body)' }}>
        <span>{filtered.length} songs</span>
        <span>{Math.floor(totalSecs / 60)}m {totalSecs % 60}s</span>
      </div>
    </div>
  );
}
