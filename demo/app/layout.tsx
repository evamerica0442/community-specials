import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Community specials — component demo',
  description: 'Visual test page for the community-specials strip and grid.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#efe8d8', color: '#1f1710' }}>
        {children}
      </body>
    </html>
  );
}
