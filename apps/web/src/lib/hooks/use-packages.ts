'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ApiResponse, ApiMeta } from '@/types';
import type { Package, CreatePackageInput, UpdatePackageInput } from '@/types/package';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const PACKAGE_KEYS = {
  all: ['packages'] as const,
  list: (params: PackagesParams) => ['packages', 'list', params] as const,
  detail: (id: string) => ['packages', 'detail', id] as const,
};

// ─── Params ───────────────────────────────────────────────────────────────────

export type PackagesParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  applyType?: string;
  active?: boolean;
};

// ─── usePackages ──────────────────────────────────────────────────────────────

type PackagesResponse = ApiResponse<Package[]> & { meta: ApiMeta };

export function usePackages(params: PackagesParams = {}) {
  return useQuery({
    queryKey: PACKAGE_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number | boolean> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      };
      if (params.keyword) query['keyword'] = params.keyword;
      if (params.applyType) query['applyType'] = params.applyType;
      if (params.active !== undefined) query['active'] = params.active;

      const res = await api.get<PackagesResponse>('/packages', { params: query });
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── usePackage ───────────────────────────────────────────────────────────────

export function usePackage(id: string) {
  return useQuery({
    queryKey: PACKAGE_KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Package>>(`/packages/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

// ─── useCreatePackage ─────────────────────────────────────────────────────────

export function useCreatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePackageInput) => {
      const res = await api.post<ApiResponse<Package>>('/packages', body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.all });
    },
  });
}

// ─── useUpdatePackage ─────────────────────────────────────────────────────────

export function useUpdatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdatePackageInput }) => {
      const res = await api.patch<ApiResponse<Package>>(`/packages/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.all });
    },
  });
}

// ─── useDeletePackage ─────────────────────────────────────────────────────────

export function useDeletePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/packages/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PACKAGE_KEYS.all });
    },
  });
}
