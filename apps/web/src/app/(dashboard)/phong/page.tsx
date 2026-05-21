'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
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
  BedDouble,
  LayoutList,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { useAuth } from '@/lib/auth/use-auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  useRooms,
  useCreateRoom,
  useUpdateRoom,
  useDeleteRoom,
  useChangeRoomStatus,
  useChangeRoomCleaning,
} from '@/lib/hooks/use-rooms';
import { useCategories } from '@/lib/hooks/use-categories';
import type { Room } from '@/types/room';
import { formatVnd } from '@/lib/format';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── Status helpers ────────────────────────────────────────────────────────────

type BadgeVariant = 'emerald' | 'sky' | 'amber' | 'orange' | 'rose' | 'zinc' | 'default';

function getRoomStatusVariant(code: string): BadgeVariant {
  switch (code) {
    case 'ready':
      return 'emerald';
    case 'occupied':
      return 'sky';
    case 'maintenance':
      return 'orange';
    case 'cleaning':
      return 'amber';
    case 'disabled':
      return 'rose';
    default:
      return 'default';
  }
}

function getCleaningStatusVariant(code: string): BadgeVariant {
  switch (code) {
    case 'clean':
      return 'emerald';
    case 'cleaning':
      return 'amber';
    case 'dirty':
      return 'rose';
    default:
      return 'default';
  }
}

// ─── Image placeholder ────────────────────────────────────────────────────────

function RoomImageThumb({
  src,
  alt,
  className,
}: {
  src: string | undefined;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted rounded-md',
          className ?? 'h-10 w-12',
        )}
        aria-label={`Không có ảnh cho ${alt}`}
      >
        <BedDouble className="h-5 w-5 text-muted-foreground/40" aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-muted', className ?? 'h-10 w-12')}>
      <Image src={src} alt={alt} fill className="object-cover" sizes="48px" />
    </div>
  );
}

// ─── Status badge with optional dropdown ─────────────────────────────────────

type StatusBadgeMenuProps = {
  room: Room;
  canChange: boolean;
  onSelect: (statusId: string) => void;
  statuses: Array<{ id: string; code: string; name: string }>;
  variant: BadgeVariant;
  label: string;
  ariaLabel: string;
};

function StatusBadgeMenu({
  room,
  canChange,
  onSelect,
  statuses,
  variant,
  label,
  ariaLabel,
}: StatusBadgeMenuProps) {
  if (!canChange || statuses.length === 0) {
    return <Badge variant={variant}>{label}</Badge>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
          aria-label={ariaLabel}
        >
          <Badge variant={variant} className="cursor-pointer hover:opacity-80 transition-opacity">
            {label}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {statuses.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onClick={() => onSelect(s.id)}
            disabled={s.id === room.statusId}
          >
            {s.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type CleaningBadgeMenuProps = {
  room: Room;
  canChange: boolean;
  onSelect: (cleaningStatusId: string) => void;
  statuses: Array<{ id: string; code: string; name: string }>;
  variant: BadgeVariant;
  label: string;
  ariaLabel: string;
};

function CleaningBadgeMenu({
  room,
  canChange,
  onSelect,
  statuses,
  variant,
  label,
  ariaLabel,
}: CleaningBadgeMenuProps) {
  if (!canChange || statuses.length === 0) {
    return <Badge variant={variant}>{label}</Badge>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
          aria-label={ariaLabel}
        >
          <Badge variant={variant} className="cursor-pointer hover:opacity-80 transition-opacity">
            {label}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {statuses.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onClick={() => onSelect(s.id)}
            disabled={s.id === room.cleaningStatusId}
          >
            {s.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const roomSchema = z.object({
  code: z
    .string()
    .min(1, 'Vui lòng nhập mã phòng')
    .max(64, 'Mã phòng tối đa 64 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Mã phòng chỉ được chứa chữ cái, số và dấu gạch dưới'),
  name: z.string().min(1, 'Vui lòng nhập tên phòng').max(200, 'Tên phòng tối đa 200 ký tự'),
  typeId: z.string().min(1, 'Vui lòng chọn loại phòng'),
  areaId: z.string().optional(),
  capacity: z.coerce
    .number()
    .int('Sức chứa phải là số nguyên')
    .min(1, 'Sức chứa tối thiểu là 1')
    .max(100, 'Sức chứa tối đa là 100')
    .default(2),
  basePrice: z.coerce.number().min(0, 'Giá cơ bản phải >= 0'),
  weekendPrice: z
    .union([z.coerce.number().min(0, 'Giá cuối tuần phải >= 0'), z.literal('')])
    .optional(),
  holidayPrice: z.union([z.coerce.number().min(0, 'Giá lễ phải >= 0'), z.literal('')]).optional(),
  statusId: z.string().min(1, 'Vui lòng chọn trạng thái phòng'),
  cleaningStatusId: z.string().min(1, 'Vui lòng chọn trạng thái dọn phòng'),
  defaultCheckIn: z
    .string()
    .regex(/^(\d{2}:\d{2})?$/, 'Giờ nhận phòng phải có định dạng HH:mm')
    .optional()
    .or(z.literal('')),
  defaultCheckOut: z
    .string()
    .regex(/^(\d{2}:\d{2})?$/, 'Giờ trả phòng phải có định dạng HH:mm')
    .optional()
    .or(z.literal('')),
  imagesText: z.string().optional(),
  note: z.string().max(1000, 'Ghi chú tối đa 1000 ký tự').optional().or(z.literal('')),
});

type RoomFormData = z.infer<typeof roomSchema>;

function parseImages(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

// ─── Room Form Dialog ─────────────────────────────────────────────────────────

type RoomFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: Room | null;
  roomTypes: Array<{ id: string; name: string }>;
  roomAreas: Array<{ id: string; name: string }>;
  roomStatuses: Array<{ id: string; name: string }>;
  cleaningStatuses: Array<{ id: string; name: string }>;
};

function RoomFormDialog({
  open,
  onOpenChange,
  editTarget,
  roomTypes,
  roomAreas,
  roomStatuses,
  cleaningStatuses,
}: RoomFormDialogProps) {
  const isEditing = editTarget !== null;
  const createMutation = useCreateRoom();
  const updateMutation = useUpdateRoom();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    values: editTarget
      ? {
          code: editTarget.code,
          name: editTarget.name,
          typeId: editTarget.typeId,
          areaId: editTarget.areaId ?? undefined,
          capacity: editTarget.capacity,
          basePrice: parseFloat(editTarget.basePrice),
          weekendPrice: editTarget.weekendPrice ? parseFloat(editTarget.weekendPrice) : '',
          holidayPrice: editTarget.holidayPrice ? parseFloat(editTarget.holidayPrice) : '',
          statusId: editTarget.statusId,
          cleaningStatusId: editTarget.cleaningStatusId,
          defaultCheckIn: editTarget.defaultCheckIn ?? '',
          defaultCheckOut: editTarget.defaultCheckOut ?? '',
          imagesText: editTarget.images.join('\n'),
          note: editTarget.note ?? '',
        }
      : {
          code: '',
          name: '',
          typeId: '',
          areaId: undefined,
          capacity: 2,
          basePrice: 0,
          weekendPrice: '',
          holidayPrice: '',
          statusId: '',
          cleaningStatusId: '',
          defaultCheckIn: '',
          defaultCheckOut: '',
          imagesText: '',
          note: '',
        },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: RoomFormData) {
    const images = parseImages(data.imagesText);
    const weekendPrice =
      data.weekendPrice !== '' && data.weekendPrice !== undefined
        ? Number(data.weekendPrice)
        : undefined;
    const holidayPrice =
      data.holidayPrice !== '' && data.holidayPrice !== undefined
        ? Number(data.holidayPrice)
        : undefined;

    const handleError = (err: unknown) => {
      const axiosErr = err as AxiosError<{ message: string | string[]; statusCode?: number }>;
      const status = axiosErr.response?.status;
      const msg = axiosErr.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Lỗi không xác định');
      if (status === 409) {
        toast({ title: `Mã phòng "${data.code}" đã tồn tại`, variant: 'destructive' });
      } else {
        toast({ title: text, variant: 'destructive' });
      }
    };

    if (isEditing) {
      updateMutation.mutate(
        {
          id: editTarget.id,
          body: {
            name: data.name,
            typeId: data.typeId,
            areaId: data.areaId || undefined,
            capacity: data.capacity,
            basePrice: data.basePrice,
            weekendPrice,
            holidayPrice,
            statusId: data.statusId,
            cleaningStatusId: data.cleaningStatusId,
            defaultCheckIn: data.defaultCheckIn || undefined,
            defaultCheckOut: data.defaultCheckOut || undefined,
            images: images.length > 0 ? images : undefined,
            note: data.note || undefined,
          },
        },
        {
          onSuccess: () => {
            toast({ title: 'Cập nhật phòng thành công', variant: 'success' });
            onOpenChange(false);
            reset();
          },
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(
        {
          code: data.code,
          name: data.name,
          typeId: data.typeId,
          areaId: data.areaId || undefined,
          capacity: data.capacity,
          basePrice: data.basePrice,
          weekendPrice,
          holidayPrice,
          statusId: data.statusId,
          cleaningStatusId: data.cleaningStatusId,
          defaultCheckIn: data.defaultCheckIn || undefined,
          defaultCheckOut: data.defaultCheckOut || undefined,
          images: images.length > 0 ? images : undefined,
          note: data.note || undefined,
        },
        {
          onSuccess: () => {
            toast({ title: 'Thêm phòng thành công', variant: 'success' });
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
          <DialogTitle>{isEditing ? 'Sửa thông tin phòng' : 'Thêm phòng mới'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Chỉnh sửa thông tin phòng ${editTarget.code}. Mã phòng không thể thay đổi.`
              : 'Điền thông tin để tạo phòng mới.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="room-form">
          {/* Row 1: Mã + Tên */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="room-code">Mã phòng</Label>
              {isEditing ? (
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                  {editTarget.code}
                </div>
              ) : (
                <>
                  <Input
                    id="room-code"
                    placeholder="vd: P101"
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
              <Label htmlFor="room-name">Tên phòng</Label>
              <Input
                id="room-name"
                placeholder="vd: Phòng 101 – Standard"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Loại phòng + Khu vực */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="room-type">Loại phòng</Label>
              <Controller
                name="typeId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="room-type" aria-invalid={!!errors.typeId}>
                      <SelectValue placeholder="Chọn loại phòng..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.typeId && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.typeId.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-area">Khu vực / Tầng</Label>
              <Controller
                name="areaId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? '__none__'}
                    onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)}
                  >
                    <SelectTrigger id="room-area">
                      <SelectValue placeholder="Không xác định" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Không xác định</SelectItem>
                      {roomAreas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Row 3: Sức chứa + Giờ nhận/trả */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="room-capacity">Sức chứa</Label>
              <Input
                id="room-capacity"
                type="number"
                min={1}
                max={100}
                aria-invalid={!!errors.capacity}
                {...register('capacity')}
              />
              {errors.capacity && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.capacity.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-checkin">Giờ nhận phòng</Label>
              <Input
                id="room-checkin"
                placeholder="14:00"
                aria-invalid={!!errors.defaultCheckIn}
                {...register('defaultCheckIn')}
              />
              {errors.defaultCheckIn && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.defaultCheckIn.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-checkout">Giờ trả phòng</Label>
              <Input
                id="room-checkout"
                placeholder="12:00"
                aria-invalid={!!errors.defaultCheckOut}
                {...register('defaultCheckOut')}
              />
              {errors.defaultCheckOut && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.defaultCheckOut.message}
                </p>
              )}
            </div>
          </div>

          {/* Row 4: Giá */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="room-base-price">Giá ngày (đ)</Label>
              <Input
                id="room-base-price"
                type="number"
                min={0}
                placeholder="850000"
                aria-invalid={!!errors.basePrice}
                {...register('basePrice')}
              />
              {errors.basePrice && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.basePrice.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-weekend-price">Giá cuối tuần (đ)</Label>
              <Input
                id="room-weekend-price"
                type="number"
                min={0}
                placeholder="Không bắt buộc"
                aria-invalid={!!errors.weekendPrice}
                {...register('weekendPrice')}
              />
              {errors.weekendPrice && (
                <p className="text-xs text-destructive" role="alert">
                  {typeof errors.weekendPrice.message === 'string'
                    ? errors.weekendPrice.message
                    : ''}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-holiday-price">Giá lễ (đ)</Label>
              <Input
                id="room-holiday-price"
                type="number"
                min={0}
                placeholder="Không bắt buộc"
                aria-invalid={!!errors.holidayPrice}
                {...register('holidayPrice')}
              />
              {errors.holidayPrice && (
                <p className="text-xs text-destructive" role="alert">
                  {typeof errors.holidayPrice.message === 'string'
                    ? errors.holidayPrice.message
                    : ''}
                </p>
              )}
            </div>
          </div>

          {/* Row 5: Trạng thái phòng + Trạng thái dọn */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="room-status">Trạng thái phòng</Label>
              <Controller
                name="statusId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="room-status" aria-invalid={!!errors.statusId}>
                      <SelectValue placeholder="Chọn trạng thái..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roomStatuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.statusId && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.statusId.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-cleaning">Trạng thái vệ sinh</Label>
              <Controller
                name="cleaningStatusId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="room-cleaning" aria-invalid={!!errors.cleaningStatusId}>
                      <SelectValue placeholder="Chọn trạng thái..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cleaningStatuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cleaningStatusId && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.cleaningStatusId.message}
                </p>
              )}
            </div>
          </div>

          {/* Row 6: Images + Note */}
          <div className="space-y-1.5">
            <Label htmlFor="room-images">Ảnh (mỗi URL một dòng)</Label>
            <Textarea
              id="room-images"
              placeholder={'https://example.com/room1.jpg\nhttps://example.com/room2.jpg'}
              rows={3}
              {...register('imagesText')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="room-note">Ghi chú</Label>
            <Textarea
              id="room-note"
              placeholder="Ghi chú thêm về phòng..."
              rows={2}
              aria-invalid={!!errors.note}
              {...register('note')}
            />
            {errors.note && (
              <p className="text-xs text-destructive" role="alert">
                {errors.note.message}
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
          <Button form="room-form" type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />}
            {isEditing ? 'Lưu thay đổi' : 'Thêm phòng'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Room Detail Dialog ───────────────────────────────────────────────────────

type RoomDetailDialogProps = {
  room: Room | null;
  onClose: () => void;
};

function RoomDetailDialog({ room, onClose }: RoomDetailDialogProps) {
  if (!room) return null;

  const thumbs = room.images.slice(0, 4);

  return (
    <Dialog open={room !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chi tiết phòng {room.code}</DialogTitle>
          <DialogDescription>{room.name}</DialogDescription>
        </DialogHeader>

        {/* Image gallery */}
        {thumbs.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {thumbs.map((src, i) => (
              <div key={i} className="relative h-20 w-28 rounded-lg overflow-hidden bg-muted">
                <Image
                  src={src}
                  alt={`Ảnh phòng ${room.code} ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 text-sm">
          <DetailRow label="Mã phòng" value={room.code} />
          <DetailRow label="Tên phòng" value={room.name} />
          <DetailRow label="Loại phòng" value={room.type.name} />
          <DetailRow label="Khu vực" value={room.area?.name ?? '—'} />
          <DetailRow label="Sức chứa" value={`${room.capacity} người`} />
          <DetailRow label="Giá ngày" value={formatVnd(room.basePrice)} />
          <DetailRow label="Giá cuối tuần" value={formatVnd(room.weekendPrice)} />
          <DetailRow label="Giá lễ" value={formatVnd(room.holidayPrice)} />
          <DetailRow
            label="Trạng thái"
            value={
              <Badge variant={getRoomStatusVariant(room.status.code)}>{room.status.name}</Badge>
            }
          />
          <DetailRow
            label="Vệ sinh"
            value={
              <Badge variant={getCleaningStatusVariant(room.cleaningStatus.code)}>
                {room.cleaningStatus.name}
              </Badge>
            }
          />
          <DetailRow label="Giờ nhận phòng" value={room.defaultCheckIn ?? '—'} />
          <DetailRow label="Giờ trả phòng" value={room.defaultCheckOut ?? '—'} />
          {room.note && <DetailRow label="Ghi chú" value={room.note} />}
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
  room: Room | null;
  onClose: () => void;
};

function DeleteConfirmDialog({ room, onClose }: DeleteDialogProps) {
  const deleteMutation = useDeleteRoom();

  function handleDelete() {
    if (!room) return;
    deleteMutation.mutate(room.id, {
      onSuccess: () => {
        toast({ title: `Đã xoá phòng "${room.code}"`, variant: 'success' });
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
    <Dialog open={room !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xoá phòng</DialogTitle>
          <DialogDescription>
            Xoá phòng{' '}
            <span className="font-semibold text-foreground">
              «{room?.code} — {room?.name}»
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
            Xoá phòng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

type TableViewProps = {
  rooms: Room[];
  isLoading: boolean;
  isError: boolean;
  canEdit: boolean;
  canChangeStatus: boolean;
  canChangeCleaning: boolean;
  roomStatuses: Array<{ id: string; code: string; name: string }>;
  cleaningStatuses: Array<{ id: string; code: string; name: string }>;
  onEdit: (room: Room) => void;
  onView: (room: Room) => void;
  onDelete: (room: Room) => void;
  onChangeStatus: (room: Room, statusId: string) => void;
  onChangeCleaning: (room: Room, cleaningStatusId: string) => void;
  onRetry: () => void;
  onAddNew: () => void;
};

function TableView({
  rooms,
  isLoading,
  isError,
  canEdit,
  canChangeStatus,
  canChangeCleaning,
  roomStatuses,
  cleaningStatuses,
  onEdit,
  onView,
  onDelete,
  onChangeStatus,
  onChangeCleaning,
  onRetry,
  onAddNew,
}: TableViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label="Danh sách phòng">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Mã phòng
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ảnh
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tên phòng
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Loại phòng
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Tầng/Khu
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Sức chứa
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Giá ngày
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Cuối tuần
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Lễ
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Trạng thái
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Vệ sinh
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
                {Array.from({ length: 12 }).map((__, j) => (
                  <td key={j} className="px-3 py-3">
                    <Skeleton className="h-5 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : isError ? (
            <tr>
              <td colSpan={12} className="px-4 py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
                  <p>Không thể tải danh sách phòng.</p>
                  <Button size="sm" variant="outline" onClick={onRetry}>
                    Thử lại
                  </Button>
                </div>
              </td>
            </tr>
          ) : rooms.length === 0 ? (
            <tr>
              <td colSpan={12} className="px-4 py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <BedDouble className="h-10 w-10 opacity-30" aria-hidden="true" />
                  <p>Chưa có phòng nào.</p>
                  {canEdit && (
                    <Button size="sm" onClick={onAddNew}>
                      <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                      Thêm phòng mới
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            rooms.map((room) => (
              <tr
                key={room.id}
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                <td className="px-3 py-3">
                  <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {room.code}
                  </code>
                </td>
                <td className="px-3 py-3">
                  <RoomImageThumb src={room.images[0]} alt={room.name} className="h-10 w-12" />
                </td>
                <td className="px-3 py-3 font-medium max-w-[160px] truncate">{room.name}</td>
                <td className="px-3 py-3">
                  <Badge variant="default">{room.type.name}</Badge>
                </td>
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                  {room.area?.name ?? '—'}
                </td>
                <td className="px-3 py-3 text-center tabular-nums">{room.capacity}</td>
                <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                  {formatVnd(room.basePrice)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                  {room.weekendPrice ? formatVnd(room.weekendPrice) : '—'}
                </td>
                <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                  {room.holidayPrice ? formatVnd(room.holidayPrice) : '—'}
                </td>
                <td className="px-3 py-3">
                  <StatusBadgeMenu
                    room={room}
                    canChange={canChangeStatus}
                    onSelect={(statusId) => onChangeStatus(room, statusId)}
                    statuses={roomStatuses}
                    variant={getRoomStatusVariant(room.status.code)}
                    label={room.status.name}
                    ariaLabel={`Đổi trạng thái phòng ${room.code}`}
                  />
                </td>
                <td className="px-3 py-3">
                  <CleaningBadgeMenu
                    room={room}
                    canChange={canChangeCleaning}
                    onSelect={(cleaningStatusId) => onChangeCleaning(room, cleaningStatusId)}
                    statuses={cleaningStatuses}
                    variant={getCleaningStatusVariant(room.cleaningStatus.code)}
                    label={room.cleaningStatus.name}
                    ariaLabel={`Đổi trạng thái vệ sinh phòng ${room.code}`}
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(room)}
                      aria-label={`Xem chi tiết phòng ${room.code}`}
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(room)}
                          aria-label={`Sửa phòng ${room.code}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete(room)}
                          aria-label={`Xoá phòng ${room.code}`}
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

// ─── Grid view ────────────────────────────────────────────────────────────────

type GridViewProps = {
  rooms: Room[];
  isLoading: boolean;
  isError: boolean;
  canEdit: boolean;
  canChangeStatus: boolean;
  canChangeCleaning: boolean;
  roomStatuses: Array<{ id: string; code: string; name: string }>;
  cleaningStatuses: Array<{ id: string; code: string; name: string }>;
  onEdit: (room: Room) => void;
  onView: (room: Room) => void;
  onDelete: (room: Room) => void;
  onChangeStatus: (room: Room, statusId: string) => void;
  onChangeCleaning: (room: Room, cleaningStatusId: string) => void;
  onRetry: () => void;
  onAddNew: () => void;
};

function GridView({
  rooms,
  isLoading,
  isError,
  canEdit,
  canChangeStatus,
  canChangeCleaning,
  roomStatuses,
  cleaningStatuses,
  onEdit,
  onView,
  onDelete,
  onChangeStatus,
  onChangeCleaning,
  onRetry,
  onAddNew,
}: GridViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-40 w-full rounded-none" />
            <CardContent className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
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
        <p>Không thể tải danh sách phòng.</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <BedDouble className="h-10 w-10 opacity-30" aria-hidden="true" />
        <p>Chưa có phòng nào.</p>
        {canEdit && (
          <Button size="sm" onClick={onAddNew}>
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Thêm phòng mới
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {rooms.map((room) => (
        <Card key={room.id} className="overflow-hidden rounded-xl">
          {/* Image */}
          <div className="relative h-36 w-full bg-muted">
            {room.images[0] ? (
              <Image
                src={room.images[0]}
                alt={room.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BedDouble className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
              </div>
            )}
          </div>

          <CardContent className="p-3">
            {/* Room code + name */}
            <div className="mb-1">
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {room.code}
              </span>
            </div>
            <p className="font-semibold text-sm leading-tight line-clamp-1">{room.name}</p>

            {/* Details */}
            <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
              <p>
                Loại: <span className="text-foreground">{room.type.name}</span>
              </p>
              <p className="flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden="true" />
                Sức chứa: {room.capacity} người
              </p>
              <p>
                Giá ngày:{' '}
                <span className="text-foreground font-medium">{formatVnd(room.basePrice)}</span>
              </p>
            </div>

            {/* Badges */}
            <div className="mt-2 flex flex-wrap gap-1">
              <StatusBadgeMenu
                room={room}
                canChange={canChangeStatus}
                onSelect={(statusId) => onChangeStatus(room, statusId)}
                statuses={roomStatuses}
                variant={getRoomStatusVariant(room.status.code)}
                label={room.status.name}
                ariaLabel={`Đổi trạng thái phòng ${room.code}`}
              />
              <CleaningBadgeMenu
                room={room}
                canChange={canChangeCleaning}
                onSelect={(cleaningStatusId) => onChangeCleaning(room, cleaningStatusId)}
                statuses={cleaningStatuses}
                variant={getCleaningStatusVariant(room.cleaningStatus.code)}
                label={room.cleaningStatus.name}
                ariaLabel={`Đổi trạng thái vệ sinh phòng ${room.code}`}
              />
            </div>

            {/* Actions */}
            <div className="mt-2 flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onView(room)}
                aria-label={`Xem chi tiết phòng ${room.code}`}
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(room)}
                    aria-label={`Sửa phòng ${room.code}`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(room)}
                    aria-label={`Xoá phòng ${room.code}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ViewMode = 'table' | 'grid';

export default function PhongPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('ADMIN', 'MANAGER');
  const canChangeStatus = hasRole('ADMIN', 'MANAGER', 'RECEPTIONIST');
  const canChangeCleaning = hasRole('ADMIN', 'MANAGER', 'HOUSEKEEPING');

  // Filters
  const [keyword, setKeyword] = useState('');
  const [typeId, setTypeId] = useState('');
  const [statusId, setStatusId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [page, setPage] = useState(1);
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Room | null>(null);
  const [viewTarget, setViewTarget] = useState<Room | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);

  // Mutations
  const changeStatusMutation = useChangeRoomStatus();
  const changeCleaningMutation = useChangeRoomCleaning();

  // Fetch categories for filters + form
  const { data: roomTypesData } = useCategories({
    group: 'ROOM_TYPE',
    active: true,
    pageSize: 100,
  });
  const { data: roomAreasData } = useCategories({
    group: 'ROOM_AREA',
    active: true,
    pageSize: 100,
  });
  const { data: roomStatusesData } = useCategories({
    group: 'ROOM_STATUS',
    active: true,
    pageSize: 100,
  });
  const { data: cleaningStatusesData } = useCategories({
    group: 'CLEANING_STATUS',
    active: true,
    pageSize: 100,
  });

  const roomTypes = roomTypesData?.data ?? [];
  const roomAreas = roomAreasData?.data ?? [];
  const roomStatuses = roomStatusesData?.data ?? [];
  const cleaningStatuses = cleaningStatusesData?.data ?? [];

  // Rooms data
  const {
    data: roomsData,
    isLoading,
    isError,
    refetch,
  } = useRooms({
    keyword: debouncedKeyword,
    typeId: typeId || undefined,
    statusId: statusId || undefined,
    areaId: areaId || undefined,
    page,
    pageSize: 20,
  });

  const rooms = roomsData?.data ?? [];
  const meta = roomsData?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const totalRooms = meta?.total ?? rooms.length;
  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);

  // Handlers
  const openCreate = useCallback(() => {
    setEditTarget(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((room: Room) => {
    setEditTarget(room);
    setFormOpen(true);
  }, []);

  const handleChangeStatus = useCallback(
    (room: Room, newStatusId: string) => {
      changeStatusMutation.mutate(
        { id: room.id, body: { statusId: newStatusId } },
        {
          onSuccess: () => {
            toast({
              title: `Cập nhật trạng thái phòng ${room.code} thành công`,
              variant: 'success',
            });
          },
          onError: (err: unknown) => {
            const axiosErr = err as AxiosError<{ message: string | string[] }>;
            if (axiosErr.response?.status === 403) {
              toast({ title: 'Bạn không có quyền thực hiện thao tác này', variant: 'destructive' });
            } else {
              toast({ title: 'Cập nhật trạng thái thất bại', variant: 'destructive' });
            }
          },
        },
      );
    },
    [changeStatusMutation],
  );

  const handleChangeCleaning = useCallback(
    (room: Room, newCleaningStatusId: string) => {
      changeCleaningMutation.mutate(
        { id: room.id, body: { cleaningStatusId: newCleaningStatusId } },
        {
          onSuccess: () => {
            toast({ title: `Cập nhật vệ sinh phòng ${room.code} thành công`, variant: 'success' });
          },
          onError: (err: unknown) => {
            const axiosErr = err as AxiosError<{ message: string | string[] }>;
            if (axiosErr.response?.status === 403) {
              toast({ title: 'Bạn không có quyền thực hiện thao tác này', variant: 'destructive' });
            } else {
              toast({ title: 'Cập nhật trạng thái vệ sinh thất bại', variant: 'destructive' });
            }
          },
        },
      );
    },
    [changeCleaningMutation],
  );

  const sharedViewProps = {
    rooms,
    isLoading,
    isError,
    canEdit,
    canChangeStatus,
    canChangeCleaning,
    roomStatuses: roomStatuses.map((s) => ({ id: s.id, code: s.code, name: s.name })),
    cleaningStatuses: cleaningStatuses.map((s) => ({ id: s.id, code: s.code, name: s.name })),
    onEdit: openEdit,
    onView: setViewTarget,
    onDelete: setDeleteTarget,
    onChangeStatus: handleChangeStatus,
    onChangeCleaning: handleChangeCleaning,
    onRetry: () => void refetch(),
    onAddNew: openCreate,
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div>
        <p className="text-xs text-muted-foreground">Quản lý cơ sở › Phòng</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: count */}
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-5 w-24 inline-block" />
          ) : (
            <>
              <span className="font-semibold text-foreground">{totalRooms}</span> phòng
              {viewMode === 'grid' && !isLoading && (
                <>
                  {' '}
                  · <span className="font-semibold text-foreground">{totalCapacity}</span> chỗ
                </>
              )}
            </>
          )}
        </p>

        {/* Right: search + view toggle + add */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Tìm mã phòng, tên phòng…"
              className="pl-9 w-64"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              aria-label="Tìm kiếm phòng"
            />
          </div>

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

          {/* Add button — RBAC gated */}
          {canEdit && (
            <Button
              onClick={openCreate}
              size="icon"
              className="h-9 w-9"
              aria-label="Thêm phòng mới"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        {/* Loại phòng */}
        <Select
          value={typeId || '__all__'}
          onValueChange={(v) => {
            setTypeId(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44 h-9 text-sm" aria-label="Lọc loại phòng">
            <SelectValue placeholder="Loại phòng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả loại phòng</SelectItem>
            {roomTypes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Trạng thái */}
        <Select
          value={statusId || '__all__'}
          onValueChange={(v) => {
            setStatusId(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44 h-9 text-sm" aria-label="Lọc trạng thái">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả trạng thái</SelectItem>
            {roomStatuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Khu vực */}
        <Select
          value={areaId || '__all__'}
          onValueChange={(v) => {
            setAreaId(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44 h-9 text-sm" aria-label="Lọc khu vực">
            <SelectValue placeholder="Khu vực" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả khu vực</SelectItem>
            {roomAreas.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        {!isLoading && !isError && totalPages > 1 && (
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
      <RoomFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        roomTypes={roomTypes.map((t) => ({ id: t.id, name: t.name }))}
        roomAreas={roomAreas.map((a) => ({ id: a.id, name: a.name }))}
        roomStatuses={roomStatuses.map((s) => ({ id: s.id, name: s.name }))}
        cleaningStatuses={cleaningStatuses.map((s) => ({ id: s.id, name: s.name }))}
      />

      {/* Detail dialog */}
      <RoomDetailDialog room={viewTarget} onClose={() => setViewTarget(null)} />

      {/* Delete confirm */}
      <DeleteConfirmDialog room={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
