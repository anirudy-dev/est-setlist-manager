'use client';
import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { SONGS, DECADES, formatDuration } from '@/data/songs';
import { Song } from '@/types';

function SongRow({
  song,
  onAdd,
  activeSetlistId,
}: {
  song: Song;
  onAdd: (songId: string) => void;
  activeSetlistId: string | null;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `master-${song.id}`,
    data: { type: 'master', songId: song.id },
  });

  return (
    <div
      style={{
        opacity: isDragging ? 0.3 : 1,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}
    >
      {/* Drag handle — separate from the + button */}
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onDoubleClick={() => onAdd(song.id)}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          cursor: 'grab',
          minWidth: 0,
        }}
        title="Drag to setlist · Double-click to add"
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="truncate"
            style={{ fontFamily: 'var(--font-body)', color: '#fff', fontSize: 13, fontWeight: 'bold' }}
          >
            {song.title}
          </div>
          <div
            className="truncate"
            style={{ color: '#666', fontSize: 11, fontFamily: 'var(--font-body)', marginTop: 2 }}
          >
            {song.artist}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
          <span
            className="mood-badge"
            style={{
              background: song.moodColor + '22',
              color: song.moodColor,
              border: `1px solid ${song.moodColor}44`,
              fontSize: 9,
              padding: '1px 5px',
              borderRadius: 2,
              fontFamily: 'var(--font-body)',
            }}
          >
            {song.mood}
          </span>
          <span style={{ color: '#555', fontSize: 11, fontFamily: 'var(--font-body)' }}>
            {formatDuration(song.duration)}
          </span>
        </div>
      </div>

      {/* + button — only shows when a setlist is active */}
      {activeSetlistId && (
        <button
          onClick={() => onAdd(song.id)}
          title="Add to active setlist"
          style={{
            flexShrink: 0,
            width: 32,
            height: '100%',
            background: 'none',
            border: 'none',
            color: '#444',
            fontSize: 18,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            paddingRight: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ff3d6e')}
          onMouseLeave={e => (e.currentTarget.style.color = '#444')}
        >
          +
        </button>
      )}
    </div>
  );
}

interface Props {
  activeSetlistId: string | null;
  onDoubleClickAdd: (songId: string) => void;
  customSongs?: Song[];
  onOpenAddSong?: () => void;
}

export default function MasterSongList({
  activeSetlistId,
  onDoubleClickAdd,
  customSongs = [],
  onOpenAddSong,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedDecade, setSelectedDecade] = useState<string>('All');
  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'duration' | 'year'>('year');

  // Merge hardcoded + custom songs
  const allSongs = useMemo(() => [...SONGS, ...customSongs], [customSongs]);

  const moods = useMemo(() => {
    const seen: Record<string, boolean> = {};
    const unique: string[] = [];
    allSongs.forEach(s => {
      if (!seen[s.mood]) { seen[s.mood] = true; unique.push(s.mood); }
    });
    return ['All', ...unique.sort()];
  }, [allSongs]);

  const allDecades = useMemo(() => {
    const seen: Record<string, boolean> = {};
    const unique: string[] = [];
    allSongs.forEach(s => {
      if (!seen[s.decade]) { seen[s.decade] = true; unique.push(s.decade); }
    });
    return ['All', ...unique.sort()];
  }, [allSongs]);

  const filtered = useMemo(() => {
    let list = [...allSongs];
    if (selectedDecade !== 'All') list = list.filter(s => s.decade === selectedDecade);
    if (selectedMood !== 'All') list = list.filter(s => s.mood === selectedMood);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      if (sortBy === 'duration') return a.duration - b.duration;
      return a.year - b.year;
    });
    return list;
  }, [search, selectedDecade, selectedMood, sortBy, allSongs]);

  const totalSecs = filtered.reduce((a, s) => a + s.duration, 0);

  const inputStyle: React.CSSProperties = {
    background: '#0f0f0f',
    border: '1px solid #252525',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    padding: '5px 8px',
    outline: 'none',
    width: '100%',
  };

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'none' };

  // Group by decade for display
  const grouped = useMemo(() => {
    const map: Record<string, Song[]> = {};
    filtered.forEach(s => {
      if (!map[s.decade]) map[s.decade] = [];
      map[s.decade].push(s);
    });
    return map;
  }, [filtered]);

  const decadeOrder = ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', 'Custom'];

  return (
    <div className="flex flex-col h-full" style={{ background: '#0d0d0d', borderRight: '1px solid #1e1e1e' }}>
      {/* Header */}
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #1e1e1e' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', color: '#fff' }}>
            SONGS
          </span>
          {onOpenAddSong && (
            <button
              onClick={onOpenAddSong}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                background: '#fff',
                color: '#000',
                border: 'none',
                cursor: 'pointer',
                padding: '3px 10px',
                letterSpacing: '0.1em',
                fontWeight: 'bold',
              }}
            >
              + ADD SONG
            </button>
          )}
        </div>

        {/* Search */}
        <input
          style={{ ...inputStyle, marginBottom: 6 }}
          placeholder="Search title or artist..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Filters row */}
        <div style={{ display: 'flex', gap: 4 }}>
          <select style={selectStyle} value={selectedDecade} onChange={e => setSelectedDecade(e.target.value)}>
            {allDecades.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select style={selectStyle} value={selectedMood} onChange={e => setSelectedMood(e.target.value)}>
            {moods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select style={selectStyle} value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
            <option value="year">Year</option>
            <option value="title">Title</option>
            <option value="artist">Artist</option>
            <option value="duration">Duration</option>
          </select>
        </div>
      </div>

      {/* Song list */}
      <div className="flex-1 overflow-y-auto">
        {decadeOrder.map(decade => {
          const songs = grouped[decade];
          if (!songs || songs.length === 0) return null;
          return (
            <div key={decade}>
              <div
                style={{
                  padding: '4px 12px',
                  position: 'sticky',
                  top: 0,
                  background: '#0d0d0d',
                  borderBottom: '1px solid #1e1e1e',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.15em', color: '#555' }}>
                  {decade}
                </span>
                <span style={{ color: '#333', fontSize: 11, fontFamily: 'var(--font-body)' }}>
                  {songs.length}
                </span>
              </div>
              {songs.map(song => (
                <SongRow
                  key={song.id}
                  song={song}
                  onAdd={onDoubleClickAdd}
                  activeSetlistId={activeSetlistId}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '6px 12px',
          borderTop: '1px solid #1e1e1e',
          display: 'flex',
          justifyContent: 'space-between',
          color: '#444',
          fontSize: 11,
          fontFamily: 'var(--font-body)',
        }}
      >
        <span>{filtered.length} songs</span>
        <span>{Math.floor(totalSecs / 60)}m {totalSecs % 60}s</span>
      </div>
    </div>
  );
}
