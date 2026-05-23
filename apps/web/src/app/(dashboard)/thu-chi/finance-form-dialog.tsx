'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { AxiosError } from 'axios';

import { useCreateFinanceTx, useUpdateFinanceTx, useFinanceTx } from '@/lib/hooks/use-finance';
import { useCategories } from '@/lib/hooks/use-categories';
import { useBookings } from '@/lib/hooks/use-bookings';
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
import type { FinanceTx } from '@/types/finance';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE'], { required_error: 'Vui lòng chọn loại' }),
  groupId: z.string().min(1, 'Vui lòng chọn nhóm'),
  occurredAt: z.string().min(1, 'Vui lòng chọn ngày'),
  amount: z.coerce
    .number({ invalid_type_error: 'Số tiền không hợp lệ' })
    .min(0, 'Số tiền phải >= 0'),
  description: z.string().min(1, 'Vui lòng nhập mô tả'),
  bookingId: z.string().nullable().optional(),
  methodId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export type FinanceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  editTarget: FinanceTx | null;
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

export function FinanceFormDialog({
  open,
  onOpenChange,
  mode,
  editTarget,
}: FinanceFormDialogProps) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  // Reference data
  const { data: groupsData } = useCategories({
    group: 'FINANCE_GROUP',
    active: true,
    pageSize: 100,
  });
  const groups = useMemo(() => groupsData?.data ?? [], [groupsData]);

  const { data: methodsData } = useCategories({
    group: 'PAYMENT_METHOD',
    active: true,
    pageSize: 100,
  });
  const methods = useMemo(() => methodsData?.data ?? [], [methodsData]);

  const { data: bookingsData } = useBookings({ pageSize: 100 });
  const bookings = useMemo(() => bookingsData?.data ?? [], [bookingsData]);

  // Detail fetch for edit/view mode
  const { data: txDetail, isLoading: isLoadingDetail } = useFinanceTx(
    (isEdit || isView) && editTarget ? editTarget.id : '',
  );

  // Mutations
  const createMutation = useCreateFinanceTx();
  const updateMutation = useUpdateFinanceTx();
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
      type: 'INCOME',
      groupId: '',
      occurredAt: todayIso(),
      amount: 0,
      description: '',
      bookingId: null,
      methodId: null,
      note: null,
    },
  });

  // Reset form when dialog opens for create mode
  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      reset({
        type: 'INCOME',
        groupId: '',
        occurredAt: todayIso(),
        amount: 0,
        description: '',
        bookingId: null,
        methodId: null,
        note: null,
      });
    }
  }, [open, mode, reset]);

  // Populate form from detail when editing/viewing
  useEffect(() => {
    if ((isEdit || isView) && txDetail) {
      reset({
        type: txDetail.type,
        groupId: txDetail.group.id,
        occurredAt: txDetail.occurredAt,
        amount: parseFloat(txDetail.amount),
        description: txDetail.description,
        bookingId: txDetail.booking?.id ?? null,
        methodId: txDetail.method?.id ?? null,
        note: txDetail.note ?? null,
      });
    }
  }, [isEdit, isView, txDetail, reset]);

  function onSubmit(data: FormData) {
    const body = {
      type: data.type,
      groupId: data.groupId,
      occurredAt: data.occurredAt,
      amount: data.amount,
      description: data.description,
      bookingId: data.bookingId ?? null,
      methodId: data.methodId ?? null,
      note: data.note ?? null,
    };

    if (mode === 'create') {
      createMutation.mutate(body, {
        onSuccess: (tx) => {
          toast({ title: `Đã tạo phiếu ${tx.code}`, variant: 'success' });
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const axiosErr = err as AxiosError<{ message: string | string[] }>;
          const msg = axiosErr.response?.data?.message;
          const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Tạo phiếu thất bại');
          toast({ title: text, variant: 'destructive' });
        },
      });
    } else if (mode === 'edit' && editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, body },
        {
          onSuccess: (tx) => {
            toast({ title: `Đã cập nhật phiếu ${tx.code}`, variant: 'success' });
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
      ? 'Tạo phiếu thu chi'
      : mode === 'edit'
        ? 'Chỉnh sửa phiếu thu chi'
        : 'Chi tiết phiếu thu chi';

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
              {/* Loại */}
              <div className="space-y-1.5">
                <Label htmlFor="type">
                  Loại <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isView}>
                      <SelectTrigger
                        id="type"
                        className="h-10"
                        aria-label="Chọn loại thu chi"
                        aria-invalid={!!errors.type}
                      >
                        <SelectValue placeholder="Chọn loại" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCOME">Thu</SelectItem>
                        <SelectItem value="EXPENSE">Chi</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
              </div>

              {/* Nhóm */}
              <div className="space-y-1.5">
                <Label htmlFor="groupId">
                  Nhóm <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="groupId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isView}>
                      <SelectTrigger
                        id="groupId"
                        className="h-10"
                        aria-label="Chọn nhóm"
                        aria-invalid={!!errors.groupId}
                      >
                        <SelectValue placeholder="Chọn nhóm" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.groupId && (
                  <p className="text-xs text-destructive">{errors.groupId.message}</p>
                )}
              </div>

              {/* Ngày */}
              <div className="space-y-1.5">
                <Label htmlFor="occurredAt">
                  Ngày <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="occurredAt"
                  type="date"
                  {...register('occurredAt')}
                  disabled={isView}
                  aria-invalid={!!errors.occurredAt}
                />
                {errors.occurredAt && (
                  <p className="text-xs text-destructive">{errors.occurredAt.message}</p>
                )}
              </div>

              {/* Số tiền */}
              <div className="space-y-1.5">
                <Label htmlFor="amount">
                  Số tiền (đ) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="0"
                  {...register('amount')}
                  disabled={isView}
                  aria-invalid={!!errors.amount}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
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

              {/* Phương thức */}
              <div className="space-y-1.5">
                <Label htmlFor="methodId">Phương thức thanh toán</Label>
                <Controller
                  name="methodId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                      disabled={isView}
                    >
                      <SelectTrigger
                        id="methodId"
                        className="h-10"
                        aria-label="Phương thức thanh toán"
                      >
                        <SelectValue placeholder="Không chọn" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Không chọn</SelectItem>
                        {methods.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Mô tả */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">
                  Mô tả <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  placeholder="Mô tả nội dung thu chi..."
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
                  {mode === 'create' ? 'Tạo phiếu' : 'Lưu thay đổi'}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
