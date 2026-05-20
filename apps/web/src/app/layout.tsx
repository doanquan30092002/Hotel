import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hotel Management',
  description: 'Quản lý khách sạn / homestay',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-tone="2">
      <body>{children}</body>
    </html>
  );
}
