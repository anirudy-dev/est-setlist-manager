'use client';
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Setlist, SetlistSong, Song } from '@/types';
import { formatDuration, formatTotalDuration } from '@/data/songs';

// ── Sortable song row inside a setlist ────────────────────────────────────────

function SetlistSongRow({
  item,
  index,
  onRemove,
  allSongs,
}: {
  item: SetlistSong;
  index: number;
  onRemove: () => void;
  allSongs: Song[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.instanceId,
  });

  const song = allSongs.find(s => s.id === item.songId);
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
      <span
        className="text-xs tabular-nums shrink-0 w-5 text-right"
        style={{ color: '#444', fontFamily: 'var(--font-body)' }}
      >
        {index + 1}
      </span>
      <span className="text-xs shrink-0" style={{ color: '#333', cursor: 'grab' }}>⠿</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate" style={{ fontFamily: 'var(--font-body)', color: '#fff' }}>
          {song.title}
        </div>
        <div className="text-xs truncate" style={{ color: '#aaa' }}>
          {song.artist}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
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
        <span className="text-xs tabular-nums" style={{ color: '#aaa', fontFamily: 'var(--font-body)' }}>
          {formatDuration(song.duration)}
        </span>
      </div>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={onRemove}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center"
        style={{ color: '#ff3d6e', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

// ── SetlistPanel ──────────────────────────────────────────────────────────────

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
  allSongs: Song[];
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
  allSongs,
}: SetlistPanelProps) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(setlist.name);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `setlist-drop-${setlist.id}`,
    data: { type: 'setlist', setlistId: setlist.id },
  });

  const totalSecs = setlist.songs.reduce((acc, item) => {
    const s = allSongs.find(song => song.id === item.songId);
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
        border: isActive ? '1px solid #2a2a2a' : '1px solid #161616',
        borderRadius: 4,
      }}
    >
      {/* Header */}
      <div
        onClick={onActivate}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid #1a1a1a',
        }}
      >
        {/* Collapse toggle */}
        <button
          onClick={e => { e.stopPropagation(); setCollapsed(p => !p); }}
          style={{
            background: 'none', border: 'none', color: '#555',
            cursor: 'pointer', fontSize: 10, padding: 0, flexShrink: 0,
            fontFamily: 'var(--font-body)',
          }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▶' : '▼'}
        </button>

        {/* Name / rename input */}
        {renaming ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenaming(false); }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, background: '#1a1a1a', border: '1px solid #ff3d6e',
              color: '#fff', padding: '2px 6px', fontSize: 12,
              fontFamily: 'var(--font-body)', outline: 'none', borderRadius: 2,
            }}
          />
        ) : (
          <span
            style={{
              flex: 1, fontFamily: 'var(--font-display)', fontSize: '0.9rem',
              letterSpacing: '0.1em', color: isActive ? '#fff' : '#888',
            }}
          >
            {setlist.name}
          </span>
        )}

        {/* Song count when collapsed */}
        {collapsed && (
          <span style={{ color: '#444', fontSize: 11, fontFamily: 'var(--font-body)', flexShrink: 0 }}>
            {setlist.songs.length} {setlist.songs.length === 1 ? 'song' : 'songs'} · {formatTotalDuration(totalSecs)}
          </span>
        )}

        {/* Active indicator */}
        {isActive && !collapsed && (
          <span style={{ color: '#00e676', fontSize: 10, fontFamily: 'var(--font-body)', flexShrink: 0 }}>
            ● ACTIVE
          </span>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setRenaming(true)}
            style={btnStyle}
            title="Rename"
          >
            ✎
          </button>
          <button
            onClick={() => onExport(setlist)}
            style={btnStyle}
            title="Export PDF"
          >
            PDF
          </button>
          <button
            onClick={() => onPrint(setlist)}
            style={btnStyle}
            title="Print"
          >
            ⎙
          </button>
          {showConfirmDelete ? (
            <>
              <button
                onClick={() => { onDelete(); setShowConfirmDelete(false); }}
                style={{ ...btnStyle, color: '#ff3d6e', borderColor: '#ff3d6e' }}
              >
                ✓
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                style={btnStyle}
              >
                ✕
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              style={btnStyle}
              title="Delete setlist"
            >
              🗑
            </button>
          )}
        </div>
      </div>

      {/* Duration bar — hidden when collapsed */}
      {!collapsed && (
        <div
          style={{
            padding: '4px 10px',
            display: 'flex',
            justifyContent: 'flex-end',
            borderBottom: '1px solid #1a1a1a',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.4rem',
              letterSpacing: '0.08em',
              color: '#ff3d6e',
            }}
          >
            {formatTotalDuration(totalSecs)}
          </span>
        </div>
      )}

      {/* Drop zone + song list — hidden when collapsed */}
      {!collapsed && (
        <div
          ref={setNodeRef}
          style={{
            minHeight: setlist.songs.length === 0 ? 80 : 'auto',
            border: isOver ? '1px dashed rgba(255,61,110,0.4)' : '1px dashed transparent',
            margin: 4,
            transition: 'all 0.15s ease',
          }}
        >
          {setlist.songs.length === 0 ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 80, color: '#333', fontSize: 12, fontFamily: 'var(--font-body)',
              }}
            >
              {isOver ? '↓ Drop here' : 'Drag songs here · or tap + on a song'}
            </div>
          ) : (
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {setlist.songs.map((item, index) => (
                <SetlistSongRow
                  key={item.instanceId}
                  item={item}
                  index={index}
                  onRemove={() => onRemoveSong(item.instanceId)}
                  allSongs={allSongs}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  color: '#888',
  borderRadius: 3,
  padding: '4px 8px',
  fontSize: 11,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  letterSpacing: '0.04em',
};
