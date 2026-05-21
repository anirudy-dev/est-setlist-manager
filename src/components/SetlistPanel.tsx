'use client';
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Setlist, SetlistSong } from '@/types';
import { getSongById, formatDuration, formatTotalDuration } from '@/data/songs';

function SetlistSongRow({ item, index, onRemove }: { item: SetlistSong; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.instanceId });
  const song = getSongById(item.songId);
  if (!song) return null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2 px-3 py-2 group"
      {...attributes}
      {...listeners}
    >
      <span className="text-xs tabular-nums shrink-0 w-5 text-right" style={{ color: '#666', fontFamily: 'var(--font-body)' }}>
        {index + 1}
      </span>
      <span className="text-xs shrink-0" style={{ color: '#444', cursor: 'grab' }}>⠿</span>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate" style={{ fontFamily: 'var(--font-body)', color: '#fff' }}>{song.title}</div>
        <div className="text-xs truncate" style={{ color: '#aaa' }}>{song.artist}</div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className="mood-badge"
          style={{ background: song.moodColor + '22', color: song.moodColor, border: `1px solid ${song.moodColor}44`, fontSize: '9px' }}
        >
          {song.mood}
        </span>
        <span className="text-xs tabular-nums" style={{ color: '#aaa', fontFamily: 'var(--font-body)' }}>
          {formatDuration(song.duration)}
        </span>
      </div>

      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={onRemove}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center"
        style={{ color: '#ff3d6e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

interface SetlistPanelProps {
  setlist: Setlist;
  isActive: boolean;
  onActivate: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onRemoveSong: (instanceId: string) => void;
  onExport: (setlist: Setlist) => void;
  onPrint: (setlist: Setlist) => void;
  gigName: string;
  gigDate: string;
  gigVenue: string;
}

export default function SetlistPanel({
  setlist, isActive, onActivate, onRename, onDelete, onRemoveSong, onExport, onPrint,
}: SetlistPanelProps) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(setlist.name);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `setlist-drop-${setlist.id}`,
    data: { type: 'setlist', setlistId: setlist.id },
  });

  const totalSecs = setlist.songs.reduce((acc, item) => {
    const s = getSongById(item.songId);
    return acc + (s?.duration ?? 0);
  }, 0);

  const itemIds = setlist.songs.map(s => s.instanceId);

  const handleRenameSubmit = () => {
    if (newName.trim()) onRename(newName.trim());
    setRenaming(false);
  };

  return (
    <div
      className="flex flex-col mb-3"
      style={{
        background: isActive ? '#141414' : '#0c0c0c',
        border: isActive ? '1px solid #2a2a2a' : '1px solid #1a1a1a',
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        style={{ borderBottom: '1px solid #1e1e1e' }}
        onClick={onActivate}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? '#00e676' : '#333', flexShrink: 0, display: 'inline-block' }} />

        {renaming ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenaming(false); }}
            onClick={e => e.stopPropagation()}
            style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid #ff3d6e', color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', outline: 'none' }}
          />
        ) : (
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', color: isActive ? '#fff' : '#aaa' }}>
            {setlist.name}
          </span>
        )}

        <div className="flex gap-1 items-center" onClick={e => e.stopPropagation()}>
          <button onClick={() => { setNewName(setlist.name); setRenaming(true); }} title="Rename" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '13px', padding: '2px 4px' }}>✎</button>
          <button onClick={() => onPrint(setlist)} title="Print" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '11px', padding: '2px 4px', fontFamily: 'var(--font-body)' }}>⎙</button>
          <button onClick={() => onExport(setlist)} title="Export PDF" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '10px', padding: '2px 4px', fontFamily: 'var(--font-body)', letterSpacing: '0.05em' }}>PDF</button>
          {!showConfirmDelete ? (
            <button onClick={() => setShowConfirmDelete(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff3d6e66', fontSize: '18px', padding: '2px 4px', lineHeight: 1 }}>×</button>
          ) : (
            <span className="flex gap-1 items-center">
              <button onClick={() => { onDelete(); setShowConfirmDelete(false); }} style={{ background: '#ff3d6e', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '9px', padding: '3px 6px', fontFamily: 'var(--font-body)', fontWeight: 'bold' }}>DEL</button>
              <button onClick={() => setShowConfirmDelete(false)} style={{ background: 'none', border: '1px solid #333', cursor: 'pointer', color: '#aaa', fontSize: '9px', padding: '3px 6px', fontFamily: 'var(--font-body)' }}>NO</button>
            </span>
          )}
        </div>
      </div>

      {/* Prominent duration bar */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ background: isActive ? '#0d1a0d' : '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: '#aaa', fontFamily: 'var(--font-body)' }}>
            {setlist.songs.length} {setlist.songs.length === 1 ? 'song' : 'songs'}
          </span>
          {isActive && (
            <span className="text-xs font-bold" style={{ color: '#00e676', fontFamily: 'var(--font-body)', letterSpacing: '0.05em' }}>
              ● ACTIVE
            </span>
          )}
        </div>
        {/* Big duration display */}
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: '0.05em', color: totalSecs > 0 ? '#ff3d6e' : '#333' }}>
          {totalSecs > 0 ? formatTotalDuration(totalSecs) : '—'}
        </span>
      </div>

      {/* Songs drop zone */}
      <div
        ref={setNodeRef}
        style={{
          minHeight: setlist.songs.length === 0 ? 72 : 'auto',
          border: isOver ? '1px dashed rgba(255,61,110,0.5)' : '1px dashed transparent',
          background: isOver ? 'rgba(255,61,110,0.05)' : 'transparent',
          margin: 4,
          transition: 'all 0.15s ease',
        }}
      >
        {setlist.songs.length === 0 ? (
          <div className="flex items-center justify-center text-sm" style={{ height: 72, color: isOver ? '#ff3d6e' : '#555', fontFamily: 'var(--font-body)' }}>
            {isOver ? '↓ Drop here' : 'Drag songs here · or double-click a song'}
          </div>
        ) : (
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {setlist.songs.map((item, index) => (
              <SetlistSongRow
                key={item.instanceId}
                item={item}
                index={index}
                onRemove={() => onRemoveSong(item.instanceId)}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
