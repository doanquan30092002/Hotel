import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { BookingItemKind } from '@prisma/client';

import { CalendarView } from '../dto/query-calendar.dto';

// ── Prisma shape interfaces ──────────────────────────────────────────────────

interface CategoryRef {
  id: string;
  code: string;
  name: string;
}

interface PrismaRoomForCalendar {
  id: string;
  code: string;
  name: string;
  type: CategoryRef;
  area: CategoryRef | null;
}

interface PrismaBookingItem {
  kind: BookingItemKind;
  roomId: string | null;
  room: { id: string; code: string; name: string } | null;
}

interface PrismaBookingForCalendar {
  id: string;
  code: string;
  checkIn: Date;
  checkOut: Date;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: CategoryRef;
  source: CategoryRef | null;
  customer: { id: string; code: string; fullName: string; phone: string | null } | null;
  items: PrismaBookingItem[];
}

// ── Public entity shapes ─────────────────────────────────────────────────────

export interface CalendarRoomEntity {
  id: string;
  code: string;
  name: string;
  type: CategoryRef;
  area: CategoryRef | null;
}

export interface CalendarBookingRoomRef {
  roomId: string;
  roomCode: string;
  roomName: string;
}

export interface CalendarBookingEntity {
  id: string;
  code: string;
  status: CategoryRef;
  source: CategoryRef | null;
  customer: { id: string; code: string; fullName: string; phone: string | null } | null;
  checkIn: string;
  checkOut: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  rooms: CalendarBookingRoomRef[];
}

export interface CalendarStats {
  totalBookings: number;
  occupancyPercent: number;
  relatedShifts: number;
}

export interface CalendarResponse {
  view: CalendarView;
  from: string;
  to: string;
  rooms: CalendarRoomEntity[];
  bookings: CalendarBookingEntity[];
  stats: CalendarStats;
}

// ── Swagger decorators class ─────────────────────────────────────────────────

export class CalendarResponseEntity {
  @ApiProperty({ enum: CalendarView }) view!: CalendarView;
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({ type: 'array' }) rooms!: CalendarRoomEntity[];
  @ApiProperty({ type: 'array' }) bookings!: CalendarBookingEntity[];
  @ApiPropertyOptional({ type: 'object' }) stats!: CalendarStats;

  static from(params: {
    view: CalendarView;
    from: string;
    to: string;
    rooms: PrismaRoomForCalendar[];
    bookings: PrismaBookingForCalendar[];
    stats: CalendarStats;
  }): CalendarResponse {
    const rooms: CalendarRoomEntity[] = params.rooms.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type,
      area: r.area,
    }));

    const bookings: CalendarBookingEntity[] = params.bookings.map((b) => {
      const roomItems = b.items.filter(
        (i): i is PrismaBookingItem & { room: { id: string; code: string; name: string } } =>
          i.kind === BookingItemKind.ROOM && i.room !== null,
      );
      return {
        id: b.id,
        code: b.code,
        status: b.status,
        source: b.source,
        customer: b.customer,
        checkIn: b.checkIn.toISOString().slice(0, 10),
        checkOut: b.checkOut.toISOString().slice(0, 10),
        checkInTime: b.checkInTime,
        checkOutTime: b.checkOutTime,
        rooms: roomItems.map((i) => ({
          roomId: i.room.id,
          roomCode: i.room.code,
          roomName: i.room.name,
        })),
      };
    });

    return {
      view: params.view,
      from: params.from,
      to: params.to,
      rooms,
      bookings,
      stats: params.stats,
    };
  }
}
