'use client';
import { useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Setlist, SetlistSong } from '@/types';
import { getSongById, formatDuration, formatTotalDuration } from '@/data/songs';

// ── Sortable song row inside setlist ─────────────────────────────────────────

function SetlistSongRow({
  item,
  index,
  onRemove,
}: {
  item: SetlistSong;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.instanceId,
  });

  const song = getSongById(item.songId);
  if (!song) return null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2 group"
      {...attributes}
      {...listeners}
    >
      {/* Position number */}
      <span className="text-xs tabular-nums shrink-0 w-5 text-right" style={{ color: '#444', fontFamily: 'var(--font-body)' }}>
        {index + 1}
      </span>

      {/* Drag handle */}
      <span className="text-xs shrink-0" style={{ color: '#333', cursor: 'grab' }}>⠿</span>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate" style={{ fontFamily: 'var(--font-body)', color: '#fff' }}>{song.title}</div>
        <div className="text-xs truncate" style={{ color: '#555' }}>{song.artist}</div>
      </div>

      {/* Mood & duration */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className="mood-badge"
          style={{ background: song.moodColor + '22', color: song.moodColor, border: `1px solid ${song.moodColor}44`, fontSize: '9px' }}
        >
          {song.mood}
        </span>
        <span className="text-xs tabular-nums" style={{ color: '#555', fontFamily: 'var(--font-body)' }}>
          {formatDuration(song.duration)}
        </span>
      </div>

      {/* Remove */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={onRemove}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center"
        style={{ color: '#ff3d6e', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

// ── Droppable setlist area ────────────────────────────────────────────────────

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
  setlist,
  isActive,
  onActivate,
  onRename,
  onDelete,
  onRemoveSong,
  onExport,
  onPrint,
  gigName,
  gigDate,
  gigVenue,
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
      className="flex flex-col"
      style={{
        background: isActive ? '#111' : '#0c0c0c',
        border: isActive ? '1px solid #333' : '1px solid #1a1a1a',
        marginBottom: '12px',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        style={{ borderBottom: '1px solid #1e1e1e' }}
        onClick={onActivate}
      >
        {/* Active indicator */}
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#00e676' : '#333', flexShrink: 0, display: 'inline-block' }} />

        {/* Name */}
        {renaming ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenaming(false); }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #ff3d6e',
              color: '#fff',
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              letterSpacing: '0.1em',
              outline: 'none',
            }}
          />
        ) : (
          <span
            style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', color: isActive ? '#fff' : '#888' }}
          >
            {setlist.name}
          </span>
        )}

        {/* Duration badge */}
        <span
          className="text-xs tabular-nums px-2 py-0.5"
          style={{
            fontFamily: 'var(--font-body)',
            background: totalSecs > 0 ? '#1a1a1a' : 'transparent',
            color: '#666',
            border: totalSecs > 0 ? '1px solid #2a2a2a' : 'none',
          }}
        >
          {totalSecs > 0 ? formatTotalDuration(totalSecs) : 'empty'}
        </span>

        {/* Actions */}
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => { setNewName(setlist.name); setRenaming(true); }}
            title="Rename"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: '12px', padding: '2px 4px' }}
          >✎</button>
          <button
            onClick={() => onPrint(setlist)}
            title="Print"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: '11px', padding: '2px 4px', fontFamily: 'var(--font-body)' }}
          >⎙</button>
          <button
            onClick={() => onExport(setlist)}
            title="Export PDF"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: '11px', padding: '2px 4px', fontFamily: 'var(--font-body)' }}
          >PDF</button>
          {!showConfirmDelete ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              title="Delete setlist"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff3d6e44', fontSize: '14px', padding: '2px 4px' }}
            >×</button>
          ) : (
            <span className="flex gap-1 items-center">
              <button
                onClick={() => { onDelete(); setShowConfirmDelete(false); }}
                style={{ background: '#ff3d6e', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '9px', padding: '2px 6px', fontFamily: 'var(--font-body)' }}
              >DEL</button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                style={{ background: 'none', border: '1px solid #333', cursor: 'pointer', color: '#888', fontSize: '9px', padding: '2px 6px', fontFamily: 'var(--font-body)' }}
              >NO</button>
            </span>
          )}
        </div>
      </div>

      {/* Song count info */}
      <div className="flex items-center justify-between px-3 py-1" style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
        <span className="text-xs" style={{ color: '#444', fontFamily: 'var(--font-body)' }}>
          {setlist.songs.length} {setlist.songs.length === 1 ? 'song' : 'songs'}
        </span>
        {isActive && (
          <span className="text-xs" style={{ color: '#00e676', fontFamily: 'var(--font-body)' }}>
            ● ACTIVE
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`min-h-16 ${isOver ? 'drop-zone-active' : ''}`}
        style={{
          minHeight: setlist.songs.length === 0 ? '80px' : 'auto',
          border: isOver ? '1px dashed rgba(255,61,110,0.4)' : '1px dashed transparent',
          margin: '4px',
          transition: 'all 0.15s ease',
        }}
      >
        {setlist.songs.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs" style={{ color: '#333', fontFamily: 'var(--font-body)' }}>
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
