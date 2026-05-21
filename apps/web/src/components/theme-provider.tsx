'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/auth-store';

const PERSIST_ROLES = ['ADMIN', 'MANAGER'];

type Tone = 1 | 2 | 3;

type ThemeContextValue = {
  tone: Tone;
  setTone: (tone: Tone) => void;
};

const ThemeContext = createContext<ThemeContextValue>({ tone: 2, setTone: () => undefined });

function parseTone(raw: unknown): Tone {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return 2;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tone, setToneState] = useState<Tone>(2);
  const accessToken = useAuthStore((s) => s.accessToken);
  const userRole = useAuthStore((s) => s.user?.role);

  // On mount: read from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('hotel.themeTone');
    const parsed = parseTone(stored);
    setToneState(parsed);
    document.documentElement.dataset['tone'] = String(parsed);
  }, []);

  const setTone = useCallback(
    (newTone: Tone) => {
      setToneState(newTone);
      if (typeof window !== 'undefined') {
        document.documentElement.dataset['tone'] = String(newTone);
        window.localStorage.setItem('hotel.themeTone', String(newTone));
      }
      if (accessToken && userRole && PERSIST_ROLES.includes(userRole)) {
        void api.put('/settings', { themeTone: newTone }).catch(() => {
          // best-effort — ignore failure
        });
      }
    },
    [accessToken, userRole],
  );

  return <ThemeContext.Provider value={{ tone, setTone }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
