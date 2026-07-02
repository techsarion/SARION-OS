import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sarion Team OS — Work smarter. Achieve more.',
  description: 'The enterprise operating system for work, meetings, people, and performance.',
};

// viewportFit: 'cover' lets env(safe-area-inset-*) resolve on notched devices.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions (e.g. Bitdefender's
          bis_register / __processed_* attributes) mutate <body> before React
          hydrates, producing a harmless dev-only mismatch warning. */}
      <body className="font-sans antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
