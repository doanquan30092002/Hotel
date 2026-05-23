// Staff domain types — mirror BE DTOs

export type ShiftType = 'day' | 'night' | 'full';

export interface Staff {
  id: string;
  code: string;
  fullName: string;
  position: { id: string; code: string; name: string } | null;
  phone: string | null;
  email: string | null;
  shiftType: ShiftType;
  joinDate: string; // YYYY-MM-DD
  baseSalary: string; // Decimal as string
  allowance: string; // Decimal as string
  active: boolean;
  avatarUrl: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffListQuery {
  page?: number;
  pageSize?: number;
  positionId?: string;
  active?: boolean;
  keyword?: string;
}

export interface CreateStaffInput {
  fullName: string;
  positionId?: string | null;
  phone?: string | null;
  email?: string | null;
  shiftType: ShiftType;
  joinDate: string; // YYYY-MM-DD
  baseSalary: number;
  allowance?: number;
  avatarUrl?: string | null;
  active?: boolean;
  note?: string | null;
}

export type UpdateStaffInput = Partial<CreateStaffInput>;
