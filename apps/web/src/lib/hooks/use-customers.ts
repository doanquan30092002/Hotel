'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ApiResponse, ApiMeta } from '@/types';
import type {
  Customer,
  CustomerQuery,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '@/types/customer';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const CUSTOMER_KEYS = {
  all: ['customers'] as const,
  list: (params: CustomerQuery) => ['customers', 'list', params] as const,
  detail: (id: string) => ['customers', 'detail', id] as const,
};

// ─── useCustomers ─────────────────────────────────────────────────────────────

type CustomersResponse = ApiResponse<Customer[]> & { meta: ApiMeta };

export function useCustomers(params: CustomerQuery = {}) {
  return useQuery({
    queryKey: CUSTOMER_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      };
      if (params.keyword) query['keyword'] = params.keyword;
      if (params.sourceId) query['sourceId'] = params.sourceId;

      const res = await api.get<CustomersResponse>('/customers', { params: query });
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── useCustomer (detail) ─────────────────────────────────────────────────────

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: CUSTOMER_KEYS.detail(id ?? ''),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
      return res.data.data;
    },
    enabled: id !== null,
    staleTime: 0,
  });
}

// ─── useCreateCustomer ────────────────────────────────────────────────────────

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCustomerInput) => {
      const res = await api.post<ApiResponse<Customer>>('/customers', body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.all });
    },
  });
}

// ─── useUpdateCustomer ────────────────────────────────────────────────────────

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateCustomerInput }) => {
      const res = await api.patch<ApiResponse<Customer>>(`/customers/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.all });
    },
  });
}

// ─── useDeleteCustomer ────────────────────────────────────────────────────────

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.all });
    },
  });
}
