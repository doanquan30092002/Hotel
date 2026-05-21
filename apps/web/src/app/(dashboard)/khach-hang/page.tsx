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
  Eye,
  AlertCircle,
  Loader2,
  Users,
  LayoutList,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  FileText,
  Phone,
  CreditCard,
  MapPin,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { useAuth } from '@/lib/auth/use-auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '@/lib/hooks/use-customers';
import { useCategories } from '@/lib/hooks/use-categories';
import type { Customer } from '@/types/customer';
import { cn } from '@/lib/utils';
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
import { Avatar } from '@/components/ui/avatar';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const customerSchema = z.object({
  code: z
    .string()
    .min(1, 'Vui lòng nhập mã khách hàng')
    .max(64, 'Mã khách hàng tối đa 64 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Mã khách hàng chỉ được chứa chữ cái, số và dấu gạch dưới'),
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự').max(200, 'Họ tên tối đa 200 ký tự'),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, 'Số điện thoại không hợp lệ (8–15 chữ số, có thể bắt đầu bằng +)')
    .optional()
    .or(z.literal('')),
  idNumber: z.string().max(50, 'Số CCCD/Hộ chiếu tối đa 50 ký tự').optional().or(z.literal('')),
  email: z
    .string()
    .email('Email không hợp lệ')
    .max(200, 'Email tối đa 200 ký tự')
    .optional()
    .or(z.literal('')),
  address: z.string().max(500, 'Địa chỉ tối đa 500 ký tự').optional().or(z.literal('')),
  nationality: z.string().max(100, 'Quốc tịch tối đa 100 ký tự').optional().or(z.literal('')),
  sourceId: z.string().optional().or(z.literal('')),
  note: z.string().max(1000, 'Ghi chú tối đa 1000 ký tự').optional().or(z.literal('')),
});

type CustomerFormData = z.infer<typeof customerSchema>;

// ─── Customer Form Dialog ─────────────────────────────────────────────────────

type CustomerFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: Customer | null;
  guestSources: Array<{ id: string; name: string }>;
};

function CustomerFormDialog({
  open,
  onOpenChange,
  editTarget,
  guestSources,
}: CustomerFormDialogProps) {
  const isEditing = editTarget !== null;
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    values: editTarget
      ? {
          code: editTarget.code,
          fullName: editTarget.fullName,
          phone: editTarget.phone ?? '',
          idNumber: editTarget.idNumber ?? '',
          email: editTarget.email ?? '',
          address: editTarget.address ?? '',
          nationality: editTarget.nationality ?? '',
          sourceId: editTarget.sourceId ?? '',
          note: editTarget.note ?? '',
        }
      : {
          code: '',
          fullName: '',
          phone: '',
          idNumber: '',
          email: '',
          address: '',
          nationality: '',
          sourceId: '',
          note: '',
        },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: CustomerFormData) {
    const handleError = (err: unknown) => {
      const axiosErr = err as AxiosError<{ message: string | string[]; statusCode?: number }>;
      const status = axiosErr.response?.status;
      const msg = axiosErr.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Lỗi không xác định');
      if (status === 409) {
        toast({ title: text, variant: 'destructive' });
      } else {
        toast({ title: text, variant: 'destructive' });
      }
    };

    const payload = {
      fullName: data.fullName,
      phone: data.phone || undefined,
      idNumber: data.idNumber || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      nationality: data.nationality || undefined,
      sourceId: data.sourceId || undefined,
      note: data.note || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: editTarget.id, body: payload },
        {
          onSuccess: () => {
            toast({ title: 'Cập nhật khách hàng thành công', variant: 'success' });
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
            toast({ title: 'Thêm khách hàng thành công', variant: 'success' });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Chỉnh sửa thông tin khách hàng ${editTarget.code}. Mã khách không thể thay đổi.`
              : 'Điền thông tin để tạo khách hàng mới.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="customer-form">
          {/* Row 1: Mã + Họ tên */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="customer-code">Mã khách hàng</Label>
              {isEditing ? (
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                  {editTarget.code}
                </div>
              ) : (
                <>
                  <Input
                    id="customer-code"
                    placeholder="vd: KH001"
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

            <div className="space-y-1.5">
              <Label htmlFor="customer-fullname">Họ tên</Label>
              <Input
                id="customer-fullname"
                placeholder="vd: Nguyễn Minh Anh"
                aria-invalid={!!errors.fullName}
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.fullName.message}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: SĐT + CCCD */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="customer-phone">Số điện thoại</Label>
              <Input
                id="customer-phone"
                placeholder="vd: 0901234567"
                aria-invalid={!!errors.phone}
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-xs text-destructive" role="alert">
                  {typeof errors.phone.message === 'string' ? errors.phone.message : ''}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customer-idnumber">CCCD / Hộ chiếu</Label>
              <Input
                id="customer-idnumber"
                placeholder="vd: 001234567890"
                aria-invalid={!!errors.idNumber}
                {...register('idNumber')}
              />
              {errors.idNumber && (
                <p className="text-xs text-destructive" role="alert">
                  {typeof errors.idNumber.message === 'string' ? errors.idNumber.message : ''}
                </p>
              )}
            </div>
          </div>

          {/* Row 3: Email + Quốc tịch */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="vd: kh@example.com"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive" role="alert">
                  {typeof errors.email.message === 'string' ? errors.email.message : ''}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customer-nationality">Quốc tịch</Label>
              <Input
                id="customer-nationality"
                placeholder="vd: Việt Nam"
                aria-invalid={!!errors.nationality}
                {...register('nationality')}
              />
              {errors.nationality && (
                <p className="text-xs text-destructive" role="alert">
                  {typeof errors.nationality.message === 'string' ? errors.nationality.message : ''}
                </p>
              )}
            </div>
          </div>

          {/* Row 4: Địa chỉ */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-address">Địa chỉ</Label>
            <Input
              id="customer-address"
              placeholder="vd: 12 Lê Lợi, Hà Nội"
              aria-invalid={!!errors.address}
              {...register('address')}
            />
            {errors.address && (
              <p className="text-xs text-destructive" role="alert">
                {typeof errors.address.message === 'string' ? errors.address.message : ''}
              </p>
            )}
          </div>

          {/* Row 5: Nguồn khách */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-source">Nguồn khách</Label>
            <Controller
              name="sourceId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger id="customer-source">
                    <SelectValue placeholder="Không xác định" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Không xác định</SelectItem>
                    {guestSources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Row 6: Ghi chú */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-note">Ghi chú</Label>
            <Textarea
              id="customer-note"
              placeholder="Ghi chú thêm về khách hàng..."
              rows={3}
              aria-invalid={!!errors.note}
              {...register('note')}
            />
            {errors.note && (
              <p className="text-xs text-destructive" role="alert">
                {typeof errors.note.message === 'string' ? errors.note.message : ''}
              </p>
            )}
          </div>

          {/* Docs note */}
          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <FileText className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Tài liệu đính kèm:{' '}
            {isEditing && editTarget.docs.length > 0
              ? `${editTarget.docs.length} tệp đã có`
              : 'Chưa có'}
            {' — '}Tải lên giấy tờ sẽ hỗ trợ ở Phase 12.
          </div>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Huỷ
            </Button>
          </DialogClose>
          <Button form="customer-form" type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />}
            {isEditing ? 'Lưu thay đổi' : 'Thêm khách hàng'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Customer Detail Dialog ───────────────────────────────────────────────────

type CustomerDetailDialogProps = {
  customer: Customer | null;
  onClose: () => void;
};

function CustomerDetailDialog({ customer, onClose }: CustomerDetailDialogProps) {
  if (!customer) return null;

  return (
    <Dialog open={customer !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chi tiết khách hàng {customer.code}</DialogTitle>
          <DialogDescription>{customer.fullName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <DetailRow label="Mã khách" value={customer.code} />
          <DetailRow label="Họ tên" value={customer.fullName} />
          <DetailRow label="Số điện thoại" value={customer.phone ?? '—'} />
          <DetailRow label="CCCD / Hộ chiếu" value={customer.idNumber ?? '—'} />
          <DetailRow label="Email" value={customer.email ?? '—'} />
          <DetailRow label="Địa chỉ" value={customer.address ?? '—'} />
          <DetailRow label="Quốc tịch" value={customer.nationality ?? '—'} />
          <DetailRow
            label="Nguồn khách"
            value={customer.source ? <Badge variant="outline">{customer.source.name}</Badge> : '—'}
          />
          <DetailRow
            label="Tài liệu"
            value={customer.docs.length > 0 ? `${customer.docs.length} tệp đính kèm` : 'Chưa có'}
          />
          {customer.note && <DetailRow label="Ghi chú" value={customer.note} />}
        </div>

        <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground mt-2">
          <span className="font-medium">Lịch sử:</span> Sẽ hiển thị lịch sử booking ở Phase 6.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} type="button">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-36 shrink-0 text-muted-foreground">{label}:</span>
      <span className="font-medium flex-1">{value}</span>
    </div>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

type DeleteDialogProps = {
  customer: Customer | null;
  onClose: () => void;
};

function DeleteConfirmDialog({ customer, onClose }: DeleteDialogProps) {
  const deleteMutation = useDeleteCustomer();

  function handleDelete() {
    if (!customer) return;
    deleteMutation.mutate(customer.id, {
      onSuccess: () => {
        toast({ title: `Đã xoá khách hàng "${customer.fullName}"`, variant: 'success' });
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
    <Dialog open={customer !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xoá khách hàng</DialogTitle>
          <DialogDescription>
            Xoá khách hàng{' '}
            <span className="font-semibold text-foreground">
              «{customer?.fullName} (mã {customer?.code})»
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
            Xoá khách hàng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

type TableViewProps = {
  customers: Customer[];
  isLoading: boolean;
  isError: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (c: Customer) => void;
  onView: (c: Customer) => void;
  onDelete: (c: Customer) => void;
  onRetry: () => void;
  onAddNew: () => void;
};

function TableView({
  customers,
  isLoading,
  isError,
  canEdit,
  canDelete,
  onEdit,
  onView,
  onDelete,
  onRetry,
  onAddNew,
}: TableViewProps) {
  const COL_COUNT = 9;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label="Danh sách khách hàng">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Mã khách
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Giấy tờ
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Họ tên
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Số điện thoại
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              CCCD/Hộ chiếu
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Địa chỉ
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Nguồn khách
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
                  <p>Không thể tải danh sách khách hàng.</p>
                  <Button size="sm" variant="outline" onClick={onRetry}>
                    Thử lại
                  </Button>
                </div>
              </td>
            </tr>
          ) : customers.length === 0 ? (
            <tr>
              <td colSpan={COL_COUNT} className="px-4 py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Users className="h-10 w-10 opacity-30" aria-hidden="true" />
                  <p>Chưa có khách hàng nào.</p>
                  {canEdit && (
                    <Button size="sm" onClick={onAddNew}>
                      <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                      Thêm khách hàng
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            customers.map((c) => (
              <tr key={c.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="px-3 py-3">
                  <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{c.code}</code>
                </td>
                <td className="px-3 py-3">
                  {c.docs.length > 0 ? (
                    <span
                      className="inline-flex items-center gap-1 text-xs text-sky-700 bg-sky-100 rounded px-1.5 py-0.5"
                      title={`${c.docs.length} giấy tờ`}
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      {c.docs.length}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-3 font-medium max-w-[160px] truncate">{c.fullName}</td>
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                  {c.phone ?? '—'}
                </td>
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                  {c.idNumber ?? '—'}
                </td>
                <td className="px-3 py-3 text-muted-foreground max-w-[160px] truncate">
                  {c.email ?? '—'}
                </td>
                <td className="px-3 py-3 text-muted-foreground max-w-[160px] truncate">
                  {c.address ?? '—'}
                </td>
                <td className="px-3 py-3">
                  {c.source ? (
                    <Badge variant="outline">{c.source.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(c)}
                      aria-label={`Xem chi tiết khách ${c.code}`}
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(c)}
                        aria-label={`Sửa khách ${c.code}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(c)}
                        aria-label={`Xoá khách ${c.code}`}
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

// ─── Grid view ────────────────────────────────────────────────────────────────

type GridViewProps = {
  customers: Customer[];
  isLoading: boolean;
  isError: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (c: Customer) => void;
  onView: (c: Customer) => void;
  onDelete: (c: Customer) => void;
  onRetry: () => void;
  onAddNew: () => void;
};

function GridView({
  customers,
  isLoading,
  isError,
  canEdit,
  canDelete,
  onEdit,
  onView,
  onDelete,
  onRetry,
  onAddNew,
}: GridViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
        <p>Không thể tải danh sách khách hàng.</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Users className="h-10 w-10 opacity-30" aria-hidden="true" />
        <p>Chưa có khách hàng nào.</p>
        {canEdit && (
          <Button size="sm" onClick={onAddNew}>
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Thêm khách hàng
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {customers.map((c) => (
        <Card key={c.id} className="overflow-hidden rounded-xl">
          <CardContent className="p-4">
            {/* Header: avatar + code + name */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={c.fullName} size={40} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-mono">{c.code}</p>
                <p className="font-semibold text-sm leading-tight line-clamp-1">{c.fullName}</p>
              </div>
            </div>

            {/* Body: 3 info lines */}
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{c.phone ?? '—'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <CreditCard className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{c.idNumber ?? '—'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate line-clamp-1">{c.address ?? '—'}</span>
              </p>
            </div>

            {/* Footer: source badge + actions */}
            <div className="mt-3 flex items-center justify-between gap-1">
              <div>
                {c.source ? (
                  <Badge variant="outline" className="text-xs">
                    {c.source.name}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onView(c)}
                  aria-label={`Xem chi tiết khách ${c.code}`}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(c)}
                    aria-label={`Sửa khách ${c.code}`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(c)}
                    aria-label={`Xoá khách ${c.code}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ViewMode = 'table' | 'grid';

export default function KhachHangPage() {
  const { hasRole } = useAuth();
  const canAdd = hasRole('ADMIN', 'MANAGER', 'RECEPTIONIST');
  const canEdit = hasRole('ADMIN', 'MANAGER', 'RECEPTIONIST');
  const canDelete = hasRole('ADMIN', 'MANAGER');

  // Filters
  const [keyword, setKeyword] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [viewTarget, setViewTarget] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  // Fetch guest sources for filter + form
  const { data: guestSourcesData } = useCategories({
    group: 'GUEST_SOURCE',
    active: true,
    pageSize: 100,
  });
  const guestSources = guestSourcesData?.data ?? [];

  // Customers data
  const {
    data: customersData,
    isLoading,
    isError,
    refetch,
  } = useCustomers({
    keyword: debouncedKeyword,
    sourceId: sourceId || undefined,
    page,
    pageSize,
  });

  const customers = customersData?.data ?? [];
  const meta = customersData?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const totalCustomers = meta?.total ?? customers.length;

  // Handlers
  const openCreate = useCallback(() => {
    setEditTarget(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((c: Customer) => {
    setEditTarget(c);
    setFormOpen(true);
  }, []);

  const sharedViewProps = {
    customers,
    isLoading,
    isError,
    canEdit,
    canDelete,
    onEdit: openEdit,
    onView: setViewTarget,
    onDelete: setDeleteTarget,
    onRetry: () => void refetch(),
    onAddNew: openCreate,
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div>
        <p className="text-xs text-muted-foreground">Quản lý cơ sở › Khách hàng</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: count */}
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-5 w-28 inline-block" />
          ) : (
            <>
              <span className="font-semibold text-foreground">{totalCustomers}</span> khách hàng
            </>
          )}
        </p>

        {/* Right: search + source filter + view toggle + add */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Tìm tên, SĐT, CCCD…"
              className="pl-9 w-64"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              aria-label="Tìm kiếm khách hàng"
            />
          </div>

          {/* Source filter */}
          <Select
            value={sourceId || '__all__'}
            onValueChange={(v) => {
              setSourceId(v === '__all__' ? '' : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44 h-9 text-sm" aria-label="Lọc nguồn khách">
              <SelectValue placeholder="Nguồn khách" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả nguồn</SelectItem>
              {guestSources.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle — Bảng / Lưới */}
          <div
            className="flex rounded-lg border border-border overflow-hidden"
            role="group"
            aria-label="Chế độ hiển thị"
          >
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === 'table'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
              aria-pressed={viewMode === 'table'}
              aria-label="Xem dạng bảng"
            >
              <LayoutList className="h-4 w-4" aria-hidden="true" />
              Bảng
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
              aria-pressed={viewMode === 'grid'}
              aria-label="Xem dạng lưới"
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              Lưới
            </button>
          </div>

          {/* Add button — RBAC gated (not HOUSEKEEPING) */}
          {canAdd && (
            <Button
              onClick={openCreate}
              size="icon"
              className="h-9 w-9"
              aria-label="Thêm khách hàng mới"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Content card */}
      <Card>
        <CardContent className="p-0">
          {viewMode === 'table' ? (
            <TableView {...sharedViewProps} />
          ) : (
            <div className="p-4">
              <GridView {...sharedViewProps} />
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {!isLoading && !isError && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {totalCustomers === 0
                ? 'Không có dữ liệu'
                : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCustomers)} trong tổng ${totalCustomers} khách hàng`}
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
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
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
        )}
      </Card>

      {/* Form dialog */}
      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        guestSources={guestSources.map((s) => ({ id: s.id, name: s.name }))}
      />

      {/* Detail dialog */}
      <CustomerDetailDialog customer={viewTarget} onClose={() => setViewTarget(null)} />

      {/* Delete confirm */}
      <DeleteConfirmDialog customer={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
