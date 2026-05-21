'use client';

import type { UserRole } from '@/types';
import { useAuthStore } from './auth-store';

export function useAuth() {
  const { user, accessToken, refreshToken, setSession, clear } = useAuthStore();

  const isAuthenticated = accessToken !== null && user !== null;

  function hasRole(...roles: UserRole[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
  }

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    hasRole,
    setSession,
    clear,
  };
}
