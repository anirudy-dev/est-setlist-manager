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
      {/* Background noise texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(255,61,110,0.08) 0%, transparent 60%),
                            radial-gradient(ellipse at 80% 30%, rgba(0,180,255,0.06) 0%, transparent 60%)`,
        }}
      />

      {/* Horizontal stripe lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="w-64 md:w-80 animate-fade-in">
          <Image src="/logo.png" alt="Every Second Tuesday" width={320} height={320} className="w-full" priority />
        </div>

        {/* Login card */}
        <div
          className="w-full animate-slide-up"
          style={{
            background: '#141414',
            border: '1px solid #252525',
            padding: '2rem',
          }}
        >
          <p
            className="text-center mb-6 uppercase tracking-widest text-xs"
            style={{ color: '#888', fontFamily: 'var(--font-body)' }}
          >
            Band Access Only
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <input
                type="password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                className="w-full px-4 py-3 text-center text-lg tracking-widest"
                style={{
                  background: '#0a0a0a',
                  border: '1px solid #333',
                  color: '#fff',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  letterSpacing: '0.3em',
                }}
                onFocus={e => { e.target.style.borderColor = '#ff3d6e'; }}
                onBlur={e => { e.target.style.borderColor = '#333'; }}
              />
            </div>

            {error && (
              <p className="text-center text-sm" style={{ color: '#ff3d6e', fontFamily: 'var(--font-body)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !pw}
              className="w-full py-3 text-sm font-bold uppercase tracking-widest transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                letterSpacing: '0.15em',
                background: loading ? '#333' : '#fff',
                color: '#000',
                border: 'none',
                cursor: loading ? 'default' : 'pointer',
                opacity: !pw ? 0.5 : 1,
              }}
            >
              {loading ? '...' : 'Enter'}
            </button>
          </form>
        </div>

        <p className="text-xs text-center" style={{ color: '#444', fontFamily: 'var(--font-body)' }}>
          nostalgic party rock from the &apos;70s — 2010s
        </p>
      </div>
    </div>
  );
}
