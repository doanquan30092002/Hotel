'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { AxiosError } from 'axios';

import {
  useCreateHousekeepingTask,
  useUpdateHousekeepingTask,
  useHousekeepingTask,
} from '@/lib/hooks/use-housekeeping';
import { useCategories } from '@/lib/hooks/use-categories';
import { useRooms } from '@/lib/hooks/use-rooms';
import { useBookings } from '@/lib/hooks/use-bookings';
import { useUsers } from '@/lib/hooks/use-users';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { HousekeepingTask } from '@/types/housekeeping';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  roomId: z.string().min(1, 'Vui lòng chọn phòng'),
  bookingId: z.string().nullable().optional(),
  statusId: z.string().min(1, 'Vui lòng chọn trạng thái'),
  assigneeId: z.string().nullable().optional(),
  priority: z.enum(['high', 'normal', 'low']),
  description: z.string().min(1, 'Vui lòng nhập công việc'),
  scheduledAt: z.string().min(1, 'Vui lòng chọn ngày dự kiến'),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

type HousekeepingFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  editTarget: HousekeepingTask | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HousekeepingFormDialog({
  open,
  onOpenChange,
  mode,
  editTarget,
}: HousekeepingFormDialogProps) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  // Reference data
  const { data: statusesData } = useCategories({
    group: 'HOUSEKEEPING_TASK_STATUS',
    active: true,
    pageSize: 100,
  });
  const statuses = useMemo(() => statusesData?.data ?? [], [statusesData]);

  const { data: roomsData } = useRooms({ pageSize: 100 });
  const rooms = roomsData?.data ?? [];

  const { data: bookingsData } = useBookings({ pageSize: 100 });
  const bookings = bookingsData?.data ?? [];

  const { data: usersData } = useUsers({ pageSize: 100 });
  const housekeepingUsers = useMemo(
    () =>
      (usersData?.data ?? []).filter(
        (u) => u.role === 'HOUSEKEEPING' || u.role === 'MANAGER' || u.role === 'ADMIN',
      ),
    [usersData],
  );

  // Detail fetch for edit/view mode
  const { data: taskDetail, isLoading: isLoadingDetail } = useHousekeepingTask(
    (isEdit || isView) && editTarget ? editTarget.id : '',
  );

  // Mutations
  const createMutation = useCreateHousekeepingTask();
  const updateMutation = useUpdateHousekeepingTask();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Form
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      roomId: '',
      bookingId: null,
      statusId: '',
      assigneeId: null,
      priority: 'normal',
      description: '',
      scheduledAt: todayIso(),
      startTime: null,
      endTime: null,
      note: null,
    },
  });

  // Reset form when dialog opens/closes or target changes
  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      reset({
        roomId: '',
        bookingId: null,
        statusId: statuses[0]?.id ?? '',
        assigneeId: null,
        priority: 'normal',
        description: '',
        scheduledAt: todayIso(),
        startTime: null,
        endTime: null,
        note: null,
      });
    }
  }, [open, mode, reset, statuses]);

  // Populate form from detail when editing/viewing
  useEffect(() => {
    if ((isEdit || isView) && taskDetail) {
      reset({
        roomId: taskDetail.room.id,
        bookingId: taskDetail.booking?.id ?? null,
        statusId: taskDetail.status.id,
        assigneeId: taskDetail.assignee?.id ?? null,
        priority: taskDetail.priority,
        description: taskDetail.description,
        scheduledAt: taskDetail.scheduledAt,
        startTime: taskDetail.startTime ?? null,
        endTime: taskDetail.endTime ?? null,
        note: taskDetail.note ?? null,
      });
    }
  }, [isEdit, isView, taskDetail, reset]);

  function onSubmit(data: FormData) {
    const body = {
      roomId: data.roomId,
      bookingId: data.bookingId ?? null,
      statusId: data.statusId,
      assigneeId: data.assigneeId ?? null,
      priority: data.priority,
      description: data.description,
      scheduledAt: data.scheduledAt,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      note: data.note ?? null,
    };

    if (mode === 'create') {
      createMutation.mutate(body, {
        onSuccess: (task) => {
          toast({ title: `Đã tạo công việc ${task.code}`, variant: 'success' });
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const axiosErr = err as AxiosError<{ message: string | string[] }>;
          const msg = axiosErr.response?.data?.message;
          const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Tạo thất bại');
          toast({ title: text, variant: 'destructive' });
        },
      });
    } else if (mode === 'edit' && editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, body },
        {
          onSuccess: (task) => {
            toast({ title: `Đã cập nhật công việc ${task.code}`, variant: 'success' });
            onOpenChange(false);
          },
          onError: (err: unknown) => {
            const axiosErr = err as AxiosError<{ message: string | string[] }>;
            const msg = axiosErr.response?.data?.message;
            const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Cập nhật thất bại');
            toast({ title: text, variant: 'destructive' });
          },
        },
      );
    }
  }

  const title =
    mode === 'create'
      ? 'Tạo công việc dọn phòng'
      : mode === 'edit'
        ? 'Chỉnh sửa công việc'
        : 'Chi tiết công việc';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {(isEdit || isView) && isLoadingDetail ? (
          <div className="space-y-4 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
              {/* Phòng */}
              <div className="space-y-1.5">
                <Label htmlFor="roomId">
                  Phòng <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="roomId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isView}>
                      <SelectTrigger
                        id="roomId"
                        className="h-10"
                        aria-label="Chọn phòng"
                        aria-invalid={!!errors.roomId}
                      >
                        <SelectValue placeholder="Chọn phòng" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} ({r.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.roomId && (
                  <p className="text-xs text-destructive">{errors.roomId.message}</p>
                )}
              </div>

              {/* Booking liên quan */}
              <div className="space-y-1.5">
                <Label htmlFor="bookingId">Booking liên quan</Label>
                <Controller
                  name="bookingId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                      disabled={isView}
                    >
                      <SelectTrigger id="bookingId" className="h-10" aria-label="Booking liên quan">
                        <SelectValue placeholder="Không liên quan booking" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Không liên quan booking</SelectItem>
                        {bookings.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.code}
                            {b.customer?.fullName ? ` — ${b.customer.fullName}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Trạng thái */}
              <div className="space-y-1.5">
                <Label htmlFor="statusId">
                  Trạng thái <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="statusId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isView}>
                      <SelectTrigger
                        id="statusId"
                        className="h-10"
                        aria-label="Chọn trạng thái"
                        aria-invalid={!!errors.statusId}
                      >
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.statusId && (
                  <p className="text-xs text-destructive">{errors.statusId.message}</p>
                )}
              </div>

              {/* Ưu tiên */}
              <div className="space-y-1.5">
                <Label htmlFor="priority">Ưu tiên</Label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isView}>
                      <SelectTrigger id="priority" className="h-10" aria-label="Chọn ưu tiên">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Cao</SelectItem>
                        <SelectItem value="normal">Trung bình</SelectItem>
                        <SelectItem value="low">Thấp</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Ngày dự kiến */}
              <div className="space-y-1.5">
                <Label htmlFor="scheduledAt">
                  Ngày dự kiến <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="scheduledAt"
                  type="date"
                  {...register('scheduledAt')}
                  disabled={isView}
                  aria-invalid={!!errors.scheduledAt}
                />
                {errors.scheduledAt && (
                  <p className="text-xs text-destructive">{errors.scheduledAt.message}</p>
                )}
              </div>

              {/* Nhân sự phụ trách */}
              <div className="space-y-1.5">
                <Label htmlFor="assigneeId">Nhân sự phụ trách</Label>
                <Controller
                  name="assigneeId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                      disabled={isView}
                    >
                      <SelectTrigger
                        id="assigneeId"
                        className="h-10"
                        aria-label="Nhân sự phụ trách"
                      >
                        <SelectValue placeholder="Chưa phân công" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Chưa phân công</SelectItem>
                        {housekeepingUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Giờ bắt đầu */}
              <div className="space-y-1.5">
                <Label htmlFor="startTime">Giờ bắt đầu</Label>
                <Input id="startTime" type="time" {...register('startTime')} disabled={isView} />
              </div>

              {/* Giờ kết thúc */}
              <div className="space-y-1.5">
                <Label htmlFor="endTime">Giờ kết thúc</Label>
                <Input id="endTime" type="time" {...register('endTime')} disabled={isView} />
              </div>

              {/* Công việc */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">
                  Công việc <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  placeholder="Mô tả công việc cần thực hiện..."
                  disabled={isView}
                  aria-invalid={!!errors.description}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description.message}</p>
                )}
              </div>

              {/* Ghi chú */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="note">Ghi chú</Label>
                <textarea
                  id="note"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  placeholder="Ghi chú thêm (tuỳ chọn)..."
                  disabled={isView}
                  {...register('note')}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {isView ? 'Đóng' : 'Huỷ'}
                </Button>
              </DialogClose>
              {!isView && (
                <Button type="submit" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {mode === 'create' ? 'Tạo công việc' : 'Lưu thay đổi'}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
