// ABOUTME: Root layout for next-app
// ABOUTME: Provides HTML structure and global styles

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'next-app',
  description: 'Built with Super Sandbox',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
