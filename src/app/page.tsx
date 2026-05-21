'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'EST2026@!';

export default function LoginPage() {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (pw === PASSWORD) {
        localStorage.setItem('est-auth', 'true');
        router.push('/dashboard');
      } else {
        setError('Wrong password. Try again.');
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#080808' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(255,61,110,0.07) 0%, transparent 60%),
                            radial-gradient(ellipse at 80% 30%, rgba(0,180,255,0.05) 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm px-6">

        {/* Logo — full width, no box, no border */}
        <div className="w-full animate-fade-in">
          <Image
            src="/logo.png"
            alt="Every Second Tuesday"
            width={600}
            height={600}
            className="w-full h-auto"
            priority
          />
        </div>

        {/* Login form */}
        <div className="w-full animate-slide-up">
          <p
            className="text-center mb-4 uppercase tracking-widest text-xs"
            style={{ color: '#666', fontFamily: 'var(--font-body)' }}
          >
            Band Access Only
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              className="w-full px-4 py-4 text-center text-lg"
              style={{
                background: '#111',
                border: '1px solid #2a2a2a',
                color: '#fff',
                outline: 'none',
                fontFamily: 'var(--font-body)',
                letterSpacing: '0.3em',
                fontSize: '1rem',
              }}
              onFocus={e => { e.target.style.borderColor = '#ff3d6e'; }}
              onBlur={e => { e.target.style.borderColor = '#2a2a2a'; }}
            />

            {error && (
              <p className="text-center text-sm" style={{ color: '#ff3d6e', fontFamily: 'var(--font-body)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !pw}
              className="w-full py-4 transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.4rem',
                letterSpacing: '0.2em',
                background: loading || !pw ? '#1a1a1a' : '#fff',
                color: loading || !pw ? '#444' : '#000',
                border: 'none',
                cursor: loading || !pw ? 'default' : 'pointer',
              }}
            >
              {loading ? '...' : 'ENTER'}
            </button>
          </form>
        </div>

        <p className="text-xs text-center" style={{ color: '#333', fontFamily: 'var(--font-body)' }}>
          nostalgic party rock from the &apos;70s — 2010s
        </p>
      </div>
    </div>
  );
}
