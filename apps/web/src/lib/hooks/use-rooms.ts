'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ApiResponse, ApiMeta } from '@/types';
import type {
  Room,
  RoomQuery,
  CreateRoomInput,
  UpdateRoomInput,
  ChangeStatusInput,
  ChangeCleaningInput,
} from '@/types/room';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const ROOM_KEYS = {
  all: ['rooms'] as const,
  list: (params: RoomQuery) => ['rooms', 'list', params] as const,
  detail: (id: string) => ['rooms', 'detail', id] as const,
};

// ─── useRooms ─────────────────────────────────────────────────────────────────

type RoomsResponse = ApiResponse<Room[]> & { meta: ApiMeta };

export function useRooms(params: RoomQuery = {}) {
  return useQuery({
    queryKey: ROOM_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      };
      if (params.typeId) query['typeId'] = params.typeId;
      if (params.statusId) query['statusId'] = params.statusId;
      if (params.cleaningStatusId) query['cleaningStatusId'] = params.cleaningStatusId;
      if (params.areaId) query['areaId'] = params.areaId;
      if (params.keyword) query['keyword'] = params.keyword;

      const res = await api.get<RoomsResponse>('/rooms', { params: query });
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── useRoom (detail) ─────────────────────────────────────────────────────────

export function useRoom(id: string | null) {
  return useQuery({
    queryKey: ROOM_KEYS.detail(id ?? ''),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Room>>(`/rooms/${id}`);
      return res.data.data;
    },
    enabled: id !== null,
    staleTime: 0,
  });
}

// ─── useCreateRoom ────────────────────────────────────────────────────────────

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateRoomInput) => {
      const res = await api.post<ApiResponse<Room>>('/rooms', body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROOM_KEYS.all });
    },
  });
}

// ─── useUpdateRoom ────────────────────────────────────────────────────────────

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateRoomInput }) => {
      const res = await api.patch<ApiResponse<Room>>(`/rooms/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROOM_KEYS.all });
    },
  });
}

// ─── useDeleteRoom ────────────────────────────────────────────────────────────

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/rooms/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROOM_KEYS.all });
    },
  });
}

// ─── useChangeRoomStatus ──────────────────────────────────────────────────────

export function useChangeRoomStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ChangeStatusInput }) => {
      const res = await api.patch<ApiResponse<Room>>(`/rooms/${id}/status`, body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROOM_KEYS.all });
    },
  });
}

// ─── useChangeRoomCleaning ────────────────────────────────────────────────────

export function useChangeRoomCleaning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ChangeCleaningInput }) => {
      const res = await api.patch<ApiResponse<Room>>(`/rooms/${id}/cleaning`, body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROOM_KEYS.all });
    },
  });
}
