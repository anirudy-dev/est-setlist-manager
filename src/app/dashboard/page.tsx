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
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuid } from 'uuid';

import { Gig, Setlist, SetlistSong } from '@/types';
import { getSongById, formatDuration, formatTotalDuration } from '@/data/songs';
import { getGigs, createGig, updateGig, deleteGig, getSetlistsForGig, createSetlist, updateSetlist, deleteSetlist } from '@/lib/supabase';
import { exportSetlistPDF, printSetlist } from '@/lib/export';

import MasterSongList from '@/components/MasterSongList';
import GigPanel from '@/components/GigPanel';
import SetlistPanel from '@/components/SetlistPanel';

type MobileTab = 'songs' | 'gigs' | 'overview';

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
  const [mobileTab, setMobileTab] = useState<MobileTab>('gigs');

  const selectedGig = gigs.find(g => g.id === selectedGigId) ?? null;
  const gigSetlists = setlists.filter(s => s.gig_id === selectedGigId);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('est-auth')) {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    setLoadingGigs(true);
    getGigs()
      .then(data => { setGigs(data || []); setLoadingGigs(false); })
      .catch(() => { setLoadingGigs(false); });
  }, []);

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

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
    } catch { showToast('Error renaming'); }
  };

  const handleDeleteSetlist = async (id: string) => {
    try {
      await deleteSetlist(id);
      setSetlists(prev => prev.filter(s => s.id !== id));
      if (activeSetlistId === id) setActiveSetlistId(null);
      showToast('Setlist deleted');
    } catch { showToast('Error deleting setlist'); }
  };

  const updateSetlistSongs = useCallback(async (setlistId: string, songs: SetlistSong[]) => {
    setSetlists(prev => prev.map(s => s.id === setlistId ? { ...s, songs } : s));
    try {
      await updateSetlist(setlistId, { songs: songs as unknown[] });
    } catch { showToast('Error saving'); }
  }, []);

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

    for (const sl of setlists) {
      const activeIdx = sl.songs.findIndex(s => s.instanceId === String(active.id));
      const overIdx = sl.songs.findIndex(s => s.instanceId === overId);
      if (activeIdx !== -1 && overIdx !== -1) {
        const reordered = arrayMove(sl.songs, activeIdx, overIdx).map((s, i) => ({ ...s, position: i }));
        updateSetlistSongs(sl.id, reordered);
        return;
      }
    }
  };

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

  const draggingSong = dragSongId ? getSongById(dragSongId) : null;

  // ── Shared setlist column content ─────────────────────────────────────────
  const SetlistsColumn = (
    <div className="flex flex-col h-full">
      <GigPanel
        gigs={gigs}
        selectedGigId={selectedGigId}
        onSelectGig={id => { setSelectedGigId(id); setActiveSetlistId(null); setMobileTab('gigs'); }}
        onCreate={handleCreateGig}
        onUpdate={handleUpdateGig}
        onDelete={handleDeleteGig}
        loading={loadingGigs}
      />

      {selectedGigId && (
        <div className="flex-1 overflow-y-auto p-3">
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
                padding: '5px 12px',
                letterSpacing: '0.1em',
                fontWeight: 'bold',
              }}
            >
              + NEW SET
            </button>
          </div>

          {loadingSetlists ? (
            <div className="text-xs text-center py-4" style={{ color: '#888', fontFamily: 'var(--font-body)' }}>Loading...</div>
          ) : gigSetlists.length === 0 ? (
            <div className="text-xs text-center py-8" style={{ color: '#888', fontFamily: 'var(--font-body)', lineHeight: 2 }}>
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
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.2em', color: '#333' }}>
              SELECT A GIG
            </div>
            <div className="mt-2 text-sm" style={{ color: '#555', fontFamily: 'var(--font-body)' }}>
              or create a new one above
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Overview column ────────────────────────────────────────────────────────
  const OverviewColumn = (
    <div className="p-4 overflow-y-auto h-full">
      {!selectedGigId ? (
        <div className="flex flex-col items-center justify-center h-full text-center gap-6">
          <Image src="/logo.png" alt="EST" width={200} height={200} className="opacity-10 w-40 h-auto" />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: '0.15em', color: '#222' }}>
              EVERY SECOND TUESDAY
            </div>
            <div className="mt-2 text-sm" style={{ color: '#333', fontFamily: 'var(--font-body)' }}>
              45 songs · 5 decades · 1 loud night
            </div>
          </div>
          <div className="text-sm" style={{ color: '#444', fontFamily: 'var(--font-body)', lineHeight: 2 }}>
            1. Create a gig<br />
            2. Add setlists<br />
            3. Drag songs in<br />
            4. Export or print
          </div>
        </div>
      ) : selectedGig ? (
        <div>
          <div className="mb-5">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '0.1em', color: '#fff' }}>
              {selectedGig.name.toUpperCase()}
            </div>
            {(selectedGig.date || selectedGig.venue) && (
              <div className="mt-1 text-sm" style={{ color: '#aaa', fontFamily: 'var(--font-body)' }}>
                {[selectedGig.date, selectedGig.venue].filter(Boolean).join(' · ')}
              </div>
            )}
            {selectedGig.notes && (
              <div className="mt-3 text-sm p-3" style={{ background: '#111', color: '#aaa', fontFamily: 'var(--font-body)', borderLeft: '2px solid #333', lineHeight: 1.6 }}>
                {selectedGig.notes}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <div className="p-4" style={{ background: '#111', border: '1px solid #222' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: '#fff' }}>{gigSetlists.length}</div>
              <div className="text-xs uppercase tracking-widest mt-1" style={{ color: '#aaa', fontFamily: 'var(--font-body)' }}>Setlists</div>
            </div>
            <div className="p-4" style={{ background: '#111', border: '1px solid #222' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: '#fff' }}>
                {gigSetlists.reduce((a, s) => a + s.songs.length, 0)}
              </div>
              <div className="text-xs uppercase tracking-widest mt-1" style={{ color: '#aaa', fontFamily: 'var(--font-body)' }}>Total Songs</div>
            </div>
          </div>

          {gigSetlists.map(sl => {
            const secs = sl.songs.reduce((acc, item) => {
              const s = getSongById(item.songId);
              return acc + (s?.duration ?? 0);
            }, 0);
            return (
              <div key={sl.id} className="p-4 mb-3" style={{ background: activeSetlistId === sl.id ? '#1a1a1a' : '#0f0f0f', border: `1px solid ${activeSetlistId === sl.id ? '#333' : '#1e1e1e'}` }}>
                <div className="flex justify-between items-start mb-3">
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', color: activeSetlistId === sl.id ? '#fff' : '#aaa' }}>
                    {sl.name.toUpperCase()}
                  </span>
                  {/* Prominent duration */}
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#ff3d6e', letterSpacing: '0.05em' }}>
                    {formatTotalDuration(secs)}
                  </span>
                </div>
                <div className="text-xs mb-2" style={{ color: '#888', fontFamily: 'var(--font-body)' }}>
                  {sl.songs.length} {sl.songs.length === 1 ? 'song' : 'songs'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {sl.songs.slice(0, 6).map((item, i) => {
                    const s = getSongById(item.songId);
                    return s ? (
                      <span key={item.instanceId} className="text-xs px-2 py-0.5" style={{ background: '#1a1a1a', color: '#aaa', fontFamily: 'var(--font-body)', border: '1px solid #252525' }}>
                        {i + 1}. {s.title}
                      </span>
                    ) : null;
                  })}
                  {sl.songs.length > 6 && (
                    <span className="text-xs px-2 py-0.5" style={{ color: '#666', fontFamily: 'var(--font-body)' }}>+{sl.songs.length - 6} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );

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
          className="flex items-center justify-between px-4 shrink-0 no-print"
          style={{ background: '#0a0a0a', borderBottom: '1px solid #1e1e1e', height: 52 }}
        >
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="EST" width={80} height={80} className="h-8 w-auto" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.12em', color: '#fff' }}>
              SETLIST MANAGER
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-body)', background: 'none', border: '1px solid #2a2a2a', color: '#aaa', cursor: 'pointer', padding: '4px 12px' }}
          >
            Logout
          </button>
        </nav>

        {/* ── DESKTOP: three columns ── */}
        <div className="hidden md:flex flex-1 min-h-0">
          <div className="w-72 shrink-0 flex flex-col min-h-0">
            <MasterSongList activeSetlistId={activeSetlistId} onDoubleClickAdd={addSongToActive} />
          </div>
          <div className="w-80 shrink-0 flex flex-col min-h-0 overflow-y-auto" style={{ borderRight: '1px solid #1e1e1e' }}>
            {SetlistsColumn}
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            {OverviewColumn}
          </div>
        </div>

        {/* ── MOBILE: tab layout ── */}
        <div className="flex md:hidden flex-1 flex-col min-h-0">
          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {mobileTab === 'songs' && (
              <div className="h-full">
                <MasterSongList activeSetlistId={activeSetlistId} onDoubleClickAdd={(id) => { addSongToActive(id); setMobileTab('gigs'); }} />
              </div>
            )}
            {mobileTab === 'gigs' && (
              <div className="h-full overflow-y-auto">
                {SetlistsColumn}
              </div>
            )}
            {mobileTab === 'overview' && (
              <div className="h-full">
                {OverviewColumn}
              </div>
            )}
          </div>

          {/* Bottom tab bar */}
          <div
            className="shrink-0 grid grid-cols-3 no-print"
            style={{ background: '#0a0a0a', borderTop: '1px solid #1e1e1e', height: 56 }}
          >
            {([
              { id: 'songs', label: 'SONGS', icon: '♪' },
              { id: 'gigs', label: 'SETLISTS', icon: '≡' },
              { id: 'overview', label: 'OVERVIEW', icon: '◈' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className="flex flex-col items-center justify-center gap-0.5"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderTop: mobileTab === tab.id ? '2px solid #ff3d6e' : '2px solid transparent',
                  color: mobileTab === tab.id ? '#fff' : '#666',
                }}
              >
                <span style={{ fontSize: '16px' }}>{tab.icon}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.08em' }}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {draggingSong ? (
          <div className="px-3 py-2 text-sm font-bold" style={{ background: '#1a1a1a', border: '1px solid #ff3d6e', color: '#fff', fontFamily: 'var(--font-body)', boxShadow: '0 8px 24px rgba(0,0,0,0.8)', minWidth: 200 }}>
            {draggingSong.title}
            <div className="text-xs font-normal" style={{ color: '#aaa' }}>{draggingSong.artist} · {formatDuration(draggingSong.duration)}</div>
          </div>
        ) : null}
      </DragOverlay>

      {toast && (
        <div
          className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 text-sm no-print"
          style={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff', fontFamily: 'var(--font-body)', zIndex: 9999, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}
        >
          {toast}
        </div>
      )}
    </DndContext>
  );
}
