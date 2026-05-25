'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ApiResponse, ApiMeta } from '@/types';
import type {
  Payroll,
  PayrollListQuery,
  CreatePayrollInput,
  UpdatePayrollInput,
  GeneratePayrollInput,
  GeneratePayrollResult,
} from '@/types/payroll';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const PAYROLL_KEYS = {
  all: ['payroll'] as const,
  list: (p: PayrollListQuery) => ['payroll', 'list', p] as const,
  detail: (id: string) => ['payroll', 'detail', id] as const,
};

// ─── usePayrolls ──────────────────────────────────────────────────────────────

type PayrollListResponse = ApiResponse<Payroll[]> & { meta: ApiMeta };

export function usePayrolls(params: PayrollListQuery = {}) {
  return useQuery({
    queryKey: PAYROLL_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      };
      if (params.staffId) query['staffId'] = params.staffId;
      if (params.statusId) query['statusId'] = params.statusId;
      if (params.month) query['month'] = params.month;
      if (params.keyword) query['keyword'] = params.keyword;

      const res = await api.get<PayrollListResponse>('/payroll', { params: query });
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── usePayroll ───────────────────────────────────────────────────────────────

export function usePayroll(id: string) {
  return useQuery({
    queryKey: PAYROLL_KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Payroll>>(`/payroll/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

// ─── useCreatePayroll ─────────────────────────────────────────────────────────

export function useCreatePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePayrollInput) => {
      const res = await api.post<ApiResponse<Payroll>>('/payroll', body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.all });
    },
  });
}

// ─── useGeneratePayroll ───────────────────────────────────────────────────────

export function useGeneratePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: GeneratePayrollInput) => {
      const res = await api.post<ApiResponse<GeneratePayrollResult>>('/payroll/generate', body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.all });
    },
  });
}

// ─── useUpdatePayroll ─────────────────────────────────────────────────────────

export function useUpdatePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdatePayrollInput }) => {
      const res = await api.patch<ApiResponse<Payroll>>(`/payroll/${id}`, body);
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.detail(id) });
    },
  });
}

// ─── useChangePayrollStatus ───────────────────────────────────────────────────

export function useChangePayrollStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, statusId }: { id: string; statusId: string }) => {
      const res = await api.patch<ApiResponse<Payroll>>(`/payroll/${id}/status`, { statusId });
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.detail(id) });
    },
  });
}

// ─── useExportPayroll ─────────────────────────────────────────────────────────

export function useExportPayroll() {
  return useMutation({
    mutationFn: async (params: Omit<PayrollListQuery, 'page' | 'pageSize'>) => {
      const query: Record<string, string> = {};
      if (params.staffId) query['staffId'] = params.staffId;
      if (params.statusId) query['statusId'] = params.statusId;
      if (params.month) query['month'] = params.month;
      if (params.keyword) query['keyword'] = params.keyword;

      const res = await api.get('/payroll/export', {
        params: query,
        responseType: 'blob',
      });

      const monthPart = params.month ?? 'tat-ca';
      const filename = `bang-luong-${monthPart}.xlsx`;
      const contentType =
        (res.headers['content-type'] as string | undefined) ??
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([res.data as BlobPart], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}

// ─── useDeletePayroll ─────────────────────────────────────────────────────────

export function useDeletePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payroll/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.all });
    },
  });
}
