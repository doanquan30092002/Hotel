'use client';

import { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { useAuth } from '@/lib/auth/use-auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  usePackages,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
} from '@/lib/hooks/use-packages';
import type { Package as PricePackage } from '@/types/package';
import { formatVnd } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

// ─── Apply type options ───────────────────────────────────────────────────────

const APPLY_TYPES = ['Standard', 'VillaVIP', 'Bungalow', 'Family', 'Deluxe'] as const;

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  // iso is YYYY-MM-DD
  const parts = iso.split('-');
  const year = parts[0] ?? '';
  const month = parts[1] ?? '';
  const day = parts[2] ?? '';
  return `${day}/${month}/${year}`;
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const packageSchema = z
  .object({
    code: z
      .string()
      .min(1, 'Vui lòng nhập mã gói')
      .max(64, 'Mã gói tối đa 64 ký tự')
      .regex(/^[a-zA-Z0-9_]+$/, 'Mã chỉ được chứa chữ cái, số và dấu gạch dưới'),
    name: z.string().min(1, 'Vui lòng nhập tên gói').max(200, 'Tên gói tối đa 200 ký tự'),
    applyType: z.string().min(1, 'Vui lòng chọn loại áp dụng'),
    numNights: z.coerce.number().int().min(1, 'Số đêm tối thiểu là 1'),
    numGuests: z.coerce.number().int().min(1, 'Số khách tối thiểu là 1'),
    totalPrice: z.coerce.number().min(0, 'Giá gói phải >= 0'),
    validFrom: z.string().min(1, 'Vui lòng chọn ngày bắt đầu'),
    validTo: z.string().min(1, 'Vui lòng chọn ngày kết thúc'),
    detail: z.string().max(2000, 'Chi tiết tối đa 2000 ký tự').optional().or(z.literal('')),
    active: z.boolean().optional().default(true),
  })
  .refine((data) => data.validTo >= data.validFrom, {
    message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
    path: ['validTo'],
  });

type PackageFormData = z.infer<typeof packageSchema>;

// ─── Package Form Dialog ──────────────────────────────────────────────────────

type PackageFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: PricePackage | null;
};

function PackageFormDialog({ open, onOpenChange, editTarget }: PackageFormDialogProps) {
  const isEditing = editTarget !== null;
  const createMutation = useCreatePackage();
  const updateMutation = useUpdatePackage();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    values: editTarget
      ? {
          code: editTarget.code,
          name: editTarget.name,
          applyType: editTarget.applyType,
          numNights: editTarget.numNights,
          numGuests: editTarget.numGuests,
          totalPrice: parseFloat(editTarget.totalPrice),
          validFrom: editTarget.validFrom,
          validTo: editTarget.validTo,
          detail: editTarget.detail ?? '',
          active: editTarget.active,
        }
      : {
          code: '',
          name: '',
          applyType: '',
          numNights: 1,
          numGuests: 2,
          totalPrice: 0,
          validFrom: '',
          validTo: '',
          detail: '',
          active: true,
        },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: PackageFormData) {
    const handleError = (err: unknown) => {
      const axiosErr = err as AxiosError<{ message: string | string[] }>;
      const msg = axiosErr.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Lỗi không xác định');
      toast({ title: text, variant: 'destructive' });
    };

    const payload = {
      name: data.name,
      applyType: data.applyType,
      numNights: data.numNights,
      numGuests: data.numGuests,
      totalPrice: data.totalPrice,
      validFrom: data.validFrom,
      validTo: data.validTo,
      detail: data.detail || undefined,
      active: data.active ?? true,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: editTarget.id, body: payload },
        {
          onSuccess: () => {
            toast({ title: 'Cập nhật gói mẫu thành công', variant: 'success' });
            onOpenChange(false);
            reset();
          },
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(
        { code: data.code, ...payload },
        {
          onSuccess: () => {
            toast({ title: 'Thêm gói mẫu thành công', variant: 'success' });
            onOpenChange(false);
            reset();
          },
          onError: handleError,
        },
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Sửa gói mẫu' : 'Thêm gói mẫu mới'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Chỉnh sửa gói ${editTarget.code}. Mã gói không thể thay đổi.`
              : 'Điền thông tin để tạo gói mẫu mới.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="package-form">
          {/* Mã gói */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-code">Mã gói</Label>
            {isEditing ? (
              <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                {editTarget.code}
              </div>
            ) : (
              <>
                <Input
                  id="pkg-code"
                  placeholder="vd: G001"
                  aria-invalid={!!errors.code}
                  {...register('code')}
                />
                {errors.code && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.code.message}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Tên gói */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-name">Tên gói</Label>
            <Input
              id="pkg-name"
              placeholder="vd: Combo lãng mạn 2 đêm"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Loại áp dụng */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-apply-type">Loại áp dụng</Label>
            <Controller
              name="applyType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="pkg-apply-type" aria-invalid={!!errors.applyType}>
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.applyType && (
              <p className="text-xs text-destructive" role="alert">
                {errors.applyType.message}
              </p>
            )}
          </div>

          {/* Số đêm + Số khách */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-nights">Số đêm</Label>
              <Input
                id="pkg-nights"
                type="number"
                min={1}
                aria-invalid={!!errors.numNights}
                {...register('numNights')}
              />
              {errors.numNights && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.numNights.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pkg-guests">Số khách</Label>
              <Input
                id="pkg-guests"
                type="number"
                min={1}
                aria-invalid={!!errors.numGuests}
                {...register('numGuests')}
              />
              {errors.numGuests && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.numGuests.message}
                </p>
              )}
            </div>
          </div>

          {/* Giá gói */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-price">Giá gói (đ)</Label>
            <Input
              id="pkg-price"
              type="number"
              min={0}
              step={10000}
              placeholder="vd: 1500000"
              aria-invalid={!!errors.totalPrice}
              {...register('totalPrice')}
            />
            {errors.totalPrice && (
              <p className="text-xs text-destructive" role="alert">
                {errors.totalPrice.message}
              </p>
            )}
          </div>

          {/* Ngày hiệu lực */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-from">Ngày bắt đầu</Label>
              <Input
                id="pkg-from"
                type="date"
                aria-invalid={!!errors.validFrom}
                {...register('validFrom')}
              />
              {errors.validFrom && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.validFrom.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pkg-to">Ngày kết thúc</Label>
              <Input
                id="pkg-to"
                type="date"
                aria-invalid={!!errors.validTo}
                {...register('validTo')}
              />
              {errors.validTo && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.validTo.message}
                </p>
              )}
            </div>
          </div>

          {/* Chi tiết */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-detail">Chi tiết</Label>
            <Textarea
              id="pkg-detail"
              placeholder="Mô tả chi tiết về gói..."
              rows={3}
              aria-invalid={!!errors.detail}
              {...register('detail')}
            />
            {errors.detail && (
              <p className="text-xs text-destructive" role="alert">
                {typeof errors.detail.message === 'string' ? errors.detail.message : ''}
              </p>
            )}
          </div>

          {/* Trạng thái */}
          <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
            <Label htmlFor="pkg-active" className="cursor-pointer">
              Hoạt động
            </Label>
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <Switch
                  id="pkg-active"
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                  aria-label="Trạng thái hoạt động"
                />
              )}
            />
          </div>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Huỷ
            </Button>
          </DialogClose>
          <Button form="package-form" type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />}
            {isEditing ? 'Lưu thay đổi' : 'Thêm gói mẫu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

type DeleteDialogProps = {
  pkg: PricePackage | null;
  onClose: () => void;
};

function DeleteConfirmDialog({ pkg, onClose }: DeleteDialogProps) {
  const deleteMutation = useDeletePackage();

  function handleDelete() {
    if (!pkg) return;
    deleteMutation.mutate(pkg.id, {
      onSuccess: () => {
        toast({ title: `Đã xoá gói mẫu "${pkg.name}"`, variant: 'success' });
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
    <Dialog open={pkg !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xoá gói mẫu</DialogTitle>
          <DialogDescription>
            Xoá gói{' '}
            <span className="font-semibold text-foreground">
              «{pkg?.name} (mã {pkg?.code})»
            </span>
            ? Hành động này không thể hoàn tác.
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
            {deleteMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />
            )}
            Xoá gói mẫu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

const COL_COUNT = 10;

type TableViewProps = {
  packages: PricePackage[];
  isLoading: boolean;
  isError: boolean;
  canWrite: boolean;
  onEdit: (p: PricePackage) => void;
  onDelete: (p: PricePackage) => void;
  onRetry: () => void;
  onAddNew: () => void;
};

function TableView({
  packages,
  isLoading,
  isError,
  canWrite,
  onEdit,
  onDelete,
  onRetry,
  onAddNew,
}: TableViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label="Danh sách gói mẫu">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Mã
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tên gói
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Loại áp dụng
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Số đêm
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Số khách
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Giá gói
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Hiệu lực
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Chi tiết
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
                  <p>Không thể tải danh sách gói mẫu.</p>
                  <Button size="sm" variant="outline" onClick={onRetry}>
                    Thử lại
                  </Button>
                </div>
              </td>
            </tr>
          ) : packages.length === 0 ? (
            <tr>
              <td colSpan={COL_COUNT} className="px-4 py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Package className="h-10 w-10 opacity-30" aria-hidden="true" />
                  <p>Chưa có gói mẫu nào.</p>
                  {canWrite && (
                    <Button size="sm" onClick={onAddNew}>
                      <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                      Thêm gói mẫu
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            packages.map((p) => (
              <tr key={p.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="px-3 py-3">
                  <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{p.code}</code>
                </td>
                <td className="px-3 py-3 font-medium max-w-[180px] truncate">{p.name}</td>
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{p.applyType}</td>
                <td className="px-3 py-3 text-center">{p.numNights}</td>
                <td className="px-3 py-3 text-center">{p.numGuests}</td>
                <td className="px-3 py-3 text-right font-medium whitespace-nowrap">
                  {formatVnd(p.totalPrice)}
                </td>
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap text-xs">
                  {formatDate(p.validFrom)} → {formatDate(p.validTo)}
                </td>
                <td
                  className="px-3 py-3 text-muted-foreground max-w-[160px] truncate"
                  title={p.detail ?? undefined}
                >
                  {p.detail ?? '—'}
                </td>
                <td className="px-3 py-3">
                  {p.active ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0">Hoạt động</Badge>
                  ) : (
                    <Badge className="bg-zinc-100 text-zinc-700 border-0">Tạm dừng</Badge>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {canWrite && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(p)}
                          aria-label={`Sửa gói ${p.code}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete(p)}
                          aria-label={`Xoá gói ${p.code}`}
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

export default function GoiMauPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('ADMIN', 'MANAGER');

  // Filters
  const [keyword, setKeyword] = useState('');
  const [applyType, setApplyType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PricePackage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PricePackage | null>(null);

  // Packages data
  const {
    data: packagesData,
    isLoading,
    isError,
    refetch,
  } = usePackages({
    keyword: debouncedKeyword,
    applyType: applyType || undefined,
    page,
    pageSize,
  });

  const packages = packagesData?.data ?? [];
  const meta = packagesData?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? packages.length;

  // Handlers
  const openCreate = useCallback(() => {
    setEditTarget(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((p: PricePackage) => {
    setEditTarget(p);
    setFormOpen(true);
  }, []);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div>
        <p className="text-xs text-muted-foreground">Quản lý cơ sở › Gói mẫu</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Tìm tên, mã gói…"
              className="pl-9 w-56"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              aria-label="Tìm kiếm gói mẫu"
            />
          </div>

          {/* Apply type filter */}
          <Select
            value={applyType || '__all__'}
            onValueChange={(v) => {
              setApplyType(v === '__all__' ? '' : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40 h-10 text-sm" aria-label="Lọc loại áp dụng">
              <SelectValue placeholder="Loại áp dụng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả loại</SelectItem>
              {APPLY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add button — ADMIN/MANAGER only */}
          {canWrite && (
            <Button onClick={openCreate} aria-label="Thêm gói mẫu mới">
              <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Thêm gói mẫu
            </Button>
          )}
        </div>
      </div>

      {/* Content card */}
      <Card>
        <CardContent className="p-0">
          <TableView
            packages={packages}
            isLoading={isLoading}
            isError={isError}
            canWrite={canWrite}
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
              : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trong tổng ${total} gói mẫu`}
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
      <PackageFormDialog open={formOpen} onOpenChange={setFormOpen} editTarget={editTarget} />

      {/* Delete confirm */}
      <DeleteConfirmDialog pkg={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
