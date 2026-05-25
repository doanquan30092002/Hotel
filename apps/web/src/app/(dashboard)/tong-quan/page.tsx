'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  AlertCircle,
  RefreshCw,
  TrendingUp,
  BedDouble,
  DollarSign,
  CalendarDays,
  ArrowDownCircle,
  LogIn,
  ShieldX,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
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

import { useDashboard } from '@/lib/hooks/use-dashboard';
import { formatVnd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/use-auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import type {
  DashboardTab,
  DashboardKpi,
  OverviewData,
  BookingOccupancyData,
  FinanceData,
  HousekeepingData,
  RevenueDayPoint,
  CategoryCount,
} from '@/types/dashboard';

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

function formatShortDate(iso: string): string {
  const parts = iso.split('T')[0]?.split('-') ?? [];
  if (parts.length < 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

const CHART_COLORS = ['hsl(var(--primary))', '#A78BFA', '#F0ABFC', '#34D399', '#FBBF24', '#FB7185'];

function fmtM(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

// ─── Loading / Empty / Error ──────────────────────────────────────────────────

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return <Skeleton className="w-full rounded-xl" style={{ height }} aria-hidden="true" />;
}

function EmptyChart({ message = 'Chưa có dữ liệu trong kỳ' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
      <CalendarDays className="h-8 w-8" aria-hidden="true" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
      <p className="text-base font-medium text-foreground">Không thể tải dữ liệu</p>
      <p className="text-sm">Đã có lỗi khi tải dashboard. Vui lòng thử lại.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden="true" />
        Thử lại
      </Button>
    </div>
  );
}

// ─── KPI strip card ───────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subLabel?: string;
  sparkline?: Array<{ v: number }>;
  isLoading?: boolean;
  valueClass?: string;
}

function KpiCard({ icon, label, value, subLabel, sparkline, isLoading, valueClass }: KpiCardProps) {
  return (
    <Card className="rounded-xl border bg-card shadow-sm p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide truncate">{label}</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-24 mt-1" />
      ) : (
        <p className={cn('text-2xl font-bold leading-tight', valueClass)}>{value}</p>
      )}
      {subLabel && !isLoading && <p className="text-xs text-muted-foreground">{subLabel}</p>}
      {sparkline && sparkline.length > 1 && !isLoading && (
        <div className="h-10 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
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

// ─── KPI strip (shared across all tabs) ───────────────────────────────────────

function KpiStrip({
  kpi,
  isLoading,
  sparkline,
}: {
  kpi: DashboardKpi | undefined;
  isLoading: boolean;
  sparkline: Array<{ v: number }>;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      <KpiCard
        icon={<TrendingUp className="h-4 w-4" />}
        label="Công suất phòng"
        value={`${kpi?.occupancyPercent ?? 0}%`}
        valueClass="text-primary"
        sparkline={sparkline}
        isLoading={isLoading}
      />
      <KpiCard
        icon={<BedDouble className="h-4 w-4" />}
        label="Phòng trống sạch"
        value={kpi?.vacantNights ?? 0}
        subLabel="phòng/đêm"
        isLoading={isLoading}
      />
      <KpiCard
        icon={<LogIn className="h-4 w-4" />}
        label="Check-in hôm nay"
        value={kpi?.todayCheckIns ?? 0}
        subLabel="lượt"
        isLoading={isLoading}
      />
      <KpiCard
        icon={<DollarSign className="h-4 w-4" />}
        label="Doanh thu tháng"
        value={isLoading ? '—' : formatVnd(kpi?.monthRevenue ?? '0')}
        valueClass="text-emerald-700"
        isLoading={isLoading}
      />
      <KpiCard
        icon={<ArrowDownCircle className="h-4 w-4" />}
        label="Chi phí tháng"
        value={isLoading ? '—' : formatVnd(kpi?.monthExpense ?? '0')}
        valueClass="text-rose-700"
        isLoading={isLoading}
      />
      <KpiCard
        icon={<CalendarDays className="h-4 w-4" />}
        label="Tổng booking"
        value={kpi?.totalBookings ?? 0}
        subLabel="booking"
        isLoading={isLoading}
      />
    </div>
  );
}

// ─── Gauge (radial semicircle) ────────────────────────────────────────────────

function Gauge({ percent, label }: { percent: number; label: string }) {
  const data = [
    { name: label, value: Math.min(100, Math.max(0, percent)), fill: 'hsl(var(--primary))' },
  ];
  return (
    <div className="flex flex-col items-center">
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
          <span className="text-xs text-muted-foreground mt-1">{label}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Revenue timeline chart (area, 3 series) ─────────────────────────────────

function RevenueTimelineChart({
  data,
  isLoading,
  height = 280,
}: {
  data: RevenueDayPoint[];
  isLoading: boolean;
  height?: number;
}) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: formatShortDate(d.date),
        revenue: parseFloat(d.revenue),
        expense: parseFloat(d.expense),
        profit: parseFloat(d.profit),
      })),
    [data],
  );

  if (isLoading) return <ChartSkeleton height={height} />;
  if (chartData.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="stroke-muted-foreground/20"
        />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtM} />
        <Tooltip formatter={(v: number) => formatVnd(v)} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="revenue"
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
        <Area
          type="monotone"
          dataKey="profit"
          name="Lợi nhuận"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
// Uses CategoryCount so the type is specific and compatible with all callers

function DonutChart({
  data,
  dataKey,
  nameKey,
  isLoading,
  height = 220,
}: {
  data: CategoryCount[];
  dataKey: keyof CategoryCount;
  nameKey: keyof CategoryCount;
  isLoading: boolean;
  height?: number;
}) {
  if (isLoading) return <ChartSkeleton height={height} />;
  if (data.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={75}
          innerRadius={42}
          paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length] ?? 'hsl(var(--primary))'} />
          ))}
        </Pie>
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Typed bar data ───────────────────────────────────────────────────────────

interface BarDataPoint {
  name: string;
  [key: string]: string | number;
}

// ─── Vertical bar chart ───────────────────────────────────────────────────────

function VerticalBarChart({
  data,
  dataKey,
  nameKey,
  barFill,
  isLoading,
  height = 220,
  labelWidth = 90,
}: {
  data: BarDataPoint[];
  dataKey: string;
  nameKey: string;
  barFill?: string;
  isLoading: boolean;
  height?: number;
  labelWidth?: number;
}) {
  if (isLoading) return <ChartSkeleton height={height} />;
  if (data.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="stroke-muted-foreground/20"
        />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtM} />
        <YAxis type="category" dataKey={nameKey} tick={{ fontSize: 11 }} width={labelWidth} />
        <Tooltip formatter={(v: number) => fmtM(v)} />
        <Bar dataKey={dataKey} fill={barFill ?? 'hsl(var(--primary))'} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Horizontal bar chart (standard) ─────────────────────────────────────────

function HorizontalBarChart({
  data,
  dataKey,
  nameKey,
  barFill,
  isLoading,
  height = 220,
}: {
  data: BarDataPoint[];
  dataKey: string;
  nameKey: string;
  barFill?: string;
  isLoading: boolean;
  height?: number;
}) {
  if (isLoading) return <ChartSkeleton height={height} />;
  if (data.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="stroke-muted-foreground/20"
        />
        <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey={dataKey} fill={barFill ?? 'hsl(var(--primary))'} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Tab 1: Tổng quan ─────────────────────────────────────────────────────────

function OverviewTab({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: OverviewData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const revenueTimeline = data?.revenueTimeline ?? [];
  const roomStatusDonut = data?.roomStatusDonut ?? [];
  const bookingSourceBarData: BarDataPoint[] = useMemo(
    () => (data?.bookingSourceBar ?? []).map((d) => ({ name: d.name, count: d.count })),
    [data],
  );

  if (isError) return <ErrorState onRetry={onRetry} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left top — Revenue/expense/profit area chart */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Doanh thu / chi phí / lợi nhuận</h3>
          <span className="text-xs text-muted-foreground">Khu vực</span>
        </div>
        <RevenueTimelineChart data={revenueTimeline} isLoading={isLoading} height={280} />
      </Card>

      {/* Right top — Occupancy gauge */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Công suất phòng hôm nay</h3>
          <span className="text-xs text-muted-foreground">Gauge</span>
        </div>
        {isLoading ? (
          <ChartSkeleton height={200} />
        ) : (
          <Gauge percent={data?.occupancyTodayPercent ?? 0} label="Công suất" />
        )}
      </Card>

      {/* Left bottom — Room status donut */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Trạng thái phòng</h3>
          <span className="text-xs text-muted-foreground">Donut</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">Số lượng phòng theo từng trạng thái</p>
        <DonutChart
          data={roomStatusDonut}
          dataKey="count"
          nameKey="name"
          isLoading={isLoading}
          height={220}
        />
      </Card>

      {/* Right bottom — Booking source bar */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Nguồn booking</h3>
          <span className="text-xs text-muted-foreground">Cột</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">Số lượng booking theo nguồn đặt phòng</p>
        <HorizontalBarChart
          data={bookingSourceBarData}
          dataKey="count"
          nameKey="name"
          barFill="hsl(var(--primary))"
          isLoading={isLoading}
          height={220}
        />
      </Card>
    </div>
  );
}

// ─── Tab 2: Booking & Công suất ───────────────────────────────────────────────

function OccupancyHeatmapGrid({
  heatmap,
  isLoading,
}: {
  heatmap: BookingOccupancyData['occupancyHeatmap'];
  isLoading: boolean;
}) {
  if (isLoading) return <ChartSkeleton height={200} />;
  if (heatmap.length === 0) return <EmptyChart message="Chưa có dữ liệu heatmap" />;

  // Show at most 8 rooms and 14 days
  const rooms = heatmap.slice(0, 8);
  const allDays = rooms[0]?.days.slice(0, 14) ?? [];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        {/* Header row */}
        <div className="flex gap-1 mb-1">
          <div className="w-20 shrink-0" />
          {allDays.map((d) => (
            <div
              key={d.date}
              className="flex-1 text-center text-xs text-muted-foreground"
              title={d.date}
            >
              {formatShortDate(d.date)}
            </div>
          ))}
        </div>
        {/* Room rows */}
        {rooms.map((room) => (
          <div key={room.roomCode} className="flex gap-1 mb-1 items-center">
            <div className="w-20 shrink-0 text-xs font-mono truncate text-muted-foreground">
              {room.roomCode}
            </div>
            {room.days.slice(0, 14).map((d) => (
              <div
                key={d.date}
                className={cn('flex-1 h-6 rounded-sm', d.occupied ? 'bg-primary' : 'bg-muted')}
                title={`${room.roomCode} — ${d.date}: ${d.occupied ? 'Đang ở' : 'Trống'}`}
              />
            ))}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-5 rounded-sm bg-primary" />
            <span className="text-xs text-muted-foreground">Đang ở</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-5 rounded-sm bg-muted border border-border" />
            <span className="text-xs text-muted-foreground">Trống</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingOccupancyTab({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: BookingOccupancyData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  // All hooks must be called before any early return
  const bookingTrend = useMemo(
    () =>
      (data?.bookingTrend ?? []).map((d) => ({ date: formatShortDate(d.date), count: d.count })),
    [data],
  );
  const topRooms: BarDataPoint[] = useMemo(
    () =>
      (data?.topRevenueRooms ?? []).map((r) => ({
        name: r.code,
        revenue: parseFloat(r.revenue),
      })),
    [data],
  );
  const sourceDonut = data?.sourceDonut ?? [];
  const heatmap = data?.occupancyHeatmap ?? [];

  if (isError) return <ErrorState onRetry={onRetry} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Trend booking */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Trend booking</h3>
          <span className="text-xs text-muted-foreground">Diện tích</span>
        </div>
        {isLoading ? (
          <ChartSkeleton height={240} />
        ) : bookingTrend.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={bookingTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="stroke-muted-foreground/20"
              />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                name="Booking"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Heatmap occupancy */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Heatmap công suất</h3>
          <span className="text-xs text-muted-foreground">Heatmap</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Trục dọc: phòng · Trục ngang: ngày (tối đa 14 ngày, 8 phòng)
        </p>
        <OccupancyHeatmapGrid heatmap={heatmap} isLoading={isLoading} />
      </Card>

      {/* Top revenue rooms */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Top phòng doanh thu</h3>
          <span className="text-xs text-muted-foreground">Cột</span>
        </div>
        <HorizontalBarChart
          data={topRooms}
          dataKey="revenue"
          nameKey="name"
          barFill="#34D399"
          isLoading={isLoading}
          height={220}
        />
      </Card>

      {/* Source donut */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Nguồn booking</h3>
          <span className="text-xs text-muted-foreground">Donut</span>
        </div>
        <DonutChart
          data={sourceDonut}
          dataKey="count"
          nameKey="name"
          isLoading={isLoading}
          height={220}
        />
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
  data: FinanceData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const expenseByGroupData: BarDataPoint[] = useMemo(
    () =>
      (data?.expenseByGroupBar ?? []).map((g) => ({ name: g.name, amount: parseFloat(g.amount) })),
    [data],
  );
  const revenueBySourceData: BarDataPoint[] = useMemo(
    () =>
      (data?.revenueBySourceBar ?? []).map((g) => ({ name: g.name, amount: parseFloat(g.amount) })),
    [data],
  );

  if (isError) return <ErrorState onRetry={onRetry} />;

  const timeline = data?.revenueExpenseTimeline ?? [];
  const targetPercent = data?.targetProgressPercent ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Revenue/expense/profit timeline */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Doanh thu – chi phí – lợi nhuận</h3>
          <span className="text-xs text-muted-foreground">Khu vực</span>
        </div>
        {/* Finance KPI summary row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tổng thu</p>
            <p className="text-sm font-semibold text-emerald-700">
              {isLoading
                ? '—'
                : formatVnd(
                    (data?.revenueExpenseTimeline ?? []).reduce(
                      (s, d) => s + parseFloat(d.revenue),
                      0,
                    ),
                  )}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tổng chi</p>
            <p className="text-sm font-semibold text-rose-700">
              {isLoading
                ? '—'
                : formatVnd(
                    (data?.revenueExpenseTimeline ?? []).reduce(
                      (s, d) => s + parseFloat(d.expense),
                      0,
                    ),
                  )}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Lợi nhuận</p>
            <p className="text-sm font-semibold text-primary">
              {isLoading
                ? '—'
                : formatVnd(
                    (data?.revenueExpenseTimeline ?? []).reduce(
                      (s, d) => s + parseFloat(d.profit),
                      0,
                    ),
                  )}
            </p>
          </div>
        </div>
        <RevenueTimelineChart data={timeline} isLoading={isLoading} height={240} />
      </Card>

      {/* Target progress gauge */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Target doanh thu tháng</h3>
          <span className="text-xs text-muted-foreground">Gauge</span>
        </div>
        {isLoading ? (
          <ChartSkeleton height={200} />
        ) : (
          <>
            <Gauge percent={targetPercent} label="Đạt mục tiêu" />
            {targetPercent === 0 && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                Chưa thiết lập mục tiêu doanh thu
              </p>
            )}
          </>
        )}
      </Card>

      {/* Expense by group */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Chi phí theo nhóm</h3>
          <span className="text-xs text-muted-foreground">Cột ngang</span>
        </div>
        <VerticalBarChart
          data={expenseByGroupData}
          dataKey="amount"
          nameKey="name"
          barFill="#FB7185"
          isLoading={isLoading}
          height={220}
          labelWidth={100}
        />
      </Card>

      {/* Revenue by source */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Doanh thu theo nguồn</h3>
          <span className="text-xs text-muted-foreground">Cột ngang</span>
        </div>
        <VerticalBarChart
          data={revenueBySourceData}
          dataKey="amount"
          nameKey="name"
          barFill="#34D399"
          isLoading={isLoading}
          height={220}
          labelWidth={100}
        />
      </Card>
    </div>
  );
}

// ─── Tab 4: Buồng phòng (Housekeeping) ───────────────────────────────────────

function WorkloadHeatmapGrid({
  heatmap,
  isLoading,
}: {
  heatmap: HousekeepingData['workloadHeatmap'];
  isLoading: boolean;
}) {
  if (isLoading) return <ChartSkeleton height={160} />;
  if (heatmap.length === 0) return <EmptyChart message="Chưa có dữ liệu workload" />;

  const MAX_COUNT = 10;

  function intensityClass(count: number): string {
    if (count === 0) return 'bg-muted';
    const ratio = Math.min(count / MAX_COUNT, 1);
    if (ratio >= 0.8) return 'bg-rose-500';
    if (ratio >= 0.5) return 'bg-rose-300';
    if (ratio >= 0.2) return 'bg-rose-100';
    return 'bg-rose-50';
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[360px]">
        {/* Header */}
        <div className="flex gap-1 mb-1">
          <div className="w-20 shrink-0 text-xs font-medium text-muted-foreground">Ngày</div>
          <div className="flex-1 text-center text-xs font-medium text-rose-700">Cao</div>
          <div className="flex-1 text-center text-xs font-medium text-amber-700">Thường</div>
          <div className="flex-1 text-center text-xs font-medium text-zinc-500">Thấp</div>
        </div>
        {heatmap.map((d) => (
          <div key={d.date} className="flex gap-1 mb-1 items-center">
            <div className="w-20 shrink-0 text-xs text-muted-foreground">
              {formatShortDate(d.date)}
            </div>
            <div
              className={cn(
                'flex-1 h-6 rounded-sm flex items-center justify-center text-xs font-medium',
                intensityClass(d.counts.high),
              )}
              title={`Cao: ${d.counts.high}`}
            >
              {d.counts.high > 0 ? d.counts.high : ''}
            </div>
            <div
              className={cn(
                'flex-1 h-6 rounded-sm flex items-center justify-center text-xs font-medium',
                d.counts.normal > 0 ? 'bg-amber-200' : 'bg-muted',
              )}
              title={`Thường: ${d.counts.normal}`}
            >
              {d.counts.normal > 0 ? d.counts.normal : ''}
            </div>
            <div
              className={cn(
                'flex-1 h-6 rounded-sm flex items-center justify-center text-xs font-medium',
                d.counts.low > 0 ? 'bg-zinc-200' : 'bg-muted',
              )}
              title={`Thấp: ${d.counts.low}`}
            >
              {d.counts.low > 0 ? d.counts.low : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HousekeepingTab({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: HousekeepingData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const staffEfficiencyData: BarDataPoint[] = useMemo(
    () =>
      (data?.staffEfficiencyBar ?? []).map((s) => ({ name: s.fullName, doneCount: s.doneCount })),
    [data],
  );

  if (isError) return <ErrorState onRetry={onRetry} />;

  const todayPercent = data?.todayProgressPercent ?? 0;
  const workloadHeatmap = data?.workloadHeatmap ?? [];
  const cleaningDonut = data?.cleaningStatusDonut ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Today progress gauge */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Tiến độ dọn phòng hôm nay</h3>
          <span className="text-xs text-muted-foreground">Gauge</span>
        </div>
        {/* Summary KPI for housekeeping */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tổng công việc</p>
            <p className="text-sm font-semibold">
              {isLoading
                ? '—'
                : (data?.staffEfficiencyBar ?? []).reduce((s, x) => s + x.doneCount, 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Hoàn thành</p>
            <p className="text-sm font-semibold text-emerald-700">{todayPercent}%</p>
          </div>
        </div>
        {isLoading ? (
          <ChartSkeleton height={200} />
        ) : (
          <Gauge percent={todayPercent} label="Hoàn thành" />
        )}
      </Card>

      {/* Workload heatmap */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Workload heatmap</h3>
          <span className="text-xs text-muted-foreground">Heatmap</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Số lượng công việc theo ngày và mức ưu tiên
        </p>
        <WorkloadHeatmapGrid heatmap={workloadHeatmap} isLoading={isLoading} />
      </Card>

      {/* Staff efficiency bar */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Hiệu suất nhân sự / buồng phòng</h3>
          <span className="text-xs text-muted-foreground">Cột ngang</span>
        </div>
        <VerticalBarChart
          data={staffEfficiencyData}
          dataKey="doneCount"
          nameKey="name"
          barFill="hsl(var(--primary))"
          isLoading={isLoading}
          height={220}
          labelWidth={100}
        />
      </Card>

      {/* Cleaning status donut */}
      <Card className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Trạng thái vệ sinh</h3>
          <span className="text-xs text-muted-foreground">Donut</span>
        </div>
        <DonutChart
          data={cleaningDonut}
          dataKey="count"
          nameKey="name"
          isLoading={isLoading}
          height={220}
        />
      </Card>
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS: Array<{ id: DashboardTab; label: string }> = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'booking_occupancy', label: 'Booking & Công suất' },
  { id: 'finance', label: 'Tài chính' },
  { id: 'housekeeping', label: 'Buồng phòng' },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getDefaultRange(): { from: string; to: string } {
  const t = new Date();
  const from = toIso(new Date(t.getFullYear(), t.getMonth(), 1));
  const to = toIso(new Date(t.getFullYear(), t.getMonth() + 1, 1));
  return { from, to };
}

// ─── Permission Denied ────────────────────────────────────────────────────────

function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
      <ShieldX className="h-12 w-12 text-destructive" aria-hidden="true" />
      <p className="text-lg font-semibold text-foreground">Bạn không có quyền truy cập</p>
      <p className="text-sm">Trang này chỉ dành cho ADMIN và MANAGER.</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TongQuanPage() {
  const { hasRole } = useAuth();

  // All hooks must be called before any conditional render
  const defaultRange = getDefaultRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [pendingFrom, setPendingFrom] = useState(defaultRange.from);
  const [pendingTo, setPendingTo] = useState(defaultRange.to);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const { data, isLoading, isError, refetch } = useDashboard({ from, to, tab: activeTab });

  const canView = hasRole('ADMIN', 'MANAGER');

  const handleApply = useCallback(() => {
    setFrom(pendingFrom);
    setTo(pendingTo);
  }, [pendingFrom, pendingTo]);

  const handleReset = useCallback(() => {
    const def = getDefaultRange();
    setPendingFrom(def.from);
    setPendingTo(def.to);
    setFrom(def.from);
    setTo(def.to);
  }, []);

  const handlePreset7Days = useCallback(() => {
    const t = new Date();
    const f = toIso(addDays(t, -7));
    const e = toIso(addDays(t, 1));
    setPendingFrom(f);
    setPendingTo(e);
    setFrom(f);
    setTo(e);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Build sparkline from revenue timeline if available
  const sparkline = useMemo(() => {
    const timeline = data?.overview?.revenueTimeline ?? [];
    return timeline.map((d) => ({ v: parseFloat(d.revenue) }));
  }, [data]);

  const kpi = data?.kpi;
  const overview = data?.overview;
  const bookingOccupancy = data?.bookingOccupancy;
  const finance = data?.finance;
  const housekeeping = data?.housekeeping;

  // Permission gate — rendered after all hooks
  if (!canView) return <PermissionDenied />;

  return (
    <div className="space-y-5 p-6">
      {/* Breadcrumb */}
      <div>
        <p className="text-xs text-muted-foreground">Vận hành › Dashboard tổng quan</p>
        <h1 className="text-xl font-semibold mt-1">Dashboard tổng quan</h1>
      </div>

      {/* Filter card */}
      <Card className="rounded-xl border bg-card shadow-sm p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* Date range */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="dash-from" className="text-xs font-medium text-muted-foreground">
                Từ ngày
              </label>
              <Input
                id="dash-from"
                type="date"
                value={pendingFrom}
                onChange={(e) => setPendingFrom(e.target.value)}
                className="h-9 w-[152px]"
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
                value={pendingTo}
                onChange={(e) => setPendingTo(e.target.value)}
                className="h-9 w-[152px]"
                aria-label="Đến ngày"
              />
            </div>
            <Button variant="default" size="sm" onClick={handleApply} aria-label="Áp dụng bộ lọc">
              Lọc
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} aria-label="Bỏ lọc">
              Bỏ lọc
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreset7Days}
              aria-label="7 ngày gần nhất"
            >
              7 ngày gần nhất
            </Button>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dashboard tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  activeTab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* KPI strip */}
      <Card className="rounded-xl border bg-card shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Khoảng lọc Dashboard
          </p>
          {kpi && !isLoading && (
            <span className="text-sm text-muted-foreground rounded-full bg-muted px-3 py-1">
              {kpi.totalBookings} booking
            </span>
          )}
        </div>
        <KpiStrip kpi={kpi} isLoading={isLoading} sparkline={sparkline} />
      </Card>

      {/* Tab content */}
      <CardContent className="p-0">
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
      </CardContent>
    </div>
  );
}
