'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ApiResponse, ApiMeta } from '@/types';
import type {
  Booking,
  BookingListQuery,
  CreateBookingInput,
  UpdateBookingInput,
  Payment,
  BookingPaymentInput,
} from '@/types/booking';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const BOOKING_KEYS = {
  all: ['bookings'] as const,
  list: (params: BookingListQuery) => ['bookings', 'list', params] as const,
  detail: (id: string) => ['bookings', 'detail', id] as const,
};

// ─── useBookings ──────────────────────────────────────────────────────────────

type BookingsResponse = ApiResponse<Booking[]> & { meta: ApiMeta };

export function useBookings(params: BookingListQuery = {}) {
  return useQuery({
    queryKey: BOOKING_KEYS.list(params),
    queryFn: async () => {
      const query: Record<string, string | number> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      };
      if (params.keyword) query['keyword'] = params.keyword;
      if (params.statusId) query['statusId'] = params.statusId;
      if (params.sourceId) query['sourceId'] = params.sourceId;
      if (params.customerId) query['customerId'] = params.customerId;
      if (params.roomId) query['roomId'] = params.roomId;
      if (params.from) query['from'] = params.from;
      if (params.to) query['to'] = params.to;

      const res = await api.get<BookingsResponse>('/bookings', { params: query });
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── useBooking ───────────────────────────────────────────────────────────────

export function useBooking(id: string) {
  return useQuery({
    queryKey: BOOKING_KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Booking>>(`/bookings/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

// ─── useCreateBooking ─────────────────────────────────────────────────────────

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateBookingInput) => {
      const res = await api.post<ApiResponse<Booking>>('/bookings', body);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
    },
  });
}

// ─── useUpdateBooking ─────────────────────────────────────────────────────────

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateBookingInput }) => {
      const res = await api.patch<ApiResponse<Booking>>(`/bookings/${id}`, body);
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(id) });
    },
  });
}

// ─── useDeleteBooking ─────────────────────────────────────────────────────────

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/bookings/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
    },
  });
}

// ─── useChangeBookingStatus ───────────────────────────────────────────────────

export function useChangeBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, statusId }: { id: string; statusId: string }) => {
      const res = await api.patch<ApiResponse<Booking>>(`/bookings/${id}/status`, { statusId });
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(id) });
    },
  });
}

// ─── useCheckInBooking ────────────────────────────────────────────────────────

export function useCheckInBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, checkInTime }: { id: string; checkInTime?: string }) => {
      const res = await api.post<ApiResponse<Booking>>(`/bookings/${id}/check-in`, {
        checkInTime,
      });
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(id) });
    },
  });
}

// ─── useCheckOutBooking ───────────────────────────────────────────────────────

export function useCheckOutBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, checkOutTime }: { id: string; checkOutTime?: string }) => {
      const res = await api.post<ApiResponse<Booking>>(`/bookings/${id}/check-out`, {
        checkOutTime,
      });
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(id) });
    },
  });
}

// ─── useAddBookingPayment ─────────────────────────────────────────────────────

export function useAddBookingPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: BookingPaymentInput }) => {
      const res = await api.post<ApiResponse<Payment>>(`/bookings/${id}/payments`, body);
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(id) });
    },
  });
}

// ─── useDeleteBookingPayment ──────────────────────────────────────────────────

export function useDeleteBookingPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, paymentId }: { bookingId: string; paymentId: string }) => {
      await api.delete(`/bookings/${bookingId}/payments/${paymentId}`);
    },
    onSuccess: (_, { bookingId }) => {
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) });
    },
  });
}
