// Shared domain types — mirror BE DTOs

export type UserRole = 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'HOUSEKEEPING';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
};

export type Setting = {
  id: string;
  propertyName: string;
  taxCode: string | null;
  address: string | null;
  email: string | null;
  website: string | null;
  hotline: string | null;
  themeTone: number;
  monthlyRevenueTarget: number | null;
  note: string | null;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type ApiMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  data: T;
  meta?: ApiMeta;
};

export type ApiError = {
  statusCode: number;
  message: string | string[];
  error: string;
  details?: unknown;
};
