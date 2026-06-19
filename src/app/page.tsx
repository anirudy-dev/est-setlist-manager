'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Homepage — auto-redirects to /dashboard.
 *
 * The password gate was removed; this page sets the est-auth flag (so the
 * existing auth checks in dashboard + stage pass) and bounces to /dashboard.
 *
 * If we ever want to restore the password, this file is the only thing that
 * needs changing — the dashboard + stage still call localStorage.getItem.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('est-auth', 'true');
    router.replace('/dashboard');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        color: '#666',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.2em',
        fontSize: 11,
        textTransform: 'uppercase',
      }}
    >
      Loading…
    </div>
  );
}
