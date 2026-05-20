import axios, { AxiosError, AxiosInstance } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15_000,
});

// Attach access token from localStorage (Phase 1 will replace with proper auth store)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('hotel.accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Surface API error shape { statusCode, message, error } on rejection
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    return Promise.reject(err);
  },
);

export type ApiResponse<T> = { data: T; meta?: Record<string, unknown> };
export type ApiError = { statusCode: number; message: string | string[]; error: string; details?: unknown };
