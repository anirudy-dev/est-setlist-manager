'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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

import { Gig, Setlist, SetlistSong, Song } from '@/types';
import { SONGS, formatDuration } from '@/data/songs';
import {
  getGigs, createGig, updateGig, deleteGig,
  getSetlistsForGig, createSetlist, updateSetlist, deleteSetlist,
  getCustomSongs,
} from '@/lib/supabase';
import { exportSetlistPDF, printSetlist } from '@/lib/export';

import MasterSongList from '@/components/MasterSongList';
import GigPanel from '@/components/GigPanel';
import SetlistPanel from '@/components/SetlistPanel';
import AddSongModal from '@/components/AddSongModal';

type MobileTab = 'songs' | 'gigs' | 'overview';

export default function Dashboard() {
  const router = useRouter();

  // ── Core state ────────────────────────────────────────────────────────────
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [customSongs, setCustomSongs] = useState<Song[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  const [loadingGigs, setLoadingGigs] = useState(true);
  const [loadingSetlists, setLoadingSetlists] = useState(false);
  const [dragSongId, setDragSongId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('gigs');
  const [showAddSong, setShowAddSong] = useState(false);

  // Merged song list — hardcoded + custom, used everywhere
  const allSongs: Song[] = useMemo(() => [...SONGS, ...customSongs], [customSongs]);

  const selectedGig = gigs.find(g => g.id === selectedGigId) ?? null;
  const gigSetlists = setlists.filter(s => s.gig_id === selectedGigId);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('est-auth')) {
      router.push('/');
    }
  }, [router]);

  // ── Load gigs + custom songs on mount ─────────────────────────────────────
  useEffect(() => {
    setLoadingGigs(true);
    Promise.all([getGigs(), getCustomSongs()])
      .then(([gigsData, customData]) => {
        setGigs(gigsData || []);
        const mapped: Song[] = (customData || []).map((s: Record<string, unknown>) => ({
          id: `custom-${s.id}`,
          title: s.title as string,
          artist: s.artist as string,
          decade: s.decade as string,
          year: s.year as number,
          duration: s.duration as number,
          mood: s.mood as string,
          moodColor: s.mood_color as string,
          energy: (s.energy as 'low' | 'medium' | 'high') ?? 'medium',
        }));
        setCustomSongs(mapped);
      })
      .catch(() => {})
      .finally(() => setLoadingGigs(false));
  }, []);

  // ── Reload custom songs after adding a new one ─────────────────────────────
  const reloadCustomSongs = useCallback(async () => {
    try {
      const customData = await getCustomSongs();
      const mapped: Song[] = (customData || []).map((s: Record<string, unknown>) => ({
        id: `custom-${s.id}`,
        title: s.title as string,
        artist: s.artist as string,
        decade: s.decade as string,
        year: s.year as number,
        duration: s.duration as number,
        mood: s.mood as string,
        moodColor: s.mood_color as string,
        energy: (s.energy as 'low' | 'medium' | 'high') ?? 'medium',
      }));
      setCustomSongs(mapped);
    } catch { /* silent */ }
  }, []);

  // ── Load setlists when gig selected ───────────────────────────────────────
  useEffect(() => {
    if (!selectedGigId) { setSetlists([]); return; }
    setLoadingSetlists(true);
    getSetlistsForGig(selectedGigId)
      .then(data => {
        const parsed = (data || []).map((s: Record<string, unknown>) => ({
          ...s,
          songs: Array.isArray(s.songs) ? s.songs : JSON.parse((s.songs as string) || '[]'),
        }));
        setSetlists(parsed as Setlist[]);
        setLoadingSetlists(false);
      })
      .catch(() => setLoadingSetlists(false));
  }, [selectedGigId]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── Gig handlers ───────────────────────────────────────────────────────────
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

  // ── Setlist handlers ───────────────────────────────────────────────────────
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

  // ── Song helpers ───────────────────────────────────────────────────────────
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
    const updated = current.songs
      .filter(s => s.instanceId !== instanceId)
      .map((s, i) => ({ ...s, position: i }));
    updateSetlistSongs(setlistId, updated);
  }, [setlists, updateSetlistSongs]);

  // ── DnD ────────────────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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
      const targetSetlistId = overId.startsWith('setlist-drop-')
        ? overId.replace('setlist-drop-', '')
        : null;
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

  // ── Export / Print ─────────────────────────────────────────────────────────
  const handleExport = (sl: Setlist) => {
    if (!selectedGig) return;
    exportSetlistPDF(sl, selectedGig, allSongs);
  };

  const handlePrint = (sl: Setlist) => {
    if (!selectedGig) return;
    printSetlist(sl, selectedGig, allSongs);
  };

  const handleLogout = () => {
    localStorage.removeItem('est-auth');
    router.push('/');
  };

  const draggingSong = dragSongId ? allSongs.find(s => s.id === dragSongId) : null;

  // ── Shared column: Setlists ────────────────────────────────────────────────
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
                fontFamily: 'var(--font-body)', fontSize: 10,
                background: '#fff', color: '#000', border: 'none',
                cursor: 'pointer', padding: '5px 12px',
                letterSpacing: '0.1em', fontWeight: 'bold',
              }}
            >
              + NEW SET
            </button>
          </div>

          {loadingSetlists ? (
            <div className="text-xs text-center py-4" style={{ color: '#888', fontFamily: 'var(--font-body)' }}>
              Loading...
            </div>
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
                allSongs={allSongs}
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

  // ── Shared column: Overview ────────────────────────────────────────────────
  const OverviewColumn = (
    <div className="p-4 overflow-y-auto h-full">
      {!selectedGigId ? (
        <div className="flex flex-col items-center justify-center h-full text-center gap-6">
          <Image
            src="/est_logo_cropped.png"
            alt="EST"
            width={240}
            height={60}
            className="opacity-10 w-48 h-auto"
            style={{ mixBlendMode: 'lighten' }}
          />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: '0.15em', color: '#222' }}>
              EVERY SECOND TUESDAY
            </div>
            <div className="mt-2 text-sm" style={{ color: '#333', fontFamily: 'var(--font-body)' }}>
              {allSongs.length} songs · 5 decades · 1 loud night
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
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.12em', color: '#fff', marginBottom: 4 }}>
            {selectedGig.name}
          </div>
          {selectedGig.date && (
            <div style={{ color: '#555', fontSize: 12, fontFamily: 'var(--font-body)', marginBottom: 2 }}>{selectedGig.date}</div>
          )}
          {selectedGig.venue && (
            <div style={{ color: '#555', fontSize: 12, fontFamily: 'var(--font-body)', marginBottom: 16 }}>{selectedGig.venue}</div>
          )}
          {selectedGig.notes && (
            <div style={{ color: '#444', fontSize: 12, fontFamily: 'var(--font-body)', marginBottom: 20, lineHeight: 1.6 }}>
              {selectedGig.notes}
            </div>
          )}

          <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 16 }}>
            {gigSetlists.map(sl => {
              const totalSecs = sl.songs.reduce((acc, item) => {
                const s = allSongs.find(song => song.id === item.songId);
                return acc + (s?.duration ?? 0);
              }, 0);
              return (
                <div key={sl.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', color: '#fff' }}>
                      {sl.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', color: '#ff3d6e', fontSize: '1.1rem' }}>
                      {Math.floor(totalSecs / 60)}:{String(totalSecs % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {sl.songs.slice(0, 8).map(item => {
                      const s = allSongs.find(song => song.id === item.songId);
                      return s ? (
                        <span
                          key={item.instanceId}
                          style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 2,
                            background: '#1a1a1a', color: '#666', fontFamily: 'var(--font-body)',
                          }}
                        >
                          {s.title}
                        </span>
                      ) : null;
                    })}
                    {sl.songs.length > 8 && (
                      <span style={{ fontSize: 10, color: '#444', fontFamily: 'var(--font-body)' }}>
                        +{sl.songs.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen" style={{ background: '#0a0a0a', color: '#fff' }}>

        {/* Nav */}
        <nav
          className="flex items-center justify-between px-4 shrink-0 no-print"
          style={{ height: 48, borderBottom: '1px solid #1e1e1e', background: '#080808' }}
        >
          <Image
            src="/logo.png"
            alt="Every Second Tuesday"
            width={160}
            height={40}
            style={{ height: 32, width: 'auto', mixBlendMode: 'lighten' }}
          />
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
          {/* Songs column — wider with Add Song button */}
          <div className="w-80 shrink-0 flex flex-col min-h-0">
            <MasterSongList
              activeSetlistId={activeSetlistId}
              onDoubleClickAdd={addSongToActive}
              customSongs={customSongs}
              onOpenAddSong={() => setShowAddSong(true)}
            />
          </div>
          {/* Gig + Setlists column */}
          <div className="w-96 shrink-0 flex flex-col min-h-0 overflow-y-auto" style={{ borderRight: '1px solid #1e1e1e' }}>
            {SetlistsColumn}
          </div>
          {/* Overview column */}
          <div className="flex-1 flex flex-col min-h-0">
            {OverviewColumn}
          </div>
        </div>

        {/* ── MOBILE: tab layout ── */}
        <div className="flex md:hidden flex-1 flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-hidden">
            {mobileTab === 'songs' && (
              <div className="h-full">
                <MasterSongList
                  activeSetlistId={activeSetlistId}
                  onDoubleClickAdd={id => { addSongToActive(id); setMobileTab('gigs'); }}
                  customSongs={customSongs}
                  onOpenAddSong={() => setShowAddSong(true)}
                />
              </div>
            )}
            {mobileTab === 'gigs' && (
              <div className="h-full overflow-y-auto">{SetlistsColumn}</div>
            )}
            {mobileTab === 'overview' && (
              <div className="h-full">{OverviewColumn}</div>
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
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderTop: mobileTab === tab.id ? '2px solid #ff3d6e' : '2px solid transparent',
                  color: mobileTab === tab.id ? '#fff' : '#666',
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, letterSpacing: '0.08em' }}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggingSong ? (
          <div
            style={{
              background: '#1a1a1a', border: '1px solid #ff3d6e',
              color: '#fff', padding: '8px 12px', minWidth: 200,
              fontFamily: 'var(--font-body)', boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: 13 }}>{draggingSong.title}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
              {draggingSong.artist} · {formatDuration(draggingSong.duration)}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 text-sm no-print"
          style={{
            background: '#1a1a1a', border: '1px solid #333',
            color: '#fff', fontFamily: 'var(--font-body)',
            zIndex: 9999, letterSpacing: '0.05em',
          }}
        >
          {toast}
        </div>
      )}

      {/* Add Song Modal */}
      {showAddSong && (
        <AddSongModal
          onClose={() => setShowAddSong(false)}
          onAdded={reloadCustomSongs}
        />
      )}
    </DndContext>
  );
}
