import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'career-ops',
  description: 'AI job search command center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
