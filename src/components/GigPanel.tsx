'use client';
import { useState, type CSSProperties } from 'react';
import { Gig } from '@/types';

interface Props {
  gigs: Gig[]; selectedGigId: string | null;
  onSelectGig: (id: string) => void;
  onCreate: (name: string, date: string, venue: string, notes: string) => void;
  onUpdate: (id: string, name: string, date: string, venue: string, notes: string) => void;
  onDelete: (id: string) => void; loading: boolean;
}

export default function GigPanel({ gigs, selectedGigId, onSelectGig, onCreate, onUpdate, onDelete, loading }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', venue: '', notes: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resetForm = () => setForm({ name: '', date: '', venue: '', notes: '' });
  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingId) { onUpdate(editingId, form.name, form.date, form.venue, form.notes); setEditingId(null); }
    else { onCreate(form.name, form.date, form.venue, form.notes); }
    resetForm(); setShowForm(false);
  };
  const startEdit = (gig: Gig, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(gig.id);
    setForm({ name: gig.name, date: gig.date || '', venue: gig.venue || '', notes: gig.notes || '' });
    setShowForm(true);
  };

  return (
    <div style={{ padding: '20px 20px 16px', borderBottom: '0.5px solid var(--border-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div className="label-eyebrow">Your gigs</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2, letterSpacing: '-0.01em' }}>Gigs &amp; Sets</div>
        </div>
        <button onClick={() => { setEditingId(null); resetForm(); setShowForm(!showForm); }} style={{ fontSize: 12, fontWeight: 600, background: showForm ? 'var(--bg-subtle)' : 'var(--brand-pink)', color: showForm ? 'var(--ink-2)' : '#fff', border: showForm ? '0.5px solid var(--border-medium)' : 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 'var(--radius-pill)', transition: 'filter 0.15s, background 0.15s' }} onMouseEnter={e => !showForm && (e.currentTarget.style.filter = 'brightness(0.96)')} onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>{showForm ? 'Cancel' : '+ New gig'}</button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input type="text" placeholder="Gig name (required)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
            <input type="text" placeholder="Venue" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} style={inputStyle} />
          </div>
          <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical', minHeight: 56 }} />
          <button onClick={handleSubmit} disabled={!form.name.trim()} style={{ background: form.name.trim() ? 'var(--brand-pink)' : 'var(--ink-4)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: form.name.trim() ? 'pointer' : 'default', padding: '10px 16px', borderRadius: 'var(--radius-pill)', alignSelf: 'flex-start', transition: 'filter 0.15s' }}>{editingId ? 'Update gig' : 'Create gig'}</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
        {loading && <div style={{ padding: '14px 4px', fontSize: 13, textAlign: 'center', color: 'var(--ink-3)' }}>Loading…</div>}
        {!loading && gigs.length === 0 && (
          <div style={{ padding: '20px 12px', fontSize: 13, textAlign: 'center', color: 'var(--ink-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', lineHeight: 1.6 }}>No gigs yet.<br />Tap <strong style={{ color: 'var(--ink-2)' }}>+ New gig</strong> to get started.</div>
        )}
        {gigs.map(gig => {
          const isSelected = selectedGigId === gig.id;
          return (
            <div key={gig.id} onClick={() => onSelectGig(gig.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', background: isSelected ? 'rgba(233, 78, 119, 0.06)' : 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: isSelected ? '0.5px solid rgba(233, 78, 119, 0.3)' : '0.5px solid var(--border-soft)', borderLeft: isSelected ? '3px solid var(--brand-pink)' : '3px solid transparent', transition: 'background 0.15s, border-color 0.15s' }} onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'var(--bg-subtle)')} onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'var(--bg-surface)')}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gig.name}</div>
                {(gig.date || gig.venue) && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[gig.date, gig.venue].filter(Boolean).join(' · ')}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={e => startEdit(gig, e)} title="Edit" style={iconBtn} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>Edit</button>
                {confirmDeleteId === gig.id ? (
                  <span style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => { onDelete(gig.id); setConfirmDeleteId(null); }} style={{ ...iconBtn, background: 'var(--brand-pink)', color: '#fff', border: 'none' }}>Delete</button>
                    <button onClick={() => setConfirmDeleteId(null)} style={iconBtn}>Cancel</button>
                  </span>
                ) : (<button onClick={() => setConfirmDeleteId(gig.id)} title="Delete gig" style={iconBtn} onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--brand-pink)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-3)'; }}>Delete</button>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = { background: 'var(--bg-surface)', border: '0.5px solid var(--border-medium)', color: 'var(--ink-1)', fontSize: 13, padding: '9px 12px', borderRadius: 'var(--radius-sm)', outline: 'none', width: '100%' };
const iconBtn: CSSProperties = { background: 'transparent', border: '0.5px solid var(--border-medium)', color: 'var(--ink-3)', fontSize: 11, fontWeight: 500, cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-pill)', transition: 'background 0.15s, color 0.15s' };
