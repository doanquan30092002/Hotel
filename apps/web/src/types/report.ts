// Mirror of apps/api/src/reports/entities/report.entity.ts

export interface ReportTotals {
  totalBookings: number;
  totalRoomRevenue: string;
  totalServiceRevenue: string;
  totalSurcharge: string;
  totalDiscount: string;
  grossRevenue: string;
  totalIncomeFinance: string;
  totalExpenseFinance: string;
  payrollExpense: string;
  operationalExpense: string;
  netProfit: string;
  occupancyPercent: number;
  averageDailyRate: string;
}

export interface TopRoom {
  code: string;
  name: string;
  revenue: string;
  nights: number;
}

export interface TopSource {
  code: string;
  name: string;
  bookings: number;
  revenue: string;
}

export interface ByStatusBooking {
  code: string;
  name: string;
  count: number;
}

export interface ReportRow {
  label: string;
  value: string;
  note: string;
}

export interface ReportSummary {
  from: string;
  to: string;
  totals: ReportTotals;
  topRooms: TopRoom[];
  topSources: TopSource[];
  byStatusBookings: ByStatusBooking[];
  rows: ReportRow[];
}

export type ReportExportFormat = 'xlsx' | 'csv';
