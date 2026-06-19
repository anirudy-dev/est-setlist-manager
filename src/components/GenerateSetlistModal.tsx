'use client';

/**
 * GenerateSetlistModal — opens from the dashboard's GENERATE button.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { v4 as uuid } from 'uuid';
import type { CrowdModel, Song, SongAttributes } from '@/types';
import { SONGS, formatDuration } from '@/data/songs';
import { getCrowdModels, getSongAttributes, getCustomSongs, replaceSetlistsForGig } from '@/lib/supabase';
import { generateSetlist, type GeneratedCandidate } from '@/lib/setGenerator';

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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCrowdModels(), getSongAttributes(), getCustomSongs()])
      .then(([modelsData, attrsData, customData]) => {
        if (cancelled) return;
        const m = (modelsData ?? []) as CrowdModel[];
        setModels(m);
        if (m.length > 0) setSelectedModelId(m[0].id);
        const map = new Map<string, SongAttributes>();
        for (const row of (attrsData ?? []) as SongAttributes[]) map.set(row.song_id, row);
        setAttrsById(map);
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
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load generator data'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selectedModel = models.find((m) => m.id === selectedModelId) ?? null;
  const candidates = useMemo<GeneratedCandidate[]>(() => {
    if (!selectedModel || songs.length === 0) return [];
    try { return generateSetlist(selectedModel, songs, attrsById, { variants: 3 }); }
    catch (e) { console.error('Generator error', e); return []; }
  }, [selectedModel, songs, attrsById]);
  const current = candidates[variantIndex] ?? null;

  const handleApply = async () => {
    if (!current) return;
    setApplying(true);
    try {
      const setsToSave = current.sets.map((s, i) => ({
        name: `Set ${i + 1}`,
        songs: s.songs.map((p, j) => ({ instanceId: uuid(), songId: p.song.id, position: j })),
      }));
      await replaceSetlistsForGig(gigId, setsToSave);
      onApplied();
      onClose();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to apply setlists');
    } finally { setApplying(false); }
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Generate setlist">
        <div style={headerStyle}>
          <div>
            <div className="label-eyebrow" style={{ marginBottom: 4 }}>Generate setlist</div>
            <h2 style={titleStyle}>{gigName}</h2>
            <p style={subtitleStyle}>Pick a crowd model, then choose from three generated variants. Apply to replace this gig&apos;s sets.</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={closeButtonStyle}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>×</button>
        </div>

        <div style={pickerRowStyle}>
          <span style={pickerLabelStyle}>Crowd model</span>
          <select value={selectedModelId ?? ''} onChange={(e) => { setSelectedModelId(e.target.value); setVariantIndex(0); }} style={selectStyle} disabled={loading || models.length === 0}>
            {models.length === 0 && <option value="">No models loaded</option>}
            {models.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
        </div>

        <div style={bodyStyle}>
          {loading && <div style={mutedStyle}>Loading library, attributes, and crowd models…</div>}
          {!loading && error && <div style={errorStyle}>{error}</div>}
          {!loading && !error && !current && <div style={mutedStyle}>No variants generated. Check that song_attributes is seeded.</div>}

          {current && (
            <>
              <div style={tabsRowStyle}>
                {candidates.map((c, i) => (
                  <button key={c.variant_name} onClick={() => setVariantIndex(i)} style={i === variantIndex ? tabActiveStyle : tabStyle}>{c.variant_name}</button>
                ))}
              </div>

              <div style={metricsRowStyle}>
                <Metric label="Singalong" value={String(current.metrics.total_singalong)} />
                <Metric label="Avg dance pull" value={current.metrics.avg_dance_pull.toFixed(2)} />
                <Metric label="Bar pull" value={`${current.metrics.bar_pull_total} ${current.metrics.bar_pull_total < 0 ? '(floor)' : '(bar)'}`} />
                <Metric label="Lifeline density" value={current.metrics.lifeline_density.toFixed(2)} />
              </div>

              <div style={setsScrollStyle}>
                {current.sets.map((set) => (
                  <div key={set.set_index} style={setBlockStyle}>
                    <div style={setHeaderStyle}>
                      <span style={setNameStyle}>Set {set.set_index + 1} · {set.phase_name}</span>
                      <span style={setMetaStyle}>target {set.target_duration_minutes}m · est {set.actual_duration_minutes}m</span>
                    </div>
                    <ol style={songListStyle}>
                      {set.songs.map((p, i) => (
                        <li key={p.song_id + '-' + i} style={songRowStyle}>
                          <span style={songIndexStyle}>{i + 1}</span>
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

              {current.reasoning.length > 0 && (
                <details style={reasoningStyle}>
                  <summary style={reasoningSummaryStyle}>Why this variant ({current.reasoning.length} notes)</summary>
                  <ul style={reasoningListStyle}>
                    {current.reasoning.map((r, i) => (<li key={i} style={reasoningItemStyle}>{r}</li>))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={ghostButtonStyle}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}>Cancel</button>
          <button onClick={handleApply} disabled={!current || applying} style={current && !applying ? primaryButtonStyle : primaryButtonDisabledStyle}
            onMouseEnter={e => { if (current && !applying) e.currentTarget.style.filter = 'brightness(0.96)'; }}
            onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>{applying ? 'Applying…' : 'Use this variant'}</button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (<div style={metricStyle}><span style={metricLabelStyle}>{label}</span><span style={metricValueStyle}>{value}</span></div>);
}

const backdropStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(26, 26, 26, 0.42)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'var(--font-body)' };
const modalStyle: CSSProperties = { background: 'var(--bg-elevated)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: 'min(960px, 100%)', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', color: 'var(--ink-1)', overflow: 'hidden' };
const headerStyle: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '20px 24px 16px', borderBottom: '0.5px solid var(--border-soft)' };
const titleStyle: CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '2px 0 0', color: 'var(--ink-1)', letterSpacing: '-0.01em' };
const subtitleStyle: CSSProperties = { fontSize: 13, color: 'var(--ink-3)', margin: '6px 0 0', lineHeight: 1.5, maxWidth: 540 };
const closeButtonStyle: CSSProperties = { background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 24, lineHeight: 1, cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-pill)', transition: 'background 0.15s', flexShrink: 0 };
const pickerRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: '0.5px solid var(--border-soft)', background: 'var(--bg-subtle)' };
const pickerLabelStyle: CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' };
const selectStyle: CSSProperties = { background: 'var(--bg-surface)', color: 'var(--ink-1)', border: '0.5px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '7px 12px', fontSize: 13, flex: 1, outline: 'none' };
const bodyStyle: CSSProperties = { flex: 1, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 16 };
const mutedStyle: CSSProperties = { color: 'var(--ink-3)', fontSize: 13, textAlign: 'center', padding: '32px 0' };
const errorStyle: CSSProperties = { color: 'var(--brand-pink)', fontSize: 13, padding: '10px 14px', border: '0.5px solid rgba(233, 78, 119, 0.3)', background: 'rgba(233, 78, 119, 0.08)', borderRadius: 'var(--radius-sm)' };
const tabsRowStyle: CSSProperties = { display: 'flex', gap: 6, borderBottom: '0.5px solid var(--border-soft)', paddingBottom: 10 };
const tabBase: CSSProperties = { background: 'transparent', border: '0.5px solid transparent', cursor: 'pointer', padding: '6px 14px', fontSize: 12, fontWeight: 500, borderRadius: 'var(--radius-pill)', transition: 'background 0.15s, color 0.15s, border-color 0.15s' };
const tabStyle: CSSProperties = { ...tabBase, color: 'var(--ink-3)' };
const tabActiveStyle: CSSProperties = { ...tabBase, color: 'var(--ink-1)', background: 'var(--bg-subtle)', border: '0.5px solid var(--border-medium)', fontWeight: 600 };
const metricsRowStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 };
const metricStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', background: 'var(--bg-subtle)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-md)' };
const metricLabelStyle: CSSProperties = { fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' };
const metricValueStyle: CSSProperties = { fontSize: 15, fontWeight: 600, color: 'var(--ink-1)' };
const setsScrollStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const setBlockStyle: CSSProperties = { background: 'var(--bg-surface)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: 14, boxShadow: 'var(--shadow-sm)' };
const setHeaderStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 8, borderBottom: '0.5px solid var(--border-soft)' };
const setNameStyle: CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.005em' };
const setMetaStyle: CSSProperties = { fontSize: 11, color: 'var(--ink-3)' };
const songListStyle: CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 0 };
const songRowStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '24px 1.4fr 1fr 90px 50px', gap: 10, padding: '7px 0', alignItems: 'baseline', borderBottom: '0.5px solid var(--border-soft)', fontSize: 13 };
const songIndexStyle: CSSProperties = { color: 'var(--ink-4)', fontSize: 12, fontWeight: 500, textAlign: 'right' };
const songTitleStyle: CSSProperties = { color: 'var(--ink-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const songArtistStyle: CSSProperties = { color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const songRoleStyle: CSSProperties = { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', background: 'var(--bg-subtle)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-pill)', padding: '2px 8px', textAlign: 'center', justifySelf: 'start' };
const songDurationStyle: CSSProperties = { color: 'var(--ink-3)', fontSize: 12, textAlign: 'right' };
const reasoningStyle: CSSProperties = { background: 'var(--bg-subtle)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: '10px 14px' };
const reasoningSummaryStyle: CSSProperties = { cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', listStyle: 'none' };
const reasoningListStyle: CSSProperties = { margin: '10px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 };
const reasoningItemStyle: CSSProperties = { fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 };
const footerStyle: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '0.5px solid var(--border-soft)', background: 'var(--bg-surface)' };
const ghostButtonStyle: CSSProperties = { background: 'var(--bg-surface)', color: 'var(--ink-2)', border: '0.5px solid var(--border-medium)', borderRadius: 'var(--radius-pill)', padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' };
const primaryButtonStyle: CSSProperties = { background: 'var(--brand-pink)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'filter 0.15s' };
const primaryButtonDisabledStyle: CSSProperties = { ...primaryButtonStyle, background: 'var(--ink-4)', cursor: 'default' };
