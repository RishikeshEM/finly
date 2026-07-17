import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Finly - Personal Finance Tracker',
  description: 'Track every dollar, reach every goal. Your personal finance dashboard powered by intelligent insights.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
