'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Search,
  BedDouble,
  CalendarPlus,
  AlertCircle,
  Building2,
  Users,
  CalendarCheck,
  LayoutGrid,
} from 'lucide-react';

import { useAvailableRooms } from '@/lib/hooks/use-available-rooms';
import type { AvailableRoomsQuery } from '@/lib/hooks/use-available-rooms';
import { useCategories } from '@/lib/hooks/use-categories';
import { formatVnd } from '@/lib/format';
import type { Room } from '@/types/room';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookingFormDialog,
  type BookingFormInitialValues,
} from '@/app/(dashboard)/booking/booking-form-dialog';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nightsBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | undefined;
  sublabel: string;
  icon: React.ReactNode;
  isLoading: boolean;
}

function KpiCard({ label, value, sublabel, icon, isLoading }: KpiCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          {isLoading ? (
            <Skeleton className="h-9 w-16 mt-1" />
          ) : (
            <div className="text-3xl font-bold mt-1">{value ?? 0}</div>
          )}
          <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>
        </div>
        <div className="text-muted-foreground/60">{icon}</div>
      </div>
    </Card>
  );
}

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-36 w-full rounded-none" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Empty panel ──────────────────────────────────────────────────────────────

function EmptyPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <BedDouble className="h-16 w-16 text-muted-foreground/30 mb-4" aria-hidden="true" />
      <p className="text-base font-medium text-muted-foreground">
        Không có phòng trống trong khoảng ngày này
      </p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        Thử thay đổi ngày nhận / trả hoặc bỏ bớt điều kiện lọc
      </p>
    </div>
  );
}

// ─── Error panel ──────────────────────────────────────────────────────────────

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-3" aria-hidden="true" />
      <p className="text-sm font-medium text-destructive">Không thể tải danh sách phòng</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  );
}

// ─── Room card ────────────────────────────────────────────────────────────────

interface RoomCardProps {
  room: Room;
  onCreateBooking: (room: Room) => void;
}

function RoomCard({ room, onCreateBooking }: RoomCardProps) {
  const firstImage = room.images[0];
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-36 w-full bg-muted">
        {firstImage ? (
          <Image
            src={firstImage}
            alt={room.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BedDouble className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="p-4 space-y-1.5">
        <div className="text-xs text-muted-foreground font-mono">{room.code}</div>
        <div className="font-semibold text-sm leading-tight">{room.name}</div>
        <div className="text-xs text-muted-foreground">
          {room.type.name}
          {room.area ? ` · ${room.area.name}` : ''}
        </div>
        <div className="flex items-center justify-between pt-2">
          <div>
            <div className="font-bold text-primary text-sm">
              {formatVnd(Number(room.basePrice))}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Users className="h-3 w-3" aria-hidden="true" />
              Sức chứa: {room.capacity}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onCreateBooking(room)}
            aria-label={`Tạo booking cho phòng ${room.name}`}
          >
            <CalendarPlus className="mr-1 h-4 w-4" aria-hidden="true" />
            Tạo booking
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhongTrongPage() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [checkIn, setCheckIn] = useState(toIso(today));
  const [checkOut, setCheckOut] = useState(toIso(tomorrow));
  const [typeId, setTypeId] = useState<string>('__all__');
  const [capacity, setCapacity] = useState<string>('__all__');

  // "submitted" is the query key — only updates when user clicks "Tìm phòng"
  const [submitted, setSubmitted] = useState<AvailableRoomsQuery>({
    checkIn: toIso(today),
    checkOut: toIso(tomorrow),
  });

  // Room types for filter select
  const { data: typeCatsData } = useCategories({
    group: 'ROOM_TYPE',
    active: true,
    pageSize: 100,
  });
  const typeOptions = typeCatsData?.data ?? [];

  // Available rooms query
  const query = useAvailableRooms(submitted, true);
  const rooms = query.data?.data ?? [];
  const meta = query.data?.meta;

  // Booking dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitial, setDialogInitial] = useState<BookingFormInitialValues | undefined>(
    undefined,
  );

  function handleSearch() {
    const next: AvailableRoomsQuery = {
      checkIn,
      checkOut,
    };
    if (typeId && typeId !== '__all__') next.typeId = typeId;
    if (capacity && capacity !== '__all__') next.capacity = Number(capacity);
    setSubmitted(next);
  }

  function handleCreateBooking(room: Room) {
    const nights = nightsBetween(submitted.checkIn, submitted.checkOut);
    setDialogInitial({
      checkIn: submitted.checkIn,
      checkOut: submitted.checkOut,
      items: [
        {
          kind: 'ROOM',
          roomId: room.id,
          refCode: room.code,
          refName: room.name,
          quantity: nights,
          unitPrice: Number(room.basePrice),
          serviceId: undefined,
          surchargeTypeId: undefined,
          note: '',
        },
      ],
    });
    setDialogOpen(true);
  }

  const bookedCount = meta?.totalBooked ?? 0;
  const scheduledCount =
    meta !== undefined ? Math.max(0, meta.totalRooms - meta.totalAvailable - meta.totalBooked) : 0;

  return (
    <div className="space-y-6">
      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Ngày nhận */}
          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <Label htmlFor="pt-checkin">Ngày nhận</Label>
            <Input
              id="pt-checkin"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              aria-label="Ngày nhận phòng"
            />
          </div>

          {/* Ngày trả */}
          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <Label htmlFor="pt-checkout">Ngày trả</Label>
            <Input
              id="pt-checkout"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              aria-label="Ngày trả phòng"
            />
          </div>

          {/* Sức chứa */}
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <Label htmlFor="pt-capacity">Sức chứa</Label>
            <Select value={capacity} onValueChange={setCapacity}>
              <SelectTrigger id="pt-capacity" aria-label="Lọc sức chứa">
                <SelectValue placeholder="Tất cả sức chứa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả sức chứa</SelectItem>
                <SelectItem value="1">1 người</SelectItem>
                <SelectItem value="2">2 người</SelectItem>
                <SelectItem value="4">4 người</SelectItem>
                <SelectItem value="6">6 người</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Loại phòng */}
          <div className="flex flex-col gap-1.5 min-w-[180px]">
            <Label htmlFor="pt-type">Loại phòng</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger id="pt-type" aria-label="Lọc loại phòng">
                <SelectValue placeholder="Tất cả loại phòng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả loại phòng</SelectItem>
                {typeOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search button */}
          <Button className="self-end" onClick={handleSearch} aria-label="Tìm phòng trống">
            <Search className="mr-2 h-4 w-4" aria-hidden="true" />
            Tìm phòng
          </Button>
        </div>
      </Card>

      {/* ── KPI row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Phòng trống"
          value={meta?.totalAvailable}
          sublabel="Có thể nhận đặt"
          icon={<BedDouble className="h-8 w-8" aria-hidden="true" />}
          isLoading={query.isLoading}
        />
        <KpiCard
          label="Phòng đã có khách"
          value={bookedCount}
          sublabel="Đang có booking"
          icon={<CalendarCheck className="h-8 w-8" aria-hidden="true" />}
          isLoading={query.isLoading}
        />
        <KpiCard
          label="Có lịch chiếm"
          value={scheduledCount}
          sublabel="Trạng thái khác"
          icon={<Building2 className="h-8 w-8" aria-hidden="true" />}
          isLoading={query.isLoading}
        />
        <KpiCard
          label="Tất cả"
          value={meta?.totalRooms}
          sublabel="Tổng số phòng"
          icon={<LayoutGrid className="h-8 w-8" aria-hidden="true" />}
          isLoading={query.isLoading}
        />
      </div>

      {/* ── Result grid ────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Danh sách phòng còn trống</h2>

        {query.isLoading && <SkeletonGrid />}

        {query.isError && !query.isLoading && <ErrorPanel onRetry={() => void query.refetch()} />}

        {!query.isLoading && !query.isError && rooms.length === 0 && <EmptyPanel />}

        {!query.isLoading && !query.isError && rooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onCreateBooking={handleCreateBooking} />
            ))}
          </div>
        )}
      </div>

      {/* ── Booking dialog ─────────────────────────────────────────────── */}
      <BookingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="create"
        initialValues={dialogInitial}
      />
    </div>
  );
}
