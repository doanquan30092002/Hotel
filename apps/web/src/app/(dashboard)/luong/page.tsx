'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Wand2,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { useAuth } from '@/lib/auth/use-auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePayrolls, useDeletePayroll, useChangePayrollStatus } from '@/lib/hooks/use-payroll';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { PayrollFormDialog } from './payroll-form-dialog';
import { GeneratePayrollDialog } from './generate-payroll-dialog';
import type { Payroll } from '@/types/payroll';
import type { Category } from '@/types/category';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonth(month: string): string {
  // "2026-05" → "Tháng 5/2026"
  const parts = month.split('-');
  const y = parts[0] ?? '';
  const m = parts[1] ?? '';
  return `Tháng ${parseInt(m, 10)}/${y}`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function PayrollStatusBadge({ code, name }: { code: string; name: string }) {
  const classMap: Record<string, string> = {
    draft: 'bg-zinc-100 text-zinc-700',
    pending: 'bg-amber-100 text-amber-700',
    paid: 'bg-emerald-100 text-emerald-700',
  };
  const cls = classMap[code] ?? 'bg-zinc-100 text-zinc-700';
  return <Badge className={`${cls} border-0 text-xs whitespace-nowrap`}>{name}</Badge>;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLoading: boolean;
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
            <p className="mt-0.5 text-xl font-bold leading-tight truncate">{value}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

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

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeletePayrollDialog({
  payroll,
  onClose,
}: {
  payroll: Payroll | null;
  onClose: () => void;
}) {
  const deleteMutation = useDeletePayroll();

  function handleDelete() {
    if (!payroll) return;
    deleteMutation.mutate(payroll.id, {
      onSuccess: () => {
        toast({ title: `Đã xoá bảng lương ${payroll.code}`, variant: 'success' });
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
    <Dialog open={payroll !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xoá bảng lương</DialogTitle>
          <DialogDescription>
            Xoá bảng lương <span className="font-semibold text-foreground">«{payroll?.code}»</span>?
            Hành động này không thể hoàn tác.
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

// ─── Inline Status Flip ───────────────────────────────────────────────────────

function StatusFlipButton({
  payroll,
  statuses,
  canManage,
}: {
  payroll: Payroll;
  statuses: Category[];
  canManage: boolean;
}) {
  const changeMutation = useChangePayrollStatus();

  if (!canManage) {
    return <PayrollStatusBadge code={payroll.status.code} name={payroll.status.name} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="cursor-pointer"
          aria-label={`Đổi trạng thái bảng lương ${payroll.code}`}
        >
          <PayrollStatusBadge code={payroll.status.code} name={payroll.status.name} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {statuses.map((s) => (
          <DropdownMenuItem
            key={s.id}
            disabled={s.id === payroll.status.id || changeMutation.isPending}
            onClick={() => {
              changeMutation.mutate(
                { id: payroll.id, statusId: s.id },
                {
                  onSuccess: () => {
                    toast({ title: `Đã cập nhật trạng thái → ${s.name}`, variant: 'success' });
                  },
                  onError: (err: unknown) => {
                    const axiosErr = err as AxiosError<{ message: string | string[] }>;
                    const msg = axiosErr.response?.data?.message;
                    const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Cập nhật thất bại');
                    toast({ title: text, variant: 'destructive' });
                  },
                },
              );
            }}
          >
            {s.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

const COL_COUNT = 13;

type TableViewProps = {
  payrolls: Payroll[];
  isLoading: boolean;
  isError: boolean;
  canManage: boolean;
  statuses: Category[];
  onView: (p: Payroll) => void;
  onEdit: (p: Payroll) => void;
  onDelete: (p: Payroll) => void;
  onRetry: () => void;
  onAddNew: () => void;
};

function TableView({
  payrolls,
  isLoading,
  isError,
  canManage,
  statuses,
  onView,
  onEdit,
  onDelete,
  onRetry,
  onAddNew,
}: TableViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label="Danh sách bảng lương">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Mã
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Tháng
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ảnh
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nhân sự
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Chức vụ
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Ngày công
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Lương cơ bản
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Phụ cấp
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Thưởng
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Phạt
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Thực nhận
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Trạng thái
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
                  <p>Không thể tải danh sách bảng lương.</p>
                  <Button size="sm" variant="outline" onClick={onRetry}>
                    Thử lại
                  </Button>
                </div>
              </td>
            </tr>
          ) : payrolls.length === 0 ? (
            <tr>
              <td colSpan={COL_COUNT} className="px-4 py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <FileText className="h-10 w-10 opacity-30" aria-hidden="true" />
                  <p>Chưa có bảng lương nào.</p>
                  {canManage && (
                    <Button size="sm" onClick={onAddNew}>
                      <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                      Thêm bảng lương
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            payrolls.map((p) => (
              <tr key={p.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                {/* Mã */}
                <td className="px-3 py-3">
                  <code className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">
                    {p.code}
                  </code>
                </td>

                {/* Tháng */}
                <td className="px-3 py-3 text-sm whitespace-nowrap">{formatMonth(p.month)}</td>

                {/* Ảnh */}
                <td className="px-3 py-3">
                  <Avatar src={p.staff.avatarUrl} name={p.staff.fullName} size={32} />
                </td>

                {/* Nhân sự */}
                <td className="px-3 py-3">
                  <div className="font-medium text-sm">{p.staff.fullName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{p.staff.code}</div>
                </td>

                {/* Chức vụ */}
                <td className="px-3 py-3 text-sm">{p.staff.position?.name ?? '—'}</td>

                {/* Ngày công */}
                <td className="px-3 py-3 text-sm text-right">{p.workingDays}</td>

                {/* Lương cơ bản */}
                <td className="px-3 py-3 text-sm text-right whitespace-nowrap">
                  {formatVnd(Number(p.baseSalary))}
                </td>

                {/* Phụ cấp */}
                <td className="px-3 py-3 text-sm text-right whitespace-nowrap">
                  {formatVnd(Number(p.allowance))}
                </td>

                {/* Thưởng */}
                <td className="px-3 py-3 text-sm text-right whitespace-nowrap">
                  {formatVnd(Number(p.bonus))}
                </td>

                {/* Phạt */}
                <td className="px-3 py-3 text-sm text-right whitespace-nowrap">
                  {p.penalty !== '0' ? (
                    <span className="text-rose-600">-{formatVnd(Number(p.penalty))}</span>
                  ) : (
                    '0 đ'
                  )}
                </td>

                {/* Thực nhận */}
                <td className="px-3 py-3 text-sm text-right whitespace-nowrap font-semibold text-emerald-700">
                  {formatVnd(Number(p.netSalary))}
                </td>

                {/* Trạng thái — inline flip */}
                <td className="px-3 py-3">
                  <StatusFlipButton payroll={p} statuses={statuses} canManage={canManage} />
                </td>

                {/* Thao tác */}
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(p)}
                      aria-label={`Xem chi tiết bảng lương ${p.code}`}
                      title="Xem"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(p)}
                          aria-label={`Sửa bảng lương ${p.code}`}
                          title="Sửa"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete(p)}
                          aria-label={`Xoá bảng lương ${p.code}`}
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

export default function LuongPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN', 'MANAGER');

  if (!canManage) {
    return <PermissionDenied />;
  }

  return <LuongContent canManage={canManage} />;
}

function LuongContent({ canManage }: { canManage: boolean }) {
  const [keyword, setKeyword] = useState('');
  const dKeyword = useDebouncedValue(keyword, 300);
  const [monthFilter, setMonthFilter] = useState('');
  const [statusId, setStatusId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [formTarget, setFormTarget] = useState<Payroll | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payroll | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  // Payroll statuses
  const { data: statusesData } = useCategories({
    group: 'PAYROLL_STATUS',
    active: true,
    pageSize: 100,
  });
  const statuses = useMemo(() => statusesData?.data ?? [], [statusesData]);

  // Payroll data
  const {
    data: listData,
    isLoading,
    isError,
    refetch,
  } = usePayrolls({
    statusId: statusId || undefined,
    month: monthFilter || undefined,
    keyword: dKeyword || undefined,
    page,
    pageSize,
  });

  const payrolls = listData?.data ?? [];
  const meta = listData?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? payrolls.length;

  // KPI derivations from current page
  const totalNetSalary = payrolls.reduce((acc, p) => acc + Number(p.netSalary), 0);
  const totalPaid = payrolls
    .filter((p) => p.status.code === 'paid')
    .reduce((acc, p) => acc + Number(p.netSalary), 0);
  const totalPending = payrolls
    .filter((p) => p.status.code === 'draft' || p.status.code === 'pending')
    .reduce((acc, p) => acc + Number(p.netSalary), 0);

  // Handlers
  const openCreate = useCallback(() => {
    setFormTarget(null);
    setFormMode('create');
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((p: Payroll) => {
    setFormTarget(p);
    setFormMode('edit');
    setFormOpen(true);
  }, []);

  const openView = useCallback((p: Payroll) => {
    setFormTarget(p);
    setFormMode('view');
    setFormOpen(true);
  }, []);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div>
        <p className="text-xs text-muted-foreground">Vận hành › Bảng lương</p>
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tìm kiếm</label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Tìm mã, tên nhân sự..."
                className="pl-9 h-9 w-56 text-sm"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                aria-label="Tìm kiếm bảng lương"
              />
            </div>
          </div>

          {/* Month filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tháng</label>
            <Input
              type="month"
              className="h-9 w-44 text-sm"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Lọc theo tháng"
            />
          </div>

          {/* Status filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Trạng thái</label>
            <Select
              value={statusId || '__all__'}
              onValueChange={(v) => {
                setStatusId(v === '__all__' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40 h-9 text-sm" aria-label="Lọc trạng thái bảng lương">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả trạng thái</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast({ title: 'Tính năng xuất XLSX sẽ có ở Phase 14', variant: 'default' })
              }
              aria-label="Xuất XLSX"
            >
              <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Xuất XLSX
            </Button>
            {canManage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGenerateOpen(true)}
                  aria-label="Tạo bảng lương theo tháng"
                >
                  <Wand2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Tạo bảng lương tháng
                </Button>
                <Button size="sm" onClick={openCreate} aria-label="Thêm bảng lương mới">
                  <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Thêm bảng lương
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<FileText className="h-5 w-5 text-primary" aria-hidden="true" />}
          label="Số bảng lương"
          value={String(total)}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<DollarSign className="h-5 w-5 text-sky-600" aria-hidden="true" />}
          label="Tổng thực nhận"
          value={formatVnd(totalNetSalary)}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
          label="Đã thanh toán"
          value={formatVnd(totalPaid)}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5 text-amber-600" aria-hidden="true" />}
          label="Chưa chi"
          value={formatVnd(totalPending)}
          isLoading={isLoading}
        />
      </div>

      {/* Table Card */}
      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Danh sách bảng lương</h2>
        </div>

        <CardContent className="p-0">
          <TableView
            payrolls={payrolls}
            isLoading={isLoading}
            isError={isError}
            canManage={canManage}
            statuses={statuses}
            onView={openView}
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
              : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trong tổng ${total} bảng lương`}
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

      {/* Form dialog */}
      <PayrollFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        editTarget={formTarget}
      />

      {/* Generate dialog */}
      <GeneratePayrollDialog open={generateOpen} onOpenChange={setGenerateOpen} />

      {/* Delete confirm */}
      <DeletePayrollDialog payroll={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
