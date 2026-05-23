// Payroll domain types — mirror BE DTOs

export interface Payroll {
  id: string;
  code: string;
  month: string; // "YYYY-MM"
  staff: {
    id: string;
    code: string;
    fullName: string;
    avatarUrl: string | null;
    position: { id: string; code: string; name: string } | null;
  };
  workingDays: number;
  baseSalary: string; // Decimal as string
  allowance: string;
  bonus: string;
  penalty: string;
  netSalary: string;
  status: { id: string; code: string; name: string };
  paidAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollListQuery {
  page?: number;
  pageSize?: number;
  staffId?: string;
  statusId?: string;
  month?: string; // "YYYY-MM"
  keyword?: string;
}

export interface CreatePayrollInput {
  staffId: string;
  month: string; // "YYYY-MM"
  workingDays: number;
  baseSalary?: number;
  allowance?: number;
  bonus?: number;
  penalty?: number;
  statusId: string;
  note?: string | null;
}

export type UpdatePayrollInput = Partial<CreatePayrollInput>;

export interface GeneratePayrollInput {
  month: string; // "YYYY-MM"
  workingDays?: number;
}

export interface GeneratePayrollResult {
  created: number;
  skipped: number;
}
