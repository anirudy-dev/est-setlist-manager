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
import { exportSetlistPDF, exportGigPDF, printSetlist } from '@/lib/export';

import MasterSongList from '@/components/MasterSongList';
import GigPanel from '@/components/GigPanel';
import SetlistPanel from '@/components/SetlistPanel';
import AddSongModal from '@/components/AddSongModal';

type MobileTab = 'songs' | 'gigs' | 'overview';

export default function Dashboard() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
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

  const allSongs: Song[] = useMemo(() => [...SONGS, ...customSongs], [customSongs]);
  const selectedGig = gigs.find(g => g.id === selectedGigId) ?? null;
  const gigSetlists = setlists.filter(s => s.gig_id === selectedGigId);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('est-auth')) {
      router.push('/');
    }
  }, [router]);

  // ── Load gigs + custom songs ───────────────────────────────────────────────
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

  // ── Reload custom songs after adding ──────────────────────────────────────
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

  // ── Toast ──────────────────────────────────────────────────────────────────
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

    // ── Case 1: dragging from master song list ─────────────────────────────
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

    // ── Case 2: reordering within a setlist ───────────────────────────────
    // activeData.type === 'setlist-song', activeData.setlistId tells us which list
    if (activeData?.type === 'setlist-song') {
      const setlistId = activeData.setlistId as string;
      const sl = setlists.find(s => s.id === setlistId);
      if (!sl) return;

      const activeIdx = sl.songs.findIndex(s => s.instanceId === String(active.id));
      const overIdx = sl.songs.findIndex(s => s.instanceId === overId);

      if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
        const reordered = arrayMove(sl.songs, activeIdx, overIdx).map((s, i) => ({ ...s, position: i }));
        updateSetlistSongs(sl.id, reordered);
      }
    }
  };

  // ── Export / Print ─────────────────────────────────────────────────────────
  const handleExportSet = (sl: Setlist) => {
    if (!selectedGig) return;
    exportSetlistPDF(sl, selectedGig, allSongs);
  };

  const handleExportGig = async () => {
  if (!selectedGig || gigSetlists.length === 0) return;
  try {
    showToast('Generating PDF...');
    await exportGigPDF(selectedGig, gigSetlists, allSongs);
  } catch (e) {
    console.error('Gig PDF error:', e);
    showToast('Error generating PDF');
  }
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

  // ── Setlists column ────────────────────────────────────────────────────────
  const SetlistsColumn = (
    <div className="flex flex-col h-full">
      <GigPanel
        gigs={gigs}
        selectedGigId={selectedGigId}
        onSelectGig={id => { setSelectedGigId(id); setActiveSetlistId(null); }}
        onCreate={handleCreateGig}
        onUpdate={handleUpdateGig}
        onDelete={handleDeleteGig}
        loading={loadingGigs}
      />

      {selectedGigId && (
        <div className="flex-1 overflow-y-auto p-3">
          {/* Sets header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', color: '#fff' }}>
              SETLISTS
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {gigSetlists.length > 0 && (
                <button
                  onClick={handleExportGig}
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: 10,
                    background: '#1a1a1a', color: '#aaa',
                    border: '1px solid #2a2a2a', cursor: 'pointer',
                    padding: '4px 10px', letterSpacing: '0.08em',
                  }}
                  title="Export full gig as PDF"
                >
                  GIG PDF
                </button>
              )}
              <button
                onClick={handleCreateSetlist}
                style={{
                  fontFamily: 'var(--font-body)', fontSize: 10,
                  background: '#fff', color: '#000', border: 'none',
                  cursor: 'pointer', padding: '4px 10px',
                  letterSpacing: '0.1em', fontWeight: 'bold',
                }}
              >
                + NEW SET
              </button>
            </div>
          </div>

          {loadingSetlists ? (
            <div style={{ color: '#555', fontSize: 12, textAlign: 'center', paddingTop: 24, fontFamily: 'var(--font-body)' }}>
              Loading...
            </div>
          ) : gigSetlists.length === 0 ? (
            <div style={{ color: '#333', fontSize: 12, textAlign: 'center', paddingTop: 32, fontFamily: 'var(--font-body)', lineHeight: 2 }}>
              No setlists yet.<br />Create one above.
            </div>
          ) : (
            <>
              {gigSetlists.map(sl => (
                <SetlistPanel
                  key={sl.id}
                  setlist={sl}
                  isActive={activeSetlistId === sl.id}
                  onActivate={() => setActiveSetlistId(sl.id)}
                  onRename={name => handleRenameSetlist(sl.id, name)}
                  onDelete={() => handleDeleteSetlist(sl.id)}
                  onRemoveSong={instanceId => handleRemoveSong(sl.id, instanceId)}
                  onExport={handleExportSet}
                  onPrint={handlePrint}
                  gigName={selectedGig?.name ?? ''}
                  gigDate={selectedGig?.date ?? ''}
                  gigVenue={selectedGig?.venue ?? ''}
                  allSongs={allSongs}
                />
              ))}

              {/* Total gig length */}
              {(() => {
                const gigTotalSecs = gigSetlists.reduce((acc, sl) =>
                  acc + sl.songs.reduce((a, item) => {
                    const s = allSongs.find(song => song.id === item.songId);
                    return a + (s?.duration ?? 0);
                  }, 0), 0);
                return (
                  <div style={{
                    borderTop: '1px solid #2a2a2a', marginTop: 4, padding: '10px 4px 4px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#444', letterSpacing: '0.08em' }}>
                      TOTAL GIG
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#ff3d6e' }}>
                      {Math.floor(gigTotalSecs / 60)}m {gigTotalSecs % 60}s
                    </span>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {!selectedGigId && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.2em', color: '#2a2a2a' }}>
              SELECT A GIG
            </div>
            <div style={{ color: '#444', fontSize: 12, fontFamily: 'var(--font-body)', marginTop: 6 }}>
              or create a new one above
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Overview column — condensed cheat sheet ────────────────────────────────
  const OverviewColumn = (
    <div style={{ padding: '16px 14px', overflowY: 'auto', height: '100%' }}>
      {!selectedGigId ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: 16 }}>
          <Image
            src="/est_logo_cropped.png"
            alt="EST"
            width={180}
            height={45}
            style={{ width: 140, height: 'auto', mixBlendMode: 'lighten', opacity: 0.08 }}
          />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.15em', color: '#1e1e1e' }}>
            SELECT A GIG TO SEE YOUR CHEAT SHEET
          </div>
        </div>
      ) : (
        <div>
          {/* Gig name */}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.12em', color: '#fff', marginBottom: 2 }}>
            {selectedGig?.name}
          </div>
          {(selectedGig?.date || selectedGig?.venue) && (
            <div style={{ color: '#444', fontSize: 11, fontFamily: 'var(--font-body)', marginBottom: 14 }}>
              {[selectedGig?.date, selectedGig?.venue].filter(Boolean).join(' · ')}
            </div>
          )}

          {gigSetlists.length === 0 ? (
            <div style={{ color: '#2a2a2a', fontSize: 12, fontFamily: 'var(--font-body)', marginTop: 20 }}>
              No setlists yet.
            </div>
          ) : (
            gigSetlists.map((sl, slIndex) => {
              const setTotalSecs = sl.songs.reduce((acc, item) => {
                const s = allSongs.find(song => song.id === item.songId);
                return acc + (s?.duration ?? 0);
              }, 0);

              return (
                <div key={sl.id} style={{ marginBottom: 18 }}>
                  {/* Set header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #1e1e1e', paddingBottom: 4, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: '#888' }}>
                      {sl.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: '#ff3d6e' }}>
                      {Math.floor(setTotalSecs / 60)}m {setTotalSecs % 60}s
                    </span>
                  </div>

                  {/* Song list — just numbers and names */}
                  {sl.songs.length === 0 ? (
                    <div style={{ color: '#2a2a2a', fontSize: 11, fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
                      No songs yet
                    </div>
                  ) : (
                    <div>
                      {sl.songs.map((item, i) => {
                        const song = allSongs.find(s => s.id === item.songId);
                        if (!song) return null;
                        return (
                          <div
                            key={item.instanceId}
                            style={{
                              display: 'flex', alignItems: 'baseline', gap: 8,
                              padding: '3px 0',
                              borderBottom: i < sl.songs.length - 1 ? '1px solid #111' : 'none',
                            }}
                          >
                            <span style={{ color: '#2a2a2a', fontSize: 10, fontFamily: 'var(--font-body)', width: 16, textAlign: 'right', flexShrink: 0 }}>
                              {i + 1}
                            </span>
                            <span style={{ color: '#ccc', fontSize: 12, fontFamily: 'var(--font-body)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {song.title}
                            </span>
                            <span style={{ color: '#333', fontSize: 10, fontFamily: 'var(--font-body)', flexShrink: 0 }}>
                              {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Spacer between sets */}
                  {slIndex < gigSetlists.length - 1 && (
                    <div style={{ height: 8 }} />
                  )}
                </div>
              );
            })
          )}

          {/* Total gig summary */}
          {gigSetlists.length > 0 && (() => {
            const gigTotalSecs = gigSetlists.reduce((acc, sl) =>
              acc + sl.songs.reduce((a, item) => {
                const s = allSongs.find(song => song.id === item.songId);
                return a + (s?.duration ?? 0);
              }, 0), 0);
            const totalSongs = gigSetlists.reduce((a, sl) => a + sl.songs.length, 0);
            return (
              <div style={{ borderTop: '1px solid #1e1e1e', marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ color: '#333', fontSize: 10, fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }}>
                  {totalSongs} SONGS TOTAL
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: '#ff3d6e' }}>
                  {Math.floor(gigTotalSecs / 60)}m {gigTotalSecs % 60}s
                </span>
              </div>
            );
          })()}
        </div>
      )}
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', color: '#fff' }}>

        {/* Nav */}
        <nav style={{ height: 48, borderBottom: '1px solid #1a1a1a', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
          <Image
            src="/logo.png"
            alt="Every Second Tuesday"
            width={160}
            height={40}
            style={{ height: 32, width: 'auto', mixBlendMode: 'lighten' }}
          />
          <button
            onClick={handleLogout}
            style={{ fontFamily: 'var(--font-body)', background: 'none', border: '1px solid #2a2a2a', color: '#666', cursor: 'pointer', padding: '4px 12px', fontSize: 11, letterSpacing: '0.08em' }}
          >
            LOGOUT
          </button>
        </nav>

        {/* ── DESKTOP: three columns ── */}
        <div className="hidden md:flex" style={{ flex: 1, minHeight: 0 }}>
          {/* Songs — narrower */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid #1a1a1a' }}>
            <MasterSongList
              activeSetlistId={activeSetlistId}
              onDoubleClickAdd={addSongToActive}
              customSongs={customSongs}
              onOpenAddSong={() => setShowAddSong(true)}
            />
          </div>
          {/* Setlists — widest */}
          <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', borderRight: '1px solid #1a1a1a' }}>
            {SetlistsColumn}
          </div>
          {/* Overview cheat sheet — takes remaining space */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {OverviewColumn}
          </div>
        </div>

        {/* ── MOBILE: tabs ── */}
        <div className="flex md:hidden" style={{ flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {mobileTab === 'songs' && (
              <div style={{ height: '100%' }}>
                <MasterSongList
                  activeSetlistId={activeSetlistId}
                  onDoubleClickAdd={id => { addSongToActive(id); setMobileTab('gigs'); }}
                  customSongs={customSongs}
                  onOpenAddSong={() => setShowAddSong(true)}
                />
              </div>
            )}
            {mobileTab === 'gigs' && (
              <div style={{ height: '100%', overflowY: 'auto' }}>{SetlistsColumn}</div>
            )}
            {mobileTab === 'overview' && (
              <div style={{ height: '100%' }}>{OverviewColumn}</div>
            )}
          </div>

          {/* Bottom tab bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#0a0a0a', borderTop: '1px solid #1a1a1a', height: 56, flexShrink: 0 }}>
            {([
              { id: 'songs', label: 'SONGS', icon: '♪' },
              { id: 'gigs', label: 'SETS', icon: '≡' },
              { id: 'overview', label: 'SHEET', icon: '◈' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  borderTop: mobileTab === tab.id ? '2px solid #ff3d6e' : '2px solid transparent',
                  color: mobileTab === tab.id ? '#fff' : '#555',
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, letterSpacing: '0.08em' }}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggingSong ? (
          <div style={{ background: '#1a1a1a', border: '1px solid #ff3d6e', color: '#fff', padding: '8px 12px', minWidth: 200, fontFamily: 'var(--font-body)', boxShadow: '0 8px 24px rgba(0,0,0,0.8)' }}>
            <div style={{ fontWeight: 'bold', fontSize: 13 }}>{draggingSong.title}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{draggingSong.artist} · {formatDuration(draggingSong.duration)}</div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff',
          padding: '8px 16px', fontFamily: 'var(--font-body)', fontSize: 12,
          zIndex: 9999, letterSpacing: '0.05em', whiteSpace: 'nowrap',
        }}>
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
