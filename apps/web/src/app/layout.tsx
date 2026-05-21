import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Hotel Management',
  description: 'Quản lý khách sạn / homestay',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-tone="2">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
