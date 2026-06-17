'use client';

/**
 * SongRowPopover — assign mini-set + banter slot to a setlist song.
 *
 * Anchored, click-away dismissible. Updates a single SetlistSong. Stays small
 * — only what's needed to set or clear the two fields. The visible chips on
 * the song row stay on the row; this popover only edits.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SetlistSong, BanterPosition, MiniSet } from '@/types';
import { banterPositionLabel } from '@/types';

interface Props {
  song: SetlistSong;
  anchorRect: DOMRect;
  onClose: () => void;
  onSave: (patch: Partial<SetlistSong>) => void;
}

const POSITIONS: BanterPosition[] = ['intro', 'pre_solo', 'post_solo', 'outro', 'breakdown', 'tag'];
const MINI_SETS: MiniSet[] = ['A', 'B', 'C', 'D'];

export default function SongRowPopover({ song, anchorRect, onClose, onSave }: Props) {
  const [miniSet, setMiniSet] = useState<MiniSet | null>(song.mini_set ?? null);
  const [hasBanter, setHasBanter] = useState<boolean>(!!song.banter_slot);
  const [banterPosition, setBanterPosition] = useState<BanterPosition>(song.banter_slot?.position ?? 'intro');
  const [banterDuration, setBanterDuration] = useState<number>(song.banter_slot?.duration_seconds ?? 12);
  const [banterNotes, setBanterNotes] = useState<string>(song.banter_slot?.notes ?? '');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      if (popoverRef.current.contains(e.target as Node)) return;
      handleSaveAndClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const t = setTimeout(() => document.addEventListener('mousedown', onDocClick), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveAndClose = () => {
    onSave({
      mini_set: miniSet,
      banter_slot: hasBanter ? {
        position: banterPosition,
        duration_seconds: Math.max(3, Math.min(120, banterDuration | 0)),
        notes: banterNotes.trim() || undefined,
      } : null,
    });
    onClose();
  };

  const popWidth = 300;
  const left = Math.max(8, Math.min(window.innerWidth - popWidth - 8, anchorRect.left));
  const top = Math.min(window.innerHeight - 480, anchorRect.bottom + 6);

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed', left, top, width: popWidth, zIndex: 10000,
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: 16, fontFamily: 'var(--font-body)', color: 'var(--ink-1)',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      <div>
        <div className="label-eyebrow" style={{ fontSize: 10, marginBottom: 2 }}>Song settings</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.005em' }}>Mini-set &amp; banter</div>
      </div>

      <div style={blockStyle}>
        <div style={sectionLabelStyle}>Mini-set</div>
        <div style={pillRowStyle}>
          <button onClick={() => setMiniSet(null)} style={miniSet === null ? pillActiveStyle : pillStyle}>None</button>
          {MINI_SETS.map((m) => (<button key={m} onClick={() => setMiniSet(m)} style={miniSet === m ? pillActiveStyle : pillStyle}>{m}</button>))}
        </div>
        <div style={helpStyle}>Groups songs into back-to-back blocks within a Set. Stage mode shows e.g. "Set 1A".</div>
      </div>

      <div style={blockStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={sectionLabelStyle}>Banter slot</span>
          <button onClick={() => setHasBanter((v) => !v)} style={hasBanter ? toggleOnStyle : toggleOffStyle} aria-pressed={hasBanter}>
            <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.18)', transform: hasBanter ? 'translateX(14px)' : 'translateX(0px)', transition: 'transform 0.15s' }} />
          </button>
        </div>

        {hasBanter && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={fieldLabelStyle}>Position</div>
              <select value={banterPosition} onChange={(e) => setBanterPosition(e.target.value as BanterPosition)} style={inputStyle}>
                {POSITIONS.map((p) => (<option key={p} value={p}>{banterPositionLabel(p)}</option>))}
              </select>
            </div>
            <div>
              <div style={{ ...fieldLabelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Duration</span>
                <span style={{ color: 'var(--brand-pink)', fontWeight: 600, fontSize: 12 }}>{banterDuration}s</span>
              </div>
              <input type="range" min={3} max={60} step={1} value={banterDuration} onChange={(e) => setBanterDuration(parseInt(e.target.value, 10))} style={sliderStyle} />
            </div>
            <div>
              <div style={fieldLabelStyle}>Notes (optional)</div>
              <textarea value={banterNotes} onChange={(e) => setBanterNotes(e.target.value)} placeholder='e.g. "shoutout to the bartender"' rows={2} style={textareaStyle} />
            </div>
            <div style={helpStyle}>Stage mode shows position + duration. Notes appear in italic if present.</div>
          </div>
        )}
      </div>

      <div style={footerRowStyle}>
        <button onClick={onClose} style={ghostBtnStyle} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}>Cancel</button>
        <button onClick={handleSaveAndClose} style={primaryBtnStyle} onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.96)')} onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>Save</button>
      </div>
    </div>
  );
}

const blockStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };
const sectionLabelStyle: CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-2)' };
const fieldLabelStyle: CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 4 };
const helpStyle: CSSProperties = { fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.45 };
const pillRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 };
const pillBase: CSSProperties = { background: 'var(--bg-surface)', color: 'var(--ink-2)', border: '0.5px solid var(--border-medium)', borderRadius: 'var(--radius-pill)', padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'background 0.12s, color 0.12s, border-color 0.12s', minWidth: 40 };
const pillStyle: CSSProperties = { ...pillBase };
const pillActiveStyle: CSSProperties = { ...pillBase, background: 'var(--brand-teal)', color: '#fff', borderColor: 'var(--brand-teal)', fontWeight: 600 };
const toggleOffStyle: CSSProperties = { width: 32, height: 18, borderRadius: 'var(--radius-pill)', background: 'rgba(0,0,0,0.12)', border: 'none', padding: 2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', transition: 'background 0.15s' };
const toggleOnStyle: CSSProperties = { ...toggleOffStyle, background: 'var(--brand-teal)' };
const inputStyle: CSSProperties = { background: 'var(--bg-surface)', border: '0.5px solid var(--border-medium)', color: 'var(--ink-1)', fontSize: 13, padding: '8px 10px', borderRadius: 'var(--radius-sm)', outline: 'none', width: '100%' };
const sliderStyle: CSSProperties = { width: '100%', accentColor: 'var(--brand-pink)', cursor: 'pointer' };
const textareaStyle: CSSProperties = { width: '100%', background: 'var(--bg-surface)', color: 'var(--ink-1)', border: '0.5px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', fontSize: 12, resize: 'vertical', outline: 'none', lineHeight: 1.45 };
const footerRowStyle: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 };
const ghostBtnStyle: CSSProperties = { background: 'var(--bg-surface)', color: 'var(--ink-2)', border: '0.5px solid var(--border-medium)', borderRadius: 'var(--radius-pill)', padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' };
const primaryBtnStyle: CSSProperties = { background: 'var(--brand-pink)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '7px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'filter 0.15s' };
