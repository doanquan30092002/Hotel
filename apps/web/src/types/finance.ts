// Finance domain types — mirror BE DTOs

export type FinanceType = 'INCOME' | 'EXPENSE';

export interface FinanceTx {
  id: string;
  code: string;
  type: FinanceType;
  group: { id: string; code: string; name: string };
  booking: { id: string; code: string } | null;
  method: { id: string; code: string; name: string } | null;
  description: string;
  amount: string; // Decimal as string
  occurredAt: string; // YYYY-MM-DD
  createdBy: { id: string; fullName: string; role: string } | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSummary {
  from: string;
  to: string;
  totalIncome: string; // Decimal as string
  totalExpense: string;
  payrollExpense: string;
  netProfit: string;
  countTransactions: number;
  byGroup: Array<{
    groupId: string;
    groupCode: string;
    groupName: string;
    type: FinanceType;
    amount: string;
    count: number;
  }>;
}

export interface BookingPayment {
  paymentId: string;
  bookingId: string;
  bookingCode: string;
  customerName: string | null;
  amount: string; // Decimal as string
  paidAt: string; // ISO date
  method: { id: string; code: string; name: string };
  roomLabel: string;
}

export interface FinanceListQuery {
  page?: number;
  pageSize?: number;
  type?: FinanceType;
  groupId?: string;
  bookingId?: string;
  methodId?: string;
  from?: string;
  to?: string;
  keyword?: string;
}

export interface FinanceSummaryQuery {
  from?: string;
  to?: string;
}

export interface BookingPaymentQuery {
  from?: string;
  to?: string;
  limit?: number;
}

export interface CreateFinanceTxInput {
  type: FinanceType;
  groupId: string;
  occurredAt: string; // YYYY-MM-DD
  amount: number;
  description: string;
  bookingId?: string | null;
  methodId?: string | null;
  note?: string | null;
}

export type UpdateFinanceTxInput = Partial<CreateFinanceTxInput>;
