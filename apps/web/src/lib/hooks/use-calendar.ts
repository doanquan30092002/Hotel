'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { CalendarQuery, CalendarResponse } from '@/types/calendar';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const CALENDAR_KEYS = {
  all: ['calendar'] as const,
  range: (params: CalendarQuery) => ['calendar', 'range', params] as const,
};

// ─── useCalendar ──────────────────────────────────────────────────────────────

export function useCalendar(params: CalendarQuery, enabled = true) {
  return useQuery({
    queryKey: CALENDAR_KEYS.range(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: CalendarResponse }>('/calendar', { params });
      return data.data;
    },
    enabled: enabled && !!params.from && !!params.to,
    staleTime: 30_000,
  });
}
