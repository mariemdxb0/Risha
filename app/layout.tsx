import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Risha — a quiet place for thoughts',
  description: 'A minimal, local-first notes app by Risha.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
