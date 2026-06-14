'use client';
import { useState, useRef, type CSSProperties } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Setlist, SetlistSong, Song, MiniSet, BanterSlot } from '@/types';
import { banterPositionLabel } from '@/types';
import { formatDuration, formatTotalDuration } from '@/data/songs';
import SongRowPopover from './SongRowPopover';

function SetlistSongRow({
  item,
  index,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onOpenSettings,
  allSongs,
  previousMiniSet,
}: {
  item: SetlistSong;
  index: number;
  onRemove: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (toIndex: number) => void;
  onOpenSettings: (anchor: DOMRect) => void;
  allSongs: Song[];
  previousMiniSet: MiniSet | null | undefined;
}) {
  const [isOver, setIsOver] = useState(false);
  const song = allSongs.find(s => s.id === item.songId);
  if (!song) return null;

  // Render a small divider when this row starts a new mini-set
  const miniSet = item.mini_set ?? null;
  const startsNewMini = miniSet && miniSet !== (previousMiniSet ?? null);

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onOpenSettings(rect);
  };

  return (
    <>
      {startsNewMini && (
        <div style={{
          padding: '6px 12px 4px',
          fontFamily: 'var(--font-display)',
          fontSize: '0.7rem',
          letterSpacing: '0.18em',
          color: '#4ECDC4',
          borderTop: '1px solid #1a1a1a',
        }}>
          ── Mini-set {miniSet} ──
        </div>
      )}

      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(index));
          onDragStart(index);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setIsOver(true);
          onDragOver(index);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          onDrop(index);
        }}
        onDragEnd={() => setIsOver(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 10px 7px 6px',
          borderBottom: '1px solid rgba(255,255,255,0.03)',
          borderTop: isOver ? '2px solid #ff3d6e' : '2px solid transparent',
          cursor: 'grab',
          userSelect: 'none',
          background: 'transparent',
          transition: 'border-top 0.1s',
        }}
      >
        <span style={{ color: '#2a2a2a', fontSize: 10, width: 18, textAlign: 'right', flexShrink: 0 }}>
          {index + 1}
        </span>

        <span style={{ color: '#444', fontSize: 16, flexShrink: 0, padding: '0 4px' }}>
          ⠿
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {song.title}
          </div>
          <div style={{ color: '#555', fontSize: 11, fontFamily: 'var(--font-body)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{song.artist}</span>
            {miniSet && (
              <span style={miniSetChipStyle}>{miniSet}</span>
            )}
            {item.banter_slot && (
              <span style={banterChipStyle}>
                ◉ {banterPositionLabel(item.banter_slot.position)} · {item.banter_slot.duration_seconds}s
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
          <span style={{ background: song.moodColor + '22', color: song.moodColor, border: `1px solid ${song.moodColor}44`, fontSize: 9, padding: '1px 5px', borderRadius: 2, fontFamily: 'var(--font-body)' }}>
            {song.mood}
          </span>
          <span style={{ color: '#555', fontSize: 11, fontFamily: 'var(--font-body)' }}>
            {formatDuration(song.duration)}
          </span>
        </div>

        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={handleSettingsClick}
          title="Mini-set + banter"
          style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: '0 4px', lineHeight: 1 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ffd93d')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >
          ⚙
        </button>

        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onRemove}
          style={{ background: 'none', border: 'none', color: '#2a2a2a', cursor: 'pointer', fontSize: 18, flexShrink: 0, padding: '0 2px', lineHeight: 1, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ff3d6e')}
          onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
        >
          ×
        </button>
      </div>
    </>
  );
}

interface SetlistPanelProps {
  setlist: Setlist;
  isActive: boolean;
  onActivate: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onRemoveSong: (instanceId: string) => void;
  onReorder: (setlistId: string, fromIndex: number, toIndex: number) => void;
  onUpdateSong: (setlistId: string, instanceId: string, patch: Partial<SetlistSong>) => void;
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
  onReorder,
  onUpdateSong,
  onExport,
  onPrint,
  allSongs,
}: SetlistPanelProps) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(setlist.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [popover, setPopover] = useState<{ song: SetlistSong; rect: DOMRect } | null>(null);
  const dragFromIndex = useRef<number>(-1);

  const { setNodeRef, isOver: isDropOver } = useDroppable({
    id: `setlist-drop-${setlist.id}`,
    data: { type: 'setlist', setlistId: setlist.id },
    disabled: setlist.songs.length > 0,
  });

  const totalSecs = setlist.songs.reduce((acc, item) => {
    const s = allSongs.find(song => song.id === item.songId);
    return acc + (s?.duration ?? 0);
  }, 0);

  const submitRename = () => {
    if (newName.trim()) onRename(newName.trim());
    setRenaming(false);
  };

  const handleDragStart = (index: number) => {
    dragFromIndex.current = index;
  };

  const handleDrop = (toIndex: number) => {
    const from = dragFromIndex.current;
    if (from === -1 || from === toIndex) return;
    onReorder(setlist.id, from, toIndex);
    dragFromIndex.current = -1;
  };

  return (
    <div style={{ background: isActive ? '#131313' : '#0b0b0b', border: isActive ? '1px solid #2a2a2a' : '1px solid #161616', borderRadius: 4, marginBottom: 10 }}>

      {/* Header */}
      <div
        onClick={onActivate}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid #1a1a1a' }}
      >
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setCollapsed(p => !p); }}
          style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 9, padding: 0, flexShrink: 0 }}
        >
          {collapsed ? '▶' : '▼'}
        </button>

        {renaming ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenaming(false); }}
            onClick={e => e.stopPropagation()}
            style={{ flex: 1, background: '#1a1a1a', border: '1px solid #ff3d6e', color: '#fff', padding: '2px 6px', fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', borderRadius: 2 }}
          />
        ) : (
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.1em', color: isActive ? '#fff' : '#666' }}>
            {setlist.name}
          </span>
        )}

        {collapsed && (
          <span style={{ color: '#333', fontSize: 11, fontFamily: 'var(--font-body)', flexShrink: 0 }}>
            {setlist.songs.length} songs · {formatTotalDuration(totalSecs)}
          </span>
        )}

        {isActive && !collapsed && (
          <span style={{ color: '#00e676', fontSize: 9, fontFamily: 'var(--font-body)', flexShrink: 0 }}>● ACTIVE</span>
        )}

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <button onClick={() => setRenaming(true)} style={btn}>✎</button>
          <button onClick={() => onExport(setlist)} style={btn}>PDF</button>
          <button onClick={() => onPrint(setlist)} style={btn}>⎙</button>
          {confirmDelete ? (
            <>
              <button onClick={() => { onDelete(); setConfirmDelete(false); }} style={{ ...btn, color: '#ff3d6e', borderColor: '#ff3d6e' }}>✓</button>
              <button onClick={() => setConfirmDelete(false)} style={btn}>✕</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={btn}>🗑</button>
          )}
        </div>
      </div>

      {/* Duration */}
      {!collapsed && (
        <div style={{ padding: '4px 12px', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid #1a1a1a' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.08em', color: '#ff3d6e' }}>
            {formatTotalDuration(totalSecs)}
          </span>
        </div>
      )}

      {/* Song list */}
      {!collapsed && (
        <div
          ref={setNodeRef}
          style={{
            minHeight: setlist.songs.length === 0 ? 72 : undefined,
            border: isDropOver ? '1px dashed rgba(255,61,110,0.5)' : '1px dashed transparent',
            margin: 4, borderRadius: 3, transition: 'border 0.15s',
          }}
        >
          {setlist.songs.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72, color: '#2a2a2a', fontSize: 12, fontFamily: 'var(--font-body)' }}>
              {isDropOver ? '↓ Drop here' : 'Drag songs here · or tap + on a song'}
            </div>
          ) : (
            setlist.songs.map((item, index) => (
              <SetlistSongRow
                key={item.instanceId}
                item={item}
                index={index}
                onRemove={() => onRemoveSong(item.instanceId)}
                onDragStart={handleDragStart}
                onDragOver={() => {}}
                onDrop={handleDrop}
                onOpenSettings={(rect) => setPopover({ song: item, rect })}
                allSongs={allSongs}
                previousMiniSet={index === 0 ? null : setlist.songs[index - 1].mini_set ?? null}
              />
            ))
          )}
        </div>
      )}

      {popover && (
        <SongRowPopover
          song={popover.song}
          anchorRect={popover.rect}
          onClose={() => setPopover(null)}
          onSave={(patch) => onUpdateSong(setlist.id, popover.song.instanceId, patch)}
        />
      )}
    </div>
  );
}

const btn: CSSProperties = {
  background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#777',
  borderRadius: 3, padding: '5px 9px', fontSize: 11,
  fontFamily: 'var(--font-body)', cursor: 'pointer', letterSpacing: '0.04em',
};

const miniSetChipStyle: CSSProperties = {
  fontSize: 9, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  padding: '1px 5px', borderRadius: 6,
  background: 'rgba(78,205,196,0.1)', color: '#4ECDC4',
  border: '0.5px solid rgba(78,205,196,0.3)',
  letterSpacing: '0.06em',
};

const banterChipStyle: CSSProperties = {
  fontSize: 9, fontFamily: 'var(--font-body)',
  padding: '1px 5px', borderRadius: 6,
  background: 'rgba(255,217,61,0.08)', color: '#ffd93d',
  border: '0.5px solid rgba(255,217,61,0.3)',
  letterSpacing: '0.04em', textTransform: 'uppercase',
};
