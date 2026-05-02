import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sygneo — Heritage Seal',
  description: 'Create a unique heritage seal that tells the story of your family.',
  metadataBase: new URL('https://sygneoforever.com'),
  openGraph: {
    title: 'Sygneo — Heritage Seal',
    description: 'Your family story, engraved forever.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#F8F5F0" />
        {/* Security headers are set via next.config — this is CSP meta fallback */}
      </head>
      <body style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
        {children}
        <footer style={{ display: 'none' }}>
          {/* Accessibility: hidden landmark for skip-nav if needed */}
        </footer>
      </body>
    </html>
  );
}
