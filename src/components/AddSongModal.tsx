'use client';
import { useState, type CSSProperties } from 'react';
import { addCustomSong } from '@/lib/supabase';

const MOODS = [
  { label: 'Energetic', value: 'energetic', color: '#FF4444' },
  { label: 'Heavy', value: 'heavy', color: '#8B0000' },
  { label: 'Groovy', value: 'groovy', color: '#FF8C00' },
  { label: 'Melodic', value: 'melodic', color: '#4169E1' },
  { label: 'Psychedelic', value: 'psychedelic', color: '#9400D3' },
  { label: 'Classic Rock', value: 'classic_rock', color: '#228B22' },
  { label: 'Nostalgic', value: 'nostalgic', color: '#DAA520' },
  { label: 'Anthemic', value: 'anthemic', color: '#DC143C' },
];
const DECADES = ['1960s', '1970s', '1980s', '1990s', '2000s'];

interface Props { onClose: () => void; onAdded: () => void; }

export default function AddSongModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState({ title: '', artist: '', decade: '1970s', year: 1975, duration: '4:00', mood: 'energetic', mood_color: '#FF4444' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleMoodChange = (value: string) => { const selected = MOODS.find(m => m.value === value); setForm(f => ({ ...f, mood: value, mood_color: selected?.color || '#FF4444' })); };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.artist.trim()) { setError('Title and Artist are required.'); return; }
    if (!/^\d+:\d{2}$/.test(form.duration)) { setError('Duration must be in M:SS format (e.g. 4:32)'); return; }
    setSaving(true);
    try { await addCustomSong(form); onAdded(); onClose(); }
    catch (e) { setError('Failed to save. Try again.'); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26, 26, 26, 0.42)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', border: '0.5px solid var(--border-soft)', width: '100%', maxWidth: 460, padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div>
          <div className="label-eyebrow" style={{ marginBottom: 4 }}>New song</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink-1)', margin: 0, letterSpacing: '-0.01em' }}>Add a song to the library</h2>
          <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: '6px 0 0', lineHeight: 1.5 }}>Fill in the basics. You can refine cues later when you generate sets.</p>
        </div>

        {error && <div style={{ background: 'rgba(233, 78, 119, 0.08)', color: 'var(--brand-pink)', border: '0.5px solid rgba(233, 78, 119, 0.3)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Song title"><input style={inputStyle} placeholder="e.g. Mr. Brightside" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></Field>
          <Field label="Artist"><input style={inputStyle} placeholder="e.g. The Killers" value={form.artist} onChange={e => setForm(f => ({ ...f, artist: e.target.value }))} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
            <Field label="Decade"><select style={inputStyle} value={form.decade} onChange={e => setForm(f => ({ ...f, decade: e.target.value }))}>{DECADES.map(d => <option key={d} value={d}>{d}</option>)}</select></Field>
            <Field label="Year"><input style={inputStyle} type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} /></Field>
          </div>
          <Field label="Duration (M:SS)"><input style={inputStyle} placeholder="4:32" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} /></Field>
          <Field label="Mood"><select style={inputStyle} value={form.mood} onChange={e => handleMoodChange(e.target.value)}>{MOODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onClose} style={{ background: 'var(--bg-surface)', color: 'var(--ink-2)', border: '0.5px solid var(--border-medium)', borderRadius: 'var(--radius-pill)', padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ background: 'var(--brand-pink)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'filter 0.15s' }} onMouseEnter={e => !saving && (e.currentTarget.style.filter = 'brightness(0.96)')} onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>{saving ? 'Saving…' : 'Add song'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: CSSProperties = { background: 'var(--bg-surface)', border: '0.5px solid var(--border-medium)', color: 'var(--ink-1)', fontSize: 14, padding: '10px 12px', borderRadius: 'var(--radius-sm)', outline: 'none', width: '100%' };
