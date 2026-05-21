'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { User } from '@/types';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (params: { accessToken: string; refreshToken: string; user: User }) => void;
  clear: () => void;
  hydrate: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ accessToken, refreshToken, user }) => {
        set({ accessToken, refreshToken, user });
      },
      clear: () => {
        set({ user: null, accessToken: null, refreshToken: null });
      },
      hydrate: () => {
        // hydration happens automatically via persist middleware
      },
    }),
    {
      name: 'hotel.auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
