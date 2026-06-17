'use client';

/**
 * VenueScoutModal — research a venue and save the intel.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { upsertVenueProfile } from '@/lib/supabase';

interface ScoutBrief {
  venue_name: string;
  city: string | null;
  typical_crowd_age_range: string | null;
  capacity_estimate: number | null;
  observed_peak_time: string | null;
  vibe: string | null;
  recommended_crowd_model_id: string | null;
  music_notes: string[];
  do_list: string[];
  dont_list: string[];
  sources: string[];
  raw_summary: string;
}

interface Props {
  venueName: string;
  city: string;
  onClose: () => void;
  onSaved: (brief: ScoutBrief) => void;
}

export default function VenueScoutModal({ venueName, city, onClose, onSaved }: Props) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<ScoutBrief | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const runScout = async () => {
    setRunning(true);
    setError(null);
    try {
      const resp = await fetch('/api/venue-scout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ venueName, city }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.hint ? `${data.error} — ${data.hint}` : (data.error ?? 'Scout failed'));
        return;
      }
      setBrief(data.brief as ScoutBrief);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scout failed');
    } finally { setRunning(false); }
  };

  const handleSave = async () => {
    if (!brief) return;
    setSaving(true);
    try {
      const notes = [
        brief.vibe ? `VIBE: ${brief.vibe}` : null,
        brief.music_notes.length > 0 ? `\nMUSIC NOTES:\n- ${brief.music_notes.join('\n- ')}` : null,
        brief.do_list.length > 0 ? `\nDO:\n- ${brief.do_list.join('\n- ')}` : null,
        brief.dont_list.length > 0 ? `\nDON'T:\n- ${brief.dont_list.join('\n- ')}` : null,
        brief.sources.length > 0 ? `\nSOURCES:\n${brief.sources.join('\n')}` : null,
      ].filter(Boolean).join('\n');

      await upsertVenueProfile({
        venue_name: brief.venue_name || venueName,
        city: brief.city ?? city ?? null,
        default_crowd_model_id: brief.recommended_crowd_model_id ?? null,
        observed_peak_time: brief.observed_peak_time ?? null,
        typical_crowd_age_range: brief.typical_crowd_age_range ?? null,
        capacity_estimate: brief.capacity_estimate ?? null,
        notes,
      });
      onSaved(brief);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()} role="dialog">
        <div style={headerStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="label-eyebrow" style={{ marginBottom: 4 }}>Venue scout</div>
            <h2 style={titleStyle}>{brief ? brief.venue_name : venueName}</h2>
            {(city || brief?.city) && <div style={subtitleStyle}>{brief?.city ?? city}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={closeButtonStyle}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>×</button>
        </div>

        <div style={bodyStyle}>
          {!brief && !running && !error && (
            <div style={emptyStateStyle}>
              <div style={{ fontSize: 36, lineHeight: 1 }}>🔍</div>
              <p style={emptyTextStyle}>Research this venue. We&apos;ll pull Google reviews, social posts, and local mentions, then synthesize a brief — crowd, peak time, vibe, music notes, banter cues. Takes 20–45 seconds.</p>
              <button onClick={runScout} style={primaryButtonStyle}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.96)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>Run scout</button>
            </div>
          )}

          {running && (
            <div style={runningStyle}>
              <div style={spinnerStyle} />
              <p style={runningTextStyle}>Searching reviews, social posts, and popular times…</p>
              <p style={runningSubtextStyle}>This usually takes 20–45 seconds.</p>
            </div>
          )}

          {error && !running && (
            <div style={errorBlockStyle}>
              <div style={errorTitleStyle}>Scout failed</div>
              <div style={errorTextStyle}>{error}</div>
              <button onClick={runScout} style={secondaryButtonStyle}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}>Retry</button>
            </div>
          )}

          {brief && !running && (
            <div style={briefStyle}>
              <div style={factsGridStyle}>
                {brief.vibe && <Fact label="Vibe" value={brief.vibe} />}
                {brief.typical_crowd_age_range && <Fact label="Age" value={brief.typical_crowd_age_range} />}
                {brief.observed_peak_time && <Fact label="Peak" value={formatPeak(brief.observed_peak_time)} />}
                {brief.capacity_estimate && <Fact label="Capacity" value={`~${brief.capacity_estimate}`} />}
                {brief.recommended_crowd_model_id && (<Fact label="Crowd model" value={brief.recommended_crowd_model_id.replace(/_/g, ' ')} highlight />)}
              </div>

              {brief.raw_summary && (<Section label="Summary"><p style={summaryStyle}>{brief.raw_summary}</p></Section>)}
              {brief.music_notes.length > 0 && (<Section label="Music notes" accent="var(--brand-blue)"><BulletList items={brief.music_notes} /></Section>)}
              {brief.do_list.length > 0 && (<Section label="Do" accent="var(--brand-teal)"><BulletList items={brief.do_list} bulletColor="var(--brand-teal)" /></Section>)}
              {brief.dont_list.length > 0 && (<Section label="Don't" accent="var(--brand-pink)"><BulletList items={brief.dont_list} bulletColor="var(--brand-pink)" /></Section>)}

              {brief.sources.length > 0 && (
                <div style={sourcesBlockStyle}>
                  <div style={sourcesHeaderStyle}>
                    <span className="label-eyebrow">Sources</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{brief.sources.length}</span>
                  </div>
                  <div style={sourceChipsStyle}>
                    {brief.sources.map((s, i) => (
                      <a key={i} href={s} target="_blank" rel="noopener noreferrer" style={sourceChipStyle}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}>
                        <span style={{ opacity: 0.6 }}>🔗</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{prettyHost(s)}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={footerStyle}>
          {brief && (
            <>
              <button onClick={runScout} style={secondaryButtonStyle} disabled={running}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}>Re-scout</button>
              <button onClick={handleSave} style={saving ? primaryButtonDisabledStyle : primaryButtonStyle} disabled={saving}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.filter = 'brightness(0.96)'; }}
                onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>{saving ? 'Saving…' : 'Save to venue profile'}</button>
            </>
          )}
          {!brief && (
            <button onClick={onClose} style={secondaryButtonStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (<div style={highlight ? factHighlightStyle : factStyle}><span style={factLabelStyle}>{label}</span><span style={highlight ? factValueHighlightStyle : factValueStyle}>{value}</span></div>);
}

function Section({ label, accent, children }: { label: string; accent?: string; children: React.ReactNode }) {
  return (<div style={sectionStyle}><div style={{ ...sectionLabelStyle, color: accent ?? 'var(--ink-3)' }}>{label}</div>{children}</div>);
}

function BulletList({ items, bulletColor }: { items: string[]; bulletColor?: string }) {
  return (
    <ul style={bulletListStyle}>
      {items.map((it, i) => (
        <li key={i} style={bulletItemStyle}>
          <span style={{ ...bulletDotStyle, background: bulletColor ?? 'var(--ink-4)' }} />
          <span style={{ flex: 1 }}>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function formatPeak(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h)) return t;
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${hour12}:${String(m).padStart(2, '0')}${ampm}`;
}

function prettyHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname && u.pathname !== '/' ? u.pathname : '');
  } catch { return url; }
}

const backdropStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(26, 26, 26, 0.42)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'var(--font-body)' };
const modalStyle: CSSProperties = { background: 'var(--bg-elevated)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: 'min(720px, 100%)', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', color: 'var(--ink-1)', overflow: 'hidden' };
const headerStyle: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '20px 24px 16px', borderBottom: '0.5px solid var(--border-soft)' };
const titleStyle: CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '2px 0 0', color: 'var(--ink-1)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis' };
const subtitleStyle: CSSProperties = { fontSize: 13, color: 'var(--ink-3)', marginTop: 4 };
const closeButtonStyle: CSSProperties = { background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 24, lineHeight: 1, cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-pill)', transition: 'background 0.15s', flexShrink: 0 };
const bodyStyle: CSSProperties = { flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 };
const emptyStateStyle: CSSProperties = { textAlign: 'center', padding: '24px 0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 };
const emptyTextStyle: CSSProperties = { fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, maxWidth: 460 };
const runningStyle: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '48px 0' };
const spinnerStyle: CSSProperties = { width: 38, height: 38, borderRadius: '50%', border: '3px solid rgba(233, 78, 119, 0.15)', borderTopColor: 'var(--brand-pink)', animation: 'venue-scout-spin 0.9s linear infinite' };
const runningTextStyle: CSSProperties = { fontSize: 13, color: 'var(--ink-2)', margin: 0, fontWeight: 500 };
const runningSubtextStyle: CSSProperties = { fontSize: 12, color: 'var(--ink-3)', margin: 0 };
const errorBlockStyle: CSSProperties = { padding: 16, borderRadius: 'var(--radius-md)', border: '0.5px solid rgba(233, 78, 119, 0.3)', background: 'rgba(233, 78, 119, 0.06)', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' };
const errorTitleStyle: CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brand-pink)' };
const errorTextStyle: CSSProperties = { fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 };
const briefStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const factsGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 6 };
const factStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-soft)', background: 'var(--bg-subtle)' };
const factHighlightStyle: CSSProperties = { ...factStyle, border: '0.5px solid rgba(233, 78, 119, 0.35)', background: 'rgba(233, 78, 119, 0.06)' };
const factLabelStyle: CSSProperties = { fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' };
const factValueStyle: CSSProperties = { fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 };
const factValueHighlightStyle: CSSProperties = { ...factValueStyle, color: 'var(--brand-pink)', fontWeight: 600, textTransform: 'capitalize' };
const sectionStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0 4px', borderTop: '0.5px solid var(--border-soft)' };
const sectionLabelStyle: CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' };
const summaryStyle: CSSProperties = { fontSize: 13.5, color: 'var(--ink-1)', lineHeight: 1.6, margin: 0 };
const bulletListStyle: CSSProperties = { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 };
const bulletItemStyle: CSSProperties = { fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.5, display: 'flex', gap: 10, alignItems: 'baseline' };
const bulletDotStyle: CSSProperties = { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, transform: 'translateY(-2px)' };
const sourcesBlockStyle: CSSProperties = { marginTop: 6, padding: '12px 14px', background: 'var(--bg-subtle)', border: '0.5px solid var(--border-soft)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 10 };
const sourcesHeaderStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const sourceChipsStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 };
const sourceChipStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-subtle)', border: '0.5px solid var(--border-medium)', color: 'var(--ink-2)', fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 'var(--radius-pill)', textDecoration: 'none', transition: 'background 0.15s', maxWidth: '100%' };
const footerStyle: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '0.5px solid var(--border-soft)', background: 'var(--bg-surface)' };
const secondaryButtonStyle: CSSProperties = { background: 'var(--bg-surface)', color: 'var(--ink-2)', border: '0.5px solid var(--border-medium)', borderRadius: 'var(--radius-pill)', padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' };
const primaryButtonStyle: CSSProperties = { background: 'var(--brand-pink)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'filter 0.15s' };
const primaryButtonDisabledStyle: CSSProperties = { ...primaryButtonStyle, background: 'var(--ink-4)', cursor: 'default' };

if (typeof document !== 'undefined' && !document.getElementById('venue-scout-spin')) {
  const style = document.createElement('style');
  style.id = 'venue-scout-spin';
  style.textContent = '@keyframes venue-scout-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}
