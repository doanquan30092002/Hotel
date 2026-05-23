'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ApiResponse, ApiMeta } from '@/types';
import type { Staff, StaffListQuery, CreateStaffInput, UpdateStaffInput } from '@/types/staff';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const STAFF_KEYS = {
  all: ['staff'] as const,
  list: (p: StaffListQuery) => ['staff', 'list', p] as const,
  detail: (id: string) => ['staff', 'detail', id] as const,
};

// ─── useStaffs ────────────────────────────────────────────────────────────────

type StaffListResponse = ApiResponse<Staff[]> & { meta: ApiMeta };

export function useStaffs(params: StaffListQuery = {}) {
  return useQuery({
    queryKey: STAFF_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number | boolean> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      };
      if (params.positionId) query['positionId'] = params.positionId;
      if (params.active !== undefined) query['active'] = params.active;
      if (params.keyword) query['keyword'] = params.keyword;

      const res = await api.get<StaffListResponse>('/staff', { params: query });
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── useStaff ─────────────────────────────────────────────────────────────────

export function useStaff(id: string) {
  return useQuery({
    queryKey: STAFF_KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Staff>>(`/staff/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

// ─── useCreateStaff ───────────────────────────────────────────────────────────

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateStaffInput) => {
      const res = await api.post<ApiResponse<Staff>>('/staff', body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STAFF_KEYS.all });
    },
  });
}

// ─── useUpdateStaff ───────────────────────────────────────────────────────────

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateStaffInput }) => {
      const res = await api.patch<ApiResponse<Staff>>(`/staff/${id}`, body);
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: STAFF_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: STAFF_KEYS.detail(id) });
    },
  });
}

// ─── useDeleteStaff ───────────────────────────────────────────────────────────

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/staff/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STAFF_KEYS.all });
    },
  });
}
