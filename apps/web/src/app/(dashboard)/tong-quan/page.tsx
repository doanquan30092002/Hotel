'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Users,
  BedDouble,
  DollarSign,
  CalendarDays,
  CheckCircle2,
  Clock,
  Wrench,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';

import { useAuth } from '@/lib/auth/use-auth';
import { useDashboard } from '@/lib/hooks/use-dashboard';
import { formatVnd } from '@/lib/format';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import type { DashboardTab } from '@/types/dashboard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatShortDate(isoOrDate: string): string {
  const parts = isoOrDate.split('T')[0]?.split('-') ?? [];
  if (parts.length < 3) return isoOrDate;
  return `${parts[2]}/${parts[1]}`;
}

const CHART_COLORS = ['hsl(var(--primary))', '#A78BFA', '#F0ABFC', '#34D399', '#FBBF24', '#FB7185'];

// ─── Permission Denied ────────────────────────────────────────────────────────

function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
      <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">Bạn không có quyền truy cập</p>
        <p className="mt-1 text-sm">
          Trang này chỉ dành cho Quản trị viên và Quản lý. Vui lòng liên hệ người quản lý.
        </p>
      </div>
    </div>
  );
}

// ─── KPI Card with sparkline ──────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: Array<{ date: string; value: number | string }>;
  isLoading?: boolean;
  valueClass?: string;
}

function KpiCard({ icon, label, value, subLabel, trend, isLoading, valueClass }: KpiCardProps) {
  const sparklineData = useMemo(
    () =>
      (trend ?? []).map((t) => ({
        date: t.date,
        v: typeof t.value === 'string' ? parseFloat(t.value) : t.value,
      })),
    [trend],
  );

  return (
    <Card className="rounded-xl border bg-card shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <span className="shrink-0">{icon}</span>
            <span className="text-xs font-medium uppercase tracking-wide truncate">{label}</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-24 mt-1" />
          ) : (
            <p className={cn('text-2xl font-bold leading-tight truncate', valueClass)}>{value}</p>
          )}
          {subLabel && !isLoading && (
            <p className="text-xs text-muted-foreground mt-0.5">{subLabel}</p>
          )}
        </div>
      </div>
      {trend && trend.length > 1 && !isLoading && (
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <Area
                type="monotone"
                dataKey="v"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.15}
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

// ─── Loading skeleton for chart area ─────────────────────────────────────────

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return <Skeleton className={`w-full rounded-xl`} style={{ height }} />;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyChart({ message = 'Không có dữ liệu trong khoảng này' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
      <CalendarDays className="h-8 w-8" aria-hidden="true" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
      <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="text-sm">Đã có lỗi khi tải dữ liệu</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden="true" />
        Thử lại
      </Button>
    </div>
  );
}

// ─── Gauge / Radial chart for occupancy ──────────────────────────────────────

function OccupancyGauge({ percent }: { percent: number }) {
  const data = [{ name: 'Công suất', value: percent, fill: 'hsl(var(--primary))' }];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-full" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="60%"
            outerRadius="90%"
            startAngle={180}
            endAngle={0}
            data={data}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={{ fill: 'hsl(var(--muted))' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
          <span className="text-3xl font-bold">{percent}%</span>
          <span className="text-xs text-muted-foreground">Công suất</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: Tổng quan ─────────────────────────────────────────────────────────

function OverviewTab({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: import('@/types/dashboard').OverviewData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const bookingTrendData = useMemo(
    () =>
      (data?.bookingsTrend ?? []).map((t) => ({
        date: formatShortDate(t.date),
        value: typeof t.value === 'string' ? parseFloat(t.value) : t.value,
      })),
    [data],
  );

  const revenueTrendData = useMemo(
    () =>
      (data?.revenueTrend ?? []).map((t) => ({
        date: formatShortDate(t.date),
        value: typeof t.value === 'string' ? parseFloat(t.value) : t.value,
      })),
    [data],
  );

  if (isError) return <ErrorState onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
          label="Tổng booking"
          value={isLoading ? '—' : (data?.totalBookings ?? 0)}
          trend={data?.bookingsTrend}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4" aria-hidden="true" />}
          label="Doanh thu"
          value={isLoading ? '—' : formatVnd(data?.totalRevenue ?? '0')}
          trend={data?.revenueTrend}
          isLoading={isLoading}
          valueClass="text-emerald-700"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          label="Công suất"
          value={isLoading ? '—' : `${data?.occupancyPercent ?? 0}%`}
          isLoading={isLoading}
          valueClass="text-primary"
        />
        <KpiCard
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          label="Khách lưu trú"
          value={isLoading ? '—' : (data?.totalGuests ?? 0)}
          isLoading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking trend */}
        <Card className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Xu hướng booking</h3>
          {isLoading ? (
            <ChartSkeleton height={240} />
          ) : bookingTrendData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={bookingTrendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted-foreground/20"
                  stroke="currentColor"
                />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Booking"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Revenue trend */}
        <Card className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Doanh thu / chi phí / lợi nhuận</h3>
          {isLoading ? (
            <ChartSkeleton height={240} />
          ) : revenueTrendData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueTrendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted-foreground/20"
                  stroke="currentColor"
                />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : String(v)
                  }
                />
                <Tooltip formatter={(v: number) => [formatVnd(v), 'Doanh thu']} />
                <Bar
                  dataKey="value"
                  name="Doanh thu"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Occupancy gauge */}
        <Card className="rounded-xl border bg-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Công suất phòng hôm nay</h3>
          </div>
          {isLoading ? (
            <ChartSkeleton height={200} />
          ) : (
            <OccupancyGauge percent={data?.occupancyPercent ?? 0} />
          )}
        </Card>

        {/* Guest count card (clean) */}
        <Card className="rounded-xl border bg-card shadow-sm p-5 flex flex-col justify-center">
          <h3 className="text-sm font-semibold mb-3">Tóm tắt khoảng thời gian</h3>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-28" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tổng booking</span>
                <span className="text-sm font-semibold">{data?.totalBookings ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Doanh thu</span>
                <span className="text-sm font-semibold text-emerald-700">
                  {formatVnd(data?.totalRevenue ?? '0')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Công suất trung bình</span>
                <span className="text-sm font-semibold text-primary">
                  {data?.occupancyPercent ?? 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Khách lưu trú</span>
                <span className="text-sm font-semibold">{data?.totalGuests ?? 0}</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Tab 2: Booking & Công suất ───────────────────────────────────────────────

function BookingOccupancyTab({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: import('@/types/dashboard').BookingOccupancyData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const newBookingsTrend = useMemo(
    () =>
      (data?.newBookingsTrend ?? []).map((t) => ({
        date: formatShortDate(t.date),
        value: typeof t.value === 'string' ? parseFloat(t.value) : t.value,
      })),
    [data],
  );

  const occupancyTrend = useMemo(
    () =>
      (data?.occupancyTrend ?? []).map((t) => ({
        date: formatShortDate(t.date),
        value: typeof t.value === 'string' ? parseFloat(t.value) : t.value,
      })),
    [data],
  );

  const avgOccupancy = useMemo(() => {
    const pts = data?.occupancyTrend ?? [];
    if (pts.length === 0) return 0;
    const sum = pts.reduce(
      (a, t) => a + (typeof t.value === 'string' ? parseFloat(t.value) : t.value),
      0,
    );
    return Math.round(sum / pts.length);
  }, [data]);

  const newBookingsSum = useMemo(() => {
    const pts = data?.newBookingsTrend ?? [];
    return pts.reduce(
      (a, t) => a + (typeof t.value === 'string' ? parseFloat(t.value) : t.value),
      0,
    );
  }, [data]);

  if (isError) return <ErrorState onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
          label="Tổng booking"
          value={isLoading ? '—' : (data?.totalBookings ?? 0)}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          label="Booking mới trong kỳ"
          value={isLoading ? '—' : newBookingsSum}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<BedDouble className="h-4 w-4" aria-hidden="true" />}
          label="Công suất trung bình"
          value={isLoading ? '—' : `${avgOccupancy}%`}
          isLoading={isLoading}
          valueClass="text-primary"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4">
        {/* New bookings trend */}
        <Card className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Trend booking</h3>
          {isLoading ? (
            <ChartSkeleton height={240} />
          ) : newBookingsTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={newBookingsTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="stroke-muted-foreground/20"
                />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Booking mới"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Occupancy trend */}
        <Card className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Heatmap công suất</h3>
          {isLoading ? (
            <ChartSkeleton height={200} />
          ) : occupancyTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={occupancyTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="stroke-muted-foreground/20"
                />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Công suất']} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Công suất"
                  stroke="#A78BFA"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Breakdown donuts + top rooms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status breakdown */}
        <Card className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Nguồn booking</h3>
          {isLoading ? (
            <ChartSkeleton height={200} />
          ) : (data?.statusBreakdown ?? []).length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data?.statusBreakdown ?? []}
                  dataKey="count"
                  nameKey="statusName"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  paddingAngle={3}
                >
                  {(data?.statusBreakdown ?? []).map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length] ?? 'hsl(var(--primary))'}
                    />
                  ))}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Source breakdown */}
        <Card className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Phân bổ trạng thái booking</h3>
          {isLoading ? (
            <ChartSkeleton height={200} />
          ) : (data?.sourceBreakdown ?? []).length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data?.sourceBreakdown ?? []}
                  dataKey="count"
                  nameKey="sourceName"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  paddingAngle={3}
                >
                  {(data?.sourceBreakdown ?? []).map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length] ?? 'hsl(var(--primary))'}
                    />
                  ))}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Top rooms table */}
      <Card className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">Top phòng doanh thu</h3>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (data?.topRooms ?? []).length === 0 ? (
            <EmptyChart message="Chưa có dữ liệu phòng" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-medium">Phòng</th>
                  <th className="px-4 py-2 text-left font-medium">Tên</th>
                  <th className="px-4 py-2 text-right font-medium">Số booking</th>
                  <th className="px-4 py-2 text-right font-medium">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topRooms ?? []).slice(0, 5).map((r) => (
                  <tr key={r.roomId} className="border-t border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-xs">{r.roomCode}</td>
                    <td className="px-4 py-3">{r.roomName}</td>
                    <td className="px-4 py-3 text-right">{r.bookingCount}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      {formatVnd(r.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 3: Tài chính ─────────────────────────────────────────────────────────

function FinanceTab({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: import('@/types/dashboard').FinanceData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const combinedTrend = useMemo(() => {
    const income = data?.incomeTrend ?? [];
    const expense = data?.expenseTrend ?? [];
    const allDates = Array.from(
      new Set([...income.map((t) => t.date), ...expense.map((t) => t.date)]),
    ).sort();
    return allDates.map((date) => {
      const inc = income.find((t) => t.date === date);
      const exp = expense.find((t) => t.date === date);
      return {
        date: formatShortDate(date),
        income: inc ? (typeof inc.value === 'string' ? parseFloat(inc.value) : inc.value) : 0,
        expense: exp ? (typeof exp.value === 'string' ? parseFloat(exp.value) : exp.value) : 0,
      };
    });
  }, [data]);

  const netProfitNum = useMemo(() => {
    const n = parseFloat(data?.netProfit ?? '0');
    return isNaN(n) ? 0 : n;
  }, [data]);

  if (isError) return <ErrorState onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          label="Tổng thu"
          value={isLoading ? '—' : formatVnd(data?.totalIncome ?? '0')}
          isLoading={isLoading}
          valueClass="text-emerald-700"
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4" aria-hidden="true" />}
          label="Tổng chi"
          value={isLoading ? '—' : formatVnd(data?.totalExpense ?? '0')}
          isLoading={isLoading}
          valueClass="text-rose-700"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          label="Lợi nhuận ròng"
          value={isLoading ? '—' : formatVnd(data?.netProfit ?? '0')}
          isLoading={isLoading}
          valueClass={netProfitNum >= 0 ? 'text-emerald-700' : 'text-rose-700'}
          subLabel={netProfitNum < 0 ? 'Âm — cần chú ý' : undefined}
        />
      </div>

      {/* Combined income + expense trend */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-3">Doanh thu – chi phí – lợi nhuận</h3>
        {isLoading ? (
          <ChartSkeleton height={280} />
        ) : combinedTrend.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={combinedTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="stroke-muted-foreground/20"
              />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : String(v)
                }
              />
              <Tooltip formatter={(v: number) => formatVnd(v)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="income"
                name="Doanh thu"
                stroke="#34D399"
                fill="#34D399"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="expense"
                name="Chi phí"
                stroke="#FB7185"
                fill="#FB7185"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Income / expense by group */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Chi phí theo nhóm</h3>
          {isLoading ? (
            <ChartSkeleton height={200} />
          ) : (data?.expenseByGroup ?? []).length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                layout="vertical"
                data={data?.expenseByGroup ?? []}
                margin={{ left: 16, right: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="stroke-muted-foreground/20"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : String(v)
                  }
                />
                <YAxis type="category" dataKey="groupName" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: number) => formatVnd(v)} />
                <Bar dataKey="amount" name="Chi phí" fill="#FB7185" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Doanh thu theo nguồn</h3>
          {isLoading ? (
            <ChartSkeleton height={200} />
          ) : (data?.incomeByGroup ?? []).length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                layout="vertical"
                data={data?.incomeByGroup ?? []}
                margin={{ left: 16, right: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="stroke-muted-foreground/20"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : String(v)
                  }
                />
                <YAxis type="category" dataKey="groupName" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: number) => formatVnd(v)} />
                <Bar dataKey="amount" name="Doanh thu" fill="#34D399" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Tab 4: Buồng phòng (Housekeeping) ───────────────────────────────────────

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Cao',
  normal: 'Trung bình',
  low: 'Thấp',
};

function HousekeepingTab({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: import('@/types/dashboard').HousekeepingData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const byStatusData = useMemo(
    () =>
      (data?.byStatus ?? []).map((s) => ({
        name: s.statusName,
        value: s.count,
      })),
    [data],
  );

  const byPriorityData = useMemo(
    () =>
      (data?.byPriority ?? []).map((p) => ({
        name: PRIORITY_LABEL[p.priority] ?? p.priority,
        value: p.count,
      })),
    [data],
  );

  const highPriorityCount = useMemo(
    () => (data?.byPriority ?? []).find((p) => p.priority === 'high')?.count ?? 0,
    [data],
  );

  if (isError) return <ErrorState onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Wrench className="h-4 w-4" aria-hidden="true" />}
          label="Tổng công việc"
          value={isLoading ? '—' : (data?.totalTasks ?? 0)}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          label="Tỉ lệ hoàn thành"
          value={isLoading ? '—' : `${data?.completionRate ?? 0}%`}
          isLoading={isLoading}
          valueClass="text-emerald-700"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" aria-hidden="true" />}
          label="Giờ hoàn thành TB"
          value={
            isLoading
              ? '—'
              : data?.avgCompletionHours != null
                ? `${data.avgCompletionHours.toFixed(1)}h`
                : '—'
          }
          isLoading={isLoading}
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4" aria-hidden="true" />}
          label="Ưu tiên cao"
          value={isLoading ? '—' : highPriorityCount}
          isLoading={isLoading}
          valueClass={highPriorityCount > 0 ? 'text-rose-700' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By status donut */}
        <Card className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Tiến độ dọn phòng hôm nay</h3>
          {isLoading ? (
            <ChartSkeleton height={200} />
          ) : byStatusData.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={byStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      paddingAngle={3}
                    >
                      {byStatusData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length] ?? 'hsl(var(--primary))'}
                        />
                      ))}
                    </Pie>
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>

        {/* By priority bar */}
        <Card className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">Workload heatmap</h3>
          {isLoading ? (
            <ChartSkeleton height={200} />
          ) : byPriorityData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byPriorityData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="stroke-muted-foreground/20"
                />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="value"
                  name="Số công việc"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Top assignees table */}
      <Card className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">Hiệu suất nhân sự buồng phòng</h3>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (data?.topAssignees ?? []).length === 0 ? (
            <EmptyChart message="Chưa có dữ liệu nhân sự" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-medium">Nhân viên</th>
                  <th className="px-4 py-2 text-right font-medium">Đã hoàn thành</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topAssignees ?? []).slice(0, 5).map((a, i) => (
                  <tr key={a.assigneeId ?? i} className="border-t border-border hover:bg-muted/50">
                    <td className="px-4 py-3">{a.assigneeName}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {a.doneCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Date range presets ───────────────────────────────────────────────────────

const today = () => new Date();

function getPreset(preset: 'today' | '7days' | '30days'): { from: string; to: string } {
  const t = today();
  if (preset === 'today') {
    return { from: toIso(t), to: toIso(addDays(t, 1)) };
  }
  if (preset === '7days') {
    return { from: toIso(addDays(t, -7)), to: toIso(addDays(t, 1)) };
  }
  return { from: toIso(addDays(t, -30)), to: toIso(addDays(t, 1)) };
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS: Array<{ id: DashboardTab; label: string }> = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'booking_occupancy', label: 'Booking & Công suất' },
  { id: 'finance', label: 'Tài chính' },
  { id: 'housekeeping', label: 'Buồng phòng' },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TongQuanPage() {
  const { hasRole } = useAuth();
  const canView = hasRole('ADMIN', 'MANAGER');

  if (!canView) return <PermissionDenied />;

  return <DashboardContent />;
}

function DashboardContent() {
  const defaultRange = getPreset('30days');
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const { data, isLoading, isError, refetch } = useDashboard({ from, to, tab: activeTab });

  const handlePreset = useCallback((preset: 'today' | '7days' | '30days') => {
    const p = getPreset(preset);
    setFrom(p.from);
    setTo(p.to);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const overview = data?.overview;
  const bookingOccupancy = data?.bookingOccupancy;
  const finance = data?.finance;
  const housekeeping = data?.housekeeping;

  return (
    <div className="space-y-5 p-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">Dashboard tổng quan</h1>
      </div>

      {/* Date range controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="dash-from" className="text-xs font-medium text-muted-foreground">
            Từ ngày
          </label>
          <Input
            id="dash-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 w-[160px]"
            aria-label="Từ ngày"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dash-to" className="text-xs font-medium text-muted-foreground">
            Đến ngày
          </label>
          <Input
            id="dash-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 w-[160px]"
            aria-label="Đến ngày"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreset('today')}
            aria-label="Hôm nay"
          >
            Hôm nay
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreset('7days')}
            aria-label="7 ngày gần nhất"
          >
            7 ngày
          </Button>
          <Button
            variant={
              from === getPreset('30days').from && to === getPreset('30days').to
                ? 'default'
                : 'outline'
            }
            size="sm"
            onClick={() => handlePreset('30days')}
            aria-label="30 ngày gần nhất"
          >
            30 ngày
          </Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-0 border-b border-border" role="tablist" aria-label="Dashboard tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div role="tabpanel" aria-label={`Nội dung tab ${activeTab}`}>
        {activeTab === 'overview' && (
          <OverviewTab
            data={overview}
            isLoading={isLoading}
            isError={isError}
            onRetry={handleRetry}
          />
        )}
        {activeTab === 'booking_occupancy' && (
          <BookingOccupancyTab
            data={bookingOccupancy}
            isLoading={isLoading}
            isError={isError}
            onRetry={handleRetry}
          />
        )}
        {activeTab === 'finance' && (
          <FinanceTab
            data={finance}
            isLoading={isLoading}
            isError={isError}
            onRetry={handleRetry}
          />
        )}
        {activeTab === 'housekeeping' && (
          <HousekeepingTab
            data={housekeeping}
            isLoading={isLoading}
            isError={isError}
            onRetry={handleRetry}
          />
        )}
      </div>
    </div>
  );
}
