'use client';

import { useState, useMemo } from 'react';
import {
  AlertCircle,
  Printer,
  Download,
  TrendingUp,
  Users,
  Wallet,
  Activity,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

import { useAuth } from '@/lib/auth/use-auth';
import { useReportSummary, useExportReport } from '@/lib/hooks/use-reports';
import { formatVnd } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ── Chart colors ──────────────────────────────────────────────────────────────

const CHART_COLORS = ['hsl(var(--primary))', '#A78BFA', '#F0ABFC', '#34D399', '#FBBF24', '#FB7185'];

// ── Date helpers ──────────────────────────────────────────────────────────────

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultRange(): { from: string; to: string } {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return { from: toIso(from), to: toIso(to) };
}

// ── Permission denied ─────────────────────────────────────────────────────────

function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
      <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">Bạn không có quyền truy cập</p>
        <p className="text-sm mt-1">Trang này chỉ dành cho ADMIN, MANAGER và RECEPTIONIST.</p>
      </div>
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  colorClass: string;
  subLabel?: string;
  isLoading?: boolean;
}

function KpiCard({ icon, label, value, colorClass, subLabel, isLoading }: KpiCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${colorClass} bg-opacity-10 shrink-0`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-28" />
          ) : (
            <p className={`mt-0.5 text-xl font-bold ${colorClass} truncate`}>{value}</p>
          )}
          {subLabel && <p className="mt-0.5 text-xs text-muted-foreground truncate">{subLabel}</p>}
        </div>
      </div>
    </Card>
  );
}

// ── Main page (RBAC gate) ─────────────────────────────────────────────────────

export default function BaoCaoPage() {
  const { hasRole } = useAuth();
  // HOUSEKEEPING is blocked; ADMIN/MANAGER/RECEPTIONIST allowed
  const canView = hasRole('ADMIN', 'MANAGER', 'RECEPTIONIST');
  const canExport = hasRole('ADMIN', 'MANAGER');

  if (!canView) return <PermissionDenied />;
  return <BaoCaoContent canExport={canExport} />;
}

// ── Page content ──────────────────────────────────────────────────────────────

function BaoCaoContent({ canExport }: { canExport: boolean }) {
  const def = useMemo(() => defaultRange(), []);
  const [fromInput, setFromInput] = useState(def.from);
  const [toInput, setToInput] = useState(def.to);
  const [submitted, setSubmitted] = useState(def);

  const { data, isLoading, isError, refetch } = useReportSummary(submitted);
  const exportMutation = useExportReport();

  const totals = data?.totals;
  const rows = data?.rows ?? [];

  // KPI values
  const grossRevenue = totals ? parseFloat(totals.grossRevenue) : 0;
  const payrollExpense = totals ? parseFloat(totals.payrollExpense) : 0;
  const operationalExpense = totals ? parseFloat(totals.operationalExpense) : 0;
  const netProfit = totals ? parseFloat(totals.netProfit) : 0;
  const occupancyPercent = totals?.occupancyPercent ?? 0;

  const isNetProfitNegative = netProfit < 0;

  // Chart data for top rooms (vertical bar chart)
  const topRoomsChartData = useMemo(
    () =>
      (data?.topRooms ?? []).slice(0, 8).map((r) => ({
        name: r.code,
        fullName: r.name,
        revenue: parseFloat(r.revenue),
      })),
    [data],
  );

  // Chart data for booking status donut
  const statusDonutData = useMemo(
    () =>
      (data?.byStatusBookings ?? []).map((s) => ({
        name: s.name,
        count: s.count,
      })),
    [data],
  );

  // Chart data for top sources bar
  const sourcesBarData = useMemo(
    () =>
      (data?.topSources ?? []).slice(0, 8).map((s) => ({
        name: s.name,
        bookings: s.bookings,
      })),
    [data],
  );

  function handleApply() {
    if (!fromInput || !toInput) {
      toast({ title: 'Vui lòng nhập đầy đủ ngày bắt đầu và kết thúc', variant: 'destructive' });
      return;
    }
    if (fromInput >= toInput) {
      toast({ title: '"Đến ngày" phải sau "Từ ngày"', variant: 'destructive' });
      return;
    }
    setSubmitted({ from: fromInput, to: toInput });
  }

  function handleExportXlsx() {
    exportMutation.mutate(
      { from: submitted.from, to: submitted.to, format: 'xlsx' },
      {
        onSuccess: () => {
          toast({ title: 'Đã tải báo cáo XLSX', variant: 'default' });
        },
        onError: () => {
          toast({ title: 'Tải báo cáo thất bại', variant: 'destructive' });
        },
      },
    );
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Báo cáo</span>
        <span aria-hidden="true">›</span>
        <span className="text-foreground font-medium">Báo cáo &amp; xuất file</span>
      </div>

      {/* Page header + control bar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Báo cáo &amp; xuất file</h1>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="report-from" className="text-sm font-medium">
              Từ ngày
            </label>
            <Input
              id="report-from"
              type="date"
              aria-label="Từ ngày"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="report-to" className="text-sm font-medium">
              Đến ngày
            </label>
            <Input
              id="report-to"
              type="date"
              aria-label="Đến ngày"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className="w-40"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleApply}
            aria-label="Áp dụng bộ lọc"
            className="h-10"
          >
            Áp dụng
          </Button>
          <Button variant="outline" onClick={handlePrint} aria-label="In báo cáo" className="h-10">
            <Printer className="h-4 w-4 mr-2" aria-hidden="true" />
            In báo cáo
          </Button>
          {canExport && (
            <Button
              onClick={handleExportXlsx}
              disabled={exportMutation.isPending}
              aria-label="Xuất file XLSX"
              className="h-10"
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              {exportMutation.isPending ? 'Đang xuất...' : 'Xuất XLSX'}
            </Button>
          )}
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <Card className="p-6">
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
            <p className="font-medium text-foreground">Không thể tải báo cáo</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Thử lại
            </Button>
          </div>
        </Card>
      )}

      {/* KPI cards row — 5 cards */}
      {!isError && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
            label="Tiền thu mặt"
            value={isLoading ? '—' : formatVnd(grossRevenue)}
            colorClass="text-emerald-600"
            subLabel="Tổng doanh thu gộp"
            isLoading={isLoading}
          />
          <KpiCard
            icon={<Users className="h-5 w-5 text-orange-500" aria-hidden="true" />}
            label="Lương đã chi"
            value={isLoading ? '—' : formatVnd(payrollExpense)}
            colorClass="text-orange-500"
            subLabel="Tổng lương nhân sự"
            isLoading={isLoading}
          />
          <KpiCard
            icon={<Wallet className="h-5 w-5 text-sky-600" aria-hidden="true" />}
            label="Chi vận hành"
            value={isLoading ? '—' : formatVnd(operationalExpense)}
            colorClass="text-sky-600"
            subLabel="Không gồm lương"
            isLoading={isLoading}
          />
          <KpiCard
            icon={
              <Activity
                className={`h-5 w-5 ${isNetProfitNegative ? 'text-rose-600' : 'text-emerald-600'}`}
                aria-hidden="true"
              />
            }
            label="Lợi nhuận cuối"
            value={isLoading ? '—' : formatVnd(netProfit)}
            colorClass={isNetProfitNegative ? 'text-rose-600' : 'text-emerald-600'}
            subLabel={isNetProfitNegative ? 'Âm — cần chú ý' : 'Thực nhận - chi phí'}
            isLoading={isLoading}
          />
          <KpiCard
            icon={<Activity className="h-5 w-5 text-violet-600" aria-hidden="true" />}
            label="Công suất trung bình"
            value={isLoading ? '—' : `${occupancyPercent}%`}
            colorClass="text-violet-600"
            subLabel="Theo khoảng thời gian"
            isLoading={isLoading}
          />
        </div>
      )}

      {/* 2-panel content grid */}
      {!isError && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Left 2/3: summary table */}
          <Card className="lg:col-span-2 p-0">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Bảng tổng hợp báo cáo</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tự động liên kết tới booking, thu chi, buồng phòng và lương
              </p>
            </div>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <Activity className="h-8 w-8" aria-hidden="true" />
                  <p>Chưa có dữ liệu trong khoảng này</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3 text-left font-medium">Chỉ số</th>
                      <th className="px-5 py-3 text-right font-medium">Giá trị</th>
                      <th className="px-5 py-3 text-left font-medium">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const numericValue = parseFloat(row.value);
                      const isNumeric = !isNaN(numericValue) && !row.value.endsWith('%');
                      const isNegativeValue = isNumeric && numericValue < 0;
                      const isPositiveValue = isNumeric && numericValue > 0;
                      return (
                        <tr
                          key={idx}
                          className="border-b border-border last:border-0 hover:bg-muted/50"
                        >
                          <td className="px-5 py-3 font-medium">{row.label}</td>
                          <td
                            className={`px-5 py-3 text-right font-semibold tabular-nums ${
                              isNegativeValue
                                ? 'text-rose-600'
                                : isPositiveValue
                                  ? 'text-emerald-700'
                                  : ''
                            }`}
                          >
                            {isNumeric ? formatVnd(numericValue) : row.value}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground text-xs">{row.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Right 1/3: top rooms bar chart */}
          <Card className="p-0">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Top phòng &amp; nguồn booking</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Visual nhanh cho cấp lãnh đạo</p>
            </div>
            <CardContent className="p-5">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : topRoomsChartData.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <Activity className="h-8 w-8" aria-hidden="true" />
                  <p className="text-sm">Chưa có dữ liệu phòng</p>
                </div>
              ) : (
                <div aria-label="Biểu đồ doanh thu top phòng">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      layout="vertical"
                      data={topRoomsChartData}
                      margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="currentColor"
                        className="stroke-muted-foreground/20"
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: number) =>
                          v >= 1_000_000
                            ? `${(v / 1_000_000).toFixed(1)}M`
                            : v >= 1_000
                              ? `${(v / 1_000).toFixed(0)}K`
                              : String(v)
                        }
                      />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={48} />
                      <Tooltip
                        formatter={(value: number) => [formatVnd(value), 'Doanh thu']}
                        labelFormatter={(label: string) => {
                          const item = topRoomsChartData.find((d) => d.name === label);
                          return item ? `${item.name} — ${item.fullName}` : label;
                        }}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))',
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={22}>
                        {topRoomsChartData.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom row: donut (1/3) + sources bar (2/3) */}
      {!isError && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Donut: booking status distribution */}
          <Card className="p-0">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Phân bố booking theo trạng thái</h2>
            </div>
            <CardContent className="p-5">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Skeleton className="h-36 w-36 rounded-full" />
                </div>
              ) : statusDonutData.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <Activity className="h-8 w-8" aria-hidden="true" />
                  <p className="text-sm">Chưa có dữ liệu</p>
                </div>
              ) : (
                <div aria-label="Biểu đồ phân bố trạng thái booking">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusDonutData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={40}
                        paddingAngle={3}
                      >
                        {statusDonutData.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bar chart: top booking sources */}
          <Card className="lg:col-span-2 p-0">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Top nguồn booking</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Số lượng booking theo từng kênh
              </p>
            </div>
            <CardContent className="p-5">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : sourcesBarData.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <Activity className="h-8 w-8" aria-hidden="true" />
                  <p className="text-sm">Chưa có dữ liệu nguồn booking</p>
                </div>
              ) : (
                <div aria-label="Biểu đồ top nguồn booking">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={sourcesBarData}
                      margin={{ top: 4, right: 16, left: 0, bottom: 24 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="currentColor"
                        className="stroke-muted-foreground/20"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        angle={-20}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(value: number) => [value, 'Số booking']}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))',
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="bookings" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {sourcesBarData.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
