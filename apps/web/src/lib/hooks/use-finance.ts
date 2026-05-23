'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ApiResponse, ApiMeta } from '@/types';
import type {
  FinanceTx,
  FinanceSummary,
  BookingPayment,
  FinanceListQuery,
  FinanceSummaryQuery,
  BookingPaymentQuery,
  CreateFinanceTxInput,
  UpdateFinanceTxInput,
} from '@/types/finance';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const FINANCE_KEYS = {
  all: ['finance'] as const,
  list: (p: FinanceListQuery) => ['finance', 'list', p] as const,
  detail: (id: string) => ['finance', 'detail', id] as const,
  summary: (p: FinanceSummaryQuery) => ['finance', 'summary', p] as const,
  bookingPayments: (p: BookingPaymentQuery) => ['finance', 'booking-payments', p] as const,
};

// ─── useFinanceTxs ─────────────────────────────────────────────────────────────

type FinanceListResponse = ApiResponse<FinanceTx[]> & { meta: ApiMeta };

export function useFinanceTxs(params: FinanceListQuery = {}) {
  return useQuery({
    queryKey: FINANCE_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      };
      if (params.type) query['type'] = params.type;
      if (params.groupId) query['groupId'] = params.groupId;
      if (params.bookingId) query['bookingId'] = params.bookingId;
      if (params.methodId) query['methodId'] = params.methodId;
      if (params.from) query['from'] = params.from;
      if (params.to) query['to'] = params.to;
      if (params.keyword) query['keyword'] = params.keyword;

      const res = await api.get<FinanceListResponse>('/finance', { params: query });
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── useFinanceTx ─────────────────────────────────────────────────────────────

export function useFinanceTx(id: string) {
  return useQuery({
    queryKey: FINANCE_KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<ApiResponse<FinanceTx>>(`/finance/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

// ─── useFinanceSummary ─────────────────────────────────────────────────────────

export function useFinanceSummary(params: FinanceSummaryQuery = {}) {
  return useQuery({
    queryKey: FINANCE_KEYS.summary(params),
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (params.from) query['from'] = params.from;
      if (params.to) query['to'] = params.to;

      const res = await api.get<ApiResponse<FinanceSummary>>('/finance/summary', {
        params: query,
      });
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

// ─── useFinanceBookingPayments ────────────────────────────────────────────────

type BookingPaymentsResponse = ApiResponse<BookingPayment[]> & { meta: ApiMeta };

export function useFinanceBookingPayments(params: BookingPaymentQuery = {}) {
  return useQuery({
    queryKey: FINANCE_KEYS.bookingPayments(params),
    queryFn: async () => {
      const query: Record<string, string | number> = {};
      if (params.from) query['from'] = params.from;
      if (params.to) query['to'] = params.to;
      if (params.limit) query['limit'] = params.limit;

      const res = await api.get<BookingPaymentsResponse>('/finance/booking-payments', {
        params: query,
      });
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── useCreateFinanceTx ───────────────────────────────────────────────────────

export function useCreateFinanceTx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateFinanceTxInput) => {
      const res = await api.post<ApiResponse<FinanceTx>>('/finance', body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
    },
  });
}

// ─── useUpdateFinanceTx ───────────────────────────────────────────────────────

export function useUpdateFinanceTx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateFinanceTxInput }) => {
      const res = await api.patch<ApiResponse<FinanceTx>>(`/finance/${id}`, body);
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.detail(id) });
    },
  });
}

// ─── useDeleteFinanceTx ───────────────────────────────────────────────────────

export function useDeleteFinanceTx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/finance/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
    },
  });
}
