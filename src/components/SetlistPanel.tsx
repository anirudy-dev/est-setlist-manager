'use client';
import { useState, useRef, type CSSProperties } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Setlist, SetlistSong, Song, MiniSet } from '@/types';
import { banterPositionLabel } from '@/types';
import { formatDuration, formatTotalDuration } from '@/data/songs';
import SongRowPopover from './SongRowPopover';

function SetlistSongRow({
  item, index, onRemove, onDragStart, onDragOver, onDrop, onOpenSettings, allSongs, previousMiniSet,
}: {
  item: SetlistSong; index: number; onRemove: () => void;
  onDragStart: (index: number) => void; onDragOver: (index: number) => void; onDrop: (toIndex: number) => void;
  onOpenSettings: (anchor: DOMRect) => void; allSongs: Song[]; previousMiniSet: MiniSet | null | undefined;
}) {
  const [isOver, setIsOver] = useState(false);
  const [hover, setHover] = useState(false);
  const song = allSongs.find(s => s.id === item.songId);
  if (!song) return null;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px 6px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--brand-teal)', textTransform: 'uppercase' }}>Mini-set {miniSet}</span>
          <span style={{ flex: 1, height: 1, background: 'rgba(47, 176, 123, 0.18)' }} />
        </div>
      )}

      <div
        draggable
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(index)); onDragStart(index); }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsOver(true); onDragOver(index); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(index); }}
        onDragEnd={() => setIsOver(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-sm)', borderTop: isOver ? '2px solid var(--brand-pink)' : '2px solid transparent', cursor: 'grab', userSelect: 'none', background: hover ? 'var(--bg-subtle)' : 'transparent', transition: 'background 0.12s, border-top 0.1s' }}
      >
        <span style={{ color: 'var(--ink-3)', fontSize: 12, fontWeight: 500, width: 18, textAlign: 'right', flexShrink: 0 }}>{index + 1}</span>
        <span style={{ color: 'var(--ink-4)', fontSize: 13, flexShrink: 0, opacity: hover ? 1 : 0.4, transition: 'opacity 0.15s' }}>⣿</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--ink-1)', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{song.artist}</span>
            {miniSet && <span style={miniSetChipStyle}>Mini-set {miniSet}</span>}
            {item.banter_slot && (<span style={banterChipStyle}>Banter · {banterPositionLabel(item.banter_slot.position)} · {item.banter_slot.duration_seconds}s</span>)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ background: song.moodColor + '18', color: song.moodColor, border: `0.5px solid ${song.moodColor}33`, fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 500 }}>{song.mood}</span>
          <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{formatDuration(song.duration)}</span>
        </div>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={handleSettingsClick}
          title="Edit mini-set or banter"
          style={editPillStyle}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--ink-1)'; e.currentTarget.style.borderColor = 'var(--border-medium)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--ink-2)'; e.currentTarget.style.borderColor = 'var(--border-soft)'; }}
        >✎ Edit</button>
        <button onMouseDown={e => e.stopPropagation()} onClick={onRemove} title="Remove song" style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 18, flexShrink: 0, padding: '0 4px', lineHeight: 1, transition: 'color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-pink)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-4)')}>×</button>
      </div>
    </>
  );
}

interface SetlistPanelProps {
  setlist: Setlist; isActive: boolean; onActivate: () => void;
  onRename: (name: string) => void; onDelete: () => void;
  onRemoveSong: (instanceId: string) => void;
  onReorder: (setlistId: string, fromIndex: number, toIndex: number) => void;
  onUpdateSong: (setlistId: string, instanceId: string, patch: Partial<SetlistSong>) => void;
  onExport: (setlist: Setlist) => void; onPrint: (setlist: Setlist) => void;
  gigName: string; gigDate: string; gigVenue: string; allSongs: Song[];
}

export default function SetlistPanel({
  setlist, isActive, onActivate, onRename, onDelete, onRemoveSong, onReorder, onUpdateSong, onExport, onPrint, allSongs,
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
    const dur = s?.duration ?? 0;
    return acc + (Number.isFinite(dur) && dur > 0 && dur <= 3600 ? dur : 0);
  }, 0);

  const submitRename = () => { if (newName.trim()) onRename(newName.trim()); setRenaming(false); };
  const handleDragStart = (index: number) => { dragFromIndex.current = index; };
  const handleDrop = (toIndex: number) => {
    const from = dragFromIndex.current;
    if (from === -1 || from === toIndex) return;
    onReorder(setlist.id, from, toIndex);
    dragFromIndex.current = -1;
  };

  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: isActive ? '0.5px solid rgba(233, 78, 119, 0.35)' : '0.5px solid var(--border-soft)', boxShadow: isActive ? '0 4px 16px rgba(233, 78, 119, 0.08), var(--shadow-sm)' : 'var(--shadow-sm)', marginBottom: 14, overflow: 'hidden', transition: 'box-shadow 0.15s, border-color 0.15s' }}>
      <div onClick={onActivate} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', cursor: 'pointer' }}>
        <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setCollapsed(p => !p); }} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 11, padding: 0, flexShrink: 0, width: 16 }}>{collapsed ? '▶' : '▼'}</button>
        {renaming ? (
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onBlur={submitRename} onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenaming(false); }} onClick={e => e.stopPropagation()} style={{ flex: 1, background: 'var(--bg-app)', border: '0.5px solid var(--brand-pink)', color: 'var(--ink-1)', padding: '6px 10px', fontSize: 14, outline: 'none', borderRadius: 'var(--radius-sm)' }} />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{setlist.name}</span>
            {isActive && !collapsed && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--brand-teal)', background: 'rgba(47, 176, 123, 0.1)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-teal)' }} />Active
              </span>
            )}
          </div>
        )}
        {collapsed && (<span style={{ color: 'var(--ink-3)', fontSize: 12, flexShrink: 0 }}>{setlist.songs.length} songs · {formatTotalDuration(totalSecs)}</span>)}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <button onClick={() => setRenaming(true)} style={headerBtn} title="Rename">Rename</button>
          <button onClick={() => onExport(setlist)} style={headerBtn} title="Export PDF">PDF</button>
          <button onClick={() => onPrint(setlist)} style={headerBtn} title="Print">Print</button>
          {confirmDelete ? (
            <>
              <button onClick={() => { onDelete(); setConfirmDelete(false); }} style={{ ...headerBtn, background: 'var(--brand-pink)', color: '#fff', border: 'none' }}>Confirm</button>
              <button onClick={() => setConfirmDelete(false)} style={headerBtn}>Cancel</button>
            </>
          ) : (<button onClick={() => setConfirmDelete(true)} style={headerBtn} title="Delete setlist">Delete</button>)}
        </div>
      </div>
      {!collapsed && (
        <div style={{ padding: '0 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{setlist.songs.length} {setlist.songs.length === 1 ? 'song' : 'songs'}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--brand-pink)', letterSpacing: '-0.01em' }}>{formatTotalDuration(totalSecs)}</span>
        </div>
      )}
      {!collapsed && (
        <div ref={setNodeRef} style={{ minHeight: setlist.songs.length === 0 ? 88 : undefined, margin: '0 8px 8px', padding: 4, borderRadius: 'var(--radius-md)', border: isDropOver ? '1.5px dashed rgba(233, 78, 119, 0.45)' : '1.5px dashed transparent', background: isDropOver ? 'rgba(233, 78, 119, 0.04)' : 'transparent', transition: 'border 0.15s, background 0.15s' }}>
          {setlist.songs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 80, color: 'var(--ink-3)', fontSize: 13, padding: 16, textAlign: 'center', gap: 4 }}>
              {isDropOver ? (<span style={{ color: 'var(--brand-pink)', fontWeight: 600 }}>Drop the song here</span>) : (<><span style={{ fontSize: 22, opacity: 0.4 }}>♪</span><span>Drag a song here, or tap <strong style={{ color: 'var(--ink-2)' }}>+</strong> on any song.</span></>)}
            </div>
          ) : (
            setlist.songs.map((item, index) => (
              <SetlistSongRow key={item.instanceId} item={item} index={index} onRemove={() => onRemoveSong(item.instanceId)} onDragStart={handleDragStart} onDragOver={() => {}} onDrop={handleDrop} onOpenSettings={(rect) => setPopover({ song: item, rect })} allSongs={allSongs} previousMiniSet={index === 0 ? null : setlist.songs[index - 1].mini_set ?? null} />
            ))
          )}
        </div>
      )}
      {popover && (<SongRowPopover song={popover.song} anchorRect={popover.rect} onClose={() => setPopover(null)} onSave={(patch) => onUpdateSong(setlist.id, popover.song.instanceId, patch)} />)}
    </div>
  );
}

const headerBtn: CSSProperties = { background: 'var(--bg-surface)', border: '0.5px solid var(--border-soft)', color: 'var(--ink-2)', borderRadius: 'var(--radius-pill)', padding: '5px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s, color 0.15s, border-color 0.15s' };
const editPillStyle: CSSProperties = { background: 'var(--bg-surface)', border: '0.5px solid var(--border-soft)', color: 'var(--ink-2)', borderRadius: 'var(--radius-pill)', padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s, color 0.15s, border-color 0.15s' };
const miniSetChipStyle: CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: 'rgba(47, 176, 123, 0.1)', color: 'var(--brand-teal)', border: '0.5px solid rgba(47, 176, 123, 0.25)' };
const banterChipStyle: CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: 'rgba(240, 162, 47, 0.1)', color: 'var(--brand-yellow)', border: '0.5px solid rgba(240, 162, 47, 0.25)' };
