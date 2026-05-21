'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuid } from 'uuid';

import { Gig, Setlist, SetlistSong } from '@/types';
import { getSongById, formatDuration } from '@/data/songs';
import { getGigs, createGig, updateGig, deleteGig, getSetlistsForGig, createSetlist, updateSetlist, deleteSetlist } from '@/lib/supabase';
import { exportSetlistPDF, printSetlist } from '@/lib/export';

import MasterSongList from '@/components/MasterSongList';
import GigPanel from '@/components/GigPanel';
import SetlistPanel from '@/components/SetlistPanel';

export default function Dashboard() {
  const router = useRouter();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  const [loadingGigs, setLoadingGigs] = useState(true);
  const [loadingSetlists, setLoadingSetlists] = useState(false);
  const [dragSongId, setDragSongId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selectedGig = gigs.find(g => g.id === selectedGigId) ?? null;
  const gigSetlists = setlists.filter(s => s.gig_id === selectedGigId);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('est-auth')) {
      router.push('/');
    }
  }, [router]);

  // ── Load gigs ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingGigs(true);
    getGigs()
      .then(data => { setGigs(data || []); setLoadingGigs(false); })
      .catch(() => { setLoadingGigs(false); });
  }, []);

  // ── Load setlists when gig selected ───────────────────────────────────────
  useEffect(() => {
    if (!selectedGigId) { setSetlists([]); return; }
    setLoadingSetlists(true);
    getSetlistsForGig(selectedGigId)
      .then(data => {
        const parsed = (data || []).map((s: any) => ({
          ...s,
          songs: Array.isArray(s.songs) ? s.songs : JSON.parse(s.songs || '[]'),
        }));
        setSetlists(parsed);
        setLoadingSetlists(false);
      })
      .catch(() => setLoadingSetlists(false));
  }, [selectedGigId]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── Gig actions ────────────────────────────────────────────────────────────
  const handleCreateGig = async (name: string, date: string, venue: string, notes: string) => {
    try {
      const gig = await createGig({ name, date, venue, notes });
      setGigs(prev => [gig, ...prev]);
      setSelectedGigId(gig.id);
      showToast('Gig created!');
    } catch { showToast('Error creating gig'); }
  };

  const handleUpdateGig = async (id: string, name: string, date: string, venue: string, notes: string) => {
    try {
      const gig = await updateGig(id, { name, date, venue, notes });
      setGigs(prev => prev.map(g => g.id === id ? gig : g));
      showToast('Gig updated!');
    } catch { showToast('Error updating gig'); }
  };

  const handleDeleteGig = async (id: string) => {
    try {
      await deleteGig(id);
      setGigs(prev => prev.filter(g => g.id !== id));
      if (selectedGigId === id) { setSelectedGigId(null); setSetlists([]); }
      showToast('Gig deleted');
    } catch { showToast('Error deleting gig'); }
  };

  // ── Setlist actions ────────────────────────────────────────────────────────
  const handleCreateSetlist = async () => {
    if (!selectedGigId) return;
    const name = `Set ${gigSetlists.length + 1}`;
    try {
      const sl = await createSetlist({ gig_id: selectedGigId, name, order_num: gigSetlists.length });
      const parsed = { ...sl, songs: [] };
      setSetlists(prev => [...prev, parsed]);
      setActiveSetlistId(parsed.id);
      showToast('Setlist created!');
    } catch { showToast('Error creating setlist'); }
  };

  const handleRenameSetlist = async (id: string, name: string) => {
    try {
      await updateSetlist(id, { name });
      setSetlists(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    } catch { showToast('Error renaming setlist'); }
  };

  const handleDeleteSetlist = async (id: string) => {
    try {
      await deleteSetlist(id);
      setSetlists(prev => prev.filter(s => s.id !== id));
      if (activeSetlistId === id) setActiveSetlistId(null);
      showToast('Setlist deleted');
    } catch { showToast('Error deleting setlist'); }
  };

  // ── Update songs in setlist (optimistic + persist) ─────────────────────────
  const updateSetlistSongs = useCallback(async (setlistId: string, songs: SetlistSong[]) => {
    setSetlists(prev => prev.map(s => s.id === setlistId ? { ...s, songs } : s));
    try {
      await updateSetlist(setlistId, { songs: songs as unknown[] });
    } catch { showToast('Error saving'); }
  }, []);

  // ── Add song to active setlist ─────────────────────────────────────────────
  const addSongToActive = useCallback((songId: string) => {
    if (!activeSetlistId) return;
    const current = setlists.find(s => s.id === activeSetlistId);
    if (!current) return;
    const newItem: SetlistSong = { instanceId: uuid(), songId, position: current.songs.length };
    updateSetlistSongs(activeSetlistId, [...current.songs, newItem]);
    showToast('Song added!');
  }, [activeSetlistId, setlists, updateSetlistSongs]);

  const handleRemoveSong = useCallback((setlistId: string, instanceId: string) => {
    const current = setlists.find(s => s.id === setlistId);
    if (!current) return;
    const updated = current.songs.filter(s => s.instanceId !== instanceId).map((s, i) => ({ ...s, position: i }));
    updateSetlistSongs(setlistId, updated);
  }, [setlists, updateSetlistSongs]);

  // ── DnD sensors ────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'master') setDragSongId(data.songId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragSongId(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overId = String(over.id);

    // Dropped from master list onto a setlist drop zone
    if (activeData?.type === 'master') {
      const targetSetlistId = overId.startsWith('setlist-drop-') ? overId.replace('setlist-drop-', '') : null;
      const resolvedId = targetSetlistId ?? activeSetlistId;
      if (resolvedId) {
        const current = setlists.find(s => s.id === resolvedId);
        if (!current) return;
        const newItem: SetlistSong = { instanceId: uuid(), songId: activeData.songId, position: current.songs.length };
        updateSetlistSongs(resolvedId, [...current.songs, newItem]);
        showToast('Song added!');
      }
      return;
    }

    // Reordering within a setlist
    if (activeData?.type === 'sortable' || active.data.current) {
      // Find which setlist owns this item
      for (const sl of setlists) {
        const activeIdx = sl.songs.findIndex(s => s.instanceId === String(active.id));
        const overIdx = sl.songs.findIndex(s => s.instanceId === overId);
        if (activeIdx !== -1 && overIdx !== -1) {
          const reordered = arrayMove(sl.songs, activeIdx, overIdx).map((s, i) => ({ ...s, position: i }));
          updateSetlistSongs(sl.id, reordered);
          return;
        }
      }
    }
  };

  // ── Export / Print ─────────────────────────────────────────────────────────
  const handleExport = (sl: Setlist) => {
    if (!selectedGig) return;
    exportSetlistPDF(sl, selectedGig);
  };

  const handlePrint = (sl: Setlist) => {
    if (!selectedGig) return;
    printSetlist(sl, selectedGig);
  };

  const handleLogout = () => {
    localStorage.removeItem('est-auth');
    router.push('/');
  };

  // ── Drag overlay song ──────────────────────────────────────────────────────
  const draggingSong = dragSongId ? getSongById(dragSongId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#080808' }}>

        {/* Top nav */}
        <nav
          className="flex items-center justify-between px-4 py-2 no-print shrink-0"
          style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', height: 52 }}
        >
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="EST" width={36} height={36} className="rounded-sm" />
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.12em', color: '#fff' }}>
                SETLIST MANAGER
              </span>
              <span className="hidden md:inline ml-2 text-xs" style={{ color: '#444', fontFamily: 'var(--font-body)' }}>
                · Every Second Tuesday
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-body)', background: 'none', border: '1px solid #222', color: '#555', cursor: 'pointer', padding: '4px 12px' }}
          >
            Logout
          </button>
        </nav>

        {/* Three-column layout */}
        <div className="flex flex-1 min-h-0">

          {/* Left: Song catalogue */}
          <div className="w-72 shrink-0 flex flex-col min-h-0 no-print">
            <MasterSongList
              activeSetlistId={activeSetlistId}
              onDoubleClickAdd={addSongToActive}
            />
          </div>

          {/* Center: Gig + Setlists */}
          <div className="w-80 shrink-0 flex flex-col min-h-0 no-print" style={{ borderRight: '1px solid #1e1e1e', overflowY: 'auto' }}>
            <GigPanel
              gigs={gigs}
              selectedGigId={selectedGigId}
              onSelectGig={id => { setSelectedGigId(id); setActiveSetlistId(null); }}
              onCreate={handleCreateGig}
              onUpdate={handleUpdateGig}
              onDelete={handleDeleteGig}
              loading={loadingGigs}
            />

            {/* Setlists section */}
            {selectedGigId && (
              <div className="flex-1 p-3">
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', color: '#fff' }}>
                    SETLISTS
                  </span>
                  <button
                    onClick={handleCreateSetlist}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '10px',
                      background: '#fff',
                      color: '#000',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 10px',
                      letterSpacing: '0.1em',
                    }}
                  >
                    + NEW SET
                  </button>
                </div>

                {loadingSetlists ? (
                  <div className="text-xs text-center py-4" style={{ color: '#444', fontFamily: 'var(--font-body)' }}>Loading...</div>
                ) : gigSetlists.length === 0 ? (
                  <div className="text-xs text-center py-8" style={{ color: '#444', fontFamily: 'var(--font-body)' }}>
                    No setlists yet.<br />Create one above.
                  </div>
                ) : (
                  gigSetlists.map(sl => (
                    <SetlistPanel
                      key={sl.id}
                      setlist={sl}
                      isActive={activeSetlistId === sl.id}
                      onActivate={() => setActiveSetlistId(sl.id)}
                      onRename={name => handleRenameSetlist(sl.id, name)}
                      onDelete={() => handleDeleteSetlist(sl.id)}
                      onRemoveSong={instanceId => handleRemoveSong(sl.id, instanceId)}
                      onExport={handleExport}
                      onPrint={handlePrint}
                      gigName={selectedGig?.name ?? ''}
                      gigDate={selectedGig?.date ?? ''}
                      gigVenue={selectedGig?.venue ?? ''}
                    />
                  ))
                )}
              </div>
            )}

            {!selectedGigId && (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.2em', color: '#222' }}>
                    SELECT A GIG
                  </div>
                  <div className="mt-2 text-xs" style={{ color: '#333', fontFamily: 'var(--font-body)' }}>
                    or create a new one above
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Overview / instructions */}
          <div className="flex-1 flex flex-col min-h-0 p-4 no-print" style={{ overflowY: 'auto' }}>
            {!selectedGigId ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-6">
                <Image src="/logo.png" alt="EST" width={120} height={120} className="opacity-20" />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.15em', color: '#1e1e1e' }}>
                    EVERY SECOND TUESDAY
                  </div>
                  <div className="mt-2 text-xs" style={{ color: '#2a2a2a', fontFamily: 'var(--font-body)' }}>
                    45 songs · 5 decades · 1 loud night
                  </div>
                </div>
                <div className="text-xs" style={{ color: '#2a2a2a', fontFamily: 'var(--font-body)', lineHeight: 1.8 }}>
                  1. Create a gig ←<br />
                  2. Add setlists to the gig<br />
                  3. Drag songs from the catalogue<br />
                  4. Export or print your setlist
                </div>
              </div>
            ) : selectedGig ? (
              <div>
                <div className="mb-4">
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '0.12em', color: '#fff' }}>
                    {selectedGig.name.toUpperCase()}
                  </div>
                  {(selectedGig.date || selectedGig.venue) && (
                    <div className="mt-1 text-xs" style={{ color: '#666', fontFamily: 'var(--font-body)' }}>
                      {[selectedGig.date, selectedGig.venue].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {selectedGig.notes && (
                    <div className="mt-2 text-xs p-3" style={{ background: '#111', color: '#888', fontFamily: 'var(--font-body)', borderLeft: '2px solid #333' }}>
                      {selectedGig.notes}
                    </div>
                  )}
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-3" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#fff' }}>{gigSetlists.length}</div>
                    <div className="text-xs uppercase tracking-widest" style={{ color: '#555', fontFamily: 'var(--font-body)' }}>Setlists</div>
                  </div>
                  <div className="p-3" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#fff' }}>
                      {gigSetlists.reduce((a, s) => a + s.songs.length, 0)}
                    </div>
                    <div className="text-xs uppercase tracking-widest" style={{ color: '#555', fontFamily: 'var(--font-body)' }}>Total Songs</div>
                  </div>
                </div>

                {/* Setlist summaries */}
                {gigSetlists.map(sl => {
                  const secs = sl.songs.reduce((acc, item) => {
                    const s = getSongById(item.songId);
                    return acc + (s?.duration ?? 0);
                  }, 0);
                  const mins = Math.floor(secs / 60);
                  return (
                    <div key={sl.id} className="p-3 mb-2" style={{ background: activeSetlistId === sl.id ? '#1a1a1a' : '#0f0f0f', border: `1px solid ${activeSetlistId === sl.id ? '#333' : '#1a1a1a'}` }}>
                      <div className="flex justify-between items-center mb-2">
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.1em', color: activeSetlistId === sl.id ? '#fff' : '#666' }}>
                          {sl.name.toUpperCase()}
                        </span>
                        <span className="text-xs" style={{ color: '#555', fontFamily: 'var(--font-body)' }}>
                          {sl.songs.length} songs · {mins}m
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {sl.songs.slice(0, 8).map((item, i) => {
                          const s = getSongById(item.songId);
                          return s ? (
                            <span key={item.instanceId} className="text-xs px-1" style={{ background: '#1a1a1a', color: '#666', fontFamily: 'var(--font-body)', border: '1px solid #222' }}>
                              {i + 1}. {s.title}
                            </span>
                          ) : null;
                        })}
                        {sl.songs.length > 8 && (
                          <span className="text-xs px-1" style={{ color: '#444', fontFamily: 'var(--font-body)' }}>+{sl.songs.length - 8} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggingSong ? (
          <div className="px-3 py-2 text-sm font-bold" style={{ background: '#1a1a1a', border: '1px solid #ff3d6e', color: '#fff', fontFamily: 'var(--font-body)', boxShadow: '0 8px 24px rgba(0,0,0,0.8)', minWidth: 200 }}>
            {draggingSong.title}
            <div className="text-xs font-normal" style={{ color: '#888' }}>{draggingSong.artist} · {formatDuration(draggingSong.duration)}</div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 text-sm no-print"
          style={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff', fontFamily: 'var(--font-body)', zIndex: 9999, letterSpacing: '0.05em' }}
        >
          {toast}
        </div>
      )}
    </DndContext>
  );
}
