'use client';
import { useState } from 'react';
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

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddSongModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState({
    title: '',
    artist: '',
    decade: '1970s',
    year: 1975,
    duration: '4:00',
    mood: 'energetic',
    mood_color: '#FF4444',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleMoodChange = (value: string) => {
    const selected = MOODS.find(m => m.value === value);
    setForm(f => ({ ...f, mood: value, mood_color: selected?.color || '#FF4444' }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.artist.trim()) {
      setError('Title and Artist are required.');
      return;
    }
    // Validate duration format MM:SS
    if (!/^\d+:\d{2}$/.test(form.duration)) {
      setError('Duration must be in M:SS format (e.g. 4:32)');
      return;
    }
    setSaving(true);
    try {
      await addCustomSong(form);
      onAdded();
      onClose();
    } catch (e) {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-white font-bold text-xl" style={{ fontFamily: 'Bebas Neue' }}>
          ADD NEW SONG
        </h2>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="space-y-3">
          <input
            className="w-full bg-zinc-800 text-white border border-zinc-600 rounded px-3 py-2 text-sm"
            placeholder="Song Title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <input
            className="w-full bg-zinc-800 text-white border border-zinc-600 rounded px-3 py-2 text-sm"
            placeholder="Artist *"
            value={form.artist}
            onChange={e => setForm(f => ({ ...f, artist: e.target.value }))}
          />
          <div className="flex gap-2">
            <select
              className="flex-1 bg-zinc-800 text-white border border-zinc-600 rounded px-3 py-2 text-sm"
              value={form.decade}
              onChange={e => setForm(f => ({ ...f, decade: e.target.value }))}
            >
              {DECADES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              className="w-24 bg-zinc-800 text-white border border-zinc-600 rounded px-3 py-2 text-sm"
              placeholder="Year"
              type="number"
              value={form.year}
              onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))}
            />
          </div>
          <input
            className="w-full bg-zinc-800 text-white border border-zinc-600 rounded px-3 py-2 text-sm"
            placeholder="Duration (e.g. 4:32)"
            value={form.duration}
            onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
          />
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Mood</label>
            <select
              className="w-full bg-zinc-800 text-white border border-zinc-600 rounded px-3 py-2 text-sm"
              value={form.mood}
              onChange={e => handleMoodChange(e.target.value)}
            >
              {MOODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded px-4 py-2 text-sm font-bold"
          >
            {saving ? 'Saving...' : 'Add Song'}
          </button>
        </div>
      </div>
    </div>
  );
}
