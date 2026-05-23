'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';

import { useCalendar } from '@/lib/hooks/use-calendar';
import { useCategories } from '@/lib/hooks/use-categories';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  parseDate,
  formatIso,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  daysBetween,
  monthLabel,
  weekLabel,
  dayLabel,
  VN_WEEKDAYS,
} from '@/lib/calendar-utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { CalendarView, CalendarBooking, CalendarRoom } from '@/types/calendar';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LEGEND = [
  {
    code: 'pending',
    name: 'Chờ xác nhận',
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  { code: 'confirmed', name: 'Đã xác nhận', classes: 'bg-sky-100 text-sky-700 border-sky-200' },
  {
    code: 'checked_in',
    name: 'Đang ở',
    classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    code: 'checked_out',
    name: 'Đã trả phòng',
    classes: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  },
  { code: 'cancelled', name: 'Đã huỷ', classes: 'bg-rose-100 text-rose-700 border-rose-200' },
] as const;

function getStatusClasses(code: string): string {
  switch (code) {
    case 'pending':
      return 'bg-amber-400 text-amber-900';
    case 'confirmed':
      return 'bg-sky-400 text-sky-900';
    case 'checked_in':
      return 'bg-emerald-400 text-emerald-900';
    case 'checked_out':
      return 'bg-zinc-300 text-zinc-800';
    case 'cancelled':
      return 'bg-rose-300 text-rose-900';
    default:
      return 'bg-primary/60 text-primary-foreground';
  }
}

// ─── Month/Week Grid ──────────────────────────────────────────────────────────

const MONTH_CELL_W = 48; // px per day cell
const WEEK_CELL_W = 140; // px per day cell
const ROW_H = 56; // px per room row (enough for booking bar + padding)
const HEADER_H = 44; // px for day header row
const ROOM_COL_W = 180; // px for sticky room label column

interface GridViewProps {
  rooms: CalendarRoom[];
  bookings: CalendarBooking[];
  rangeStart: Date;
  rangeEnd: Date; // exclusive
  cellWidth: number;
  todayIso: string;
}

function GridView({ rooms, bookings, rangeStart, rangeEnd, cellWidth, todayIso }: GridViewProps) {
  const n = daysBetween(rangeStart, rangeEnd);
  const days = Array.from({ length: n }, (_, i) => addDays(rangeStart, i));

  // Build a map: roomId -> list of bookings
  const bookingsByRoom = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const room of rooms) {
      map.set(room.id, []);
    }
    for (const bk of bookings) {
      for (const br of bk.rooms) {
        const arr = map.get(br.roomId);
        if (arr) arr.push(bk);
      }
    }
    return map;
  }, [rooms, bookings]);

  const totalWidth = ROOM_COL_W + n * cellWidth;

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <div style={{ minWidth: totalWidth }}>
        {/* Header row */}
        <div className="flex border-b border-border bg-muted" style={{ height: HEADER_H }}>
          {/* sticky room label cell */}
          <div
            className="sticky left-0 z-10 flex shrink-0 items-center border-r border-border bg-muted px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W }}
          >
            Phòng
          </div>
          {/* Day header cells */}
          {days.map((day) => {
            const iso = formatIso(day);
            const isToday = iso === todayIso;
            const wd = VN_WEEKDAYS[day.getDay()] ?? '';
            return (
              <div
                key={iso}
                className={`flex shrink-0 flex-col items-center justify-center border-r border-border text-xs ${
                  isToday ? 'bg-primary/10 font-bold text-primary' : 'text-muted-foreground'
                }`}
                style={{ width: cellWidth, minWidth: cellWidth }}
              >
                <span className="font-semibold">{day.getDate()}</span>
                <span className="text-[10px]">{wd}</span>
              </div>
            );
          })}
        </div>

        {/* Room rows */}
        {rooms.map((room) => {
          const roomBookings = bookingsByRoom.get(room.id) ?? [];
          return (
            <div
              key={room.id}
              className="relative flex border-b border-border last:border-b-0"
              style={{ height: ROW_H }}
            >
              {/* Sticky room label */}
              <div
                className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-border bg-card px-3"
                style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W }}
              >
                <span className="text-sm font-semibold text-foreground">{room.code}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {room.type.name}
                  {room.area ? ` · ${room.area.name}` : ''}
                </span>
              </div>

              {/* Day cells background */}
              <div className="relative flex flex-1">
                {days.map((day) => {
                  const iso = formatIso(day);
                  const isToday = iso === todayIso;
                  return (
                    <div
                      key={iso}
                      className={`shrink-0 border-r border-border last:border-r-0 ${
                        isToday ? 'bg-primary/5' : ''
                      }`}
                      style={{ width: cellWidth, minWidth: cellWidth, height: ROW_H }}
                    />
                  );
                })}

                {/* Booking bars (absolutely positioned over the day cells) */}
                {roomBookings.map((bk) => {
                  const checkInDate = parseDate(bk.checkIn);
                  const checkOutDate = parseDate(bk.checkOut);
                  const startCol = Math.max(0, daysBetween(rangeStart, checkInDate));
                  const endCol = Math.min(n, daysBetween(rangeStart, checkOutDate));
                  if (endCol <= startCol) return null;
                  const leftPx = startCol * cellWidth;
                  const widthPx = (endCol - startCol) * cellWidth - 2; // -2 for gap
                  const statusClasses = getStatusClasses(bk.status.code);
                  const label =
                    cellWidth >= 100
                      ? `${bk.code}${bk.customer ? ` — ${bk.customer.fullName}` : ''}`
                      : bk.code;
                  return (
                    <div
                      key={bk.id}
                      title={`${bk.code} · ${bk.customer?.fullName ?? '—'} · ${bk.status.name}`}
                      className={`absolute top-2 overflow-hidden rounded text-xs font-medium shadow-sm ${statusClasses}`}
                      style={{
                        left: leftPx + 1,
                        width: widthPx,
                        height: ROW_H - 16,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 6,
                        paddingRight: 4,
                      }}
                    >
                      <span className="truncate">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {rooms.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Không có phòng nào trong khoảng này
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

const DAY_ROW_H = 64;
const TIME_HOURS = [0, 6, 12, 18, 24];

interface DayViewProps {
  rooms: CalendarRoom[];
  bookings: CalendarBooking[];
  dayDate: Date;
}

function DayView({ rooms, bookings, dayDate }: DayViewProps) {
  const dayIso = formatIso(dayDate);

  // Filter bookings that include this day
  const bookingsOnDay = useMemo(
    () =>
      bookings.filter((bk) => {
        const ci = parseDate(bk.checkIn);
        const co = parseDate(bk.checkOut);
        return ci <= dayDate && co > dayDate;
      }),
    [bookings, dayDate],
  );

  // Build map roomId -> bookings
  const bookingsByRoom = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const room of rooms) map.set(room.id, []);
    for (const bk of bookingsOnDay) {
      for (const br of bk.rooms) {
        const arr = map.get(br.roomId);
        if (arr) arr.push(bk);
      }
    }
    return map;
  }, [rooms, bookingsOnDay]);

  return (
    <div className="rounded-xl border border-border">
      {/* Time axis header */}
      <div
        className="flex items-center border-b border-border bg-muted"
        style={{ height: HEADER_H }}
      >
        <div
          className="sticky left-0 shrink-0 border-r border-border bg-muted"
          style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W }}
        />
        <div className="relative flex-1">
          {TIME_HOURS.map((h) => (
            <span
              key={h}
              className="absolute text-xs text-muted-foreground"
              style={{ left: `${(h / 24) * 100}%`, transform: 'translateX(-50%)' }}
            >
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      </div>

      {/* Day label subheader */}
      <div className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
        {dayIso}
      </div>

      {/* Room rows */}
      {rooms.map((room) => {
        const roomBookings = bookingsByRoom.get(room.id) ?? [];
        return (
          <div
            key={room.id}
            className="flex border-b border-border last:border-b-0"
            style={{ height: DAY_ROW_H }}
          >
            {/* Room label */}
            <div
              className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-border bg-card px-3"
              style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W }}
            >
              <span className="text-sm font-semibold">{room.code}</span>
              <span className="truncate text-[11px] text-muted-foreground">
                {room.type.name}
                {room.area ? ` · ${room.area.name}` : ''}
              </span>
            </div>

            {/* Time strip */}
            <div className="relative flex-1">
              {/* Grid lines at 6h intervals */}
              {TIME_HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute top-0 h-full border-l border-dashed border-border"
                  style={{ left: `${(h / 24) * 100}%` }}
                />
              ))}

              {roomBookings.length === 0 ? (
                <div className="flex h-full items-center px-3 text-xs text-muted-foreground">
                  Trống trong ngày — Nhấp đôi để đặt nhanh hoặc thêm mới
                </div>
              ) : (
                roomBookings.map((bk) => {
                  // Parse check-in/check-out times, default 14:00 / 12:00
                  const [ciH, ciM] = (bk.checkInTime ?? '14:00').split(':').map(Number);
                  const [coH, coM] = (bk.checkOutTime ?? '12:00').split(':').map(Number);
                  const startMin = (ciH ?? 14) * 60 + (ciM ?? 0);
                  let endMin = (coH ?? 12) * 60 + (coM ?? 0);
                  if (endMin <= startMin) endMin = startMin + 60; // safety
                  const leftPct = (startMin / 1440) * 100;
                  const widthPct = Math.max(2, ((endMin - startMin) / 1440) * 100);
                  const statusClasses = getStatusClasses(bk.status.code);
                  return (
                    <div
                      key={bk.id}
                      title={`${bk.code} · ${bk.customer?.fullName ?? '—'}`}
                      className={`absolute top-2 overflow-hidden rounded px-2 text-xs font-medium shadow-sm ${statusClasses}`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        height: DAY_ROW_H - 16,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <span className="truncate">
                        {bk.code}
                        {bk.customer ? ` — ${bk.customer.fullName}` : ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}

      {rooms.length === 0 && (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Không có phòng nào trong ngày này
        </div>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LichPage() {
  const [view, setView] = useState<CalendarView>('month');
  const [anchorDate, setAnchorDate] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  });

  const [statusId, setStatusId] = useState<string>('');
  const [sourceId, setSourceId] = useState<string>('');
  const [keywordRaw, setKeywordRaw] = useState('');
  const keyword = useDebouncedValue(keywordRaw, 300);

  // Compute range
  const { from, to } = useMemo(() => {
    switch (view) {
      case 'month':
        return {
          from: formatIso(startOfMonth(anchorDate)),
          to: formatIso(endOfMonth(anchorDate)),
        };
      case 'week':
        return {
          from: formatIso(startOfWeek(anchorDate)),
          to: formatIso(endOfWeek(anchorDate)),
        };
      case 'day':
        return {
          from: formatIso(startOfDay(anchorDate)),
          to: formatIso(endOfDay(anchorDate)),
        };
    }
  }, [view, anchorDate]);

  const rangeStart = useMemo(() => parseDate(from), [from]);
  const rangeEnd = useMemo(() => parseDate(to), [to]);

  const query = useMemo(
    () => ({
      from,
      to,
      view,
      ...(statusId ? { statusId } : {}),
      ...(sourceId ? { sourceId } : {}),
      ...(keyword ? { keyword } : {}),
    }),
    [from, to, view, statusId, sourceId, keyword],
  );

  const { data, isLoading, isError, refetch } = useCalendar(query);

  // Categories for filters
  const { data: statusCats } = useCategories({
    group: 'BOOKING_STATUS',
    active: true,
    pageSize: 100,
  });
  const { data: sourceCats } = useCategories({
    group: 'GUEST_SOURCE',
    active: true,
    pageSize: 100,
  });

  const statusOptions = statusCats?.data ?? [];
  const sourceOptions = sourceCats?.data ?? [];

  const todayIso = useMemo(() => {
    const t = new Date();
    return formatIso(new Date(t.getFullYear(), t.getMonth(), t.getDate()));
  }, []);

  // Navigation
  const goToday = useCallback(() => {
    const t = new Date();
    setAnchorDate(new Date(t.getFullYear(), t.getMonth(), t.getDate()));
  }, []);

  const goPrev = useCallback(() => {
    setAnchorDate((d) => {
      switch (view) {
        case 'month':
          return addDays(startOfMonth(d), -1);
        case 'week':
          return addDays(d, -7);
        case 'day':
          return addDays(d, -1);
      }
    });
  }, [view]);

  const goNext = useCallback(() => {
    setAnchorDate((d) => {
      switch (view) {
        case 'month':
          return addDays(endOfMonth(d), 1);
        case 'week':
          return addDays(d, 7);
        case 'day':
          return addDays(d, 1);
      }
    });
  }, [view]);

  // Period label for KPI card
  const periodLabel = useMemo(() => {
    switch (view) {
      case 'month':
        return monthLabel(anchorDate);
      case 'week':
        return weekLabel(rangeStart, rangeEnd);
      case 'day':
        return dayLabel(anchorDate);
    }
  }, [view, anchorDate, rangeStart, rangeEnd]);

  const viewSubLabel = useMemo(() => {
    switch (view) {
      case 'month':
        return 'Booking trong tháng';
      case 'week':
        return 'Booking trong tuần';
      case 'day':
        return 'Booking trong ngày';
    }
  }, [view]);

  const rooms = data?.rooms ?? [];
  const bookings = data?.bookings ?? [];
  const stats = data?.stats;

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* ── Control bar ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={goPrev} aria-label="Kỳ trước">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              aria-label="Về hôm nay"
              className="px-4"
            >
              Hôm nay
            </Button>
            <Button variant="outline" size="icon" onClick={goNext} aria-label="Kỳ tiếp">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* View switcher */}
          <div
            role="group"
            aria-label="Chế độ xem"
            className="flex overflow-hidden rounded-lg border border-border"
          >
            {(['month', 'week', 'day'] as CalendarView[]).map((v, idx) => {
              const labels: Record<CalendarView, string> = {
                month: 'Tháng',
                week: 'Tuần',
                day: 'Ngày',
              };
              const isActive = view === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={`Xem theo ${labels[v]}`}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    idx > 0 ? 'border-l border-border' : ''
                  } ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {labels[v]}
                </button>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Tìm booking, phòng..."
              aria-label="Tìm kiếm lịch booking"
              className="h-9 w-52 pl-8 text-sm"
              value={keywordRaw}
              onChange={(e) => setKeywordRaw(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <Select
            value={statusId || '__all__'}
            onValueChange={(v) => setStatusId(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-44" aria-label="Lọc trạng thái">
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả trạng thái</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Source filter */}
          <Select
            value={sourceId || '__all__'}
            onValueChange={(v) => setSourceId(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-40" aria-label="Lọc nguồn">
              <SelectValue placeholder="Tất cả nguồn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả nguồn</SelectItem>
              {sourceOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* ── KPI Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard
          label={periodLabel}
          value={isLoading ? '…' : `${rooms.length} phòng`}
          sub="Tổng quan occupancy theo phòng"
        />
        <KpiCard label={viewSubLabel} value={isLoading ? '…' : (stats?.totalBookings ?? 0)} />
        <KpiCard
          label="Công suất ước tính"
          value={isLoading ? '…' : `${stats?.occupancyPercent ?? 0}%`}
        />
        <KpiCard label="Lịch đợt liên quan" value={isLoading ? '…' : (stats?.relatedShifts ?? 0)} />
      </div>

      {/* ── Status legend ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2" aria-label="Chú thích trạng thái">
        {STATUS_LEGEND.map((s) => (
          <span
            key={s.code}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${s.classes}`}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-80" aria-hidden="true" />
            {s.name}
          </span>
        ))}
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Đang tải lịch">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
              <p className="text-sm font-medium text-destructive">
                Không thể tải lịch booking. Vui lòng thử lại.
              </p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Thử lại
              </Button>
            </div>
          ) : bookings.length === 0 && rooms.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Không có booking trong khoảng này</p>
            </div>
          ) : view === 'day' ? (
            <DayView rooms={rooms} bookings={bookings} dayDate={rangeStart} />
          ) : (
            <GridView
              rooms={rooms}
              bookings={bookings}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              cellWidth={view === 'month' ? MONTH_CELL_W : WEEK_CELL_W}
              todayIso={todayIso}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
