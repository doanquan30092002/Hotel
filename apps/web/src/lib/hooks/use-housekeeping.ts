'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ApiResponse, ApiMeta } from '@/types';
import type {
  HousekeepingTask,
  HousekeepingListQuery,
  CreateHousekeepingTaskInput,
  UpdateHousekeepingTaskInput,
} from '@/types/housekeeping';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const HOUSEKEEPING_KEYS = {
  all: ['housekeeping'] as const,
  list: (params: HousekeepingListQuery) => ['housekeeping', 'list', params] as const,
  detail: (id: string) => ['housekeeping', 'detail', id] as const,
};

// ─── useHousekeepingTasks ─────────────────────────────────────────────────────

type HousekeepingListResponse = ApiResponse<HousekeepingTask[]> & { meta: ApiMeta };

export function useHousekeepingTasks(params: HousekeepingListQuery = {}) {
  return useQuery({
    queryKey: HOUSEKEEPING_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      };
      if (params.keyword) query['keyword'] = params.keyword;
      if (params.statusId) query['statusId'] = params.statusId;
      if (params.roomId) query['roomId'] = params.roomId;
      if (params.assigneeId) query['assigneeId'] = params.assigneeId;
      if (params.priority) query['priority'] = params.priority;
      if (params.from) query['from'] = params.from;
      if (params.to) query['to'] = params.to;

      const res = await api.get<HousekeepingListResponse>('/housekeeping', { params: query });
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── useHousekeepingTask ──────────────────────────────────────────────────────

export function useHousekeepingTask(id: string) {
  return useQuery({
    queryKey: HOUSEKEEPING_KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<ApiResponse<HousekeepingTask>>(`/housekeeping/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

// ─── useCreateHousekeepingTask ────────────────────────────────────────────────

export function useCreateHousekeepingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateHousekeepingTaskInput) => {
      const res = await api.post<ApiResponse<HousekeepingTask>>('/housekeeping', body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HOUSEKEEPING_KEYS.all });
    },
  });
}

// ─── useUpdateHousekeepingTask ────────────────────────────────────────────────

export function useUpdateHousekeepingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateHousekeepingTaskInput }) => {
      const res = await api.patch<ApiResponse<HousekeepingTask>>(`/housekeeping/${id}`, body);
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: HOUSEKEEPING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: HOUSEKEEPING_KEYS.detail(id) });
    },
  });
}

// ─── useDeleteHousekeepingTask ────────────────────────────────────────────────

export function useDeleteHousekeepingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/housekeeping/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HOUSEKEEPING_KEYS.all });
    },
  });
}

// ─── useChangeHousekeepingStatus ──────────────────────────────────────────────

export function useChangeHousekeepingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, statusId }: { id: string; statusId: string }) => {
      const res = await api.patch<ApiResponse<HousekeepingTask>>(`/housekeeping/${id}/status`, {
        statusId,
      });
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: HOUSEKEEPING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: HOUSEKEEPING_KEYS.detail(id) });
    },
  });
}

// ─── useAssignHousekeepingTask ────────────────────────────────────────────────

export function useAssignHousekeepingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assigneeId }: { id: string; assigneeId: string | null }) => {
      const res = await api.patch<ApiResponse<HousekeepingTask>>(`/housekeeping/${id}/assign`, {
        assigneeId,
      });
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: HOUSEKEEPING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: HOUSEKEEPING_KEYS.detail(id) });
    },
  });
}
