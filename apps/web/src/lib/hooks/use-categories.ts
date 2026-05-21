'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { api } from '@/lib/api-client';
import type { ApiResponse, ApiMeta } from '@/types';
import type { Category, CategoryGroup, GroupCount } from '@/types/category';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const CATEGORY_KEYS = {
  all: ['categories'] as const,
  list: (params: CategoriesParams) => ['categories', 'list', params] as const,
  groupCounts: () => ['categories', 'group-counts'] as const,
};

// ─── Params ───────────────────────────────────────────────────────────────────

export type CategoriesParams = {
  group?: CategoryGroup | '';
  active?: boolean;
  keyword?: string;
  page?: number;
  pageSize?: number;
};

// ─── useCategories ────────────────────────────────────────────────────────────

type CategoriesResponse = ApiResponse<Category[]> & { meta: ApiMeta };

export function useCategories(params: CategoriesParams = {}) {
  return useQuery({
    queryKey: CATEGORY_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number | boolean> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      };
      if (params.group) query['group'] = params.group;
      if (params.active !== undefined) query['active'] = params.active;
      if (params.keyword) query['keyword'] = params.keyword;

      const res = await api.get<CategoriesResponse>('/categories', { params: query });
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── useGroupCounts ───────────────────────────────────────────────────────────

export function useGroupCounts() {
  return useQuery({
    queryKey: CATEGORY_KEYS.groupCounts(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<GroupCount[]>>('/categories/group-counts');
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export type CreateCategoryBody = {
  group: CategoryGroup;
  code: string;
  name: string;
  sortOrder?: number;
  active?: boolean;
};

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCategoryBody) => {
      const res = await api.post<ApiResponse<Category>>('/categories', body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export type UpdateCategoryBody = Partial<Omit<CreateCategoryBody, 'group'>>;

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateCategoryBody }) => {
      const res = await api.patch<ApiResponse<Category>>(`/categories/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
    },
  });
}

// ─── Toggle active ────────────────────────────────────────────────────────────

export function useToggleActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<ApiResponse<Category>>(`/categories/${id}/toggle-active`);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError<{ message: string }>;
      console.error('Toggle active failed:', axiosErr.response?.data?.message);
    },
  });
}
