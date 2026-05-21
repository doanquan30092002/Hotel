'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/lib/auth/auth-store';

export default function HomePage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (accessToken) {
      router.replace('/tong-quan');
    } else {
      router.replace('/dang-nhap');
    }
  }, [accessToken, router]);

  return null;
}
