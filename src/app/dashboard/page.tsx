'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { v4 as uuid } from 'uuid';

import { Gig, Setlist, SetlistSong, Song } from '@/types';
import { SONGS, formatDuration, formatTotalDuration } from '@/data/songs';
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
import GenerateSetlistModal from '@/components/GenerateSetlistModal';
import DebriefModal from '@/components/DebriefModal';
import VenueScoutModal from '@/components/VenueScoutModal';

type MobileTab = 'songs' | 'gigs' | 'overview';

export default function Dashboard() {
  const router = useRouter();

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
  const [showGenerate, setShowGenerate] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);
  const [showScout, setShowScout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const allSongs: Song[] = useMemo(() => [...SONGS, ...customSongs], [customSongs]);
  const selectedGig = gigs.find(g => g.id === selectedGigId) ?? null;
  const gigSetlists = setlists.filter(s => s.gig_id === selectedGigId);
  const gigHasSongs = gigSetlists.some(sl => (sl.songs?.length ?? 0) > 0);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('est-auth')) router.push('/');
  }, [router]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

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
      })
      .catch(() => {})
      .finally(() => setLoadingSetlists(false));
  }, [selectedGigId]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

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
    try {
      const sl = await createSetlist({ gig_id: selectedGigId, name: `Set ${gigSetlists.length + 1}`, order_num: gigSetlists.length });
      setSetlists(prev => [...prev, { ...sl, songs: [] }]);
      setActiveSetlistId(sl.id);
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
    } catch { showToast('Error deleting'); }
  };

  const addSongToActive = useCallback((songId: string) => {
    if (!activeSetlistId) return;
    setSetlists(prev => {
      const sl = prev.find(s => s.id === activeSetlistId);
      if (!sl) return prev;
      const newItem: SetlistSong = { instanceId: uuid(), songId, position: sl.songs.length };
      const updated = [...sl.songs, newItem];
      updateSetlist(activeSetlistId, { songs: updated as unknown[] }).catch(() => {});
      return prev.map(s => s.id === activeSetlistId ? { ...s, songs: updated } : s);
    });
    showToast('Song added!');
  }, [activeSetlistId, showToast]);

  const handleRemoveSong = useCallback((setlistId: string, instanceId: string) => {
    setSetlists(prev => {
      const sl = prev.find(s => s.id === setlistId);
      if (!sl) return prev;
      const updated = sl.songs
        .filter(s => s.instanceId !== instanceId)
        .map((s, i) => ({ ...s, position: i }));
      updateSetlist(setlistId, { songs: updated as unknown[] }).catch(() => {});
      return prev.map(s => s.id === setlistId ? { ...s, songs: updated } : s);
    });
  }, []);

  const handleReorder = useCallback((setlistId: string, fromIndex: number, toIndex: number) => {
    setSetlists(prev => {
      const sl = prev.find(s => s.id === setlistId);
      if (!sl) return prev;
      const songs = [...sl.songs];
      const [moved] = songs.splice(fromIndex, 1);
      songs.splice(toIndex, 0, moved);
      const reordered = songs.map((s, i) => ({ ...s, position: i }));
      updateSetlist(setlistId, { songs: reordered as unknown[] }).catch(() => {});
      return prev.map(s => s.id === setlistId ? { ...s, songs: reordered } : s);
    });
  }, []);

  const handleUpdateSong = useCallback((setlistId: string, instanceId: string, patch: Partial<SetlistSong>) => {
    setSetlists(prev => {
      const sl = prev.find(s => s.id === setlistId);
      if (!sl) return prev;
      const updated = sl.songs.map(s => s.instanceId === instanceId ? { ...s, ...patch } : s);
      updateSetlist(setlistId, { songs: updated as unknown[] }).catch(() => {});
      return prev.map(s => s.id === setlistId ? { ...s, songs: updated } : s);
    });
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'master') setDragSongId(data.songId);
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDragSongId(null);
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current;
    const overData = over.data.current;
    const overId = String(over.id);
    if (activeData?.type === 'master') {
      const targetId =
        overId.startsWith('setlist-drop-') ? overId.replace('setlist-drop-', '') :
        overData?.setlistId ? String(overData.setlistId) :
        activeSetlistId;
      if (targetId) {
        setSetlists(prev => {
          const sl = prev.find(s => s.id === targetId);
          if (!sl) return prev;
          const newItem: SetlistSong = { instanceId: uuid(), songId: activeData.songId, position: sl.songs.length };
          const updated = [...sl.songs, newItem];
          updateSetlist(targetId, { songs: updated as unknown[] }).catch(() => {});
          return prev.map(s => s.id === targetId ? { ...s, songs: updated } : s);
        });
        showToast('Song added!');
      }
    }
  }, [activeSetlistId, showToast]);

  const handleExportSet = useCallback((sl: Setlist) => {
    if (!selectedGig) return;
    exportSetlistPDF(sl, selectedGig, allSongs).catch(() => showToast('Export failed'));
  }, [selectedGig, allSongs, showToast]);

  const handleExportGig = useCallback(async () => {
    if (!selectedGig || gigSetlists.length === 0) return;
    try {
      showToast('Generating PDF...');
      await exportGigPDF(selectedGig, gigSetlists, allSongs);
    } catch (e) {
      console.error(e);
      showToast('Error generating PDF');
    }
  }, [selectedGig, gigSetlists, allSongs, showToast]);

  const handlePrint = useCallback((sl: Setlist) => {
    if (!selectedGig) return;
    printSetlist(sl, selectedGig, allSongs);
  }, [selectedGig, allSongs]);

  const handleOpenStage = useCallback(() => {
    if (!selectedGigId) return;
    if (typeof window !== 'undefined') {
      window.open(`/stage/${selectedGigId}`, '_blank', 'noopener,noreferrer');
    }
  }, [selectedGigId]);

  const reloadSetlists = useCallback(async () => {
    if (!selectedGigId) return;
    try {
      const data = await getSetlistsForGig(selectedGigId);
      const parsed = (data || []).map((s: Record<string, unknown>) => ({
        ...s,
        songs: Array.isArray(s.songs) ? s.songs : JSON.parse((s.songs as string) || '[]'),
      }));
      setSetlists(parsed as Setlist[]);
    } catch { /* silent */ }
  }, [selectedGigId]);

  const handleLogout = () => { localStorage.removeItem('est-auth'); router.push('/'); };

  const draggingSong = dragSongId ? allSongs.find(s => s.id === dragSongId) : null;

  const SetlistsColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>
      <GigPanel
        gigs={gigs}
        selectedGigId={selectedGigId}
        onSelectGig={id => { setSelectedGigId(id); setActiveSetlistId(null); }}
        onCreate={handleCreateGig}
        onUpdate={handleUpdateGig}
        onDelete={handleDeleteGig}
        loading={loadingGigs}
      />

      {selectedGigId ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div className="label-eyebrow">Run sheet for {selectedGig?.name}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2, letterSpacing: '-0.01em' }}>Setlists</div>
            </div>
            <button onClick={handleCreateSetlist} style={primaryPillStyle}>+ New set</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-soft)' }}>
            <button onClick={() => setShowGenerate(true)} title="Generate a setlist from the crowd model" style={primaryPillStyle}>✨ Generate set</button>
            <button onClick={() => setShowScout(true)} title="Research the venue — feeds the generator" style={secondaryPillStyle}>🔍 Scout venue</button>
            {gigHasSongs && <button onClick={handleOpenStage} title="Open stage mode in a new tab" style={secondaryPillStyle}>▶ Open stage mode</button>}
            {gigHasSongs && <button onClick={() => setShowDebrief(true)} title="Rate each song after the gig — feeds the generator" style={secondaryPillStyle}>◉ Debrief gig</button>}
            {gigSetlists.length > 0 && <button onClick={handleExportGig} style={secondaryPillStyle} title="Export full gig PDF">Export PDF</button>}
          </div>

          {loadingSetlists ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, textAlign: 'center', padding: '32px 16px', fontFamily: 'var(--font-body)' }}>Loading sets…</div>
          ) : gigSetlists.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '0.5px dashed var(--border-medium)', color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>🎶</div>
              <div style={{ color: 'var(--ink-2)', fontWeight: 600, marginBottom: 4 }}>No sets yet</div>
              <div>Tap <strong style={{ color: 'var(--ink-2)' }}>+ New set</strong> above, or use <strong style={{ color: 'var(--ink-2)' }}>✨ Generate set</strong> to build one for you.</div>
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
                  onReorder={handleReorder}
                  onUpdateSong={handleUpdateSong}
                  onExport={handleExportSet}
                  onPrint={handlePrint}
                  gigName={selectedGig?.name ?? ''}
                  gigDate={selectedGig?.date ?? ''}
                  gigVenue={selectedGig?.venue ?? ''}
                  allSongs={allSongs}
                />
              ))}
              {(() => {
                const total = gigSetlists.reduce((acc, sl) => acc + sl.songs.reduce((a, item) => {
                  const s = allSongs.find(song => song.id === item.songId);
                  return a + (s?.duration ?? 0);
                }, 0), 0);
                return (
                  <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="label-eyebrow">Total gig</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--brand-pink)', letterSpacing: '-0.01em' }}>{Math.floor(total / 60)}m {total % 60}s</span>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <div style={{ maxWidth: 280 }}>
            <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>🎤</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>Pick a gig to begin</div>
            <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>Choose a gig from the list above, or create a new one to start building setlists.</div>
          </div>
        </div>
      )}
    </div>
  );

  const OverviewColumn = (
    <div style={{ padding: '24px 20px', overflowY: 'auto', height: '100%', background: 'var(--bg-app)' }}>
      {!selectedGigId ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: 16, padding: 24 }}>
          <div style={{ fontSize: 44, opacity: 0.45 }}>📋</div>
          <div style={{ maxWidth: 280 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>Your run sheet lives here</div>
            <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>Pick a gig on the left to see your run sheet — every set, every song, every timing.</div>
          </div>
        </div>
      ) : (
        <div>
          <div className="label-eyebrow">Run sheet</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2, letterSpacing: '-0.01em' }}>{selectedGig?.name}</div>
          {(selectedGig?.date || selectedGig?.venue) && (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, fontFamily: 'var(--font-body)', marginTop: 4, marginBottom: 20 }}>{[selectedGig?.date, selectedGig?.venue].filter(Boolean).join(' · ')}</div>
          )}
          {!selectedGig?.date && !selectedGig?.venue && <div style={{ height: 16 }} />}
          {gigSetlists.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, fontFamily: 'var(--font-body)', marginTop: 20, padding: '24px 20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '0.5px dashed var(--border-medium)', textAlign: 'center' }}>No sets yet for this gig.</div>
          ) : gigSetlists.map((sl) => {
            const setTotalSecs = sl.songs.reduce((acc, item) => {
              const s = allSongs.find(song => song.id === item.songId);
              const dur = Number(s?.duration) || 0;
              return acc + (dur > 0 && dur <= 3600 ? dur : 0);
            }, 0);
            return (
              <div key={sl.id} style={{ marginBottom: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 16px', borderBottom: '0.5px solid var(--border-soft)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.005em' }}>{sl.name}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--brand-pink)' }}>{formatTotalDuration(setTotalSecs)}</span>
                </div>
                {sl.songs.length === 0 ? (
                  <div style={{ color: 'var(--ink-3)', fontSize: 12, fontStyle: 'italic', padding: '12px 16px' }}>No songs yet</div>
                ) : (
                  <div style={{ padding: '6px 16px 10px' }}>
                    {sl.songs.map((item, i) => {
                      const song = allSongs.find(s => s.id === item.songId);
                      if (!song) return null;
                      return (
                        <div key={item.instanceId} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: i < sl.songs.length - 1 ? '0.5px solid var(--border-soft)' : 'none' }}>
                          <span style={{ color: 'var(--ink-3)', fontSize: 11, width: 18, textAlign: 'right', flexShrink: 0, fontWeight: 500 }}>{i + 1}</span>
                          <span style={{ color: 'var(--ink-1)', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
                          <span style={{ color: 'var(--ink-3)', fontSize: 11, flexShrink: 0 }}>{Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {gigSetlists.length > 0 && (() => {
            const total = gigSetlists.reduce((acc, sl) => acc + sl.songs.reduce((a, item) => {
              const s = allSongs.find(song => song.id === item.songId);
              const dur = Number(s?.duration) || 0;
              return a + (dur > 0 && dur <= 3600 ? dur : 0);
            }, 0), 0);
            const songCount = gigSetlists.reduce((a, sl) => a + sl.songs.length, 0);
            return (
              <div style={{ marginTop: 8, padding: '14px 16px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="label-eyebrow">{songCount} songs total</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--brand-pink)', letterSpacing: '-0.01em' }}>{formatTotalDuration(total)}</span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app)', color: 'var(--ink-1)' }}>
        <nav style={{ height: 60, borderBottom: '0.5px solid var(--border-soft)', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Image src="/logo.png" alt="Every Second Tuesday" width={160} height={40} style={{ height: 32, width: 'auto' }} />
            <span className="label-eyebrow" style={{ marginLeft: 4 }}>Gigs</span>
          </div>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(o => !o)} title="Settings" style={{ background: 'transparent', border: '0.5px solid var(--border-soft)', color: 'var(--ink-2)', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>⚙</button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 44, right: 0, background: 'var(--bg-surface)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', minWidth: 180, padding: 6, zIndex: 100 }}>
                <button onClick={() => { setMenuOpen(false); handleLogout(); }} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--ink-2)', fontSize: 13, padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>Reset session</button>
              </div>
            )}
          </div>
        </nav>

        <div className="hidden md:flex" style={{ flex: 1, minHeight: 0, gap: 12, padding: 12 }}>
          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <MasterSongList activeSetlistId={activeSetlistId} onDoubleClickAdd={addSongToActive} customSongs={customSongs} onOpenAddSong={() => setShowAddSong(true)} />
          </div>
          <div style={{ width: 460, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            {SetlistsColumn}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            {OverviewColumn}
          </div>
        </div>

        <div className="flex md:hidden" style={{ flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {mobileTab === 'songs' && <div style={{ height: '100%' }}><MasterSongList activeSetlistId={activeSetlistId} onDoubleClickAdd={id => { addSongToActive(id); setMobileTab('gigs'); }} customSongs={customSongs} onOpenAddSong={() => setShowAddSong(true)} /></div>}
            {mobileTab === 'gigs' && <div style={{ height: '100%', overflowY: 'auto' }}>{SetlistsColumn}</div>}
            {mobileTab === 'overview' && <div style={{ height: '100%' }}>{OverviewColumn}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--bg-surface)', borderTop: '0.5px solid var(--border-soft)', height: 64, flexShrink: 0, boxShadow: '0 -2px 12px rgba(20, 15, 5, 0.04)' }}>
            {([{ id: 'songs', label: 'Songs', icon: '♫' }, { id: 'gigs', label: 'Sets', icon: '☰' }, { id: 'overview', label: 'Run sheet', icon: '☷' }] as const).map(tab => {
              const isActive = mobileTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setMobileTab(tab.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: isActive ? 'var(--brand-pink)' : 'var(--ink-3)' }}>
                  <span style={{ fontSize: 18 }}>{tab.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 500 }}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {draggingSong ? (
          <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--brand-pink)', color: 'var(--ink-1)', padding: '10px 14px', minWidth: 220, borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{draggingSong.title}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{draggingSong.artist} · {formatDuration(draggingSong.duration)}</div>
          </div>
        ) : null}
      </DragOverlay>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink-1)', color: '#fff', padding: '10px 18px', borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 500, boxShadow: 'var(--shadow-lg)', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>
      )}

      {showAddSong && <AddSongModal onClose={() => setShowAddSong(false)} onAdded={reloadCustomSongs} />}
      {showGenerate && selectedGigId && <GenerateSetlistModal gigId={selectedGigId} gigName={selectedGig?.name ?? 'Gig'} onClose={() => setShowGenerate(false)} onApplied={() => { reloadSetlists(); showToast('Setlist generated'); }} />}
      {showDebrief && selectedGigId && <DebriefModal gigId={selectedGigId} gigName={selectedGig?.name ?? 'Gig'} onClose={() => setShowDebrief(false)} onSaved={() => showToast('Debrief saved — generator will learn from this')} />}
      {showScout && selectedGigId && selectedGig && <VenueScoutModal venueName={selectedGig.venue || selectedGig.name || 'Venue'} city="" onClose={() => setShowScout(false)} onSaved={() => showToast('Venue profile saved — generator will use it')} />}
    </DndContext>
  );
}

const primaryPillStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, background: 'var(--brand-pink)', color: '#fff', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 'var(--radius-pill)', transition: 'filter 0.15s',
};

const secondaryPillStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, background: 'var(--bg-surface)', color: 'var(--ink-1)', border: '0.5px solid var(--border-medium)', cursor: 'pointer', padding: '8px 14px', borderRadius: 'var(--radius-pill)', transition: 'background 0.15s',
};
