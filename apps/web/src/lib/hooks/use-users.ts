'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ApiResponse, ApiMeta, User } from '@/types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export type UsersParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  role?: string;
};

export const USER_KEYS = {
  all: ['users'] as const,
  list: (params: UsersParams) => ['users', 'list', params] as const,
};

// ─── useUsers ─────────────────────────────────────────────────────────────────

type UsersResponse = ApiResponse<User[]> & { meta: ApiMeta };

export function useUsers(params: UsersParams = {}) {
  return useQuery({
    queryKey: USER_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 100,
      };
      if (params.keyword) query['keyword'] = params.keyword;
      if (params.role) query['role'] = params.role;

      const res = await api.get<UsersResponse>('/users', { params: query });
      return res.data;
    },
    staleTime: 30_000,
  });
}
