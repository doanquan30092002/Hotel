'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ApiResponse, ApiMeta } from '@/types';
import type {
  Upload,
  UploadStats,
  UploadListQuery,
  CreateUploadInput,
  UpdateUploadInput,
} from '@/types/upload';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const UPLOAD_KEYS = {
  all: ['uploads'] as const,
  list: (p: UploadListQuery) => ['uploads', 'list', p] as const,
  stats: () => ['uploads', 'stats'] as const,
  detail: (id: string) => ['uploads', 'detail', id] as const,
};

// ─── useUploads ───────────────────────────────────────────────────────────────

type UploadListResponse = ApiResponse<Upload[]> & { meta: ApiMeta };

export function useUploads(params: UploadListQuery = {}) {
  return useQuery({
    queryKey: UPLOAD_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      };
      if (params.kind) query['kind'] = params.kind;
      if (params.entityType) query['entityType'] = params.entityType;
      if (params.entityId) query['entityId'] = params.entityId;
      if (params.keyword) query['keyword'] = params.keyword;

      const res = await api.get<UploadListResponse>('/uploads', { params: query });
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── useUpload ────────────────────────────────────────────────────────────────

export function useUpload(id: string) {
  return useQuery({
    queryKey: UPLOAD_KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Upload>>(`/uploads/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

// ─── useUploadStats ───────────────────────────────────────────────────────────

export function useUploadStats() {
  return useQuery({
    queryKey: UPLOAD_KEYS.stats(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<UploadStats>>('/uploads/stats');
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

// ─── useCreateUpload ──────────────────────────────────────────────────────────

export function useCreateUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateUploadInput) => {
      const res = await api.post<ApiResponse<Upload>>('/uploads', body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: UPLOAD_KEYS.all });
    },
  });
}

// ─── useUpdateUpload ──────────────────────────────────────────────────────────

export function useUpdateUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateUploadInput }) => {
      const res = await api.patch<ApiResponse<Upload>>(`/uploads/${id}`, body);
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: UPLOAD_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: UPLOAD_KEYS.detail(id) });
    },
  });
}

// ─── useDeleteUpload ──────────────────────────────────────────────────────────

export function useDeleteUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/uploads/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: UPLOAD_KEYS.all });
    },
  });
}
