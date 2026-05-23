'use client';

import { useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Receipt,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { useAuth } from '@/lib/auth/use-auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  useFinanceTxs,
  useFinanceSummary,
  useFinanceBookingPayments,
  useDeleteFinanceTx,
} from '@/lib/hooks/use-finance';
import { useCategories } from '@/lib/hooks/use-categories';
import { formatVnd } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FinanceFormDialog } from './finance-form-dialog';
import type { FinanceTx, FinanceType } from '@/types/finance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const parts = iso.split('-');
  const y = parts[0] ?? '';
  const m = parts[1] ?? '';
  const d = parts[2] ?? '';
  return `${d}/${m}/${y}`;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  valueClass,
  isLoading,
  subLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  isLoading: boolean;
  subLabel?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-1.5 h-7 w-28" />
          ) : (
            <p className={`mt-0.5 text-xl font-bold leading-tight truncate ${valueClass ?? ''}`}>
              {value}
            </p>
          )}
          {subLabel && <p className="mt-0.5 text-xs text-muted-foreground">{subLabel}</p>}
        </div>
      </div>
    </Card>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: FinanceType }) {
  if (type === 'INCOME') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs whitespace-nowrap">
        Thu
      </Badge>
    );
  }
  return (
    <Badge className="bg-rose-100 text-rose-700 border-0 text-xs whitespace-nowrap">Chi</Badge>
  );
}

// ─── Permission denied panel ──────────────────────────────────────────────────

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

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteTxDialog({ tx, onClose }: { tx: FinanceTx | null; onClose: () => void }) {
  const deleteMutation = useDeleteFinanceTx();

  function handleDelete() {
    if (!tx) return;
    deleteMutation.mutate(tx.id, {
      onSuccess: () => {
        toast({ title: `Đã xoá phiếu ${tx.code}`, variant: 'success' });
        onClose();
      },
      onError: (err: unknown) => {
        const axiosErr = err as AxiosError<{ message: string | string[] }>;
        const msg = axiosErr.response?.data?.message;
        const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Xoá thất bại');
        toast({ title: text, variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open={tx !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xoá phiếu thu chi</DialogTitle>
          <DialogDescription>
            Xoá phiếu <span className="font-semibold text-foreground">«{tx?.code}»</span>? Hành động
            này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} type="button">
            Huỷ
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            type="button"
          >
            Xoá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

const COL_COUNT = 9;

type TableViewProps = {
  txs: FinanceTx[];
  isLoading: boolean;
  isError: boolean;
  canManage: boolean;
  onEdit: (tx: FinanceTx) => void;
  onDelete: (tx: FinanceTx) => void;
  onRetry: () => void;
  onAddNew: () => void;
};

function TableView({
  txs,
  isLoading,
  isError,
  canManage,
  onEdit,
  onDelete,
  onRetry,
  onAddNew,
}: TableViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label="Danh sách thu chi">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Mã
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Ngày
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Loại
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nhóm
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Liên quan booking
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mô tả
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Số tiền
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Người thực hiện
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                {Array.from({ length: COL_COUNT }).map((__, j) => (
                  <td key={j} className="px-3 py-3">
                    <Skeleton className="h-5 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : isError ? (
            <tr>
              <td colSpan={COL_COUNT} className="px-4 py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
                  <p>Không thể tải danh sách thu chi.</p>
                  <Button size="sm" variant="outline" onClick={onRetry}>
                    Thử lại
                  </Button>
                </div>
              </td>
            </tr>
          ) : txs.length === 0 ? (
            <tr>
              <td colSpan={COL_COUNT} className="px-4 py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Receipt className="h-10 w-10 opacity-30" aria-hidden="true" />
                  <p>Chưa có phiếu thu chi nào trong khoảng thời gian này.</p>
                  {canManage && (
                    <Button size="sm" onClick={onAddNew}>
                      <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                      Tạo phiếu thu chi
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            txs.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                {/* Mã */}
                <td className="px-3 py-3">
                  <code className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">
                    {tx.code}
                  </code>
                </td>

                {/* Ngày */}
                <td className="px-3 py-3 whitespace-nowrap text-sm">{formatDate(tx.occurredAt)}</td>

                {/* Loại */}
                <td className="px-3 py-3">
                  <TypeBadge type={tx.type} />
                </td>

                {/* Nhóm */}
                <td className="px-3 py-3 text-sm">{tx.group.name}</td>

                {/* Liên quan booking */}
                <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {tx.booking ? (
                    <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {tx.booking.code}
                    </code>
                  ) : (
                    '—'
                  )}
                </td>

                {/* Mô tả */}
                <td className="px-3 py-3 text-sm max-w-[200px]">
                  <span className="line-clamp-2">{tx.description}</span>
                </td>

                {/* Số tiền */}
                <td
                  className={`px-3 py-3 text-sm text-right font-semibold whitespace-nowrap ${
                    tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {tx.type === 'EXPENSE' ? '-' : ''}
                  {formatVnd(tx.amount)}
                </td>

                {/* Người thực hiện */}
                <td className="px-3 py-3 text-sm whitespace-nowrap">
                  {tx.createdBy?.fullName ?? (
                    <span className="text-muted-foreground italic">—</span>
                  )}
                </td>

                {/* Thao tác */}
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(tx)}
                          aria-label={`Sửa phiếu ${tx.code}`}
                          title="Sửa"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete(tx)}
                          aria-label={`Xoá phiếu ${tx.code}`}
                          title="Xoá"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ThuChiPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN', 'MANAGER');

  // Default date range: first day of current month → first day of next month
  const today = new Date();
  const defaultFrom = toIso(new Date(today.getFullYear(), today.getMonth(), 1));
  const defaultTo = toIso(new Date(today.getFullYear(), today.getMonth() + 1, 1));

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [type, setType] = useState<FinanceType | ''>('');
  const [groupId, setGroupId] = useState('');
  const [keyword, setKeyword] = useState('');
  const dKeyword = useDebouncedValue(keyword, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [formTarget, setFormTarget] = useState<FinanceTx | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceTx | null>(null);

  // Reference data
  const { data: groupsData } = useCategories({
    group: 'FINANCE_GROUP',
    active: true,
    pageSize: 100,
  });
  const groups = groupsData?.data ?? [];

  // Finance data
  const summary = useFinanceSummary({ from: from || undefined, to: to || undefined });
  const {
    data: listData,
    isLoading,
    isError,
    refetch,
  } = useFinanceTxs({
    from: from || undefined,
    to: to || undefined,
    type: type || undefined,
    groupId: groupId || undefined,
    keyword: dKeyword || undefined,
    page,
    pageSize,
  });
  const payments = useFinanceBookingPayments({
    from: from || undefined,
    to: to || undefined,
    limit: 12,
  });

  const txs = listData?.data ?? [];
  const meta = listData?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? txs.length;

  // Summary values
  const summaryData = summary.data;
  const totalIncome = parseFloat(summaryData?.totalIncome ?? '0');
  const totalExpense = parseFloat(summaryData?.totalExpense ?? '0');
  const payrollExpense = parseFloat(summaryData?.payrollExpense ?? '0');
  const operationExpense = totalExpense - payrollExpense;
  const netProfit = parseFloat(summaryData?.netProfit ?? '0');

  // Handlers
  const openCreate = useCallback(() => {
    setFormTarget(null);
    setFormMode('create');
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((tx: FinanceTx) => {
    setFormTarget(tx);
    setFormMode('edit');
    setFormOpen(true);
  }, []);

  if (!canManage) {
    return <PermissionDenied />;
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div>
        <p className="text-xs text-muted-foreground">Vận hành › Thu chi vận hành</p>
      </div>

      {/* Control bar (date range + filters + search) */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* From date */}
          <div className="space-y-1">
            <label htmlFor="from-date" className="text-xs font-medium text-muted-foreground">
              Từ ngày
            </label>
            <Input
              id="from-date"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="h-9 w-40 text-sm"
              aria-label="Từ ngày"
            />
          </div>

          {/* To date */}
          <div className="space-y-1">
            <label htmlFor="to-date" className="text-xs font-medium text-muted-foreground">
              Đến ngày
            </label>
            <Input
              id="to-date"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="h-9 w-40 text-sm"
              aria-label="Đến ngày"
            />
          </div>

          {/* Type filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Loại</label>
            <Select
              value={type || '__all__'}
              onValueChange={(v) => {
                setType(v === '__all__' ? '' : (v as FinanceType));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36 h-9 text-sm" aria-label="Lọc loại thu chi">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả loại</SelectItem>
                <SelectItem value="INCOME">Thu</SelectItem>
                <SelectItem value="EXPENSE">Chi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Group filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nhóm</label>
            <Select
              value={groupId || '__all__'}
              onValueChange={(v) => {
                setGroupId(v === '__all__' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44 h-9 text-sm" aria-label="Lọc nhóm">
                <SelectValue placeholder="Tất cả nhóm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả nhóm</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tìm kiếm</label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Tìm mã, mô tả..."
                className="pl-9 h-9 w-56 text-sm"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                aria-label="Tìm kiếm thu chi"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
          label="Tổng tiền thu"
          value={formatVnd(totalIncome)}
          valueClass="text-emerald-600"
          isLoading={summary.isLoading}
          subLabel={`${summaryData?.countTransactions ?? 0} giao dịch`}
        />
        <KpiCard
          icon={<TrendingDown className="h-5 w-5 text-rose-600" aria-hidden="true" />}
          label="Chi vận hành"
          value={formatVnd(operationExpense)}
          valueClass="text-rose-600"
          isLoading={summary.isLoading}
        />
        <KpiCard
          icon={<DollarSign className="h-5 w-5 text-orange-600" aria-hidden="true" />}
          label="Lương"
          value={formatVnd(payrollExpense)}
          valueClass="text-orange-600"
          isLoading={summary.isLoading}
        />
        <KpiCard
          icon={<BarChart2 className="h-5 w-5 text-primary" aria-hidden="true" />}
          label="Lợi nhuận ròng"
          value={formatVnd(netProfit)}
          valueClass={netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          isLoading={summary.isLoading}
          subLabel={netProfit < 0 ? 'Âm — cần chú ý' : undefined}
        />
      </div>

      {/* Two-panel grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Finance list table */}
        <Card className="lg:col-span-2 p-0">
          {/* Card header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Danh sách thu chi</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast({
                    title: 'Tính năng đang phát triển ở Phase 14',
                    variant: 'default',
                  })
                }
                aria-label="Xuất XLSX"
              >
                <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Xuất XLSX
              </Button>
              <Button size="sm" onClick={openCreate} aria-label="Tạo phiếu thu chi mới">
                <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Tạo phiếu thu chi
              </Button>
            </div>
          </div>

          <CardContent className="p-0">
            <TableView
              txs={txs}
              isLoading={isLoading}
              isError={isError}
              canManage={canManage}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onRetry={() => void refetch()}
              onAddNew={openCreate}
            />
          </CardContent>

          {/* Pagination — always visible */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {total === 0
                ? 'Không có dữ liệu'
                : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trong tổng ${total} phiếu`}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Số dòng / trang</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[80px]" aria-label="Số dòng mỗi trang">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Trang tiếp"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Right: Booking payments */}
        <Card className="p-4">
          <h3 className="font-semibold text-base">Thanh toán booking</h3>
          <p className="text-xs text-muted-foreground mb-3 mt-0.5">Nhiều đợt, nhiều phương thức</p>

          {payments.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div className="flex flex-col gap-1.5 flex-1 mr-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : payments.isError ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
              <p className="text-sm">Không thể tải thanh toán</p>
            </div>
          ) : !payments.data?.data?.length ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Receipt className="h-8 w-8 opacity-30" aria-hidden="true" />
              <p className="text-sm">Chưa có thanh toán trong kỳ</p>
            </div>
          ) : (
            <div className="space-y-0.5 max-h-[520px] overflow-y-auto pr-1">
              {payments.data.data.map((p) => (
                <div
                  key={p.paymentId}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="font-mono text-xs font-medium truncate">
                      {p.bookingCode} – {p.roomLabel}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.customerName ?? '—'} – {p.method.name}
                    </div>
                  </div>
                  <div className="font-semibold text-sm text-emerald-600 whitespace-nowrap">
                    {formatVnd(Number(p.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Form dialog (create / edit / view) */}
      <FinanceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        editTarget={formTarget}
      />

      {/* Delete confirm */}
      <DeleteTxDialog tx={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
