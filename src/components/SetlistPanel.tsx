'use client';
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Setlist, SetlistSong, Song } from '@/types';
import { formatDuration, formatTotalDuration } from '@/data/songs';

// ── Sortable song row ─────────────────────────────────────────────────────────

function SetlistSongRow({
  item,
  index,
  setlistId,
  onRemove,
  allSongs,
}: {
  item: SetlistSong;
  index: number;
  setlistId: string;
  onRemove: () => void;
  allSongs: Song[];
}) {
  // setActivatorNodeRef makes ONLY the drag handle trigger dragging
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.instanceId,
    data: { type: 'setlist-song', setlistId },
  });

  const song = allSongs.find(s => s.id === item.songId);
  if (!song) return null;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px 8px 8px',
        background: isDragging ? '#1a1a1a' : 'transparent',
      }}
    >
      {/* Index */}
      <span style={{
        color: '#3a3a3a', fontSize: 11, fontFamily: 'var(--font-body)',
        width: 18, textAlign: 'right', flexShrink: 0, userSelect: 'none',
      }}>
        {index + 1}
      </span>

      {/* Drag handle — this is the ONLY element that triggers dragging */}
      <span
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        style={{
          color: '#2a2a2a', cursor: 'grab', fontSize: 14, flexShrink: 0,
          userSelect: 'none', touchAction: 'none', padding: '0 2px',
        }}
        title="Drag to reorder"
      >
        ⠿
      </span>

      {/* Song info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-body)', color: '#fff', fontSize: 13,
          fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {song.title}
        </div>
        <div style={{
          color: '#555', fontSize: 11, fontFamily: 'var(--font-body)', marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {song.artist}
        </div>
      </div>

      {/* Mood + duration */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <span style={{
          background: song.moodColor + '22', color: song.moodColor,
          border: `1px solid ${song.moodColor}44`,
          fontSize: 9, padding: '1px 5px', borderRadius: 2, fontFamily: 'var(--font-body)',
        }}>
          {song.mood}
        </span>
        <span style={{ color: '#555', fontSize: 11, fontFamily: 'var(--font-body)' }}>
          {formatDuration(song.duration)}
        </span>
      </div>

      {/* Remove — stopPropagation prevents accidental drag trigger */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', color: '#2a2a2a', cursor: 'pointer',
          fontSize: 18, flexShrink: 0, padding: '0 2px', lineHeight: 1,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#ff3d6e')}
        onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
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

  const handleRenameSubmit = () => {
    if (newName.trim()) onRename(newName.trim());
    setRenaming(false);
  };

  return (
    <div style={{
      background: isActive ? '#131313' : '#0b0b0b',
      border: isActive ? '1px solid #2a2a2a' : '1px solid #151515',
      borderRadius: 4,
      marginBottom: 10,
    }}>
      {/* Header */}
      <div
        onClick={onActivate}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 10px', cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid #1a1a1a',
        }}
      >
        {/* Collapse toggle */}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setCollapsed(p => !p); }}
          style={{
            background: 'none', border: 'none', color: '#444', cursor: 'pointer',
            fontSize: 9, padding: 0, flexShrink: 0, fontFamily: 'var(--font-body)',
          }}
        >
          {collapsed ? '▶' : '▼'}
        </button>

        {/* Name or rename input */}
        {renaming ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') setRenaming(false);
            }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, background: '#1a1a1a', border: '1px solid #ff3d6e',
              color: '#fff', padding: '2px 6px', fontSize: 12,
              fontFamily: 'var(--font-body)', outline: 'none', borderRadius: 2,
            }}
          />
        ) : (
          <span style={{
            flex: 1, fontFamily: 'var(--font-display)', fontSize: '0.9rem',
            letterSpacing: '0.1em', color: isActive ? '#fff' : '#666',
          }}>
            {setlist.name}
          </span>
        )}

        {/* Summary when collapsed */}
        {collapsed && (
          <span style={{ color: '#3a3a3a', fontSize: 11, fontFamily: 'var(--font-body)', flexShrink: 0 }}>
            {setlist.songs.length} songs · {formatTotalDuration(totalSecs)}
          </span>
        )}

        {/* Active pill */}
        {isActive && !collapsed && (
          <span style={{ color: '#00e676', fontSize: 9, fontFamily: 'var(--font-body)', flexShrink: 0 }}>
            ● ACTIVE
          </span>
        )}

        {/* Action buttons */}
        <div
          style={{ display: 'flex', gap: 4, flexShrink: 0 }}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => setRenaming(true)} style={btn}>✎</button>
          <button onClick={() => onExport(setlist)} style={btn}>PDF</button>
          <button onClick={() => onPrint(setlist)} style={btn}>⎙</button>
          {showConfirmDelete ? (
            <>
              <button onClick={() => { onDelete(); setShowConfirmDelete(false); }} style={{ ...btn, color: '#ff3d6e', borderColor: '#ff3d6e' }}>✓</button>
              <button onClick={() => setShowConfirmDelete(false)} style={btn}>✕</button>
            </>
          ) : (
            <button onClick={() => setShowConfirmDelete(true)} style={btn} title="Delete">🗑</button>
          )}
        </div>
      </div>

      {/* Duration */}
      {!collapsed && (
        <div style={{
          padding: '4px 12px', display: 'flex', justifyContent: 'flex-end',
          borderBottom: '1px solid #1a1a1a',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.08em', color: '#ff3d6e' }}>
            {formatTotalDuration(totalSecs)}
          </span>
        </div>
      )}

      {/* Drop zone + song list */}
      {!collapsed && (
        <div
          ref={setNodeRef}
          style={{
            minHeight: setlist.songs.length === 0 ? 72 : undefined,
            border: isOver ? '1px dashed rgba(255,61,110,0.5)' : '1px dashed transparent',
            margin: 4,
            borderRadius: 3,
            transition: 'border 0.15s ease',
          }}
        >
          {setlist.songs.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 72, color: '#2a2a2a', fontSize: 12, fontFamily: 'var(--font-body)',
            }}>
              {isOver ? '↓ Drop here' : 'Drag songs here · or tap + on a song'}
            </div>
          ) : (
            <SortableContext items={setlist.songs.map(s => s.instanceId)} strategy={verticalListSortingStrategy}>
              {setlist.songs.map((item, index) => (
                <SetlistSongRow
                  key={item.instanceId}
                  item={item}
                  index={index}
                  setlistId={setlist.id}
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

const btn: React.CSSProperties = {
  background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#777',
  borderRadius: 3, padding: '5px 9px', fontSize: 11,
  fontFamily: 'var(--font-body)', cursor: 'pointer', letterSpacing: '0.04em',
};
