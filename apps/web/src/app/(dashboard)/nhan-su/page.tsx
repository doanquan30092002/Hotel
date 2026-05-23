'use client';

import { useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Users,
  Building2,
  Wallet,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { useAuth } from '@/lib/auth/use-auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useStaffs, useDeleteStaff } from '@/lib/hooks/use-staff';
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
import { Avatar } from '@/components/ui/avatar';
import { StaffFormDialog } from './staff-form-dialog';
import type { Staff } from '@/types/staff';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const parts = iso.split('-');
  const y = parts[0] ?? '';
  const m = parts[1] ?? '';
  const d = parts[2] ?? '';
  return `${d}/${m}/${y}`;
}

const SHIFT_LABELS: Record<string, string> = {
  day: 'Ca ngày',
  night: 'Ca đêm',
  full: 'Cả ngày',
};

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

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteStaffDialog({ staff, onClose }: { staff: Staff | null; onClose: () => void }) {
  const deleteMutation = useDeleteStaff();

  function handleDelete() {
    if (!staff) return;
    deleteMutation.mutate(staff.id, {
      onSuccess: () => {
        toast({ title: `Đã xoá nhân sự ${staff.fullName}`, variant: 'success' });
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
    <Dialog open={staff !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xoá nhân sự</DialogTitle>
          <DialogDescription>
            Xoá nhân sự <span className="font-semibold text-foreground">«{staff?.fullName}»</span>?
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

// ─── Table ────────────────────────────────────────────────────────────────────

const COL_COUNT = 11;

type TableViewProps = {
  staffList: Staff[];
  isLoading: boolean;
  isError: boolean;
  canManage: boolean;
  onView: (s: Staff) => void;
  onEdit: (s: Staff) => void;
  onDelete: (s: Staff) => void;
  onRetry: () => void;
  onAddNew: () => void;
};

function TableView({
  staffList,
  isLoading,
  isError,
  canManage,
  onView,
  onEdit,
  onDelete,
  onRetry,
  onAddNew,
}: TableViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label="Danh sách nhân sự">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Mã nhân sự
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Họ tên
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Bộ phận
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Chức vụ
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Liên hệ
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Ca làm
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Ngày vào
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Lương cơ bản
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Phụ cấp
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
                  <p>Không thể tải danh sách nhân sự.</p>
                  <Button size="sm" variant="outline" onClick={onRetry}>
                    Thử lại
                  </Button>
                </div>
              </td>
            </tr>
          ) : staffList.length === 0 ? (
            <tr>
              <td colSpan={COL_COUNT} className="px-4 py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Users className="h-10 w-10 opacity-30" aria-hidden="true" />
                  <p>Chưa có nhân sự nào.</p>
                  {canManage && (
                    <Button size="sm" onClick={onAddNew}>
                      <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                      Thêm nhân sự
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            staffList.map((s) => (
              <tr key={s.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                {/* Mã */}
                <td className="px-3 py-3">
                  <code className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">
                    {s.code}
                  </code>
                </td>

                {/* Họ tên + avatar */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar src={s.avatarUrl} name={s.fullName} size={36} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{s.fullName}</p>
                    </div>
                  </div>
                </td>

                {/* Bộ phận */}
                <td className="px-3 py-3 text-sm">{s.department?.name ?? '—'}</td>

                {/* Chức vụ */}
                <td className="px-3 py-3 text-sm">{s.position?.name ?? '—'}</td>

                {/* Liên hệ */}
                <td className="px-3 py-3">
                  <div className="text-sm">{s.phone ?? '—'}</div>
                  {s.email && (
                    <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                      {s.email}
                    </div>
                  )}
                </td>

                {/* Ca làm */}
                <td className="px-3 py-3 text-sm whitespace-nowrap">
                  {SHIFT_LABELS[s.shiftType] ?? s.shiftType}
                </td>

                {/* Ngày vào */}
                <td className="px-3 py-3 text-sm whitespace-nowrap">{formatDate(s.joinDate)}</td>

                {/* Lương cơ bản */}
                <td className="px-3 py-3 text-sm text-right whitespace-nowrap font-medium">
                  {formatVnd(Number(s.baseSalary))}
                </td>

                {/* Phụ cấp */}
                <td className="px-3 py-3 text-sm text-right whitespace-nowrap">
                  {formatVnd(Number(s.allowance))}
                </td>

                {/* Trạng thái */}
                <td className="px-3 py-3">
                  {s.active ? (
                    <Badge className="bg-sky-100 text-sky-700 border-0 text-xs whitespace-nowrap">
                      Đang làm
                    </Badge>
                  ) : (
                    <Badge className="bg-zinc-100 text-zinc-700 border-0 text-xs whitespace-nowrap">
                      Ngừng
                    </Badge>
                  )}
                </td>

                {/* Thao tác */}
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(s)}
                      aria-label={`Xem chi tiết nhân sự ${s.code}`}
                      title="Xem"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(s)}
                          aria-label={`Sửa nhân sự ${s.code}`}
                          title="Sửa"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete(s)}
                          aria-label={`Xoá nhân sự ${s.code}`}
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

export default function NhanSuPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN', 'MANAGER');

  if (!canManage) {
    return <PermissionDenied />;
  }

  return <NhanSuContent canManage={canManage} />;
}

function NhanSuContent({ canManage }: { canManage: boolean }) {
  const [keyword, setKeyword] = useState('');
  const dKeyword = useDebouncedValue(keyword, 300);
  const [departmentId, setDepartmentId] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [formTarget, setFormTarget] = useState<Staff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);

  // Reference data for department filter
  const { data: deptsData } = useCategories({
    group: 'STAFF_DEPARTMENT',
    active: true,
    pageSize: 100,
  });
  const departments = deptsData?.data ?? [];

  // Staff data
  const {
    data: listData,
    isLoading,
    isError,
    refetch,
  } = useStaffs({
    departmentId: departmentId || undefined,
    active: activeFilter === 'all' ? undefined : activeFilter === 'true',
    keyword: dKeyword || undefined,
    page,
    pageSize,
  });

  const staffList = listData?.data ?? [];
  const meta = listData?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? staffList.length;

  // KPI derivations (per-page, documented as nit)
  const activeCount = staffList.filter((s) => s.active).length;
  const uniqueDepts = new Set(staffList.map((s) => s.department?.id).filter(Boolean)).size;
  const totalSalaryEstimate = staffList
    .filter((s) => s.active)
    .reduce((acc, s) => acc + Number(s.baseSalary) + Number(s.allowance), 0);

  // Handlers
  const openCreate = useCallback(() => {
    setFormTarget(null);
    setFormMode('create');
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((s: Staff) => {
    setFormTarget(s);
    setFormMode('edit');
    setFormOpen(true);
  }, []);

  const openView = useCallback((s: Staff) => {
    setFormTarget(s);
    setFormMode('view');
    setFormOpen(true);
  }, []);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div>
        <p className="text-xs text-muted-foreground">Vận hành › Nhân sự</p>
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
                placeholder="Tìm mã, SĐT, họ tên..."
                className="pl-9 h-9 w-56 text-sm"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                aria-label="Tìm kiếm nhân sự"
              />
            </div>
          </div>

          {/* Department filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Bộ phận</label>
            <Select
              value={departmentId || '__all__'}
              onValueChange={(v) => {
                setDepartmentId(v === '__all__' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44 h-9 text-sm" aria-label="Lọc bộ phận">
                <SelectValue placeholder="Tất cả bộ phận" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả bộ phận</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Trạng thái</label>
            <Select
              value={activeFilter}
              onValueChange={(v) => {
                setActiveFilter(v as 'all' | 'true' | 'false');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40 h-9 text-sm" aria-label="Lọc trạng thái">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="true">Đang làm</SelectItem>
                <SelectItem value="false">Ngừng</SelectItem>
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
              <Button size="sm" onClick={openCreate} aria-label="Thêm nhân sự mới">
                <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Thêm nhân sự
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-5 w-5 text-primary" aria-hidden="true" />}
          label="Nhân sự đang làm"
          value={String(activeCount)}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<Building2 className="h-5 w-5 text-sky-600" aria-hidden="true" />}
          label="Bộ phận"
          value={String(uniqueDepts)}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<Wallet className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
          label="Tổng lương dự kiến"
          value={formatVnd(totalSalaryEstimate)}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<Calendar className="h-5 w-5 text-orange-600" aria-hidden="true" />}
          label="Đợt sắp tới"
          value="0"
          isLoading={false}
        />
      </div>

      {/* Table Card */}
      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Danh sách nhân sự</h2>
        </div>

        <CardContent className="p-0">
          <TableView
            staffList={staffList}
            isLoading={isLoading}
            isError={isError}
            canManage={canManage}
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
              : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trong tổng ${total} nhân sự`}
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
      <StaffFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        editTarget={formTarget}
      />

      {/* Delete confirm */}
      <DeleteStaffDialog staff={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
