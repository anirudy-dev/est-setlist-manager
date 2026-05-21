'use client';
import { useState } from 'react';
import { Gig } from '@/types';

interface Props {
  gigs: Gig[];
  selectedGigId: string | null;
  onSelectGig: (id: string) => void;
  onCreate: (name: string, date: string, venue: string, notes: string) => void;
  onUpdate: (id: string, name: string, date: string, venue: string, notes: string) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export default function GigPanel({ gigs, selectedGigId, onSelectGig, onCreate, onUpdate, onDelete, loading }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', venue: '', notes: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resetForm = () => setForm({ name: '', date: '', venue: '', notes: '' });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      onUpdate(editingId, form.name, form.date, form.venue, form.notes);
      setEditingId(null);
    } else {
      onCreate(form.name, form.date, form.venue, form.notes);
    }
    resetForm();
    setShowForm(false);
  };

  const startEdit = (gig: Gig, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(gig.id);
    setForm({ name: gig.name, date: gig.date || '', venue: gig.venue || '', notes: gig.notes || '' });
    setShowForm(true);
  };

  const inputStyle = {
    background: '#0a0a0a',
    border: '1px solid #252525',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    padding: '6px 10px',
    outline: 'none',
    width: '100%',
  };

  return (
    <div style={{ borderBottom: '1px solid #1e1e1e' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #1e1e1e' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.1em', color: '#fff' }}>
          GIGS
        </span>
        <button
          onClick={() => { setEditingId(null); resetForm(); setShowForm(!showForm); }}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '10px',
            background: showForm ? '#1a1a1a' : '#fff',
            color: showForm ? '#888' : '#000',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 10px',
            letterSpacing: '0.1em',
          }}
        >
          {showForm ? 'CANCEL' : '+ NEW GIG'}
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="p-3" style={{ background: '#0d0d0d', borderBottom: '1px solid #1e1e1e' }}>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Gig name *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={inputStyle}
            />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
              <input type="text" placeholder="Venue" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} style={inputStyle} />
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <button
              onClick={handleSubmit}
              disabled={!form.name.trim()}
              style={{
                background: form.name.trim() ? '#fff' : '#222',
                color: form.name.trim() ? '#000' : '#444',
                fontFamily: 'var(--font-display)',
                fontSize: '0.9rem',
                letterSpacing: '0.1em',
                border: 'none',
                cursor: form.name.trim() ? 'pointer' : 'default',
                padding: '8px',
              }}
            >
              {editingId ? 'UPDATE GIG' : 'CREATE GIG'}
            </button>
          </div>
        </div>
      )}

      {/* Gig list */}
      <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
        {loading && (
          <div className="px-3 py-4 text-xs text-center" style={{ color: '#444', fontFamily: 'var(--font-body)' }}>
            Loading...
          </div>
        )}
        {!loading && gigs.length === 0 && (
          <div className="px-3 py-4 text-xs text-center" style={{ color: '#444', fontFamily: 'var(--font-body)' }}>
            No gigs yet. Create one above.
          </div>
        )}
        {gigs.map(gig => (
          <div
            key={gig.id}
            onClick={() => onSelectGig(gig.id)}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer group"
            style={{
              background: selectedGigId === gig.id ? '#1a1a1a' : 'transparent',
              borderBottom: '1px solid #141414',
              borderLeft: selectedGigId === gig.id ? '2px solid #fff' : '2px solid transparent',
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate" style={{ fontFamily: 'var(--font-body)', color: selectedGigId === gig.id ? '#fff' : '#aaa' }}>
                {gig.name}
              </div>
              {(gig.date || gig.venue) && (
                <div className="text-xs truncate mt-0.5" style={{ color: '#555' }}>
                  {[gig.date, gig.venue].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <button onClick={e => startEdit(gig, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '12px', padding: '2px 3px' }}>✎</button>
              {confirmDeleteId === gig.id ? (
                <span className="flex gap-1">
                  <button onClick={() => { onDelete(gig.id); setConfirmDeleteId(null); }} style={{ background: '#ff3d6e', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '9px', padding: '2px 5px', fontFamily: 'var(--font-body)' }}>DEL</button>
                  <button onClick={() => setConfirmDeleteId(null)} style={{ background: 'none', border: '1px solid #333', cursor: 'pointer', color: '#888', fontSize: '9px', padding: '2px 5px', fontFamily: 'var(--font-body)' }}>NO</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDeleteId(gig.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff3d6e44', fontSize: '14px', padding: '2px 3px' }}>×</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
