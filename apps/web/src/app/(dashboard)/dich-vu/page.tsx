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
  Wrench,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { useAuth } from '@/lib/auth/use-auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from '@/lib/hooks/use-services';
import { useCategories } from '@/lib/hooks/use-categories';
import type { Service } from '@/types/service';
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

// ─── Zod schema ───────────────────────────────────────────────────────────────

const serviceSchema = z.object({
  code: z
    .string()
    .min(1, 'Vui lòng nhập mã dịch vụ')
    .max(64, 'Mã dịch vụ tối đa 64 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Mã chỉ được chứa chữ cái, số và dấu gạch dưới'),
  name: z.string().min(1, 'Vui lòng nhập tên dịch vụ').max(200, 'Tên dịch vụ tối đa 200 ký tự'),
  groupId: z.string().min(1, 'Vui lòng chọn nhóm dịch vụ'),
  unitId: z.string().min(1, 'Vui lòng chọn đơn vị'),
  price: z.coerce.number().min(0, 'Đơn giá phải >= 0'),
  active: z.boolean().optional().default(true),
  note: z.string().max(1000, 'Ghi chú tối đa 1000 ký tự').optional().or(z.literal('')),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

// ─── Service Form Dialog ──────────────────────────────────────────────────────

type ServiceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: Service | null;
  serviceGroups: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string }>;
};

function ServiceFormDialog({
  open,
  onOpenChange,
  editTarget,
  serviceGroups,
  units,
}: ServiceFormDialogProps) {
  const isEditing = editTarget !== null;
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    values: editTarget
      ? {
          code: editTarget.code,
          name: editTarget.name,
          groupId: editTarget.groupId,
          unitId: editTarget.unitId,
          price: parseFloat(editTarget.price),
          active: editTarget.active,
          note: editTarget.note ?? '',
        }
      : {
          code: '',
          name: '',
          groupId: '',
          unitId: '',
          price: 0,
          active: true,
          note: '',
        },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: ServiceFormData) {
    const handleError = (err: unknown) => {
      const axiosErr = err as AxiosError<{ message: string | string[] }>;
      const msg = axiosErr.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Lỗi không xác định');
      toast({ title: text, variant: 'destructive' });
    };

    const payload = {
      name: data.name,
      groupId: data.groupId,
      unitId: data.unitId,
      price: data.price,
      active: data.active ?? true,
      note: data.note || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: editTarget.id, body: payload },
        {
          onSuccess: () => {
            toast({ title: 'Cập nhật dịch vụ thành công', variant: 'success' });
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
            toast({ title: 'Thêm dịch vụ thành công', variant: 'success' });
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
          <DialogTitle>{isEditing ? 'Sửa thông tin dịch vụ' : 'Thêm dịch vụ mới'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Chỉnh sửa dịch vụ ${editTarget.code}. Mã dịch vụ không thể thay đổi.`
              : 'Điền thông tin để tạo dịch vụ mới.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="service-form">
          {/* Mã dịch vụ */}
          <div className="space-y-1.5">
            <Label htmlFor="service-code">Mã dịch vụ</Label>
            {isEditing ? (
              <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                {editTarget.code}
              </div>
            ) : (
              <>
                <Input
                  id="service-code"
                  placeholder="vd: SV001"
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

          {/* Tên dịch vụ */}
          <div className="space-y-1.5">
            <Label htmlFor="service-name">Tên dịch vụ</Label>
            <Input
              id="service-name"
              placeholder="vd: Tắm trắng sinh học"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Nhóm dịch vụ + Đơn vị */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="service-group">Nhóm dịch vụ</Label>
              <Controller
                name="groupId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="service-group" aria-invalid={!!errors.groupId}>
                      <SelectValue placeholder="Chọn nhóm" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.groupId && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.groupId.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="service-unit">Đơn vị</Label>
              <Controller
                name="unitId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="service-unit" aria-invalid={!!errors.unitId}>
                      <SelectValue placeholder="Chọn đơn vị" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.unitId && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.unitId.message}
                </p>
              )}
            </div>
          </div>

          {/* Đơn giá */}
          <div className="space-y-1.5">
            <Label htmlFor="service-price">Đơn giá (đ)</Label>
            <Input
              id="service-price"
              type="number"
              min={0}
              step={1000}
              placeholder="vd: 80000"
              aria-invalid={!!errors.price}
              {...register('price')}
            />
            {errors.price && (
              <p className="text-xs text-destructive" role="alert">
                {errors.price.message}
              </p>
            )}
          </div>

          {/* Trạng thái */}
          <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
            <Label htmlFor="service-active" className="cursor-pointer">
              Hoạt động
            </Label>
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <Switch
                  id="service-active"
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                  aria-label="Trạng thái hoạt động"
                />
              )}
            />
          </div>

          {/* Ghi chú */}
          <div className="space-y-1.5">
            <Label htmlFor="service-note">Ghi chú</Label>
            <Textarea
              id="service-note"
              placeholder="Ghi chú thêm về dịch vụ..."
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
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Huỷ
            </Button>
          </DialogClose>
          <Button form="service-form" type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />}
            {isEditing ? 'Lưu thay đổi' : 'Thêm dịch vụ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

type DeleteDialogProps = {
  service: Service | null;
  onClose: () => void;
};

function DeleteConfirmDialog({ service, onClose }: DeleteDialogProps) {
  const deleteMutation = useDeleteService();

  function handleDelete() {
    if (!service) return;
    deleteMutation.mutate(service.id, {
      onSuccess: () => {
        toast({ title: `Đã xoá dịch vụ "${service.name}"`, variant: 'success' });
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
    <Dialog open={service !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xoá dịch vụ</DialogTitle>
          <DialogDescription>
            Xoá dịch vụ{' '}
            <span className="font-semibold text-foreground">
              «{service?.name} (mã {service?.code})»
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
            Xoá dịch vụ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

const COL_COUNT = 8;

type TableViewProps = {
  services: Service[];
  isLoading: boolean;
  isError: boolean;
  canWrite: boolean;
  onEdit: (s: Service) => void;
  onDelete: (s: Service) => void;
  onRetry: () => void;
  onAddNew: () => void;
};

function TableView({
  services,
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
      <table className="w-full text-sm" role="table" aria-label="Danh sách dịch vụ">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Mã
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tên dịch vụ
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Nhóm dịch vụ
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Đơn vị
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Đơn giá
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Trạng thái
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ghi chú
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
                  <p>Không thể tải danh sách dịch vụ.</p>
                  <Button size="sm" variant="outline" onClick={onRetry}>
                    Thử lại
                  </Button>
                </div>
              </td>
            </tr>
          ) : services.length === 0 ? (
            <tr>
              <td colSpan={COL_COUNT} className="px-4 py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Wrench className="h-10 w-10 opacity-30" aria-hidden="true" />
                  <p>Chưa có dịch vụ nào.</p>
                  {canWrite && (
                    <Button size="sm" onClick={onAddNew}>
                      <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                      Thêm dịch vụ
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            services.map((s) => (
              <tr key={s.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="px-3 py-3">
                  <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{s.code}</code>
                </td>
                <td className="px-3 py-3 font-medium max-w-[180px] truncate">{s.name}</td>
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                  {s.group.name}
                </td>
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{s.unit.name}</td>
                <td className="px-3 py-3 text-right font-medium whitespace-nowrap">
                  {formatVnd(s.price)}
                </td>
                <td className="px-3 py-3">
                  {s.active ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0">Hoạt động</Badge>
                  ) : (
                    <Badge className="bg-zinc-100 text-zinc-700 border-0">Tạm dừng</Badge>
                  )}
                </td>
                <td className="px-3 py-3 text-muted-foreground max-w-[160px] truncate">
                  {s.note ?? '—'}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {canWrite && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(s)}
                          aria-label={`Sửa dịch vụ ${s.code}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete(s)}
                          aria-label={`Xoá dịch vụ ${s.code}`}
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

export default function DichVuPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('ADMIN', 'MANAGER');

  // Filters
  const [keyword, setKeyword] = useState('');
  const [groupId, setGroupId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  // Reference data
  const { data: groupsData } = useCategories({
    group: 'SERVICE_GROUP',
    active: true,
    pageSize: 100,
  });
  const serviceGroups = groupsData?.data ?? [];

  const { data: unitsData } = useCategories({
    group: 'UNIT',
    active: true,
    pageSize: 100,
  });
  const units = unitsData?.data ?? [];

  // Services data
  const {
    data: servicesData,
    isLoading,
    isError,
    refetch,
  } = useServices({
    keyword: debouncedKeyword,
    groupId: groupId || undefined,
    unitId: unitId || undefined,
    page,
    pageSize,
  });

  const services = servicesData?.data ?? [];
  const meta = servicesData?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? services.length;

  // Handlers
  const openCreate = useCallback(() => {
    setEditTarget(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((s: Service) => {
    setEditTarget(s);
    setFormOpen(true);
  }, []);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div>
        <p className="text-xs text-muted-foreground">Quản lý cơ sở › Dịch vụ</p>
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
              placeholder="Tìm tên, mã dịch vụ…"
              className="pl-9 w-56"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              aria-label="Tìm kiếm dịch vụ"
            />
          </div>

          {/* Group filter */}
          <Select
            value={groupId || '__all__'}
            onValueChange={(v) => {
              setGroupId(v === '__all__' ? '' : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44 h-10 text-sm" aria-label="Lọc nhóm dịch vụ">
              <SelectValue placeholder="Nhóm dịch vụ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả nhóm</SelectItem>
              {serviceGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Unit filter */}
          <Select
            value={unitId || '__all__'}
            onValueChange={(v) => {
              setUnitId(v === '__all__' ? '' : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36 h-10 text-sm" aria-label="Lọc đơn vị">
              <SelectValue placeholder="Đơn vị" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả đơn vị</SelectItem>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add button — ADMIN/MANAGER only */}
          {canWrite && (
            <Button onClick={openCreate} aria-label="Thêm dịch vụ mới">
              <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Thêm dịch vụ
            </Button>
          )}
        </div>
      </div>

      {/* Content card */}
      <Card>
        <CardContent className="p-0">
          <TableView
            services={services}
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
              : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trong tổng ${total} dịch vụ`}
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
      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        serviceGroups={serviceGroups.map((g) => ({ id: g.id, name: g.name }))}
        units={units.map((u) => ({ id: u.id, name: u.name }))}
      />

      {/* Delete confirm */}
      <DeleteConfirmDialog service={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
