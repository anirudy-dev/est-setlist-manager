import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EST Setlist Manager',
  description: 'Every Second Tuesday — Setlist Manager',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
