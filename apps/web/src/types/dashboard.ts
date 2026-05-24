// Dashboard types — mirrors BE DashboardResponse tagged union

export type DashboardTab = 'overview' | 'booking_occupancy' | 'finance' | 'housekeeping';

export interface DashboardQuery {
  from: string;
  to: string;
  tab: DashboardTab;
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export interface TrendPoint {
  date: string;
  value: number | string;
}

export interface OverviewData {
  totalBookings: number;
  totalRevenue: string;
  occupancyPercent: number;
  totalGuests: number;
  bookingsTrend: TrendPoint[];
  revenueTrend: TrendPoint[];
}

// ─── Booking & Occupancy ──────────────────────────────────────────────────────

export interface BookingOccupancyData {
  totalBookings: number;
  newBookingsTrend: TrendPoint[];
  occupancyTrend: TrendPoint[];
  statusBreakdown: Array<{ statusCode: string; statusName: string; count: number }>;
  sourceBreakdown: Array<{ sourceCode: string; sourceName: string; count: number }>;
  topRooms: Array<{
    roomId: string;
    roomCode: string;
    roomName: string;
    bookingCount: number;
    revenue: string;
  }>;
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export interface FinanceData {
  totalIncome: string;
  totalExpense: string;
  netProfit: string;
  incomeTrend: TrendPoint[];
  expenseTrend: TrendPoint[];
  incomeByGroup: Array<{ groupCode: string; groupName: string; amount: string }>;
  expenseByGroup: Array<{ groupCode: string; groupName: string; amount: string }>;
}

// ─── Housekeeping ─────────────────────────────────────────────────────────────

export interface HousekeepingData {
  totalTasks: number;
  byStatus: Array<{ statusCode: string; statusName: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  completionRate: number;
  avgCompletionHours: number | null;
  topAssignees: Array<{
    assigneeId: string | null;
    assigneeName: string;
    doneCount: number;
  }>;
}

// ─── Tagged union response ────────────────────────────────────────────────────

export interface DashboardResponse {
  from: string;
  to: string;
  tab: DashboardTab;
  overview?: OverviewData;
  bookingOccupancy?: BookingOccupancyData;
  finance?: FinanceData;
  housekeeping?: HousekeepingData;
}
