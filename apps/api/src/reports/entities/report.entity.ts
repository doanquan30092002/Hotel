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

export interface ReportSummaryData {
  from: string;
  to: string;
  totals: ReportTotals;
  topRooms: TopRoom[];
  topSources: TopSource[];
  byStatusBookings: ByStatusBooking[];
  rows: ReportRow[];
}

export class ReportSummaryEntity {
  data!: ReportSummaryData;

  static from(data: ReportSummaryData): ReportSummaryEntity {
    const entity = new ReportSummaryEntity();
    entity.data = data;
    return entity;
  }
}
