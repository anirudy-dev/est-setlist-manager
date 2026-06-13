'use client';

/**
 * /stage/[gigId] — phone-first stage mode.
 *
 * Read-only performance view. Big current song, dim next song, set-transition
 * cue, swipe + arrow + space to advance. Screen wake lock so the phone doesn't
 * sleep mid-set.
 *
 * Pure client-side render. Pulls from the same tables the dashboard reads
 * (gigs, setlists, custom_songs). No schema dependency. Safe to ship alone.
 */

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  type CSSProperties,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Gig, Setlist, Song } from '@/types';
import { SONGS, formatDuration } from '@/data/songs';
import { getGigs, getSetlistsForGig, getCustomSongs } from '@/lib/supabase';

type StagePosition = {
  setIndex: number;
  setName: string;
  setSongIndex: number;
  setLength: number;
  song: Song;
};

// Lightweight nav typing for wake lock — the global lib.dom type isn't
// guaranteed across all Next/TS configurations.
interface WakeLockSentinelLike {
  release: () => Promise<void>;
}
interface WakeLockNavigator extends Navigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
}

const COLORS = {
  bg: '#0A0A0B',
  ink: '#F5F2EE',
  ink70: 'rgba(245, 242, 238, 0.70)',
  ink55: 'rgba(245, 242, 238, 0.55)',
  ink45: 'rgba(245, 242, 238, 0.45)',
  ink35: 'rgba(245, 242, 238, 0.35)',
  ink20: 'rgba(245, 242, 238, 0.20)',
  hairline: 'rgba(255, 255, 255, 0.07)',
};

const FONT_BODY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif';
const FONT_MONO =
  'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace';

export default function StagePage() {
  const router = useRouter();
  const params = useParams<{ gigId: string }>();
  const gigId = params?.gigId ?? '';

  const [gig, setGig] = useState<Gig | null>(null);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [customSongs, setCustomSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState<Date>(() => new Date());

  // Same simple gate the dashboard uses.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('est-auth')) router.push('/');
  }, [router]);

  // Load gig + setlists + custom songs in parallel.
  useEffect(() => {
    if (!gigId) return;
    let cancelled = false;

    Promise.all([getGigs(), getSetlistsForGig(gigId), getCustomSongs()])
      .then(([gigsData, setlistsData, customSongsData]) => {
        if (cancelled) return;

        const foundGig =
          (gigsData as Gig[] | null)?.find((g) => g.id === gigId) ?? null;

        if (!foundGig) {
          setErrorMsg('Gig not found');
          return;
        }
        setGig(foundGig);

        // Setlists' songs may come back as JSONB array OR as a stringified
        // array depending on the column type. Dashboard handles both — match.
        const parsedSetlists: Setlist[] = (
          (setlistsData as Array<Record<string, unknown>>) ?? []
        ).map((s) => ({
          ...(s as unknown as Setlist),
          songs: Array.isArray(s.songs)
            ? (s.songs as Setlist['songs'])
            : JSON.parse((s.songs as string) || '[]'),
        }));
        setSetlists(parsedSetlists);

        // Same snake_case → camelCase shape the dashboard builds inline.
        const mappedCustom: Song[] = (
          (customSongsData as Array<Record<string, unknown>>) ?? []
        ).map((s) => ({
          id: `custom-${s.id as string}`,
          title: s.title as string,
          artist: s.artist as string,
          decade: s.decade as string,
          year: s.year as number,
          duration: s.duration as number,
          mood: s.mood as string,
          moodColor: s.mood_color as string,
          energy:
            (s.energy as 'low' | 'medium' | 'high' | undefined) ?? 'medium',
        }));
        setCustomSongs(mappedCustom);
      })
      .catch(() => {
        if (!cancelled) setErrorMsg('Failed to load gig');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gigId]);

  const allSongs = useMemo(() => [...SONGS, ...customSongs], [customSongs]);

  const positions: StagePosition[] = useMemo(() => {
    const out: StagePosition[] = [];
    setlists.forEach((sl, setIdx) => {
      const songs = sl.songs ?? [];
      songs.forEach((item, setSongIdx) => {
        const song = allSongs.find((s) => s.id === item.songId);
        if (song) {
          out.push({
            setIndex: setIdx,
            setName: sl.name,
            setSongIndex: setSongIdx,
            setLength: songs.length,
            song,
          });
        }
      });
    });
    return out;
  }, [setlists, allSongs]);

  const current = positions[index] ?? null;
  const next = positions[index + 1] ?? null;
  const setChangeAhead =
    !!current && !!next && next.setIndex !== current.setIndex;

  const advance = useCallback(() => {
    setIndex((i) => Math.min(i + 1, Math.max(0, positions.length - 1)));
  }, [positions.length]);

  const goBack = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Keyboard nav.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.code === 'Space') {
        e.preventDefault();
        advance();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'Escape') {
        router.push('/dashboard');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, goBack, router]);

  // Touch swipe (horizontal only; threshold = 60px).
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: ReactTouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    if (dx < -60) advance();
    else if (dx > 60) goBack();
    touchStartX.current = null;
  };

  // Wake lock — keep the screen awake while on stage. Re-acquire on
  // visibility change (locking and unlocking the phone releases it).
  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;

    let lock: WakeLockSentinelLike | null = null;
    let released = false;

    const acquire = async () => {
      try {
        lock = (await nav.wakeLock!.request('screen')) ?? null;
      } catch {
        // User agent refused (battery saver, etc.) — ignore.
      }
    };
    acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !released) acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      released = true;
      lock?.release().catch(() => undefined);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Live clock — tick every 30s, enough to keep the wall time honest.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // ── render ────────────────────────────────────────────────────────────────

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (loading) {
    return (
      <main style={shellStyle}>
        <div style={loadingStyle}>Loading</div>
      </main>
    );
  }

  if (errorMsg || !gig || positions.length === 0) {
    return (
      <main style={shellStyle}>
        <div style={emptyStyle}>
          <div style={emptyEyebrowStyle}>Stage mode</div>
          <div style={emptyTitleStyle}>
            {errorMsg ?? 'No songs in this gig yet'}
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            style={emptyButtonStyle}
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={pageStyle}
    >
      {/* Status row */}
      <div style={statusRowStyle}>
        <span style={timeStyle}>{timeStr}</span>
        <span style={positionStyle}>
          <span style={positionMonoStyle}>
            {current!.setSongIndex + 1} / {current!.setLength}
          </span>
          <span style={dotStyle} />
          <span>
            Set {current!.setIndex + 1} of {setlists.length}
          </span>
        </span>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          style={exitButtonStyle}
        >
          Exit
        </button>
      </div>

      {/* Set name eyebrow */}
      <div style={eyebrowStyle}>{current!.setName}</div>

      {/* Current song */}
      <h1 style={titleStyle}>{current!.song.title}</h1>
      <p style={artistStyle}>{current!.song.artist}</p>

      <div style={metaRowStyle}>
        <span style={durationStyle}>{formatDuration(current!.song.duration)}</span>
        {current!.song.mood && (
          <span
            style={{
              ...moodChipStyle,
              color: current!.song.moodColor,
              borderColor: `${current!.song.moodColor}55`,
            }}
          >
            {current!.song.mood}
          </span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Up next */}
      {next ? (
        <div style={nextBlockStyle}>
          <p style={nextEyebrowStyle}>Up next</p>
          <p style={nextTitleStyle}>{next.song.title}</p>
          <p style={nextArtistStyle}>{next.song.artist}</p>
          {setChangeAhead && (
            <p style={setChangeStyle}>{next.setName} begins</p>
          )}
        </div>
      ) : (
        <div style={endOfNightStyle}>
          <p style={endOfNightTextStyle}>Last song — close it out</p>
        </div>
      )}

      {/* Footer hint + manual nav */}
      <div style={footerRowStyle}>
        <button
          type="button"
          onClick={goBack}
          disabled={index === 0}
          aria-label="Previous song"
          style={{
            ...arrowButtonStyle,
            color: index === 0 ? COLORS.ink20 : COLORS.ink45,
            cursor: index === 0 ? 'default' : 'pointer',
          }}
        >
          ‹
        </button>
        <span style={hintStyle}>Swipe to advance</span>
        <button
          type="button"
          onClick={advance}
          disabled={index >= positions.length - 1}
          aria-label="Next song"
          style={{
            ...arrowButtonStyle,
            color:
              index >= positions.length - 1 ? COLORS.ink20 : COLORS.ink55,
            cursor:
              index >= positions.length - 1 ? 'default' : 'pointer',
          }}
        >
          ›
        </button>
      </div>
    </main>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const shellStyle: CSSProperties = {
  background: COLORS.bg,
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: COLORS.ink,
  fontFamily: FONT_BODY,
};

const loadingStyle: CSSProperties = {
  color: COLORS.ink45,
  fontSize: 11,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

const emptyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: 24,
};

const emptyEyebrowStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: COLORS.ink45,
  marginBottom: 12,
};

const emptyTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 500,
  color: COLORS.ink,
  marginBottom: 22,
};

const emptyButtonStyle: CSSProperties = {
  background: 'transparent',
  border: `0.5px solid ${COLORS.ink35}`,
  color: COLORS.ink,
  padding: '10px 20px',
  fontSize: 11,
  fontFamily: FONT_BODY,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  borderRadius: 8,
  cursor: 'pointer',
};

const pageStyle: CSSProperties = {
  background: COLORS.bg,
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  padding: '22px 22px 18px',
  color: COLORS.ink,
  fontFamily: FONT_BODY,
  overflow: 'hidden',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const statusRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: 11.5,
  color: COLORS.ink45,
  paddingBottom: 18,
  borderBottom: `0.5px solid ${COLORS.hairline}`,
};

const timeStyle: CSSProperties = {
  fontFamily: FONT_MONO,
  color: COLORS.ink70,
  minWidth: 60,
};

const positionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  letterSpacing: '0.04em',
};

const positionMonoStyle: CSSProperties = {
  fontFamily: FONT_MONO,
  color: COLORS.ink70,
};

const dotStyle: CSSProperties = {
  width: 3,
  height: 3,
  borderRadius: '50%',
  background: COLORS.ink20,
};

const exitButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: COLORS.ink45,
  cursor: 'pointer',
  fontFamily: FONT_BODY,
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  padding: 0,
  minWidth: 60,
  textAlign: 'right',
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: COLORS.ink45,
  margin: '24px 0 10px',
};

const titleStyle: CSSProperties = {
  fontSize: 'clamp(36px, 8vw, 64px)',
  fontWeight: 500,
  color: COLORS.ink,
  margin: 0,
  letterSpacing: '-0.024em',
  lineHeight: 1.02,
};

const artistStyle: CSSProperties = {
  fontSize: 16,
  color: COLORS.ink70,
  margin: '10px 0 0',
};

const metaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: 16,
};

const durationStyle: CSSProperties = {
  fontSize: 13,
  color: COLORS.ink55,
  fontFamily: FONT_MONO,
};

const moodChipStyle: CSSProperties = {
  fontSize: 10,
  padding: '2px 9px',
  border: '0.5px solid',
  borderRadius: 999,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontWeight: 500,
};

const nextBlockStyle: CSSProperties = {
  padding: '16px 0 6px',
  borderTop: `0.5px solid ${COLORS.hairline}`,
};

const nextEyebrowStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: COLORS.ink35,
  margin: '0 0 10px',
};

const nextTitleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 500,
  color: COLORS.ink70,
  margin: 0,
  letterSpacing: '-0.018em',
  lineHeight: 1.1,
};

const nextArtistStyle: CSSProperties = {
  fontSize: 13,
  color: COLORS.ink45,
  margin: '4px 0 0',
};

const setChangeStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: COLORS.ink35,
  margin: '14px 0 0',
};

const endOfNightStyle: CSSProperties = {
  padding: '16px 0',
  borderTop: `0.5px solid ${COLORS.hairline}`,
  textAlign: 'center',
};

const endOfNightTextStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: COLORS.ink55,
  margin: 0,
};

const footerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 18,
  paddingTop: 14,
};

const arrowButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 22,
  padding: '4px 8px',
  fontFamily: FONT_BODY,
};

const hintStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: COLORS.ink35,
};
