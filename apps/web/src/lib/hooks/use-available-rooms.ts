'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { Room } from '@/types/room';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvailableRoomsQuery {
  checkIn: string;
  checkOut: string;
  typeId?: string;
  capacity?: number;
  keyword?: string;
}

export interface AvailableRoomsMeta {
  checkIn: string;
  checkOut: string;
  totalRooms: number;
  totalAvailable: number;
  totalBooked: number;
}

export interface AvailableRoomsResponse {
  data: Room[];
  meta: AvailableRoomsMeta;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const AVAILABLE_KEYS = {
  all: ['rooms-available'] as const,
  list: (params: AvailableRoomsQuery) => ['rooms-available', 'list', params] as const,
};

// ─── useAvailableRooms ────────────────────────────────────────────────────────

export function useAvailableRooms(params: AvailableRoomsQuery, enabled: boolean) {
  return useQuery({
    queryKey: AVAILABLE_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number> = {
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      };
      if (params.typeId) query['typeId'] = params.typeId;
      if (params.capacity) query['capacity'] = params.capacity;
      if (params.keyword) query['keyword'] = params.keyword;

      const res = await api.get<AvailableRoomsResponse>('/rooms/available', { params: query });
      return res.data;
    },
    enabled: enabled && !!params.checkIn && !!params.checkOut,
    staleTime: 30_000,
  });
}
