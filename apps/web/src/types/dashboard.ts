// Dashboard types — mirrors BE DashboardResponse (dashboard.entity.ts)
// Tab values match BE DashboardTab enum

export type DashboardTab = 'overview' | 'booking_occupancy' | 'finance' | 'housekeeping';

export interface DashboardQuery {
  from: string;
  to: string;
  tab: DashboardTab;
}

// ─── KPI block (always present) ───────────────────────────────────────────────

export interface DashboardKpi {
  occupancyPercent: number;
  vacantNights: number;
  todayCheckIns: number;
  monthRevenue: string;
  monthExpense: string;
  totalBookings: number;
}

// ─── Shared sub-types ─────────────────────────────────────────────────────────

export interface CategoryCount {
  code: string;
  name: string;
  count: number;
}

export interface RevenueDayPoint {
  date: string;
  revenue: string;
  expense: string;
  profit: string;
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

export interface OverviewData {
  revenueTimeline: RevenueDayPoint[];
  occupancyTodayPercent: number;
  roomStatusDonut: CategoryCount[];
  bookingSourceBar: CategoryCount[];
}

// ─── Booking & Occupancy tab ──────────────────────────────────────────────────

export interface BookingTrendPoint {
  date: string;
  count: number;
}

export interface OccupancyHeatmapRoom {
  roomCode: string;
  days: Array<{ date: string; occupied: boolean }>;
}

export interface TopRevenueRoom {
  roomId: string;
  code: string;
  name: string;
  revenue: string;
}

export interface BookingOccupancyData {
  bookingTrend: BookingTrendPoint[];
  occupancyHeatmap: OccupancyHeatmapRoom[];
  topRevenueRooms: TopRevenueRoom[];
  sourceDonut: CategoryCount[];
}

// ─── Finance tab ──────────────────────────────────────────────────────────────

export interface FinanceGroupBar {
  code: string;
  name: string;
  amount: string;
}

export interface FinanceData {
  revenueExpenseTimeline: RevenueDayPoint[];
  targetProgressPercent: number;
  expenseByGroupBar: FinanceGroupBar[];
  revenueBySourceBar: FinanceGroupBar[];
}

// ─── Housekeeping tab ─────────────────────────────────────────────────────────

export interface WorkloadHeatmapDay {
  date: string;
  counts: { high: number; normal: number; low: number };
}

export interface StaffEfficiencyBar {
  staffId: string;
  fullName: string;
  doneCount: number;
  avgMinutes: number;
}

export interface HousekeepingData {
  todayProgressPercent: number;
  workloadHeatmap: WorkloadHeatmapDay[];
  staffEfficiencyBar: StaffEfficiencyBar[];
  cleaningStatusDonut: CategoryCount[];
}

// ─── Full response (tagged union) ────────────────────────────────────────────

export interface DashboardResponse {
  from: string;
  to: string;
  tab: DashboardTab;
  kpi: DashboardKpi;
  overview?: OverviewData;
  bookingOccupancy?: BookingOccupancyData;
  finance?: FinanceData;
  housekeeping?: HousekeepingData;
}
