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
  anchorRect: DOMRect;          // pixel coords of the chip the user clicked
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

  // Click-away
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      if (popoverRef.current.contains(e.target as Node)) return;
      handleSaveAndClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Defer so the opening click doesn't immediately close us.
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

  // Position: anchor below the chip; clamp to viewport.
  const popWidth = 320;
  const left = Math.max(8, Math.min(window.innerWidth - popWidth - 8, anchorRect.left));
  const top = Math.min(window.innerHeight - 460, anchorRect.bottom + 6);

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        left, top, width: popWidth,
        zIndex: 10_000,
        background: '#0F0F11',
        border: '1px solid #2a2a32',
        borderRadius: 10,
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
        padding: 14,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        color: '#F5F2EE',
      }}
    >
      <div style={eyebrowStyle}>Song settings</div>

      {/* Mini-set */}
      <div style={blockStyle}>
        <div style={labelStyle}>Mini-set</div>
        <div style={pillRowStyle}>
          <button
            onClick={() => setMiniSet(null)}
            style={miniSet === null ? pillActiveStyle : pillStyle}
          >None</button>
          {MINI_SETS.map((m) => (
            <button
              key={m}
              onClick={() => setMiniSet(m)}
              style={miniSet === m ? pillActiveStyle : pillStyle}
            >{m}</button>
          ))}
        </div>
        <div style={helpStyle}>
          Groups songs into back-to-back blocks within a Set. Stage mode shows e.g. "Set 1A".
        </div>
      </div>

      {/* Banter */}
      <div style={blockStyle}>
        <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Banter slot</span>
          <button
            onClick={() => setHasBanter((v) => !v)}
            style={hasBanter ? togglePillActiveStyle : togglePillStyle}
          >
            {hasBanter ? 'ON' : 'OFF'}
          </button>
        </div>

        {hasBanter && (
          <>
            <div style={{ ...labelStyle, marginTop: 8, fontSize: 9 }}>Position</div>
            <div style={pillRowStyle}>
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setBanterPosition(p)}
                  style={banterPosition === p ? pillActiveStyle : pillStyle}
                >
                  {banterPositionLabel(p)}
                </button>
              ))}
            </div>

            <div style={{ ...labelStyle, marginTop: 10, fontSize: 9 }}>
              Duration: <span style={{ color: '#F5F2EE' }}>{banterDuration}s</span>
            </div>
            <input
              type="range"
              min={3} max={60} step={1}
              value={banterDuration}
              onChange={(e) => setBanterDuration(parseInt(e.target.value, 10))}
              style={sliderStyle}
            />

            <div style={{ ...labelStyle, marginTop: 10, fontSize: 9 }}>Notes (optional)</div>
            <textarea
              value={banterNotes}
              onChange={(e) => setBanterNotes(e.target.value)}
              placeholder='e.g. "shoutout to the bartender"'
              rows={2}
              style={textareaStyle}
            />

            <div style={helpStyle}>
              Stage mode shows position + duration as a chip. Notes appear in italic if present.
            </div>
          </>
        )}
      </div>

      <div style={footerRowStyle}>
        <button onClick={onClose} style={ghostBtnStyle}>Cancel</button>
        <button onClick={handleSaveAndClose} style={primaryBtnStyle}>Save</button>
      </div>
    </div>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────

const eyebrowStyle: CSSProperties = {
  fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
  color: 'rgba(245,242,238,0.5)', marginBottom: 10,
};

const blockStyle: CSSProperties = {
  marginBottom: 12,
};

const labelStyle: CSSProperties = {
  fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'rgba(245,242,238,0.5)', marginBottom: 6,
};

const helpStyle: CSSProperties = {
  fontSize: 10, color: 'rgba(245,242,238,0.4)', marginTop: 6, lineHeight: 1.4,
};

const pillRowStyle: CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 4,
};

const pillBase: CSSProperties = {
  background: 'transparent', color: 'rgba(245,242,238,0.7)',
  border: '0.5px solid rgba(245,242,238,0.18)',
  borderRadius: 14, padding: '4px 10px',
  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
};

const pillStyle: CSSProperties = { ...pillBase };
const pillActiveStyle: CSSProperties = {
  ...pillBase,
  background: '#ffd93d', color: '#0F0F11', borderColor: '#ffd93d', fontWeight: 600,
};

const togglePillBase: CSSProperties = {
  background: 'transparent', border: '0.5px solid rgba(245,242,238,0.25)',
  color: 'rgba(245,242,238,0.55)', padding: '2px 10px', borderRadius: 12,
  fontSize: 10, letterSpacing: '0.16em', cursor: 'pointer', fontFamily: 'inherit',
};

const togglePillStyle: CSSProperties = { ...togglePillBase };
const togglePillActiveStyle: CSSProperties = {
  ...togglePillBase, background: '#4ECDC4', color: '#0F0F11', borderColor: '#4ECDC4', fontWeight: 600,
};

const sliderStyle: CSSProperties = {
  width: '100%', accentColor: '#ffd93d',
};

const textareaStyle: CSSProperties = {
  width: '100%', background: '#16161a', color: '#F5F2EE',
  border: '0.5px solid #2a2a32', borderRadius: 6,
  padding: 8, fontSize: 11, fontFamily: 'inherit',
  resize: 'vertical',
};

const footerRowStyle: CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6,
};

const ghostBtnStyle: CSSProperties = {
  background: 'transparent', color: 'rgba(245,242,238,0.7)',
  border: '0.5px solid #2a2a32', padding: '6px 12px',
  fontSize: 11, cursor: 'pointer', borderRadius: 6, fontFamily: 'inherit',
};

const primaryBtnStyle: CSSProperties = {
  background: '#ffd93d', color: '#0F0F11', border: 'none',
  padding: '6px 16px', fontSize: 11, fontWeight: 600,
  cursor: 'pointer', borderRadius: 6, fontFamily: 'inherit',
};
