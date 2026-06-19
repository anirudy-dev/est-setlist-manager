'use client';

/**
 * DebriefModal — post-gig debrief flow.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Setlist, Song } from '@/types';
import { formatDuration } from '@/data/songs';
import { getSetlistsForGig, getSongs, saveGigDebrief } from '@/lib/supabase';

interface Props {
  gigId: string;
  gigName: string;
  onClose: () => void;
  onSaved: () => void;
}

interface SongRating {
  songId: string;
  setPosition: number;
  songPosition: number;
  floorDensity: number;
  singalongHeat: number;
  barPull: number;
}

const DIM_COLORS: Record<'floorDensity' | 'singalongHeat' | 'barPull', string> = {
  floorDensity: 'var(--brand-pink)',
  singalongHeat: 'var(--brand-teal)',
  barPull: 'var(--brand-yellow)',
};

export default function DebriefModal({ gigId, gigName, onClose, onSaved }: Props) {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [ratings, setRatings] = useState<Record<string, SongRating>>({});
  const [overallScore, setOverallScore] = useState<number>(3);
  const [rebookSignal, setRebookSignal] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSetlistsForGig(gigId), getSongs()])
      .then(([setlistsData, songsData]) => {
        if (cancelled) return;
        const parsed: Setlist[] = ((setlistsData ?? []) as Array<Record<string, unknown>>).map((s) => ({
          ...(s as unknown as Setlist),
          songs: (Array.isArray(s.songs) ? (s.songs as Setlist['songs']) : JSON.parse((s.songs as string) || '[]')) as Setlist['songs'],
        }));
        setSetlists(parsed);
        setSongs(songsData ?? []);

        const seed: Record<string, SongRating> = {};
        parsed.forEach((sl: Setlist, setIdx: number) => {
          sl.songs.forEach((item: Setlist['songs'][number], songIdx: number) => {
            const key = `${setIdx}-${songIdx}-${item.songId}`;
            seed[key] = { songId: item.songId, setPosition: setIdx + 1, songPosition: songIdx + 1, floorDensity: 3, singalongHeat: 3, barPull: 3 };
          });
        });
        setRatings(seed);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load gig'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gigId]);

  const songsLookup = useMemo(() => { const m = new Map<string, Song>(); for (const s of songs) m.set(s.id, s); return m; }, [songs]);
  const totalSongs = Object.keys(ratings).length;

  const handleRate = (key: string, dim: 'floorDensity' | 'singalongHeat' | 'barPull', value: number) => {
    setRatings((prev) => ({ ...prev, [key]: { ...prev[key], [dim]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveGigDebrief({
        gig_id: gigId,
        overall_score: overallScore,
        rebook_signal: rebookSignal,
        notes,
        song_outcomes: Object.values(ratings).map((r) => ({
          song_id: r.songId,
          set_position: r.setPosition,
          song_position: r.songPosition,
          floor_density: r.floorDensity,
          singalong_heat: r.singalongHeat,
          bar_pull: r.barPull,
        })),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save debrief');
    } finally { setSaving(false); }
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()} role="dialog">
        <div style={headerStyle}>
          <div>
            <div className="label-eyebrow" style={{ marginBottom: 4 }}>Post-gig debrief</div>
            <h2 style={titleStyle}>{gigName}</h2>
            <p style={subtitleStyle}>Rate every song you played. Sixty seconds. The generator learns what landed.</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={closeButtonStyle}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>×</button>
        </div>

        <div style={bodyStyle}>
          {loading && <div style={mutedStyle}>Loading setlist…</div>}
          {!loading && error && <div style={errorStyle}>{error}</div>}
          {!loading && totalSongs === 0 && <div style={mutedStyle}>No songs in this gig&apos;s setlists. Build it first, then debrief.</div>}

          {!loading && totalSongs > 0 && (
            <>
              {setlists.map((sl, setIdx) => (
                <div key={sl.id} style={setBlockStyle}>
                  <div style={setHeaderStyle}>
                    <span style={setNameStyle}>{sl.name}</span>
                    <span style={setCountStyle}>{sl.songs.length} {sl.songs.length === 1 ? 'song' : 'songs'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {sl.songs.map((item, songIdx) => {
                      const key = `${setIdx}-${songIdx}-${item.songId}`;
                      const rating = ratings[key];
                      const song = songsLookup.get(item.songId);
                      if (!rating || !song) return null;
                      return (
                        <div key={key} style={songRowStyle}>
                          <div style={songMetaStyle}>
                            <span style={songIndexStyle}>{songIdx + 1}</span>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                              <span style={songTitleStyle}>{song.title}</span>
                              <span style={songArtistStyle}>{song.artist} · {formatDuration(song.duration)}</span>
                            </div>
                          </div>
                          <div style={ratingsRowStyle}>
                            <RatingBar label="Floor" value={rating.floorDensity} color={DIM_COLORS.floorDensity} onChange={(v) => handleRate(key, 'floorDensity', v)} />
                            <RatingBar label="Singalong" value={rating.singalongHeat} color={DIM_COLORS.singalongHeat} onChange={(v) => handleRate(key, 'singalongHeat', v)} />
                            <RatingBar label="Bar" value={rating.barPull} color={DIM_COLORS.barPull} onChange={(v) => handleRate(key, 'barPull', v)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div style={overallBlockStyle}>
                <div>
                  <div style={overallLabelStyle}>How was the night overall?</div>
                  <div style={overallRowStyle}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setOverallScore(n)} style={n === overallScore ? scoreButtonActiveStyle : scoreButtonStyle}
                        onMouseEnter={e => { if (n !== overallScore) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                        onMouseLeave={e => { if (n !== overallScore) e.currentTarget.style.background = 'var(--bg-surface)'; }}>{n}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={overallLabelStyle}>Did the venue ask about rebooking?</div>
                  <div style={overallRowStyle}>
                    <button onClick={() => setRebookSignal(true)} style={rebookSignal === true ? choiceButtonActiveStyle : choiceButtonStyle}>Yes</button>
                    <button onClick={() => setRebookSignal(false)} style={rebookSignal === false ? choiceButtonActiveStyle : choiceButtonStyle}>No</button>
                    <button onClick={() => setRebookSignal(null)} style={rebookSignal === null ? choiceButtonActiveStyle : choiceButtonStyle}>Unsure</button>
                  </div>
                </div>

                <div>
                  <div style={overallLabelStyle}>Notes (optional)</div>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What worked. What didn't. Anything we want to remember next time." rows={3} style={notesStyle} />
                </div>
              </div>
            </>
          )}
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={ghostButtonStyle}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}>Cancel</button>
          <button onClick={handleSave} disabled={saving || totalSongs === 0} style={!saving && totalSongs > 0 ? primaryButtonStyle : primaryButtonDisabledStyle}
            onMouseEnter={e => { if (!saving && totalSongs > 0) e.currentTarget.style.filter = 'brightness(0.96)'; }}
            onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>{saving ? 'Saving…' : 'Save debrief'}</button>
        </div>
      </div>
    </div>
  );
}

function RatingBar({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (v: number) => void }) {
  return (
    <div style={ratingBarStyle}>
      <span style={ratingLabelStyle}>{label}</span>
      <div style={ratingDotsStyle}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= value;
          return (<button key={n} type="button" onClick={() => onChange(n)} aria-label={`${label} ${n}`} style={filled ? { ...ratingDotBase, background: color, borderColor: color } : ratingDotEmptyStyle} />);
        })}
      </div>
    </div>
  );
}

const backdropStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(26, 26, 26, 0.42)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'var(--font-body)' };
const modalStyle: CSSProperties = { background: 'var(--bg-elevated)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: 'min(900px, 100%)', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', color: 'var(--ink-1)', overflow: 'hidden' };
const headerStyle: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '20px 24px 16px', borderBottom: '0.5px solid var(--border-soft)' };
const titleStyle: CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '2px 0 0', color: 'var(--ink-1)', letterSpacing: '-0.01em' };
const subtitleStyle: CSSProperties = { fontSize: 13, color: 'var(--ink-3)', margin: '6px 0 0', lineHeight: 1.5, maxWidth: 540 };
const closeButtonStyle: CSSProperties = { background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 24, lineHeight: 1, cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-pill)', transition: 'background 0.15s', flexShrink: 0 };
const bodyStyle: CSSProperties = { flex: 1, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 };
const mutedStyle: CSSProperties = { color: 'var(--ink-3)', fontSize: 13, textAlign: 'center', padding: '32px 0' };
const errorStyle: CSSProperties = { color: 'var(--brand-pink)', fontSize: 13, padding: '10px 14px', border: '0.5px solid rgba(233, 78, 119, 0.3)', background: 'rgba(233, 78, 119, 0.08)', borderRadius: 'var(--radius-sm)' };
const setBlockStyle: CSSProperties = { background: 'var(--bg-surface)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: 14, boxShadow: 'var(--shadow-sm)' };
const setHeaderStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 8, borderBottom: '0.5px solid var(--border-soft)' };
const setNameStyle: CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.005em' };
const setCountStyle: CSSProperties = { fontSize: 11, color: 'var(--ink-3)' };
const songRowStyle: CSSProperties = { padding: '10px 0', borderBottom: '0.5px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: 8 };
const songMetaStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };
const songIndexStyle: CSSProperties = { color: 'var(--ink-4)', fontSize: 12, fontWeight: 500, width: 20, textAlign: 'right', flexShrink: 0 };
const songTitleStyle: CSSProperties = { color: 'var(--ink-1)', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const songArtistStyle: CSSProperties = { color: 'var(--ink-3)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const ratingsRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 18, paddingLeft: 30 };
const ratingBarStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const ratingLabelStyle: CSSProperties = { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' };
const ratingDotsStyle: CSSProperties = { display: 'flex', gap: 5 };
const ratingDotBase: CSSProperties = { width: 16, height: 16, borderRadius: '50%', border: '1px solid transparent', cursor: 'pointer', padding: 0, transition: 'transform 0.1s, background 0.15s' };
const ratingDotEmptyStyle: CSSProperties = { ...ratingDotBase, background: 'var(--bg-surface)', border: '1px solid var(--border-medium)' };
const overallBlockStyle: CSSProperties = { background: 'var(--bg-surface)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: 'var(--shadow-sm)' };
const overallLabelStyle: CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8 };
const overallRowStyle: CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' };
const scoreButtonStyle: CSSProperties = { background: 'var(--bg-surface)', color: 'var(--ink-2)', border: '0.5px solid var(--border-medium)', padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 'var(--radius-pill)', minWidth: 42, transition: 'background 0.15s' };
const scoreButtonActiveStyle: CSSProperties = { ...scoreButtonStyle, background: 'var(--brand-yellow)', color: '#fff', borderColor: 'var(--brand-yellow)', fontWeight: 700 };
const choiceButtonStyle: CSSProperties = { background: 'var(--bg-surface)', color: 'var(--ink-2)', border: '0.5px solid var(--border-medium)', padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 'var(--radius-pill)', transition: 'background 0.15s' };
const choiceButtonActiveStyle: CSSProperties = { ...choiceButtonStyle, background: 'var(--brand-teal)', color: '#fff', borderColor: 'var(--brand-teal)', fontWeight: 600 };
const notesStyle: CSSProperties = { width: '100%', background: 'var(--bg-surface)', color: 'var(--ink-1)', border: '0.5px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 13, resize: 'vertical', minHeight: 72, outline: 'none', lineHeight: 1.5 };
const footerStyle: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '0.5px solid var(--border-soft)', background: 'var(--bg-surface)' };
const ghostButtonStyle: CSSProperties = { background: 'var(--bg-surface)', color: 'var(--ink-2)', border: '0.5px solid var(--border-medium)', borderRadius: 'var(--radius-pill)', padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' };
const primaryButtonStyle: CSSProperties = { background: 'var(--brand-pink)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'filter 0.15s' };
const primaryButtonDisabledStyle: CSSProperties = { ...primaryButtonStyle, background: 'var(--ink-4)', cursor: 'default' };
