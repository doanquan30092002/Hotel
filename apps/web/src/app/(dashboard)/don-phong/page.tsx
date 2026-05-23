'use client';

import { useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  WashingMachine,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { useAuth } from '@/lib/auth/use-auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useHousekeepingTasks, useDeleteHousekeepingTask } from '@/lib/hooks/use-housekeeping';
import { useCategories } from '@/lib/hooks/use-categories';
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
import { HousekeepingFormDialog } from './housekeeping-form-dialog';
import type { HousekeepingTask, HousekeepingPriority } from '@/types/housekeeping';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (start && end) return `${start} → ${end}`;
  if (start) return `${start} →`;
  return '—';
}

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: HousekeepingPriority }) {
  const map: Record<HousekeepingPriority, [string, string]> = {
    high: ['Cao', 'bg-rose-100 text-rose-700'],
    normal: ['Trung bình', 'bg-amber-100 text-amber-700'],
    low: ['Thấp', 'bg-zinc-100 text-zinc-700'],
  };
  const [label, cls] = map[priority];
  return <Badge className={`${cls} border-0 text-xs whitespace-nowrap`}>{label}</Badge>;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function TaskStatusBadge({ code, name }: { code: string; name: string }) {
  const clsMap: Record<string, string> = {
    waiting: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-sky-100 text-sky-700',
    done: 'bg-emerald-100 text-emerald-700',
    skipped: 'bg-zinc-100 text-zinc-700',
  };
  const cls = clsMap[code] ?? 'bg-muted text-muted-foreground';
  return <Badge className={`${cls} border-0 text-xs whitespace-nowrap`}>{name}</Badge>;
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteTaskDialog({
  task,
  onClose,
}: {
  task: HousekeepingTask | null;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteHousekeepingTask();

  function handleDelete() {
    if (!task) return;
    deleteMutation.mutate(task.id, {
      onSuccess: () => {
        toast({ title: `Đã xoá công việc ${task.code}`, variant: 'success' });
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
    <Dialog open={task !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xoá công việc</DialogTitle>
          <DialogDescription>
            Xoá công việc <span className="font-semibold text-foreground">«{task?.code}»</span>?
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

const COL_COUNT = 10;

type TableViewProps = {
  tasks: HousekeepingTask[];
  isLoading: boolean;
  isError: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onView: (t: HousekeepingTask) => void;
  onEdit: (t: HousekeepingTask) => void;
  onDelete: (t: HousekeepingTask) => void;
  onRetry: () => void;
  onAddNew: () => void;
};

function TableView({
  tasks,
  isLoading,
  isError,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
  onRetry,
  onAddNew,
}: TableViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label="Danh sách công việc dọn phòng">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Mã
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Ngày
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Phòng
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Booking
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Công việc
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Ưu tiên
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Nhân sự
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Giờ
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
                  <p>Không thể tải danh sách công việc dọn phòng.</p>
                  <Button size="sm" variant="outline" onClick={onRetry}>
                    Thử lại
                  </Button>
                </div>
              </td>
            </tr>
          ) : tasks.length === 0 ? (
            <tr>
              <td colSpan={COL_COUNT} className="px-4 py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <WashingMachine className="h-10 w-10 opacity-30" aria-hidden="true" />
                  <p>Chưa có công việc dọn phòng nào.</p>
                  <Button size="sm" onClick={onAddNew}>
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                    Tạo công việc
                  </Button>
                </div>
              </td>
            </tr>
          ) : (
            tasks.map((t) => (
              <tr key={t.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                {/* Mã */}
                <td className="px-3 py-3">
                  <code className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">
                    {t.code}
                  </code>
                </td>

                {/* Ngày */}
                <td className="px-3 py-3 whitespace-nowrap text-sm">{formatDate(t.scheduledAt)}</td>

                {/* Phòng */}
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{t.room.name}</span>
                    <span className="text-xs text-muted-foreground">{t.room.code}</span>
                  </div>
                </td>

                {/* Booking */}
                <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {t.booking?.code ?? '—'}
                </td>

                {/* Công việc */}
                <td className="px-3 py-3 text-sm max-w-[180px]">
                  <span className="line-clamp-2">{t.description}</span>
                </td>

                {/* Ưu tiên */}
                <td className="px-3 py-3">
                  <PriorityBadge priority={t.priority} />
                </td>

                {/* Nhân sự */}
                <td className="px-3 py-3 text-sm whitespace-nowrap">
                  {t.assignee?.fullName ?? (
                    <span className="text-muted-foreground italic">Chưa phân công</span>
                  )}
                </td>

                {/* Giờ */}
                <td className="px-3 py-3 text-sm whitespace-nowrap text-muted-foreground">
                  {formatTimeRange(t.startTime, t.endTime)}
                </td>

                {/* Trạng thái */}
                <td className="px-3 py-3">
                  <TaskStatusBadge code={t.status.code} name={t.status.name} />
                </td>

                {/* Thao tác */}
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* View */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(t)}
                      aria-label={`Xem công việc ${t.code}`}
                      title="Xem chi tiết"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Button>

                    {/* Edit */}
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(t)}
                        aria-label={`Sửa công việc ${t.code}`}
                        title="Sửa"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}

                    {/* Delete */}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(t)}
                        aria-label={`Xoá công việc ${t.code}`}
                        title="Xoá"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
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

export default function DonPhongPage() {
  const { hasRole } = useAuth();
  const canAdd = hasRole('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING');
  const canEdit = hasRole('ADMIN', 'MANAGER', 'HOUSEKEEPING');
  const canDelete = hasRole('ADMIN', 'MANAGER');

  // Filters
  const [keyword, setKeyword] = useState('');
  const [statusId, setStatusId] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<HousekeepingPriority | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [formTarget, setFormTarget] = useState<HousekeepingTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HousekeepingTask | null>(null);

  // Reference data for filters
  const { data: statusesData } = useCategories({
    group: 'HOUSEKEEPING_TASK_STATUS',
    active: true,
    pageSize: 100,
  });
  const statuses = statusesData?.data ?? [];

  // Tasks data
  const {
    data: tasksData,
    isLoading,
    isError,
    refetch,
  } = useHousekeepingTasks({
    keyword: debouncedKeyword || undefined,
    statusId: statusId || undefined,
    priority: priorityFilter || undefined,
    page,
    pageSize,
  });

  const tasks = tasksData?.data ?? [];
  const meta = tasksData?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? tasks.length;

  // Handlers
  const openCreate = useCallback(() => {
    setFormTarget(null);
    setFormMode('create');
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((t: HousekeepingTask) => {
    setFormTarget(t);
    setFormMode('edit');
    setFormOpen(true);
  }, []);

  const openView = useCallback((t: HousekeepingTask) => {
    setFormTarget(t);
    setFormMode('view');
    setFormOpen(true);
  }, []);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div>
        <p className="text-xs text-muted-foreground">Quản lý cơ sở › Buồng phòng</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Tìm mã, phòng, công việc..."
              className="pl-9 w-64"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              aria-label="Tìm kiếm công việc"
            />
          </div>

          {/* Status filter */}
          <Select
            value={statusId || '__all__'}
            onValueChange={(v) => {
              setStatusId(v === '__all__' ? '' : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44 h-10 text-sm" aria-label="Lọc trạng thái">
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select
            value={priorityFilter || '__all__'}
            onValueChange={(v) => {
              setPriorityFilter(v === '__all__' ? '' : (v as HousekeepingPriority));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36 h-10 text-sm" aria-label="Lọc ưu tiên">
              <SelectValue placeholder="Ưu tiên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả ưu tiên</SelectItem>
              <SelectItem value="high">Cao</SelectItem>
              <SelectItem value="normal">Trung bình</SelectItem>
              <SelectItem value="low">Thấp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Add button */}
        {canAdd && (
          <Button onClick={openCreate} aria-label="Tạo công việc dọn phòng mới">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Tạo công việc
          </Button>
        )}
      </div>

      {/* Content card */}
      <Card>
        <CardContent className="p-0">
          <TableView
            tasks={tasks}
            isLoading={isLoading}
            isError={isError}
            canEdit={canEdit}
            canDelete={canDelete}
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
              : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trong tổng ${total} công việc`}
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

      {/* Form dialog (create / edit / view) */}
      <HousekeepingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        editTarget={formTarget}
      />

      {/* Delete confirm */}
      <DeleteTaskDialog task={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
