import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15_000,
});

// Flag to prevent infinite refresh loops
let isRefreshing = false;
type QueueItem = { resolve: (token: string) => void; reject: (err: unknown) => void };
let failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// Request interceptor — attach Bearer token from auth store
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('hotel.auth');
      if (raw) {
        const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
        const token = parsed?.state?.accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// Response interceptor — refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthPath = originalRequest.url?.includes('/auth/');
    if (err.response?.status === 401 && !isAuthPath && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((e: unknown) => Promise.reject(e));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const raw =
          typeof window !== 'undefined' ? window.localStorage.getItem('hotel.auth') : null;
        const parsed = raw ? (JSON.parse(raw) as { state?: { refreshToken?: string } }) : null;
        const refreshToken = parsed?.state?.refreshToken;

        if (!refreshToken) throw new Error('No refresh token');

        const { data: body } = await axios.post<{ data: { accessToken: string } }>(
          `${baseURL}/auth/refresh`,
          { refreshToken },
        );
        const newToken = body.data.accessToken;

        // Update persisted store directly
        if (typeof window !== 'undefined') {
          const storeRaw = window.localStorage.getItem('hotel.auth');
          if (storeRaw) {
            const store = JSON.parse(storeRaw) as { state: Record<string, unknown> };
            store.state.accessToken = newToken;
            window.localStorage.setItem('hotel.auth', JSON.stringify(store));
          }
        }

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError: unknown) {
        processQueue(refreshError, null);
        // Clear auth and redirect
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('hotel.auth');
          window.location.href = '/dang-nhap';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  },
);

export type { ApiResponse, ApiError } from '@/types';
