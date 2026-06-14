'use client';

/**
 * GenerateSetlistModal — opens from the dashboard's GENERATE button.
 *
 * Loads crowd models + song_attributes from Supabase, runs the generator
 * on the available songs, presents N candidate variants in tabs. On accept,
 * replaces the gig's existing setlists with the chosen variant.
 *
 * Dark theme to match the rest of the dashboard. Body-scroll prevented
 * while the modal is open.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { v4 as uuid } from 'uuid';
import type { CrowdModel, Song, SongAttributes } from '@/types';
import { SONGS, formatDuration } from '@/data/songs';
import {
  getCrowdModels,
  getSongAttributes,
  getCustomSongs,
  replaceSetlistsForGig,
} from '@/lib/supabase';
import {
  generateSetlist,
  type GeneratedCandidate,
} from '@/lib/setGenerator';

interface Props {
  gigId: string;
  gigName: string;
  onClose: () => void;
  onApplied: () => void;
}

export default function GenerateSetlistModal({ gigId, gigName, onClose, onApplied }: Props) {
  const [models, setModels] = useState<CrowdModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [attrsById, setAttrsById] = useState<Map<string, SongAttributes>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [variantIndex, setVariantIndex] = useState(0);
  const [applying, setApplying] = useState(false);

  // Prevent body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Load everything in parallel.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getCrowdModels(), getSongAttributes(), getCustomSongs()])
      .then(([modelsData, attrsData, customData]) => {
        if (cancelled) return;
        const m = (modelsData ?? []) as CrowdModel[];
        setModels(m);
        if (m.length > 0) setSelectedModelId(m[0].id);

        // Build attrs lookup.
        const map = new Map<string, SongAttributes>();
        for (const row of (attrsData ?? []) as SongAttributes[]) {
          map.set(row.song_id, row);
        }
        setAttrsById(map);

        // Merge base + custom songs.
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
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load generator data');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selectedModel = models.find((m) => m.id === selectedModelId) ?? null;

  const candidates = useMemo<GeneratedCandidate[]>(() => {
    if (!selectedModel || songs.length === 0) return [];
    try {
      return generateSetlist(selectedModel, songs, attrsById, { variants: 3 });
    } catch (e) {
      console.error('Generator error', e);
      return [];
    }
  }, [selectedModel, songs, attrsById]);

  const current = candidates[variantIndex] ?? null;

  const handleApply = async () => {
    if (!current) return;
    setApplying(true);
    try {
      const setsToSave = current.sets.map((s, i) => ({
        name: `Set ${i + 1}`,
        songs: s.songs.map((p, j) => ({
          instanceId: uuid(),
          songId: p.song.id,
          position: j,
        })),
      }));
      await replaceSetlistsForGig(gigId, setsToSave);
      onApplied();
      onClose();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to apply setlists');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Generate setlist"
      >
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>Generate setlist</div>
            <h2 style={titleStyle}>{gigName}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={closeButtonStyle}>×</button>
        </div>

        {/* Model picker */}
        <div style={pickerRowStyle}>
          <span style={labelStyle}>Crowd model</span>
          <select
            value={selectedModelId ?? ''}
            onChange={(e) => { setSelectedModelId(e.target.value); setVariantIndex(0); }}
            style={selectStyle}
            disabled={loading || models.length === 0}
          >
            {models.length === 0 && <option value="">No models loaded</option>}
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {loading && <div style={mutedStyle}>Loading library, attributes, and crowd models…</div>}
          {!loading && error && <div style={errorStyle}>{error}</div>}
          {!loading && !error && !current && (
            <div style={mutedStyle}>No variants generated. Check that song_attributes is seeded.</div>
          )}

          {current && (
            <>
              {/* Variant tabs */}
              <div style={tabsRowStyle}>
                {candidates.map((c, i) => (
                  <button
                    key={c.variant_name}
                    onClick={() => setVariantIndex(i)}
                    style={i === variantIndex ? tabActiveStyle : tabStyle}
                  >
                    {c.variant_name}
                  </button>
                ))}
              </div>

              {/* Metrics strip */}
              <div style={metricsRowStyle}>
                <Metric label="Singalong" value={String(current.metrics.total_singalong)} />
                <Metric label="Avg dance pull" value={current.metrics.avg_dance_pull.toFixed(2)} />
                <Metric
                  label="Bar pull"
                  value={`${current.metrics.bar_pull_total} ${current.metrics.bar_pull_total < 0 ? '(floor)' : '(bar)'}`}
                />
                <Metric label="Lifeline density" value={current.metrics.lifeline_density.toFixed(2)} />
              </div>

              {/* Sets */}
              <div style={setsScrollStyle}>
                {current.sets.map((set) => (
                  <div key={set.set_index} style={setBlockStyle}>
                    <div style={setHeaderStyle}>
                      <span style={setNameStyle}>SET {set.set_index + 1} — {set.phase_name}</span>
                      <span style={setMetaStyle}>
                        target {set.target_duration_minutes}m · est {set.actual_duration_minutes}m
                      </span>
                    </div>
                    <ol style={songListStyle}>
                      {set.songs.map((p, i) => (
                        <li key={p.song_id + '-' + i} style={songRowStyle}>
                          <span style={songIndexStyle}>{i + 1}.</span>
                          <span style={songTitleStyle}>{p.song.title}</span>
                          <span style={songArtistStyle}>{p.song.artist}</span>
                          <span style={songRoleStyle}>{p.role}</span>
                          <span style={songDurationStyle}>{formatDuration(p.song.duration)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>

              {/* Reasoning footnotes */}
              {current.reasoning.length > 0 && (
                <details style={reasoningStyle}>
                  <summary style={reasoningSummaryStyle}>Why this variant ({current.reasoning.length} notes)</summary>
                  <ul style={reasoningListStyle}>
                    {current.reasoning.map((r, i) => (
                      <li key={i} style={reasoningItemStyle}>{r}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button onClick={onClose} style={ghostButtonStyle}>Cancel</button>
          <button
            onClick={handleApply}
            disabled={!current || applying}
            style={current && !applying ? primaryButtonStyle : primaryButtonDisabledStyle}
          >
            {applying ? 'Applying…' : 'Use this variant'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <span style={metricValueStyle}>{value}</span>
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
  background: '#0F0F11',
  border: '1px solid #1f1f24',
  borderRadius: 12,
  width: 'min(960px, 100%)',
  maxHeight: 'calc(100vh - 32px)',
  display: 'flex',
  flexDirection: 'column',
  color: '#F5F2EE',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  padding: '20px 24px 16px',
  borderBottom: '0.5px solid #1f1f24',
};

const eyebrowStyle: CSSProperties = {
  fontSize: 10, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase',
  color: 'rgba(245,242,238,0.45)',
};

const titleStyle: CSSProperties = {
  fontSize: 22, fontWeight: 500, margin: '6px 0 0',
  letterSpacing: '-0.018em',
};

const closeButtonStyle: CSSProperties = {
  background: 'none', border: 'none', color: 'rgba(245,242,238,0.55)',
  fontSize: 28, lineHeight: 1, cursor: 'pointer', padding: '0 6px',
};

const pickerRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 24px',
  borderBottom: '0.5px solid #1f1f24',
};

const labelStyle: CSSProperties = {
  fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'rgba(245,242,238,0.5)',
};

const selectStyle: CSSProperties = {
  background: '#16161a', color: '#F5F2EE',
  border: '0.5px solid #2a2a32', borderRadius: 6,
  padding: '6px 10px', fontSize: 12,
  fontFamily: 'inherit',
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

const tabsRowStyle: CSSProperties = {
  display: 'flex', gap: 4, borderBottom: '0.5px solid #1f1f24', paddingBottom: 8,
};

const tabBase: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '6px 12px', fontSize: 12, letterSpacing: '0.04em',
  borderRadius: 6, fontFamily: 'inherit',
};

const tabStyle: CSSProperties = { ...tabBase, color: 'rgba(245,242,238,0.55)' };
const tabActiveStyle: CSSProperties = {
  ...tabBase, color: '#F5F2EE', background: '#1f1f24', border: '0.5px solid #2a2a32',
};

const metricsRowStyle: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 8, padding: '8px 0',
};

const metricStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
  padding: '8px 10px', border: '0.5px solid #1f1f24', borderRadius: 6,
};

const metricLabelStyle: CSSProperties = {
  fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'rgba(245,242,238,0.4)',
};

const metricValueStyle: CSSProperties = {
  fontSize: 14, fontWeight: 500, color: '#F5F2EE',
};

const setsScrollStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 14,
};

const setBlockStyle: CSSProperties = {
  border: '0.5px solid #1f1f24', borderRadius: 8, padding: 14,
};

const setHeaderStyle: CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
  paddingBottom: 8, marginBottom: 6, borderBottom: '0.5px solid #1f1f24',
};

const setNameStyle: CSSProperties = {
  fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
};

const setMetaStyle: CSSProperties = {
  fontSize: 11, color: 'rgba(245,242,238,0.45)',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
};

const songListStyle: CSSProperties = {
  listStyle: 'none', padding: 0, margin: 0,
  display: 'flex', flexDirection: 'column', gap: 0,
};

const songRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '24px 1fr 1fr 80px 44px',
  gap: 8, padding: '5px 0', alignItems: 'baseline',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  fontSize: 12,
};

const songIndexStyle: CSSProperties = {
  color: 'rgba(245,242,238,0.4)',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
};

const songTitleStyle: CSSProperties = { color: '#F5F2EE' };
const songArtistStyle: CSSProperties = { color: 'rgba(245,242,238,0.55)' };

const songRoleStyle: CSSProperties = {
  fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'rgba(245,242,238,0.4)',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
};

const songDurationStyle: CSSProperties = {
  color: 'rgba(245,242,238,0.45)',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  textAlign: 'right',
};

const reasoningStyle: CSSProperties = {
  border: '0.5px solid #1f1f24', borderRadius: 6, padding: 10,
};

const reasoningSummaryStyle: CSSProperties = {
  cursor: 'pointer', fontSize: 11, letterSpacing: '0.08em',
  color: 'rgba(245,242,238,0.55)',
};

const reasoningListStyle: CSSProperties = {
  margin: '8px 0 0', paddingLeft: 18,
  display: 'flex', flexDirection: 'column', gap: 4,
};

const reasoningItemStyle: CSSProperties = {
  fontSize: 11, color: 'rgba(245,242,238,0.65)', lineHeight: 1.4,
};

const footerStyle: CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 8,
  padding: '14px 24px',
  borderTop: '0.5px solid #1f1f24',
};

const ghostButtonStyle: CSSProperties = {
  background: 'transparent', color: 'rgba(245,242,238,0.7)',
  border: '0.5px solid #2a2a32', padding: '8px 16px',
  fontSize: 12, cursor: 'pointer', borderRadius: 6,
  fontFamily: 'inherit',
};

const primaryButtonStyle: CSSProperties = {
  background: '#ff3d6e', color: '#0F0F11', border: 'none',
  padding: '8px 18px', fontSize: 12, fontWeight: 600,
  letterSpacing: '0.06em', cursor: 'pointer', borderRadius: 6,
  fontFamily: 'inherit',
};

const primaryButtonDisabledStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: 'rgba(255,61,110,0.3)', cursor: 'default',
};
