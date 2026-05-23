'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ApiResponse, ApiMeta } from '@/types';
import type { Service, CreateServiceInput, UpdateServiceInput } from '@/types/service';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const SERVICE_KEYS = {
  all: ['services'] as const,
  list: (params: ServicesParams) => ['services', 'list', params] as const,
  detail: (id: string) => ['services', 'detail', id] as const,
};

// ─── Params ───────────────────────────────────────────────────────────────────

export type ServicesParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  groupId?: string;
  unitId?: string;
  active?: boolean;
};

// ─── useServices ──────────────────────────────────────────────────────────────

type ServicesResponse = ApiResponse<Service[]> & { meta: ApiMeta };

export function useServices(params: ServicesParams = {}) {
  return useQuery({
    queryKey: SERVICE_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number | boolean> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      };
      if (params.keyword) query['keyword'] = params.keyword;
      if (params.groupId) query['groupId'] = params.groupId;
      if (params.unitId) query['unitId'] = params.unitId;
      if (params.active !== undefined) query['active'] = params.active;

      const res = await api.get<ServicesResponse>('/services', { params: query });
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── useService ───────────────────────────────────────────────────────────────

export function useService(id: string) {
  return useQuery({
    queryKey: SERVICE_KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Service>>(`/services/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

// ─── useCreateService ─────────────────────────────────────────────────────────

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateServiceInput) => {
      const res = await api.post<ApiResponse<Service>>('/services', body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICE_KEYS.all });
    },
  });
}

// ─── useUpdateService ─────────────────────────────────────────────────────────

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateServiceInput }) => {
      const res = await api.patch<ApiResponse<Service>>(`/services/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICE_KEYS.all });
    },
  });
}

// ─── useDeleteService ─────────────────────────────────────────────────────────

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/services/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICE_KEYS.all });
    },
  });
}
