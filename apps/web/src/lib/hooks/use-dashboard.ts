import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { DashboardQuery, DashboardResponse } from '@/types/dashboard';

export const DASHBOARD_KEYS = {
  all: ['dashboard'] as const,
  detail: (p: DashboardQuery) => ['dashboard', 'detail', p] as const,
};

export function useDashboard(params: DashboardQuery) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.detail(params),
    queryFn: async () => {
      const res = await api.get<{ data: DashboardResponse }>('/dashboard', { params });
      return res.data.data;
    },
    enabled: !!params.from && !!params.to,
    staleTime: 30_000,
  });
}
