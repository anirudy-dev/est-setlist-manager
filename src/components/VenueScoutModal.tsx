'use client';

/**
 * VenueScoutModal — research a venue and save the intel.
 *
 * Two-state UX:
 *   1. "Scout" — runs /api/venue-scout, shows progress
 *   2. "Brief" — shows structured intel + "Save to gig" button
 *
 * Saving writes a venue_profiles row keyed by venue_name (upserts on match)
 * with the recommended crowd model + peak time + notes. The generator will
 * read this next time GENERATE runs for this venue.
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
    } finally {
      setRunning(false);
    }
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()} role="dialog">
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>Venue scout</div>
            <h2 style={titleStyle}>{venueName}</h2>
            {city && <div style={subtitleStyle}>{city}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={closeButtonStyle}>×</button>
        </div>

        <div style={bodyStyle}>
          {!brief && !running && !error && (
            <div style={emptyStateStyle}>
              <p style={emptyTextStyle}>
                Research this venue. Pulls Google reviews, social posts,
                and local mentions. Synthesizes a brief: crowd, peak time,
                vibe, music notes, banter cues. Takes 20-45 seconds.
              </p>
              <button onClick={runScout} style={primaryButtonStyle}>Run scout</button>
            </div>
          )}

          {running && (
            <div style={runningStyle}>
              <div style={spinnerStyle} />
              <p style={runningTextStyle}>
                Searching reviews, social, popular times…
              </p>
            </div>
          )}

          {error && !running && (
            <div style={errorBlockStyle}>
              <div style={errorTitleStyle}>Scout failed</div>
              <div style={errorTextStyle}>{error}</div>
              <button onClick={runScout} style={ghostButtonStyle}>Retry</button>
            </div>
          )}

          {brief && !running && (
            <div style={briefStyle}>
              {/* Headline facts */}
              <div style={factsGridStyle}>
                {brief.vibe && <Fact label="Vibe" value={brief.vibe} />}
                {brief.typical_crowd_age_range && <Fact label="Age" value={brief.typical_crowd_age_range} />}
                {brief.observed_peak_time && <Fact label="Peak" value={formatPeak(brief.observed_peak_time)} />}
                {brief.capacity_estimate && <Fact label="Capacity" value={`~${brief.capacity_estimate}`} />}
                {brief.recommended_crowd_model_id && (
                  <Fact label="Model" value={brief.recommended_crowd_model_id.replace(/_/g, ' ')} highlight />
                )}
              </div>

              {/* Summary */}
              {brief.raw_summary && (
                <Section label="Summary">
                  <p style={summaryStyle}>{brief.raw_summary}</p>
                </Section>
              )}

              {/* Music notes */}
              {brief.music_notes.length > 0 && (
                <Section label="Music notes">
                  <BulletList items={brief.music_notes} />
                </Section>
              )}

              {/* Do / Don't */}
              {brief.do_list.length > 0 && (
                <Section label="Do" color={DO_COLOR}>
                  <BulletList items={brief.do_list} color={DO_COLOR} />
                </Section>
              )}
              {brief.dont_list.length > 0 && (
                <Section label="Don't" color={DONT_COLOR}>
                  <BulletList items={brief.dont_list} color={DONT_COLOR} />
                </Section>
              )}

              {/* Sources */}
              {brief.sources.length > 0 && (
                <details style={sourcesStyle}>
                  <summary style={sourcesSummaryStyle}>
                    Sources ({brief.sources.length})
                  </summary>
                  <ul style={sourcesListStyle}>
                    {brief.sources.map((s, i) => (
                      <li key={i} style={sourceItemStyle}>
                        <a href={s} target="_blank" rel="noopener noreferrer" style={sourceLinkStyle}>{s}</a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <div style={footerStyle}>
          {brief && (
            <>
              <button onClick={runScout} style={ghostButtonStyle} disabled={running}>
                Re-scout
              </button>
              <button onClick={handleSave} style={primaryButtonStyle} disabled={saving}>
                {saving ? 'Saving…' : 'Save to venue profile'}
              </button>
            </>
          )}
          {!brief && (
            <button onClick={onClose} style={ghostButtonStyle}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={highlight ? factHighlightStyle : factStyle}>
      <span style={factLabelStyle}>{label}</span>
      <span style={factValueStyle}>{value}</span>
    </div>
  );
}

function Section({ label, color, children }: { label: string; color?: string; children: React.ReactNode }) {
  return (
    <div style={sectionStyle}>
      <div style={{ ...sectionLabelStyle, color: color ?? 'rgba(245,242,238,0.5)' }}>{label}</div>
      {children}
    </div>
  );
}

function BulletList({ items, color }: { items: string[]; color?: string }) {
  return (
    <ul style={bulletListStyle}>
      {items.map((it, i) => (
        <li key={i} style={{ ...bulletItemStyle, color: color ? hexToRgba(color, 0.85) : 'rgba(245,242,238,0.8)' }}>
          {it}
        </li>
      ))}
    </ul>
  );
}

function formatPeak(t: string): string {
  // "HH:MM:SS" → "12:15am"
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h)) return t;
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${hour12}:${String(m).padStart(2, '0')}${ampm}`;
}

function hexToRgba(hex: string, alpha: number): string {
  // Accepts "#RRGGBB"
  const m = hex.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 255;
  const g = (v >> 8) & 255;
  const b = v & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── styles ────────────────────────────────────────────────────────────────────

const DO_COLOR = '#4ECDC4';
const DONT_COLOR = '#FF6B6B';

const backdropStyle: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 10_000,
  background: 'rgba(0,0,0,0.72)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16,
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
};

const modalStyle: CSSProperties = {
  background: '#0F0F11', border: '1px solid #1f1f24', borderRadius: 12,
  width: 'min(720px, 100%)', maxHeight: 'calc(100vh - 32px)',
  display: 'flex', flexDirection: 'column', color: '#F5F2EE', overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  padding: '20px 24px 14px', borderBottom: '0.5px solid #1f1f24',
};

const eyebrowStyle: CSSProperties = {
  fontSize: 10, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase',
  color: 'rgba(245,242,238,0.45)',
};

const titleStyle: CSSProperties = {
  fontSize: 22, fontWeight: 500, margin: '6px 0 0', letterSpacing: '-0.018em',
};

const subtitleStyle: CSSProperties = {
  fontSize: 12, color: 'rgba(245,242,238,0.5)', marginTop: 4,
};

const closeButtonStyle: CSSProperties = {
  background: 'none', border: 'none', color: 'rgba(245,242,238,0.55)',
  fontSize: 28, lineHeight: 1, cursor: 'pointer', padding: '0 6px',
};

const bodyStyle: CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '20px 24px',
  display: 'flex', flexDirection: 'column', gap: 14,
};

const emptyStateStyle: CSSProperties = {
  textAlign: 'center', padding: '24px 0', display: 'flex',
  flexDirection: 'column', alignItems: 'center', gap: 16,
};

const emptyTextStyle: CSSProperties = {
  fontSize: 13, color: 'rgba(245,242,238,0.65)', lineHeight: 1.5,
  margin: 0, maxWidth: 440,
};

const runningStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
  padding: '40px 0',
};

const spinnerStyle: CSSProperties = {
  width: 32, height: 32, borderRadius: '50%',
  border: '2.5px solid rgba(255,217,61,0.2)',
  borderTopColor: '#ffd93d',
  animation: 'venue-scout-spin 1s linear infinite',
};

const runningTextStyle: CSSProperties = {
  fontSize: 12, color: 'rgba(245,242,238,0.55)',
  letterSpacing: '0.06em', margin: 0,
};

const errorBlockStyle: CSSProperties = {
  padding: 16, borderRadius: 8,
  border: '0.5px solid rgba(255,107,107,0.4)',
  background: 'rgba(255,107,107,0.06)',
  display: 'flex', flexDirection: 'column', gap: 10,
};

const errorTitleStyle: CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: '#ff6b6b',
};

const errorTextStyle: CSSProperties = {
  fontSize: 12, color: 'rgba(245,242,238,0.75)', lineHeight: 1.5,
};

const briefStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 14,
};

const factsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 8,
};

const factStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
  padding: '10px 12px', borderRadius: 6,
  border: '0.5px solid rgba(255,255,255,0.06)',
};

const factHighlightStyle: CSSProperties = {
  ...factStyle,
  border: '0.5px solid rgba(255,217,61,0.45)',
  background: 'rgba(255,217,61,0.06)',
};

const factLabelStyle: CSSProperties = {
  fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'rgba(245,242,238,0.45)',
};

const factValueStyle: CSSProperties = {
  fontSize: 13, color: '#F5F2EE',
};

const sectionStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8,
  padding: '12px 0',
  borderTop: '0.5px solid rgba(255,255,255,0.06)',
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase',
};

const summaryStyle: CSSProperties = {
  fontSize: 13, color: 'rgba(245,242,238,0.85)', lineHeight: 1.55, margin: 0,
};

const bulletListStyle: CSSProperties = {
  margin: 0, padding: '0 0 0 18px',
  display: 'flex', flexDirection: 'column', gap: 6,
};

const bulletItemStyle: CSSProperties = {
  fontSize: 12, lineHeight: 1.45,
};

const sourcesStyle: CSSProperties = {
  padding: 10, borderRadius: 6,
  border: '0.5px solid rgba(255,255,255,0.06)',
};

const sourcesSummaryStyle: CSSProperties = {
  fontSize: 11, cursor: 'pointer', letterSpacing: '0.08em',
  color: 'rgba(245,242,238,0.55)',
};

const sourcesListStyle: CSSProperties = {
  margin: '8px 0 0', paddingLeft: 18,
  display: 'flex', flexDirection: 'column', gap: 4,
};

const sourceItemStyle: CSSProperties = {
  fontSize: 10, lineHeight: 1.4,
};

const sourceLinkStyle: CSSProperties = {
  color: '#ffd93d', textDecoration: 'none',
  overflowWrap: 'anywhere',
};

const footerStyle: CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 8,
  padding: '14px 24px',
  borderTop: '0.5px solid #1f1f24',
};

const ghostButtonStyle: CSSProperties = {
  background: 'transparent', color: 'rgba(245,242,238,0.7)',
  border: '0.5px solid #2a2a32', padding: '8px 16px',
  fontSize: 12, cursor: 'pointer', borderRadius: 6, fontFamily: 'inherit',
};

const primaryButtonStyle: CSSProperties = {
  background: '#ffd93d', color: '#0F0F11', border: 'none',
  padding: '8px 18px', fontSize: 12, fontWeight: 600,
  letterSpacing: '0.06em', cursor: 'pointer', borderRadius: 6, fontFamily: 'inherit',
};

// Inject keyframes once (Next.js with no CSS module).
if (typeof document !== 'undefined' && !document.getElementById('venue-scout-spin')) {
  const style = document.createElement('style');
  style.id = 'venue-scout-spin';
  style.textContent = '@keyframes venue-scout-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}
