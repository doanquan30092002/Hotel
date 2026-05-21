'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/lib/auth/auth-store';
import { api } from '@/lib/api-client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import type { User, ApiResponse } from '@/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { accessToken, clear, setSession, refreshToken } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [checked, setChecked] = useState(false);
  // Track Zustand persist hydration: on the first server render the store
  // has null values; we wait one tick so localStorage can hydrate the store.
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand persist to rehydrate from localStorage
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!accessToken) {
      router.replace('/dang-nhap');
      return;
    }
    // Verify token with /auth/me
    api
      .get<ApiResponse<User>>('/auth/me')
      .then(({ data }) => {
        // Update user in store if stale
        setSession({
          accessToken: accessToken,
          refreshToken: refreshToken ?? '',
          user: data.data,
        });
        setChecked(true);
      })
      .catch(() => {
        clear();
        router.replace('/dang-nhap');
      });
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated || !checked) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar onToggleSidebar={() => setCollapsed((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
