import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { BookingItemKind } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CalendarResponse, CalendarResponseEntity } from './entities/calendar.entity';
import { CalendarView, QueryCalendarDto } from './dto/query-calendar.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getCalendar(query: QueryCalendarDto): Promise<CalendarResponse> {
    const from = new Date(query.from);
    const to = new Date(query.to);

    if (from >= to) {
      throw new UnprocessableEntityException('to phải sau from');
    }

    // 1. Fetch all rooms (optionally filtered by typeId)
    const rooms = await this.prisma.room.findMany({
      where: {
        deletedAt: null,
        ...(query.typeId !== undefined ? { typeId: query.typeId } : {}),
      },
      include: {
        type: { select: { id: true, code: true, name: true } },
        area: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ code: 'asc' }],
    });

    // 2. Fetch bookings overlapping the date range [from, to)
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        checkIn: { lt: to },
        checkOut: { gt: from },
        ...(query.statusId !== undefined ? { statusId: query.statusId } : {}),
        ...(query.sourceId !== undefined ? { sourceId: query.sourceId } : {}),
        ...(query.keyword !== undefined && query.keyword !== ''
          ? {
              OR: [
                { code: { contains: query.keyword, mode: 'insensitive' } },
                {
                  customer: {
                    OR: [
                      { fullName: { contains: query.keyword, mode: 'insensitive' } },
                      { phone: { contains: query.keyword, mode: 'insensitive' } },
                      { code: { contains: query.keyword, mode: 'insensitive' } },
                    ],
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        customer: { select: { id: true, code: true, fullName: true, phone: true } },
        status: { select: { id: true, code: true, name: true } },
        source: { select: { id: true, code: true, name: true } },
        items: {
          where: { kind: BookingItemKind.ROOM },
          include: { room: { select: { id: true, code: true, name: true } } },
        },
      },
      orderBy: [{ checkIn: 'asc' }],
    });

    // 3. Compute stats
    const totalDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (24 * 3600 * 1000)));
    const totalSlots = rooms.length * totalDays;
    let bookedNights = 0;
    let shifts = 0;

    for (const b of bookings) {
      // Overlapping nights between [from, to) ∩ [b.checkIn, b.checkOut)
      const start = Math.max(from.getTime(), b.checkIn.getTime());
      const end = Math.min(to.getTime(), b.checkOut.getTime());
      const nights = Math.max(0, Math.ceil((end - start) / (24 * 3600 * 1000)));
      const roomCount = b.items.filter((i) => i.roomId !== null).length;
      bookedNights += nights * roomCount;

      if (b.checkIn >= from && b.checkIn < to) shifts++;
      if (b.checkOut > from && b.checkOut <= to) shifts++;
    }

    const occupancyPercent = totalSlots > 0 ? Math.round((bookedNights / totalSlots) * 100) : 0;

    return CalendarResponseEntity.from({
      view: query.view ?? CalendarView.MONTH,
      from: query.from,
      to: query.to,
      rooms,
      bookings,
      stats: { totalBookings: bookings.length, occupancyPercent, relatedShifts: shifts },
    });
  }
}
