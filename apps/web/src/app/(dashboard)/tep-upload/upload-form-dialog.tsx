'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AxiosError } from 'axios';

import { useCreateUpload, useUpdateUpload } from '@/lib/hooks/use-uploads';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Upload, UploadKind, EntityType } from '@/types/upload';

// ─── Schema ───────────────────────────────────────────────────────────────────

const uploadSchema = z.object({
  kind: z.enum(['ROOM_IMAGE', 'GUEST_DOC', 'STAFF_AVATAR', 'OTHER'], {
    required_error: 'Vui lòng chọn nhóm tệp',
  }),
  entityType: z
    .enum(['room', 'customer', 'staff', 'other', '__none__'])
    .optional()
    .transform((v) => (v === '__none__' ? null : (v ?? null))),
  entityId: z
    .string()
    .optional()
    .transform((v) => v?.trim() || null),
  fileName: z.string().min(1, 'Tên tệp không được trống'),
  fileSize: z.coerce.number().min(0).optional(),
  mimeType: z
    .string()
    .optional()
    .transform((v) => v?.trim() || 'application/octet-stream'),
  url: z.string().min(1, 'URL không được trống'),
  fileId: z
    .string()
    .optional()
    .transform((v) => v?.trim() || null),
  note: z
    .string()
    .optional()
    .transform((v) => v?.trim() || null),
});

type FormData = z.infer<typeof uploadSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export type UploadFormMode = 'create' | 'edit' | 'view';

interface UploadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: UploadFormMode;
  upload?: Upload | null;
}

// ─── Kind / EntityType labels ─────────────────────────────────────────────────

const KIND_LABELS: Record<UploadKind, string> = {
  ROOM_IMAGE: 'Ảnh phòng',
  GUEST_DOC: 'Hình tham khảo',
  STAFF_AVATAR: 'Avatar',
  OTHER: 'Khác',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  room: 'Phòng',
  customer: 'Khách hàng',
  staff: 'Nhân sự',
  other: 'Khác',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function UploadFormDialog({ open, onOpenChange, mode, upload }: UploadFormDialogProps) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const createMutation = useCreateUpload();
  const updateMutation = useUpdateUpload();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      kind: undefined,
      entityType: undefined,
      entityId: '',
      fileName: '',
      fileSize: undefined,
      mimeType: '',
      url: '',
      fileId: '',
      note: '',
    },
  });

  // Populate form when editing/viewing
  useEffect(() => {
    if (!open) return;
    if (upload && (isEdit || isView)) {
      reset({
        kind: upload.kind,
        entityType: (upload.entityType ?? '__none__') as FormData['entityType'],
        entityId: upload.entityId ?? '',
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
        url: upload.url,
        fileId: upload.fileId ?? '',
        note: upload.note ?? '',
      });
    } else if (isCreate) {
      reset({
        kind: undefined,
        entityType: undefined,
        entityId: '',
        fileName: '',
        fileSize: undefined,
        mimeType: '',
        url: '',
        fileId: '',
        note: '',
      });
    }
  }, [open, upload, isEdit, isView, isCreate, reset]);

  async function onSubmit(data: FormData) {
    const body = {
      kind: data.kind,
      entityType: data.entityType as EntityType,
      entityId: data.entityId ?? null,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType ?? 'application/octet-stream',
      url: data.url,
      fileId: data.fileId ?? null,
      note: data.note ?? null,
    };

    try {
      if (isCreate) {
        await createMutation.mutateAsync(body);
        toast({ title: 'Đã thêm tệp upload', variant: 'success' });
      } else if (isEdit && upload) {
        await updateMutation.mutateAsync({ id: upload.id, body });
        toast({ title: 'Đã cập nhật tệp upload', variant: 'success' });
      }
      onOpenChange(false);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string | string[] }>;
      const msg = axiosErr.response?.data?.message;
      toast({
        title: 'Có lỗi xảy ra',
        description: Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Không rõ lỗi'),
        variant: 'destructive',
      });
    }
  }

  const watchKind = watch('kind');
  const watchEntityType = watch('entityType');

  const title = isCreate
    ? 'Thêm tệp upload'
    : isEdit
      ? 'Chỉnh sửa tệp upload'
      : 'Chi tiết tệp upload';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isView ? 'Thông tin chi tiết tệp upload' : 'Điền thông tin tệp upload bên dưới'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Kind */}
          <div className="space-y-1.5">
            <Label htmlFor="kind">
              Nhóm <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watchKind ?? ''}
              onValueChange={(v) => setValue('kind', v as UploadKind, { shouldValidate: true })}
              disabled={isView}
            >
              <SelectTrigger id="kind" aria-label="Chọn nhóm tệp">
                <SelectValue placeholder="Chọn nhóm..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABELS) as UploadKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.kind && <p className="text-xs text-destructive">{errors.kind.message}</p>}
          </div>

          {/* Entity type */}
          <div className="space-y-1.5">
            <Label htmlFor="entityType">Loại đối tượng</Label>
            <Select
              value={(watchEntityType as string | undefined) ?? '__none__'}
              onValueChange={(v) =>
                setValue('entityType', v as FormData['entityType'], { shouldValidate: true })
              }
              disabled={isView}
            >
              <SelectTrigger id="entityType" aria-label="Chọn loại đối tượng">
                <SelectValue placeholder="Chọn loại đối tượng..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Không có —</SelectItem>
                {(Object.keys(ENTITY_TYPE_LABELS) as Array<keyof typeof ENTITY_TYPE_LABELS>).map(
                  (t) => (
                    <SelectItem key={t} value={t}>
                      {ENTITY_TYPE_LABELS[t]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Entity ID */}
          <div className="space-y-1.5">
            <Label htmlFor="entityId">ID đối tượng</Label>
            <Input
              id="entityId"
              placeholder="Nhập ID đối tượng..."
              disabled={isView}
              {...register('entityId')}
            />
          </div>

          {/* File name */}
          <div className="space-y-1.5">
            <Label htmlFor="fileName">
              Tên tệp <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fileName"
              placeholder="Ví dụ: room_b101_01.jpg"
              disabled={isView}
              aria-invalid={!!errors.fileName}
              {...register('fileName')}
            />
            {errors.fileName && (
              <p className="text-xs text-destructive">{errors.fileName.message}</p>
            )}
          </div>

          {/* File size */}
          <div className="space-y-1.5">
            <Label htmlFor="fileSize">Dung lượng (bytes)</Label>
            <Input
              id="fileSize"
              type="number"
              min={0}
              placeholder="Ví dụ: 204800"
              disabled={isView}
              {...register('fileSize')}
            />
          </div>

          {/* MIME type */}
          <div className="space-y-1.5">
            <Label htmlFor="mimeType">MIME type</Label>
            <Input
              id="mimeType"
              placeholder="Ví dụ: image/jpeg"
              disabled={isView}
              {...register('mimeType')}
            />
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label htmlFor="url">
              URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="url"
              placeholder="https://... hoặc /uploads/..."
              disabled={isView}
              aria-invalid={!!errors.url}
              {...register('url')}
            />
            {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
          </div>

          {/* File ID */}
          <div className="space-y-1.5">
            <Label htmlFor="fileId">File ID</Label>
            <Input
              id="fileId"
              placeholder="Hash / ID lưu trữ ngoài (nếu có)"
              disabled={isView}
              {...register('fileId')}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              placeholder="Ghi chú thêm..."
              rows={3}
              disabled={isView}
              {...register('note')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {isView ? 'Đóng' : 'Huỷ'}
            </Button>
            {!isView && (
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Đang lưu...' : isCreate ? 'Thêm tệp' : 'Lưu thay đổi'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
