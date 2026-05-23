'use client';

import { useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CalendarX,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { useAuth } from '@/lib/auth/use-auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  useBookings,
  useDeleteBooking,
  useCheckInBooking,
  useCheckOutBooking,
} from '@/lib/hooks/use-bookings';
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
import { BookingFormDialog } from './booking-form-dialog';
import type { Booking } from '@/types/booking';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function BookingStatusBadge({ code, name }: { code: string; name: string }) {
  const clsMap: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-sky-100 text-sky-700',
    checked_in: 'bg-emerald-100 text-emerald-700',
    checked_out: 'bg-zinc-100 text-zinc-700',
    cancelled: 'bg-rose-100 text-rose-700',
  };
  const cls = clsMap[code] ?? 'bg-muted text-muted-foreground';
  return <Badge className={`${cls} border-0 text-xs whitespace-nowrap`}>{name}</Badge>;
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteBookingDialog({
  booking,
  onClose,
}: {
  booking: Booking | null;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteBooking();

  function handleDelete() {
    if (!booking) return;
    deleteMutation.mutate(booking.id, {
      onSuccess: () => {
        toast({ title: `Đã xoá booking ${booking.code}`, variant: 'success' });
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
    <Dialog open={booking !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xoá booking</DialogTitle>
          <DialogDescription>
            Xoá booking <span className="font-semibold text-foreground">«{booking?.code}»</span>?
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
            Xoá booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

const COL_COUNT = 10;

type TableViewProps = {
  bookings: Booking[];
  isLoading: boolean;
  isError: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onView: (b: Booking) => void;
  onEdit: (b: Booking) => void;
  onDelete: (b: Booking) => void;
  onCheckIn: (b: Booking) => void;
  onCheckOut: (b: Booking) => void;
  onRetry: () => void;
  onAddNew: () => void;
};

function TableView({
  bookings,
  isLoading,
  isError,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
  onCheckIn,
  onCheckOut,
  onRetry,
  onAddNew,
}: TableViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label="Danh sách booking">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Mã booking
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Khách
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Ngày
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Phòng
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Loại giá
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Tổng tiền
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Đã TT
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Còn phải trả
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
                  <p>Không thể tải danh sách booking.</p>
                  <Button size="sm" variant="outline" onClick={onRetry}>
                    Thử lại
                  </Button>
                </div>
              </td>
            </tr>
          ) : bookings.length === 0 ? (
            <tr>
              <td colSpan={COL_COUNT} className="px-4 py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <CalendarX className="h-10 w-10 opacity-30" aria-hidden="true" />
                  <p>Chưa có booking nào.</p>
                  <Button size="sm" onClick={onAddNew}>
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                    Tạo booking
                  </Button>
                </div>
              </td>
            </tr>
          ) : (
            bookings.map((b) => {
              const roomItems = b.items?.filter((i) => i.kind === 'ROOM') ?? [];
              const firstRoom = roomItems[0];
              const roomDisplay = firstRoom?.room?.name
                ? roomItems.length > 1
                  ? `${firstRoom.room.name} +${roomItems.length - 1}`
                  : firstRoom.room.name
                : '—';

              const statusCode = b.status.code;
              const canCheckIn = statusCode === 'confirmed';
              const canCheckOut = statusCode === 'checked_in';

              return (
                <tr
                  key={b.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  {/* Mã booking + source */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      <code className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">
                        {b.code}
                      </code>
                      <span className="text-xs text-muted-foreground">{b.source?.name ?? '—'}</span>
                    </div>
                  </td>

                  {/* Khách */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm">
                        {b.customer?.fullName ?? 'Khách lẻ'}
                      </span>
                      {b.customer?.phone && (
                        <span className="text-xs text-muted-foreground">{b.customer.phone}</span>
                      )}
                    </div>
                  </td>

                  {/* Ngày */}
                  <td className="px-3 py-3 whitespace-nowrap text-sm">
                    {formatDate(b.checkIn)} – {formatDate(b.checkOut)}
                  </td>

                  {/* Phòng */}
                  <td className="px-3 py-3 text-sm whitespace-nowrap">{roomDisplay}</td>

                  {/* Loại giá */}
                  <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {b.priceType?.name ?? '—'}
                  </td>

                  {/* Tổng tiền */}
                  <td className="px-3 py-3 text-right font-medium text-sm whitespace-nowrap">
                    {formatVnd(b.totalAmount)}
                  </td>

                  {/* Đã TT */}
                  <td className="px-3 py-3 text-right text-sm whitespace-nowrap text-emerald-600">
                    {formatVnd(b.paidAmount)}
                  </td>

                  {/* Còn phải trả */}
                  <td className="px-3 py-3 text-right text-sm whitespace-nowrap">
                    <span
                      className={
                        parseFloat(b.remainingAmount) > 0
                          ? 'text-rose-600 font-medium'
                          : 'text-muted-foreground'
                      }
                    >
                      {formatVnd(b.remainingAmount)}
                    </span>
                  </td>

                  {/* Trạng thái */}
                  <td className="px-3 py-3">
                    <BookingStatusBadge code={b.status.code} name={b.status.name} />
                  </td>

                  {/* Thao tác */}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* View */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(b)}
                        aria-label={`Xem booking ${b.code}`}
                        title="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Button>

                      {/* Edit */}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(b)}
                          aria-label={`Sửa booking ${b.code}`}
                          title="Sửa"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}

                      {/* Check-in */}
                      {canEdit && canCheckIn && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => onCheckIn(b)}
                          aria-label={`Check-in booking ${b.code}`}
                          title="Check-in"
                        >
                          <LogIn className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}

                      {/* Check-out */}
                      {canEdit && canCheckOut && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                          onClick={() => onCheckOut(b)}
                          aria-label={`Check-out booking ${b.code}`}
                          title="Check-out"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}

                      {/* Delete */}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete(b)}
                          aria-label={`Xoá booking ${b.code}`}
                          title="Xoá"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookingPage() {
  const { hasRole } = useAuth();
  const canAdd = hasRole('ADMIN', 'MANAGER', 'RECEPTIONIST');
  const canEdit = hasRole('ADMIN', 'MANAGER', 'RECEPTIONIST');
  const canDelete = hasRole('ADMIN', 'MANAGER');

  // Filters
  const [keyword, setKeyword] = useState('');
  const [statusId, setStatusId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [formTarget, setFormTarget] = useState<Booking | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);

  // Reference data for filters
  const { data: statusesData } = useCategories({
    group: 'BOOKING_STATUS',
    active: true,
    pageSize: 100,
  });
  const statuses = statusesData?.data ?? [];

  const { data: sourcesData } = useCategories({
    group: 'BOOKING_SOURCE',
    active: true,
    pageSize: 100,
  });
  const sources = sourcesData?.data ?? [];

  // Bookings data
  const {
    data: bookingsData,
    isLoading,
    isError,
    refetch,
  } = useBookings({
    keyword: debouncedKeyword || undefined,
    statusId: statusId || undefined,
    sourceId: sourceId || undefined,
    page,
    pageSize,
  });

  const checkInMutation = useCheckInBooking();
  const checkOutMutation = useCheckOutBooking();

  const bookings = bookingsData?.data ?? [];
  const meta = bookingsData?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? bookings.length;

  // Handlers
  const openCreate = useCallback(() => {
    setFormTarget(null);
    setFormMode('create');
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((b: Booking) => {
    setFormTarget(b);
    setFormMode('edit');
    setFormOpen(true);
  }, []);

  const openView = useCallback((b: Booking) => {
    setFormTarget(b);
    setFormMode('view');
    setFormOpen(true);
  }, []);

  const handleCheckIn = useCallback(
    (b: Booking) => {
      checkInMutation.mutate(
        { id: b.id },
        {
          onSuccess: () => toast({ title: `Check-in ${b.code} thành công`, variant: 'success' }),
          onError: (err: unknown) => {
            const axiosErr = err as AxiosError<{ message: string | string[] }>;
            const msg = axiosErr.response?.data?.message;
            const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Lỗi');
            toast({ title: text, variant: 'destructive' });
          },
        },
      );
    },
    [checkInMutation],
  );

  const handleCheckOut = useCallback(
    (b: Booking) => {
      checkOutMutation.mutate(
        { id: b.id },
        {
          onSuccess: () => toast({ title: `Check-out ${b.code} thành công`, variant: 'success' }),
          onError: (err: unknown) => {
            const axiosErr = err as AxiosError<{ message: string | string[] }>;
            const msg = axiosErr.response?.data?.message;
            const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Lỗi');
            toast({ title: text, variant: 'destructive' });
          },
        },
      );
    },
    [checkOutMutation],
  );

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div>
        <p className="text-xs text-muted-foreground">Quản lý cơ sở › Booking</p>
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
              placeholder="Tìm mã booking, khách, phòng..."
              className="pl-9 w-64"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              aria-label="Tìm kiếm booking"
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
            <SelectTrigger className="w-44 h-10 text-sm" aria-label="Lọc trạng thái booking">
              <SelectValue placeholder="Trạng thái" />
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

          {/* Source filter */}
          <Select
            value={sourceId || '__all__'}
            onValueChange={(v) => {
              setSourceId(v === '__all__' ? '' : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40 h-10 text-sm" aria-label="Lọc nguồn booking">
              <SelectValue placeholder="Nguồn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả nguồn</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Add button */}
        {canAdd && (
          <Button onClick={openCreate} aria-label="Tạo booking mới">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Tạo booking
          </Button>
        )}
      </div>

      {/* Content card */}
      <Card>
        <CardContent className="p-0">
          <TableView
            bookings={bookings}
            isLoading={isLoading}
            isError={isError}
            canEdit={canEdit}
            canDelete={canDelete}
            onView={openView}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onRetry={() => void refetch()}
            onAddNew={openCreate}
          />
        </CardContent>

        {/* Pagination — always visible */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {total === 0
              ? 'Không có dữ liệu'
              : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trong tổng ${total} booking`}
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
      <BookingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        editTarget={formTarget}
      />

      {/* Delete confirm */}
      <DeleteBookingDialog booking={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
