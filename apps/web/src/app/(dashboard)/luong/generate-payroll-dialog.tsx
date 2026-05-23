'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { AxiosError } from 'axios';

import { useGeneratePayroll } from '@/lib/hooks/use-payroll';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  month: z.string().min(1, 'Vui lòng chọn tháng'),
  workingDays: z.coerce.number().min(0, 'Ngày công >= 0').max(31, 'Tối đa 31 ngày'),
});

type FormData = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentMonthIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type GeneratePayrollDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GeneratePayrollDialog({ open, onOpenChange }: GeneratePayrollDialogProps) {
  const generateMutation = useGeneratePayroll();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      month: currentMonthIso(),
      workingDays: 28,
    },
  });

  // Reset when opened
  useEffect(() => {
    if (open) {
      reset({ month: currentMonthIso(), workingDays: 28 });
    }
  }, [open, reset]);

  function onSubmit(data: FormData) {
    generateMutation.mutate(
      { month: data.month, workingDays: data.workingDays },
      {
        onSuccess: (result) => {
          toast({
            title: `Đã tạo ${result.created} bảng lương, bỏ qua ${result.skipped} bảng lương đã có cho tháng này`,
            variant: 'success',
          });
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const axiosErr = err as AxiosError<{ message: string | string[] }>;
          const msg = axiosErr.response?.data?.message;
          const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Tạo bảng lương thất bại');
          toast({ title: text, variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo bảng lương theo tháng</DialogTitle>
          <DialogDescription>
            Hệ thống sẽ tự động tạo bảng lương cho tất cả nhân sự đang làm. Bảng lương đã có sẽ được
            bỏ qua.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 py-4">
            {/* Tháng */}
            <div className="space-y-1.5">
              <Label htmlFor="gen-month">
                Tháng <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gen-month"
                type="month"
                {...register('month')}
                aria-invalid={!!errors.month}
                aria-label="Chọn tháng tạo bảng lương"
              />
              {errors.month && <p className="text-xs text-destructive">{errors.month.message}</p>}
            </div>

            {/* Ngày công mặc định */}
            <div className="space-y-1.5">
              <Label htmlFor="gen-working-days">Ngày công mặc định</Label>
              <Input
                id="gen-working-days"
                type="number"
                min={0}
                max={31}
                step={1}
                {...register('workingDays')}
                aria-invalid={!!errors.workingDays}
                aria-label="Ngày công mặc định"
              />
              {errors.workingDays && (
                <p className="text-xs text-destructive">{errors.workingDays.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Huỷ
              </Button>
            </DialogClose>
            <Button type="submit" disabled={generateMutation.isPending}>
              {generateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Tạo bảng lương
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
