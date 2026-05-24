// Dashboard response entity — never exposes raw Prisma types.
// Each tab has its own typed block. The `kpi` block is always returned.

import { DashboardTab } from '../dto/query-dashboard.dto';

// ── KPI (always present) ──────────────────────────────────────────────────────

export interface DashboardKpi {
  occupancyPercent: number; // 0..100
  vacantNights: number;
  todayCheckIns: number;
  monthRevenue: string; // Decimal → string
  monthExpense: string; // Decimal → string
  totalBookings: number;
}

// ── Overview ──────────────────────────────────────────────────────────────────

export interface RevenueDayPoint {
  date: string;
  revenue: string;
  expense: string;
  profit: string;
}

export interface CategoryCount {
  code: string;
  name: string;
  count: number;
}

export interface OverviewTabData {
  revenueTimeline: RevenueDayPoint[];
  occupancyTodayPercent: number;
  roomStatusDonut: CategoryCount[];
  bookingSourceBar: CategoryCount[];
}

// ── Booking & Occupancy ───────────────────────────────────────────────────────

export interface BookingTrendPoint {
  date: string;
  count: number;
}

export interface OccupancyHeatmapRoom {
  roomCode: string;
  days: { date: string; occupied: boolean }[];
}

export interface TopRevenueRoom {
  roomId: string;
  code: string;
  name: string;
  revenue: string;
}

export interface BookingOccupancyTabData {
  bookingTrend: BookingTrendPoint[];
  occupancyHeatmap: OccupancyHeatmapRoom[];
  topRevenueRooms: TopRevenueRoom[];
  sourceDonut: CategoryCount[];
}

// ── Finance ───────────────────────────────────────────────────────────────────

export interface FinanceGroupBar {
  code: string;
  name: string;
  amount: string;
}

export interface FinanceTabData {
  revenueExpenseTimeline: RevenueDayPoint[];
  targetProgressPercent: number;
  expenseByGroupBar: FinanceGroupBar[];
  revenueBySourceBar: FinanceGroupBar[];
}

// ── Housekeeping ──────────────────────────────────────────────────────────────

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

export interface HousekeepingTabData {
  todayProgressPercent: number;
  workloadHeatmap: WorkloadHeatmapDay[];
  staffEfficiencyBar: StaffEfficiencyBar[];
  cleaningStatusDonut: CategoryCount[];
}

// ── Full response ─────────────────────────────────────────────────────────────

export interface DashboardResponse {
  from: string;
  to: string;
  tab: DashboardTab;
  kpi: DashboardKpi;
  overview?: OverviewTabData;
  bookingOccupancy?: BookingOccupancyTabData;
  finance?: FinanceTabData;
  housekeeping?: HousekeepingTabData;
}
