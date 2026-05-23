'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { AxiosError } from 'axios';

import { useCreatePayroll, useUpdatePayroll, usePayroll } from '@/lib/hooks/use-payroll';
import { useStaffs } from '@/lib/hooks/use-staff';
import { useCategories } from '@/lib/hooks/use-categories';
import { formatVnd } from '@/lib/format';
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
import type { Payroll } from '@/types/payroll';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  staffId: z.string().min(1, 'Vui lòng chọn nhân sự'),
  month: z.string().min(1, 'Vui lòng chọn tháng'),
  workingDays: z.coerce.number().min(0, 'Ngày công >= 0').max(31),
  baseSalary: z.coerce.number().min(0, 'Lương >= 0'),
  allowance: z.coerce.number().min(0, 'Phụ cấp >= 0'),
  bonus: z.coerce.number().min(0, 'Thưởng >= 0'),
  penalty: z.coerce.number().min(0, 'Phạt >= 0'),
  statusId: z.string().min(1, 'Vui lòng chọn trạng thái'),
  note: z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export type PayrollFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  editTarget: Payroll | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentMonthIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ─── Computed Net Display ─────────────────────────────────────────────────────

function ComputedNetSalary({ control }: { control: import('react-hook-form').Control<FormData> }) {
  const baseSalary = useWatch({ control, name: 'baseSalary' }) ?? 0;
  const allowance = useWatch({ control, name: 'allowance' }) ?? 0;
  const bonus = useWatch({ control, name: 'bonus' }) ?? 0;
  const penalty = useWatch({ control, name: 'penalty' }) ?? 0;

  const net = Number(baseSalary) + Number(allowance) + Number(bonus) - Number(penalty);

  return (
    <div className="space-y-1.5">
      <Label>Thực nhận (tính trước)</Label>
      <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm font-semibold text-emerald-700">
        {formatVnd(net)}
      </div>
      <p className="text-xs text-muted-foreground">
        Lương + Phụ cấp + Thưởng - Phạt. BE sẽ tính lại khi lưu.
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PayrollFormDialog({
  open,
  onOpenChange,
  mode,
  editTarget,
}: PayrollFormDialogProps) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  // Staff list for dropdown
  const { data: staffData } = useStaffs({ pageSize: 100, active: true });
  const staffList = useMemo(() => staffData?.data ?? [], [staffData]);

  // Payroll statuses
  const { data: statusesData } = useCategories({
    group: 'PAYROLL_STATUS',
    active: true,
    pageSize: 100,
  });
  const statuses = useMemo(() => statusesData?.data ?? [], [statusesData]);

  // Detail fetch for edit/view
  const { data: payrollDetail, isLoading: isLoadingDetail } = usePayroll(
    (isEdit || isView) && editTarget ? editTarget.id : '',
  );

  // Mutations
  const createMutation = useCreatePayroll();
  const updateMutation = useUpdatePayroll();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Track selected staff for auto-fill
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      staffId: '',
      month: currentMonthIso(),
      workingDays: 28,
      baseSalary: 0,
      allowance: 0,
      bonus: 0,
      penalty: 0,
      statusId: '',
      note: null,
    },
  });

  // Reset for create mode
  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      reset({
        staffId: '',
        month: currentMonthIso(),
        workingDays: 28,
        baseSalary: 0,
        allowance: 0,
        bonus: 0,
        penalty: 0,
        statusId: '',
        note: null,
      });
      setSelectedStaffId('');
    }
  }, [open, mode, reset]);

  // Populate for edit/view
  useEffect(() => {
    if ((isEdit || isView) && payrollDetail) {
      reset({
        staffId: payrollDetail.staff.id,
        month: payrollDetail.month,
        workingDays: payrollDetail.workingDays,
        baseSalary: parseFloat(payrollDetail.baseSalary),
        allowance: parseFloat(payrollDetail.allowance),
        bonus: parseFloat(payrollDetail.bonus),
        penalty: parseFloat(payrollDetail.penalty),
        statusId: payrollDetail.status.id,
        note: payrollDetail.note ?? null,
      });
      setSelectedStaffId(payrollDetail.staff.id);
    }
  }, [isEdit, isView, payrollDetail, reset]);

  // Auto-fill baseSalary + allowance from selected staff
  useEffect(() => {
    if (!selectedStaffId || mode !== 'create') return;
    const staff = staffList.find((s) => s.id === selectedStaffId);
    if (staff) {
      setValue('baseSalary', parseFloat(staff.baseSalary));
      setValue('allowance', parseFloat(staff.allowance));
    }
  }, [selectedStaffId, staffList, setValue, mode]);

  function onSubmit(data: FormData) {
    const body = {
      staffId: data.staffId,
      month: data.month,
      workingDays: data.workingDays,
      baseSalary: data.baseSalary,
      allowance: data.allowance,
      bonus: data.bonus,
      penalty: data.penalty,
      statusId: data.statusId,
      note: data.note ?? null,
    };

    if (mode === 'create') {
      createMutation.mutate(body, {
        onSuccess: (p) => {
          toast({ title: `Đã tạo bảng lương ${p.code}`, variant: 'success' });
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const axiosErr = err as AxiosError<{ message: string | string[] }>;
          const msg = axiosErr.response?.data?.message;
          const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Tạo bảng lương thất bại');
          toast({ title: text, variant: 'destructive' });
        },
      });
    } else if (mode === 'edit' && editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, body },
        {
          onSuccess: (p) => {
            toast({ title: `Đã cập nhật bảng lương ${p.code}`, variant: 'success' });
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
      ? 'Thêm bảng lương'
      : mode === 'edit'
        ? 'Chỉnh sửa bảng lương'
        : 'Chi tiết bảng lương';

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
              {/* Nhân sự */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="staffId">
                  Nhân sự <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="staffId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        setSelectedStaffId(v);
                      }}
                      disabled={isView || isEdit}
                    >
                      <SelectTrigger
                        id="staffId"
                        className="h-10"
                        aria-label="Chọn nhân sự"
                        aria-invalid={!!errors.staffId}
                      >
                        <SelectValue placeholder="Chọn nhân sự..." />
                      </SelectTrigger>
                      <SelectContent>
                        {staffList.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.code} — {s.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.staffId && (
                  <p className="text-xs text-destructive">{errors.staffId.message}</p>
                )}
              </div>

              {/* Tháng */}
              <div className="space-y-1.5">
                <Label htmlFor="month">
                  Tháng <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="month"
                  type="month"
                  {...register('month')}
                  disabled={isView || isEdit}
                  aria-invalid={!!errors.month}
                  aria-label="Chọn tháng bảng lương"
                />
                {errors.month && <p className="text-xs text-destructive">{errors.month.message}</p>}
              </div>

              {/* Ngày công */}
              <div className="space-y-1.5">
                <Label htmlFor="workingDays">
                  Ngày công <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="workingDays"
                  type="number"
                  min={0}
                  max={31}
                  step={1}
                  placeholder="28"
                  {...register('workingDays')}
                  disabled={isView}
                  aria-invalid={!!errors.workingDays}
                />
                {errors.workingDays && (
                  <p className="text-xs text-destructive">{errors.workingDays.message}</p>
                )}
              </div>

              {/* Lương cơ bản */}
              <div className="space-y-1.5">
                <Label htmlFor="baseSalary">Lương cơ bản (đ)</Label>
                <Input
                  id="baseSalary"
                  type="number"
                  min={0}
                  step={100000}
                  placeholder="0"
                  {...register('baseSalary')}
                  disabled={isView}
                  aria-invalid={!!errors.baseSalary}
                />
                {errors.baseSalary && (
                  <p className="text-xs text-destructive">{errors.baseSalary.message}</p>
                )}
              </div>

              {/* Phụ cấp */}
              <div className="space-y-1.5">
                <Label htmlFor="allowance">Phụ cấp (đ)</Label>
                <Input
                  id="allowance"
                  type="number"
                  min={0}
                  step={100000}
                  placeholder="0"
                  {...register('allowance')}
                  disabled={isView}
                  aria-invalid={!!errors.allowance}
                />
                {errors.allowance && (
                  <p className="text-xs text-destructive">{errors.allowance.message}</p>
                )}
              </div>

              {/* Thưởng */}
              <div className="space-y-1.5">
                <Label htmlFor="bonus">Thưởng (đ)</Label>
                <Input
                  id="bonus"
                  type="number"
                  min={0}
                  step={100000}
                  placeholder="0"
                  {...register('bonus')}
                  disabled={isView}
                  aria-invalid={!!errors.bonus}
                />
                {errors.bonus && <p className="text-xs text-destructive">{errors.bonus.message}</p>}
              </div>

              {/* Phạt */}
              <div className="space-y-1.5">
                <Label htmlFor="penalty">Phạt (đ)</Label>
                <Input
                  id="penalty"
                  type="number"
                  min={0}
                  step={100000}
                  placeholder="0"
                  {...register('penalty')}
                  disabled={isView}
                  aria-invalid={!!errors.penalty}
                />
                {errors.penalty && (
                  <p className="text-xs text-destructive">{errors.penalty.message}</p>
                )}
              </div>

              {/* Thực nhận (computed display) */}
              <ComputedNetSalary control={control} />

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
                        aria-label="Chọn trạng thái bảng lương"
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

              {/* Ghi chú */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="payroll-note">Ghi chú</Label>
                <textarea
                  id="payroll-note"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
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
                  {mode === 'create' ? 'Tạo bảng lương' : 'Lưu thay đổi'}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
