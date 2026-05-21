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
  ListTree,
  Tags,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { useAuth } from '@/lib/auth/use-auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  useCategories,
  useGroupCounts,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useToggleActive,
} from '@/lib/hooks/use-categories';
import { CATEGORY_GROUP_LABEL, CATEGORY_GROUPS } from '@/types/category';
import type { Category, CategoryGroup } from '@/types/category';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const categorySchema = z.object({
  group: z.string().min(1, 'Vui lòng chọn nhóm danh mục') as z.ZodType<CategoryGroup>,
  code: z
    .string()
    .min(1, 'Vui lòng nhập mã')
    .regex(/^[a-z0-9_]+$/, 'Mã chỉ gồm chữ thường, số và dấu gạch dưới'),
  name: z.string().min(1, 'Vui lòng nhập tên danh mục'),
  sortOrder: z.coerce.number().int().min(0, 'Thứ tự phải >= 0').default(0),
  active: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type KpiCardProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  isLoading: boolean;
};

function KpiCard({ icon, label, value, isLoading }: KpiCardProps) {
  return (
    <Card className="rounded-xl border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold mt-0.5">{value}</p>
          )}
        </div>
        <div className="shrink-0 text-primary opacity-80">{icon}</div>
      </div>
    </Card>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: Category | null;
  defaultGroup?: CategoryGroup;
};

function CategoryFormDialog({
  open,
  onOpenChange,
  editTarget,
  defaultGroup,
}: CategoryFormDialogProps) {
  const isEditing = editTarget !== null;
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      group: editTarget?.group ?? defaultGroup ?? 'ROOM_TYPE',
      code: editTarget?.code ?? '',
      name: editTarget?.name ?? '',
      sortOrder: editTarget?.sortOrder ?? 0,
      active: editTarget?.active ?? true,
    },
    values: editTarget
      ? {
          group: editTarget.group,
          code: editTarget.code,
          name: editTarget.name,
          sortOrder: editTarget.sortOrder,
          active: editTarget.active,
        }
      : {
          group: defaultGroup ?? 'ROOM_TYPE',
          code: '',
          name: '',
          sortOrder: 0,
          active: true,
        },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: CategoryFormData) {
    if (isEditing) {
      updateMutation.mutate(
        {
          id: editTarget.id,
          body: {
            code: data.code,
            name: data.name,
            sortOrder: data.sortOrder,
            active: data.active,
          },
        },
        {
          onSuccess: () => {
            toast({ title: 'Cập nhật danh mục thành công', variant: 'success' });
            onOpenChange(false);
            reset();
          },
          onError: (err: unknown) => {
            const axiosErr = err as AxiosError<{ message: string | string[] }>;
            const msg = axiosErr.response?.data?.message;
            const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Lỗi cập nhật');
            toast({ title: text, variant: 'destructive' });
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          group: data.group,
          code: data.code,
          name: data.name,
          sortOrder: data.sortOrder,
          active: data.active,
        },
        {
          onSuccess: () => {
            toast({ title: 'Thêm danh mục thành công', variant: 'success' });
            onOpenChange(false);
            reset();
          },
          onError: (err: unknown) => {
            const axiosErr = err as AxiosError<{ message: string | string[] }>;
            const msg = axiosErr.response?.data?.message;
            const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Lỗi tạo mới');
            toast({ title: text, variant: 'destructive' });
          },
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Sửa danh mục' : 'Thêm danh mục mới'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Chỉnh sửa thông tin danh mục. Nhóm không thể thay đổi.'
              : 'Điền thông tin để tạo danh mục mới.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="category-form">
          {/* Nhóm */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-group">Nhóm danh mục</Label>
            <Controller
              name="group"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isEditing}>
                  <SelectTrigger id="cat-group" aria-invalid={!!errors.group}>
                    <SelectValue placeholder="Chọn nhóm..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {CATEGORY_GROUP_LABEL[g]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.group && (
              <p className="text-xs text-destructive" role="alert">
                {errors.group.message}
              </p>
            )}
          </div>

          {/* Mã */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-code">Mã</Label>
            <Input
              id="cat-code"
              placeholder="vd: standard_room"
              aria-invalid={!!errors.code}
              {...register('code', {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                },
              })}
            />
            {errors.code && (
              <p className="text-xs text-destructive" role="alert">
                {errors.code.message}
              </p>
            )}
          </div>

          {/* Tên */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Tên danh mục</Label>
            <Input
              id="cat-name"
              placeholder="vd: Phòng Tiêu Chuẩn"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Thứ tự + Hoạt động */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-sort">Thứ tự</Label>
              <Input
                id="cat-sort"
                type="number"
                min={0}
                placeholder="0"
                aria-invalid={!!errors.sortOrder}
                {...register('sortOrder')}
              />
              {errors.sortOrder && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.sortOrder.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-active">Hoạt động</Label>
              <div className="flex h-10 items-center">
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="cat-active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Huỷ
            </Button>
          </DialogClose>
          <Button form="category-form" type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEditing ? 'Lưu thay đổi' : 'Thêm danh mục'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

type DeleteDialogProps = {
  category: Category | null;
  onClose: () => void;
};

function DeleteConfirmDialog({ category, onClose }: DeleteDialogProps) {
  const deleteMutation = useDeleteCategory();

  function handleDelete() {
    if (!category) return;
    deleteMutation.mutate(category.id, {
      onSuccess: () => {
        toast({ title: `Đã xoá danh mục "${category.name}"`, variant: 'success' });
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
    <Dialog open={category !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xoá danh mục</DialogTitle>
          <DialogDescription>
            Xoá danh mục <span className="font-semibold text-foreground">«{category?.name}»</span>?
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
            {deleteMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Xoá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-32" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-20" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-40" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-8" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-20" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-16" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DanhMucPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('ADMIN', 'MANAGER');

  // Filters
  const [keyword, setKeyword] = useState('');
  const [activeGroup, setActiveGroup] = useState<CategoryGroup | ''>('');
  const [page, setPage] = useState(1);
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const toggleActiveMutation = useToggleActive();

  // Data
  const { data: groupCounts, isLoading: groupCountsLoading } = useGroupCounts();
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch,
  } = useCategories({
    group: activeGroup,
    keyword: debouncedKeyword,
    page,
    pageSize: 20,
  });

  const categories = categoriesData?.data ?? [];
  const meta = categoriesData?.meta;
  const totalPages = meta?.totalPages ?? 1;

  // KPI derived values
  const totalCategories = groupCounts?.reduce((sum, gc) => sum + gc.total, 0) ?? 0;
  const totalGroups = groupCounts?.length ?? 0;
  const totalActive = groupCounts?.reduce((sum, gc) => sum + gc.active, 0) ?? 0;
  const totalInactive = totalCategories - totalActive;

  const handleGroupChipClick = useCallback((group: CategoryGroup | '') => {
    setActiveGroup(group);
    setPage(1);
  }, []);

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(cat: Category) {
    setEditTarget(cat);
    setFormOpen(true);
  }

  function handleToggleActive(cat: Category) {
    toggleActiveMutation.mutate(cat.id, {
      onSuccess: () => {
        toast({
          title: cat.active ? `Đã ngưng hoạt động "${cat.name}"` : `Đã kích hoạt "${cat.name}"`,
          variant: 'success',
        });
      },
      onError: () => {
        toast({ title: 'Cập nhật trạng thái thất bại', variant: 'destructive' });
      },
    });
  }

  const activeGroupCount = groupCounts?.find((gc) => gc.group === activeGroup);

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Heading */}
      <div>
        <p className="text-xs text-muted-foreground">Cài đặt hệ thống › Danh mục</p>
        <h2 className="text-2xl font-semibold mt-0.5">Quản lý Danh mục</h2>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          icon={<ListTree className="h-7 w-7" aria-hidden="true" />}
          label="Tổng danh mục"
          value={totalCategories}
          isLoading={groupCountsLoading}
        />
        <KpiCard
          icon={<Tags className="h-7 w-7" aria-hidden="true" />}
          label="Nhóm danh mục"
          value={totalGroups}
          isLoading={groupCountsLoading}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" />}
          label="Đang hoạt động"
          value={totalActive}
          isLoading={groupCountsLoading}
        />
        <KpiCard
          icon={<XCircle className="h-7 w-7 text-zinc-400" aria-hidden="true" />}
          label="Ngưng dùng"
          value={totalInactive}
          isLoading={groupCountsLoading}
        />
      </div>

      {/* Action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Tìm danh mục..."
            className="pl-9"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            aria-label="Tìm kiếm danh mục"
          />
        </div>

        <div className="flex gap-2">
          {/* Group select (mirrors active chip) */}
          <Select
            value={activeGroup === '' ? '__all__' : activeGroup}
            onValueChange={(v) => handleGroupChipClick(v === '__all__' ? '' : (v as CategoryGroup))}
          >
            <SelectTrigger className="w-52" aria-label="Lọc theo nhóm">
              <SelectValue placeholder="Tất cả nhóm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả nhóm</SelectItem>
              {CATEGORY_GROUPS.map((g) => (
                <SelectItem key={g} value={g}>
                  {CATEGORY_GROUP_LABEL[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canEdit && (
            <Button onClick={openCreate} aria-label="Thêm danh mục mới">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Thêm danh mục
            </Button>
          )}
        </div>
      </div>

      {/* Group chips card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nhóm danh mục</CardTitle>
          <CardDescription>
            Chọn nhóm để lọc danh sách. Hiển thị số lượng đang hoạt động / tổng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            {/* "Tất cả" chip */}
            <button
              onClick={() => handleGroupChipClick('')}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
                activeGroup === ''
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              aria-pressed={activeGroup === ''}
              aria-label="Tất cả nhóm"
            >
              Tất cả ({totalActive})
            </button>

            {groupCountsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-28 rounded-full" />
                ))
              : groupCounts?.map((gc) => {
                  const isActive = activeGroup === gc.group;
                  return (
                    <button
                      key={gc.group}
                      onClick={() => handleGroupChipClick(gc.group)}
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring whitespace-nowrap',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                      aria-pressed={isActive}
                      aria-label={`${CATEGORY_GROUP_LABEL[gc.group]} (${gc.active})`}
                    >
                      {CATEGORY_GROUP_LABEL[gc.group]} ({gc.active})
                    </button>
                  );
                })}
          </div>
        </CardContent>
      </Card>

      {/* Table card */}
      <Card>
        {activeGroup && activeGroupCount !== undefined && (
          <div className="px-5 pt-4 pb-0 text-sm text-muted-foreground">
            Nhóm:{' '}
            <span className="font-medium text-foreground">{CATEGORY_GROUP_LABEL[activeGroup]}</span>{' '}
            &mdash; {activeGroupCount.active} hoạt động / {activeGroupCount.total} tổng
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="Danh sách danh mục">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nhóm
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Mã
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Tên danh mục
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Thứ tự
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {categoriesLoading ? (
                <TableSkeleton />
              ) : categoriesError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
                      <p>Không thể tải danh mục.</p>
                      <Button size="sm" variant="outline" onClick={() => void refetch()}>
                        Thử lại
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <ListTree className="h-10 w-10 opacity-30" aria-hidden="true" />
                      <p>Chưa có danh mục nào trong nhóm này.</p>
                      {canEdit && (
                        <Button size="sm" onClick={openCreate}>
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          Thêm danh mục
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {CATEGORY_GROUP_LABEL[cat.group]}
                    </td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {cat.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 font-medium">{cat.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{cat.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={cat.active ? 'emerald' : 'zinc'}>
                          {cat.active ? 'Hoạt động' : 'Ngưng dùng'}
                        </Badge>
                        {canEdit && (
                          <Switch
                            checked={cat.active}
                            onCheckedChange={() => handleToggleActive(cat)}
                            disabled={toggleActiveMutation.isPending}
                            aria-label={`Bật/tắt trạng thái "${cat.name}"`}
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(cat)}
                            aria-label={`Sửa danh mục ${cat.name}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(cat)}
                            aria-label={`Xoá danh mục ${cat.name}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!categoriesLoading && !categoriesError && totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
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
        )}
      </Card>

      {/* Form dialog */}
      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        defaultGroup={activeGroup !== '' ? activeGroup : undefined}
      />

      {/* Delete confirm dialog */}
      <DeleteConfirmDialog category={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
