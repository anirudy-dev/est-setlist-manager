'use client';

/**
 * DebriefModal — post-gig debrief flow.
 *
 * After a gig, the band opens this modal, rates each song that was played
 * on three dimensions (floor density, singalong heat, bar pull), and gives
 * the night an overall score. The result feeds the generator's learning
 * loop — over a dozen gigs, the model starts to know what actually works
 * at each venue with each crowd model.
 *
 * Minimal UI: one row per song with three sliders (1-5), a notes textarea,
 * an overall 1-5 score, and a rebook-signal toggle. Saves to gig_outcomes
 * + song_outcomes via two Supabase writes.
 *
 * Dark theme to match the dashboard.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Setlist, Song } from '@/types';
import { SONGS, formatDuration } from '@/data/songs';
import {
  getSetlistsForGig,
  getCustomSongs,
  saveGigDebrief,
} from '@/lib/supabase';

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
  floorDensity: number;     // 1-5
  singalongHeat: number;    // 1-5
  barPull: number;          // 1-5  (1 = floor packed, 5 = bar packed)
}

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
    Promise.all([getSetlistsForGig(gigId), getCustomSongs()])
      .then(([setlistsData, customData]) => {
        if (cancelled) return;
        const parsed: Setlist[] = ((setlistsData ?? []) as Array<Record<string, unknown>>).map((s) => ({
          ...(s as unknown as Setlist),
          songs: (Array.isArray(s.songs)
            ? (s.songs as Setlist['songs'])
            : JSON.parse((s.songs as string) || '[]')) as Setlist['songs'],
        }));
        setSetlists(parsed);

        const mappedCustom: Song[] = ((customData ?? []) as Array<Record<string, unknown>>).map((s) => ({
          id: `custom-${s.id as string}`,
          title: s.title as string,
          artist: s.artist as string,
          decade: s.decade as string,
          year: s.year as number,
          duration: s.duration as number,
          mood: s.mood as string,
          moodColor: s.mood_color as string,
          energy: (s.energy as 'low' | 'medium' | 'high' | undefined) ?? 'medium',
        }));
        setSongs([...SONGS, ...mappedCustom]);

        // Seed default ratings of 3 across the board.
        const seed: Record<string, SongRating> = {};
        parsed.forEach((sl: Setlist, setIdx: number) => {
          sl.songs.forEach((item: Setlist['songs'][number], songIdx: number) => {
            const key = `${setIdx}-${songIdx}-${item.songId}`;
            seed[key] = {
              songId: item.songId,
              setPosition: setIdx + 1,
              songPosition: songIdx + 1,
              floorDensity: 3,
              singalongHeat: 3,
              barPull: 3,
            };
          });
        });
        setRatings(seed);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load gig'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gigId]);

  const songsLookup = useMemo(() => {
    const m = new Map<string, Song>();
    for (const s of songs) m.set(s.id, s);
    return m;
  }, [songs]);

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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()} role="dialog">
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>Post-gig debrief</div>
            <h2 style={titleStyle}>{gigName}</h2>
            <div style={subtitleStyle}>
              Rate each song. 60 seconds. Feeds the generator.
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={closeButtonStyle}>×</button>
        </div>

        <div style={bodyStyle}>
          {loading && <div style={mutedStyle}>Loading setlist…</div>}
          {!loading && error && <div style={errorStyle}>{error}</div>}
          {!loading && totalSongs === 0 && (
            <div style={mutedStyle}>No songs in this gig's setlists. Build it first, then debrief.</div>
          )}

          {!loading && totalSongs > 0 && (
            <>
              {setlists.map((sl, setIdx) => (
                <div key={sl.id} style={setBlockStyle}>
                  <div style={setHeaderStyle}>{sl.name}</div>
                  {sl.songs.map((item, songIdx) => {
                    const key = `${setIdx}-${songIdx}-${item.songId}`;
                    const rating = ratings[key];
                    const song = songsLookup.get(item.songId);
                    if (!rating || !song) return null;
                    return (
                      <div key={key} style={songRowStyle}>
                        <div style={songMetaStyle}>
                          <span style={songIndexStyle}>{songIdx + 1}.</span>
                          <span style={songTitleStyle}>{song.title}</span>
                          <span style={songArtistStyle}>{song.artist}</span>
                          <span style={songDurationStyle}>{formatDuration(song.duration)}</span>
                        </div>
                        <div style={ratingsRowStyle}>
                          <RatingBar
                            label="Floor"
                            value={rating.floorDensity}
                            onChange={(v) => handleRate(key, 'floorDensity', v)}
                          />
                          <RatingBar
                            label="Singalong"
                            value={rating.singalongHeat}
                            onChange={(v) => handleRate(key, 'singalongHeat', v)}
                          />
                          <RatingBar
                            label="Bar"
                            value={rating.barPull}
                            onChange={(v) => handleRate(key, 'barPull', v)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Overall */}
              <div style={overallBlockStyle}>
                <div style={overallLabelStyle}>How was the night overall?</div>
                <div style={overallRowStyle}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setOverallScore(n)}
                      style={n === overallScore ? scoreButtonActiveStyle : scoreButtonStyle}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div style={overallLabelStyle}>Did the venue ask about rebooking?</div>
                <div style={overallRowStyle}>
                  <button
                    onClick={() => setRebookSignal(true)}
                    style={rebookSignal === true ? scoreButtonActiveStyle : scoreButtonStyle}
                  >Yes</button>
                  <button
                    onClick={() => setRebookSignal(false)}
                    style={rebookSignal === false ? scoreButtonActiveStyle : scoreButtonStyle}
                  >No</button>
                  <button
                    onClick={() => setRebookSignal(null)}
                    style={rebookSignal === null ? scoreButtonActiveStyle : scoreButtonStyle}
                  >Unsure</button>
                </div>

                <div style={overallLabelStyle}>Notes (optional)</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What worked. What didn't. Anything we want to remember next time."
                  rows={3}
                  style={notesStyle}
                />
              </div>
            </>
          )}
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={ghostButtonStyle}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || totalSongs === 0}
            style={!saving && totalSongs > 0 ? primaryButtonStyle : primaryButtonDisabledStyle}
          >
            {saving ? 'Saving…' : 'Save debrief'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RatingBar({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={ratingBarStyle}>
      <span style={ratingLabelStyle}>{label}</span>
      <div style={ratingDotsStyle}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${label} ${n}`}
            style={n <= value ? ratingDotFilledStyle : ratingDotEmptyStyle}
          />
        ))}
      </div>
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const backdropStyle: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 10_000,
  background: 'rgba(0,0,0,0.72)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16,
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
};

const modalStyle: CSSProperties = {
  background: '#0F0F11', border: '1px solid #1f1f24', borderRadius: 12,
  width: 'min(900px, 100%)', maxHeight: 'calc(100vh - 32px)',
  display: 'flex', flexDirection: 'column', color: '#F5F2EE', overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  padding: '20px 24px 16px', borderBottom: '0.5px solid #1f1f24',
};

const eyebrowStyle: CSSProperties = {
  fontSize: 10, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase',
  color: 'rgba(245,242,238,0.45)',
};

const titleStyle: CSSProperties = {
  fontSize: 22, fontWeight: 500, margin: '6px 0 0', letterSpacing: '-0.018em',
};

const subtitleStyle: CSSProperties = {
  fontSize: 12, color: 'rgba(245,242,238,0.6)', marginTop: 6,
};

const closeButtonStyle: CSSProperties = {
  background: 'none', border: 'none', color: 'rgba(245,242,238,0.55)',
  fontSize: 28, lineHeight: 1, cursor: 'pointer', padding: '0 6px',
};

const bodyStyle: CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '16px 24px',
  display: 'flex', flexDirection: 'column', gap: 14,
};

const mutedStyle: CSSProperties = {
  color: 'rgba(245,242,238,0.4)', fontSize: 12,
  textAlign: 'center', padding: '24px 0',
};

const errorStyle: CSSProperties = {
  color: '#ff6b6b', fontSize: 12, padding: 12,
  border: '0.5px solid rgba(255,107,107,0.3)', borderRadius: 6,
  background: 'rgba(255,107,107,0.05)',
};

const setBlockStyle: CSSProperties = {
  border: '0.5px solid #1f1f24', borderRadius: 8, padding: 14,
};

const setHeaderStyle: CSSProperties = {
  fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
  paddingBottom: 8, marginBottom: 8, borderBottom: '0.5px solid #1f1f24',
};

const songRowStyle: CSSProperties = {
  padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
  display: 'flex', flexDirection: 'column', gap: 6,
};

const songMetaStyle: CSSProperties = {
  display: 'grid', gridTemplateColumns: '24px 1fr auto auto', gap: 8,
  alignItems: 'baseline', fontSize: 12,
};

const songIndexStyle: CSSProperties = {
  color: 'rgba(245,242,238,0.4)',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
};

const songTitleStyle: CSSProperties = { color: '#F5F2EE', fontWeight: 500 };
const songArtistStyle: CSSProperties = { color: 'rgba(245,242,238,0.55)' };

const songDurationStyle: CSSProperties = {
  color: 'rgba(245,242,238,0.4)',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
};

const ratingsRowStyle: CSSProperties = {
  display: 'flex', gap: 16, paddingLeft: 32,
};

const ratingBarStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
};

const ratingLabelStyle: CSSProperties = {
  fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'rgba(245,242,238,0.45)',
};

const ratingDotsStyle: CSSProperties = {
  display: 'flex', gap: 4,
};

const ratingDotFilledStyle: CSSProperties = {
  width: 14, height: 14, borderRadius: '50%',
  background: '#ffd93d', border: '1px solid #ffd93d',
  cursor: 'pointer', padding: 0,
};

const ratingDotEmptyStyle: CSSProperties = {
  width: 14, height: 14, borderRadius: '50%',
  background: 'transparent', border: '1px solid rgba(245,242,238,0.3)',
  cursor: 'pointer', padding: 0,
};

const overallBlockStyle: CSSProperties = {
  border: '0.5px solid #1f1f24', borderRadius: 8, padding: 14,
  display: 'flex', flexDirection: 'column', gap: 8,
};

const overallLabelStyle: CSSProperties = {
  fontSize: 11, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'rgba(245,242,238,0.55)', marginTop: 6,
};

const overallRowStyle: CSSProperties = {
  display: 'flex', gap: 6,
};

const scoreButtonStyle: CSSProperties = {
  background: '#1a1a1a', color: 'rgba(245,242,238,0.7)',
  border: '0.5px solid #2a2a32', padding: '6px 14px',
  fontSize: 12, cursor: 'pointer', borderRadius: 6,
  fontFamily: 'inherit', minWidth: 40,
};

const scoreButtonActiveStyle: CSSProperties = {
  ...scoreButtonStyle,
  background: '#ffd93d', color: '#0F0F11', borderColor: '#ffd93d',
  fontWeight: 600,
};

const notesStyle: CSSProperties = {
  background: '#16161a', color: '#F5F2EE',
  border: '0.5px solid #2a2a32', borderRadius: 6,
  padding: 10, fontSize: 12, fontFamily: 'inherit',
  resize: 'vertical', minHeight: 60,
};

const footerStyle: CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 8,
  padding: '14px 24px', borderTop: '0.5px solid #1f1f24',
};

const ghostButtonStyle: CSSProperties = {
  background: 'transparent', color: 'rgba(245,242,238,0.7)',
  border: '0.5px solid #2a2a32', padding: '8px 16px',
  fontSize: 12, cursor: 'pointer', borderRadius: 6,
  fontFamily: 'inherit',
};

const primaryButtonStyle: CSSProperties = {
  background: '#ffd93d', color: '#0F0F11', border: 'none',
  padding: '8px 18px', fontSize: 12, fontWeight: 600,
  letterSpacing: '0.06em', cursor: 'pointer', borderRadius: 6,
  fontFamily: 'inherit',
};

const primaryButtonDisabledStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: 'rgba(255,217,61,0.3)', cursor: 'default',
};
