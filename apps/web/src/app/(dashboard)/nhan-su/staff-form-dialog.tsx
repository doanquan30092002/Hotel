'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { AxiosError } from 'axios';

import { useCreateStaff, useUpdateStaff, useStaff } from '@/lib/hooks/use-staff';
import { useCategories } from '@/lib/hooks/use-categories';
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
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import type { Staff } from '@/types/staff';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  departmentId: z.string().nullable().optional(),
  positionId: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('Email không hợp lệ').nullable().optional().or(z.literal('')),
  shiftType: z.enum(['day', 'night', 'full'], { required_error: 'Vui lòng chọn ca làm' }),
  joinDate: z.string().min(1, 'Vui lòng chọn ngày vào làm'),
  baseSalary: z.coerce.number({ invalid_type_error: 'Lương không hợp lệ' }).min(0, 'Lương >= 0'),
  allowance: z.coerce.number().min(0, 'Phụ cấp >= 0').optional(),
  avatarUrl: z.string().nullable().optional(),
  active: z.boolean().optional(),
  note: z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export type StaffFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  editTarget: Staff | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const SHIFT_LABELS: Record<string, string> = {
  day: 'Ca ngày',
  night: 'Ca đêm',
  full: 'Cả ngày',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function StaffFormDialog({ open, onOpenChange, mode, editTarget }: StaffFormDialogProps) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  // Reference data
  const { data: deptsData } = useCategories({
    group: 'STAFF_DEPARTMENT',
    active: true,
    pageSize: 100,
  });
  const departments = useMemo(() => deptsData?.data ?? [], [deptsData]);

  const { data: posData } = useCategories({
    group: 'STAFF_POSITION',
    active: true,
    pageSize: 100,
  });
  const positions = useMemo(() => posData?.data ?? [], [posData]);

  // Detail fetch for edit/view
  const { data: staffDetail, isLoading: isLoadingDetail } = useStaff(
    (isEdit || isView) && editTarget ? editTarget.id : '',
  );

  // Mutations
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
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
      fullName: '',
      departmentId: null,
      positionId: null,
      phone: null,
      email: null,
      shiftType: 'day',
      joinDate: todayIso(),
      baseSalary: 0,
      allowance: 0,
      avatarUrl: null,
      active: true,
      note: null,
    },
  });

  // Reset for create mode
  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      reset({
        fullName: '',
        departmentId: null,
        positionId: null,
        phone: null,
        email: null,
        shiftType: 'day',
        joinDate: todayIso(),
        baseSalary: 0,
        allowance: 0,
        avatarUrl: null,
        active: true,
        note: null,
      });
    }
  }, [open, mode, reset]);

  // Populate from detail for edit/view
  useEffect(() => {
    if ((isEdit || isView) && staffDetail) {
      reset({
        fullName: staffDetail.fullName,
        departmentId: staffDetail.department?.id ?? null,
        positionId: staffDetail.position?.id ?? null,
        phone: staffDetail.phone ?? null,
        email: staffDetail.email ?? null,
        shiftType: staffDetail.shiftType,
        joinDate: staffDetail.joinDate,
        baseSalary: parseFloat(staffDetail.baseSalary),
        allowance: parseFloat(staffDetail.allowance),
        avatarUrl: staffDetail.avatarUrl ?? null,
        active: staffDetail.active,
        note: staffDetail.note ?? null,
      });
    }
  }, [isEdit, isView, staffDetail, reset]);

  function onSubmit(data: FormData) {
    const body = {
      fullName: data.fullName,
      departmentId: data.departmentId ?? null,
      positionId: data.positionId ?? null,
      phone: data.phone ?? null,
      email: (data.email === '' ? null : data.email) ?? null,
      shiftType: data.shiftType,
      joinDate: data.joinDate,
      baseSalary: data.baseSalary,
      allowance: data.allowance ?? 0,
      avatarUrl: data.avatarUrl ?? null,
      active: data.active ?? true,
      note: data.note ?? null,
    };

    if (mode === 'create') {
      createMutation.mutate(body, {
        onSuccess: (s) => {
          toast({ title: `Đã thêm nhân sự ${s.code} — ${s.fullName}`, variant: 'success' });
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const axiosErr = err as AxiosError<{ message: string | string[] }>;
          const msg = axiosErr.response?.data?.message;
          const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Thêm nhân sự thất bại');
          toast({ title: text, variant: 'destructive' });
        },
      });
    } else if (mode === 'edit' && editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, body },
        {
          onSuccess: (s) => {
            toast({ title: `Đã cập nhật nhân sự ${s.fullName}`, variant: 'success' });
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
    mode === 'create' ? 'Thêm nhân sự' : mode === 'edit' ? 'Chỉnh sửa nhân sự' : 'Chi tiết nhân sự';

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
              {/* Họ tên */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fullName">
                  Họ tên <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="Nhập họ tên..."
                  {...register('fullName')}
                  disabled={isView}
                  aria-invalid={!!errors.fullName}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              {/* Bộ phận */}
              <div className="space-y-1.5">
                <Label htmlFor="departmentId">Bộ phận</Label>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                      disabled={isView}
                    >
                      <SelectTrigger id="departmentId" className="h-10" aria-label="Chọn bộ phận">
                        <SelectValue placeholder="Chọn bộ phận" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Không phân công</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Chức vụ */}
              <div className="space-y-1.5">
                <Label htmlFor="positionId">Chức vụ</Label>
                <Controller
                  name="positionId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                      disabled={isView}
                    >
                      <SelectTrigger id="positionId" className="h-10" aria-label="Chọn chức vụ">
                        <SelectValue placeholder="Chọn chức vụ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Không phân công</SelectItem>
                        {positions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* SĐT */}
              <div className="space-y-1.5">
                <Label htmlFor="phone">SĐT</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0909xxxxxx"
                  {...register('phone')}
                  disabled={isView}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  {...register('email')}
                  disabled={isView}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {/* Ca làm */}
              <div className="space-y-1.5">
                <Label htmlFor="shiftType">
                  Ca làm <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="shiftType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isView}>
                      <SelectTrigger
                        id="shiftType"
                        className="h-10"
                        aria-label="Chọn ca làm"
                        aria-invalid={!!errors.shiftType}
                      >
                        <SelectValue placeholder="Chọn ca" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SHIFT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.shiftType && (
                  <p className="text-xs text-destructive">{errors.shiftType.message}</p>
                )}
              </div>

              {/* Ngày vào làm */}
              <div className="space-y-1.5">
                <Label htmlFor="joinDate">
                  Ngày vào làm <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="joinDate"
                  type="date"
                  {...register('joinDate')}
                  disabled={isView}
                  aria-invalid={!!errors.joinDate}
                />
                {errors.joinDate && (
                  <p className="text-xs text-destructive">{errors.joinDate.message}</p>
                )}
              </div>

              {/* Lương cơ bản */}
              <div className="space-y-1.5">
                <Label htmlFor="baseSalary">
                  Lương cơ bản (đ) <span className="text-destructive">*</span>
                </Label>
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

              {/* URL ảnh đại diện */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="avatarUrl">URL ảnh đại diện</Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  {...register('avatarUrl')}
                  disabled={isView}
                />
              </div>

              {/* Đang làm */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="active">Trạng thái</Label>
                <div className="flex items-center gap-2">
                  <Controller
                    name="active"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="active"
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                        disabled={isView}
                        aria-label="Đang làm việc"
                      />
                    )}
                  />
                  <span className="text-sm text-muted-foreground">Đang làm việc</span>
                </div>
              </div>

              {/* Ghi chú */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="note">Ghi chú</Label>
                <textarea
                  id="note"
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
                  {mode === 'create' ? 'Thêm nhân sự' : 'Lưu thay đổi'}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
