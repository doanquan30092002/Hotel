'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  Search,
  RefreshCw,
  Plus,
  Eye,
  ExternalLink,
  Pencil,
  Trash2,
  FileIcon,
  ImageOff,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Image as ImageIcon,
  User,
  FileText,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { useAuth } from '@/lib/auth/use-auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useUploads, useUploadStats, useDeleteUpload, UPLOAD_KEYS } from '@/lib/hooks/use-uploads';
import { useQueryClient } from '@tanstack/react-query';
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
import { UploadFormDialog } from './upload-form-dialog';
import type { Upload as UploadItem, UploadKind } from '@/types/upload';

// ─── Kind badge ───────────────────────────────────────────────────────────────

const KIND_CONFIG: Record<UploadKind, { label: string; className: string }> = {
  ROOM_IMAGE: { label: 'Ảnh phòng', className: 'bg-emerald-100 text-emerald-700 border-0' },
  GUEST_DOC: { label: 'Hình tham khảo', className: 'bg-sky-100 text-sky-700 border-0' },
  STAFF_AVATAR: { label: 'Avatar', className: 'bg-amber-100 text-amber-700 border-0' },
  OTHER: { label: 'Khác', className: 'bg-zinc-100 text-zinc-700 border-0' },
};

function KindBadge({ kind }: { kind: UploadKind }) {
  const cfg = KIND_CONFIG[kind];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  isLoading: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-1.5 h-7 w-20" />
          ) : (
            <p className="mt-0.5 text-2xl font-bold leading-tight">{value}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Thumbnail cell ───────────────────────────────────────────────────────────

function ThumbnailCell({ upload }: { upload: UploadItem }) {
  const isImage = upload.mimeType.startsWith('image/');
  if (isImage) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
        <Image
          src={upload.url}
          alt={upload.fileName}
          fill
          className="object-cover"
          unoptimized
          sizes="40px"
        />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
      <FileIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}

// ─── Permission Denied ────────────────────────────────────────────────────────

function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <p className="text-lg font-semibold">Bạn không có quyền truy cập</p>
      <p className="text-sm text-muted-foreground">
        Chỉ có Quản trị viên và Quản lý mới xem được trang này.
      </p>
    </div>
  );
}

// ─── Page (outer shell — RBAC gate) ──────────────────────────────────────────

export default function TepUploadPage() {
  const { hasRole } = useAuth();
  const canView = hasRole('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING');
  if (!canView) return <PermissionDenied />;
  return <TepUploadContent />;
}

// ─── Page content ─────────────────────────────────────────────────────────────

function TepUploadContent() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('ADMIN', 'MANAGER', 'RECEPTIONIST');
  const canDelete = hasRole('ADMIN', 'MANAGER');

  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [kindFilter, setKindFilter] = useState<UploadKind | '__all__'>('__all__');
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  // Sync page reset on filter change
  const handleKeywordChange = useCallback((v: string) => {
    setKeyword(v);
    setPage(1);
  }, []);

  const handleKindChange = useCallback((v: UploadKind | '__all__') => {
    setKindFilter(v);
    setPage(1);
  }, []);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedUpload, setSelectedUpload] = useState<UploadItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UploadItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Query params
  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      keyword: debouncedKeyword || undefined,
      kind: kindFilter !== '__all__' ? kindFilter : undefined,
    }),
    [page, pageSize, debouncedKeyword, kindFilter],
  );

  const { data: listData, isLoading, isError, error, refetch } = useUploads(queryParams);
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useUploadStats();
  const deleteMutation = useDeleteUpload();

  const uploads = listData?.data ?? [];
  const meta = listData?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? uploads.length;
  const stats = statsData;

  // Refetch both
  const handleRefetch = useCallback(() => {
    void refetch();
    void refetchStats();
  }, [refetch, refetchStats]);

  // Delete
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: 'Đã xoá tệp upload', variant: 'success' });
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string | string[] }>;
      const msg = axiosErr.response?.data?.message;
      toast({
        title: 'Xoá thất bại',
        description: Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Không rõ lỗi'),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-5 p-6">
      {/* Page title */}
      <h1 className="text-xl font-semibold">Thư viện tệp upload</h1>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              placeholder="Tìm tên tệp, file ID, mã đối tượng..."
              aria-label="Tìm kiếm tệp upload"
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
            />
          </div>

          {/* Kind filter */}
          <Select
            value={kindFilter}
            onValueChange={(v) => handleKindChange(v as UploadKind | '__all__')}
          >
            <SelectTrigger className="w-[180px]" aria-label="Lọc nhóm tệp">
              <SelectValue placeholder="Tất cả nhóm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả nhóm</SelectItem>
              <SelectItem value="ROOM_IMAGE">Ảnh phòng</SelectItem>
              <SelectItem value="GUEST_DOC">Hình tham khảo</SelectItem>
              <SelectItem value="STAFF_AVATAR">Avatar</SelectItem>
              <SelectItem value="OTHER">Khác</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button variant="outline" onClick={handleRefetch} aria-label="Làm mới dữ liệu">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Làm mới
          </Button>

          {/* Add — RBAC gated */}
          {canWrite && (
            <Button
              onClick={() => {
                setSelectedUpload(null);
                setFormMode('create');
                setFormOpen(true);
              }}
              aria-label="Thêm tệp upload mới"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Thêm tệp
            </Button>
          )}
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          icon={<Upload className="h-5 w-5 text-primary" aria-hidden="true" />}
          label="Tổng tệp đã upload"
          value={stats?.total ?? 0}
          isLoading={statsLoading}
        />
        <KpiCard
          icon={<ImageIcon className="h-5 w-5 text-emerald-500" aria-hidden="true" />}
          label="Ảnh phòng"
          value={stats?.byKind.ROOM_IMAGE ?? 0}
          isLoading={statsLoading}
        />
        <KpiCard
          icon={<FileText className="h-5 w-5 text-sky-500" aria-hidden="true" />}
          label="Hình tham khảo"
          value={stats?.byKind.GUEST_DOC ?? 0}
          isLoading={statsLoading}
        />
        <KpiCard
          icon={<User className="h-5 w-5 text-amber-500" aria-hidden="true" />}
          label="Avatar"
          value={stats?.byKind.STAFF_AVATAR ?? 0}
          isLoading={statsLoading}
        />
      </div>

      {/* Table card */}
      <Card className="p-0">
        {/* Card header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Danh sách tệp upload</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Chỉnh sửa nhanh, xem trước và xoá trực tiếp theo từng đối tượng gốc.
            </p>
          </div>
          {!isLoading && <span className="text-xs text-muted-foreground">{total} dòng</span>}
        </div>

        <CardContent className="p-0">
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-3 p-5">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {/* Error state */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
              <p className="font-medium text-destructive">
                {(error as AxiosError<{ message: string }>)?.response?.data?.message ??
                  'Lỗi tải danh sách tệp upload'}
              </p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Thử lại
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && uploads.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <ImageOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Chưa có tệp upload nào</p>
              {canWrite && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedUpload(null);
                    setFormMode('create');
                    setFormOpen(true);
                  }}
                >
                  Thêm tệp đầu tiên
                </Button>
              )}
            </div>
          )}

          {/* Table */}
          {!isLoading && !isError && uploads.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3 text-left font-medium">Xem nhanh</th>
                    <th className="px-3 py-3 text-left font-medium">Nhóm</th>
                    <th className="px-3 py-3 text-left font-medium">Đối tượng</th>
                    <th className="px-3 py-3 text-left font-medium">Tên tệp</th>
                    <th className="px-3 py-3 text-left font-medium">File ID</th>
                    <th className="px-3 py-3 text-left font-medium">Liên kết</th>
                    <th className="px-3 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {uploads.map((u) => (
                    <UploadRow
                      key={u.id}
                      upload={u}
                      canWrite={canWrite}
                      canDelete={canDelete}
                      onView={() => {
                        setSelectedUpload(u);
                        setFormMode('view');
                        setFormOpen(true);
                      }}
                      onEdit={() => {
                        setSelectedUpload(u);
                        setFormMode('edit');
                        setFormOpen(true);
                      }}
                      onDelete={() => {
                        setDeleteTarget(u);
                        setDeleteConfirmOpen(true);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination footer — ALWAYS VISIBLE */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {total === 0
              ? 'Không có dữ liệu'
              : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trong tổng ${total} tệp`}
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
      <UploadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        upload={selectedUpload}
      />

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xoá tệp upload</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá tệp{' '}
              <span className="font-semibold">{deleteTarget?.fileName}</span> không? Thao tác này
              không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Đang xoá...' : 'Xoá'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Upload Row ───────────────────────────────────────────────────────────────

function UploadRow({
  upload,
  canWrite,
  canDelete,
  onView,
  onEdit,
  onDelete,
}: {
  upload: UploadItem;
  canWrite: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const truncateFileId = upload.fileId
    ? upload.fileId.length > 16
      ? `${upload.fileId.slice(0, 16)}…`
      : upload.fileId
    : '—';

  const entityDisplay =
    upload.entityType && upload.entityId
      ? `${upload.entityType} — ${upload.entityId.slice(0, 12)}${upload.entityId.length > 12 ? '…' : ''}`
      : upload.entityType
        ? upload.entityType
        : '—';

  return (
    <tr className="hover:bg-muted/50">
      {/* Thumbnail */}
      <td className="px-3 py-2.5">
        <ThumbnailCell upload={upload} />
      </td>

      {/* Kind badge */}
      <td className="px-3 py-2.5">
        <KindBadge kind={upload.kind} />
      </td>

      {/* Entity */}
      <td className="px-3 py-2.5">
        <span className="text-xs text-muted-foreground">{entityDisplay}</span>
      </td>

      {/* File name */}
      <td className="max-w-[180px] px-3 py-2.5">
        <span className="block truncate text-sm" title={upload.fileName}>
          {upload.fileName}
        </span>
        <span className="text-xs text-muted-foreground">
          {upload.fileSize > 0
            ? upload.fileSize >= 1024 * 1024
              ? `${(upload.fileSize / (1024 * 1024)).toFixed(1)} MB`
              : `${(upload.fileSize / 1024).toFixed(1)} KB`
            : '—'}
        </span>
      </td>

      {/* File ID */}
      <td className="px-3 py-2.5">
        <span
          className="font-mono text-xs text-muted-foreground"
          title={upload.fileId ?? undefined}
        >
          {truncateFileId}
        </span>
      </td>

      {/* Link */}
      <td className="px-3 py-2.5">
        <a
          href={upload.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          aria-label={`Mở tệp ${upload.fileName} trong tab mới`}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          Xem
        </a>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onView}
            aria-label={`Xem chi tiết ${upload.fileName}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.open(upload.url, '_blank')}
            aria-label={`Mở tệp ${upload.fileName} trong tab mới`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Button>
          {canWrite && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              aria-label={`Chỉnh sửa ${upload.fileName}`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label={`Xoá ${upload.fileName}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
