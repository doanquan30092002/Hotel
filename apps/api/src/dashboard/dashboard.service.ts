import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { BookingItemKind, CategoryGroup, FinanceTxType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { DashboardTab, QueryDashboardDto } from './dto/query-dashboard.dto';
import {
  BookingOccupancyTabData,
  CategoryCount,
  DashboardKpi,
  DashboardResponse,
  FinanceTabData,
  HousekeepingTabData,
  OccupancyHeatmapRoom,
  OverviewTabData,
  RevenueDayPoint,
} from './entities/dashboard.entity';

// ── constants ─────────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 3600 * 1000;

// ── date helpers ──────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" from a Date object (UTC). */
function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Returns array of ISO date strings [from, from+1 day, ..., to-1 day].
 * E.g. from='2026-05-01', to='2026-05-04' → ['2026-05-01','2026-05-02','2026-05-03']
 */
function getDateRange(from: string, to: string): string[] {
  const result: string[] = [];
  let cur = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  while (cur < end) {
    result.push(toIsoDate(cur));
    cur = new Date(cur.getTime() + MS_PER_DAY);
  }
  return result;
}

/** Normalise a Prisma @db.Date field to a midnight-UTC Date for arithmetic. */
function toMidnightUtc(d: Date): Date {
  return new Date(toIsoDate(d) + 'T00:00:00Z');
}

// ── service ───────────────────────────────────────────────────────────────────

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(query: QueryDashboardDto): Promise<DashboardResponse> {
    if (query.from >= query.to) {
      throw new UnprocessableEntityException('to phải sau from');
    }

    const tab = query.tab ?? DashboardTab.OVERVIEW;
    const from = query.from;
    const to = query.to;
    const fromDate = new Date(from + 'T00:00:00Z');
    const toDate = new Date(to + 'T00:00:00Z');

    const kpi = await this.getKpi(from, to, fromDate, toDate);

    const response: DashboardResponse = { from, to, tab, kpi };

    switch (tab) {
      case DashboardTab.OVERVIEW:
        response.overview = await this.getOverviewTab(from, to, fromDate, toDate);
        break;
      case DashboardTab.BOOKING_OCCUPANCY:
        response.bookingOccupancy = await this.getBookingOccupancyTab(from, to, fromDate, toDate);
        break;
      case DashboardTab.FINANCE:
        response.finance = await this.getFinanceTab(from, to, fromDate, toDate);
        break;
      case DashboardTab.HOUSEKEEPING:
        response.housekeeping = await this.getHousekeepingTab(from, to, fromDate, toDate);
        break;
    }

    return response;
  }

  // ── KPI block (always computed) ─────────────────────────────────────────────

  private async getKpi(
    from: string,
    to: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<DashboardKpi> {
    // 1. Active rooms for occupancy
    const activeRooms = await this.prisma.room.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    const totalRooms = activeRooms.length;
    const totalDays = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY));
    const totalRoomNights = totalRooms * totalDays;

    // 2. Bookings overlapping [from, to) (excluding soft-deleted)
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        checkIn: { lt: toDate },
        checkOut: { gt: fromDate },
      },
      select: {
        checkIn: true,
        checkOut: true,
        items: {
          where: { kind: BookingItemKind.ROOM, roomId: { not: null } },
          select: { roomId: true },
        },
      },
    });

    let bookedNights = 0;
    for (const b of bookings) {
      const bCheckIn = toMidnightUtc(b.checkIn);
      const bCheckOut = toMidnightUtc(b.checkOut);
      const start = Math.max(fromDate.getTime(), bCheckIn.getTime());
      const end = Math.min(toDate.getTime(), bCheckOut.getTime());
      const nights = Math.max(0, Math.ceil((end - start) / MS_PER_DAY));
      const roomCount = b.items.length;
      bookedNights += nights * (roomCount > 0 ? roomCount : 1);
    }

    const occupancyPercent =
      totalRoomNights > 0 ? Math.min(100, Math.round((bookedNights / totalRoomNights) * 100)) : 0;
    const vacantNights = Math.max(0, totalRoomNights - bookedNights);

    // 3. Today check-ins (purely today snapshot, independent of date range)
    const today = toIsoDate(new Date());
    const todayStart = new Date(today + 'T00:00:00Z');
    const todayEnd = new Date(todayStart.getTime() + MS_PER_DAY);
    const todayCheckIns = await this.prisma.booking.count({
      where: {
        deletedAt: null,
        checkIn: { gte: todayStart, lt: todayEnd },
      },
    });

    // 4. Finance aggregation for [from, to)
    const txs = await this.prisma.financeTx.findMany({
      where: {
        deletedAt: null,
        occurredAt: { gte: fromDate, lt: toDate },
      },
      select: { type: true, amount: true },
    });

    let monthRevenue = new Prisma.Decimal(0);
    let monthExpense = new Prisma.Decimal(0);
    for (const tx of txs) {
      if (tx.type === FinanceTxType.INCOME) {
        monthRevenue = monthRevenue.add(tx.amount);
      } else {
        monthExpense = monthExpense.add(tx.amount);
      }
    }

    return {
      occupancyPercent,
      vacantNights,
      todayCheckIns,
      monthRevenue: monthRevenue.toString(),
      monthExpense: monthExpense.toString(),
      totalBookings: bookings.length,
    };
  }

  // ── Overview tab ────────────────────────────────────────────────────────────

  private async getOverviewTab(
    from: string,
    to: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<OverviewTabData> {
    const dateRange = getDateRange(from, to);

    // revenue/expense timeline: aggregate FinanceTx by occurredAt date
    const txs = await this.prisma.financeTx.findMany({
      where: {
        deletedAt: null,
        occurredAt: { gte: fromDate, lt: toDate },
      },
      select: { type: true, amount: true, occurredAt: true },
    });

    const revenueByDay = new Map<string, Prisma.Decimal>();
    const expenseByDay = new Map<string, Prisma.Decimal>();

    for (const tx of txs) {
      const day = toIsoDate(tx.occurredAt);
      if (tx.type === FinanceTxType.INCOME) {
        revenueByDay.set(day, (revenueByDay.get(day) ?? new Prisma.Decimal(0)).add(tx.amount));
      } else {
        expenseByDay.set(day, (expenseByDay.get(day) ?? new Prisma.Decimal(0)).add(tx.amount));
      }
    }

    const revenueTimeline: RevenueDayPoint[] = dateRange.map((date) => {
      const rev = revenueByDay.get(date) ?? new Prisma.Decimal(0);
      const exp = expenseByDay.get(date) ?? new Prisma.Decimal(0);
      return {
        date,
        revenue: rev.toString(),
        expense: exp.toString(),
        profit: rev.sub(exp).toString(),
      };
    });

    // Occupancy today
    const today = toIsoDate(new Date());
    const todayStart = new Date(today + 'T00:00:00Z');
    const todayEnd = new Date(todayStart.getTime() + MS_PER_DAY);

    const activeRooms = await this.prisma.room.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    const totalRooms = activeRooms.length;

    const todayBookings = await this.prisma.booking.count({
      where: {
        deletedAt: null,
        checkIn: { lt: todayEnd },
        checkOut: { gt: todayStart },
      },
    });

    const occupancyTodayPercent =
      totalRooms > 0 ? Math.min(100, Math.round((todayBookings / totalRooms) * 100)) : 0;

    // Room status donut — group by Room.statusId, map to category
    const rooms = await this.prisma.room.findMany({
      where: { deletedAt: null },
      select: { statusId: true },
    });

    const statusCountMap = new Map<string, number>();
    for (const r of rooms) {
      statusCountMap.set(r.statusId, (statusCountMap.get(r.statusId) ?? 0) + 1);
    }

    const statusIds = Array.from(statusCountMap.keys());
    const statusCats =
      statusIds.length > 0
        ? await this.prisma.category.findMany({
            where: { id: { in: statusIds }, deletedAt: null },
            select: { id: true, code: true, name: true },
          })
        : [];

    const statusLookup = new Map(statusCats.map((c) => [c.id, c]));
    const roomStatusDonut: CategoryCount[] = statusIds.map((id) => {
      const cat = statusLookup.get(id);
      return {
        code: cat?.code ?? id,
        name: cat?.name ?? id,
        count: statusCountMap.get(id) ?? 0,
      };
    });

    // Booking source bar — bookings overlapping [from, to)
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        checkIn: { lt: toDate },
        checkOut: { gt: fromDate },
      },
      select: { sourceId: true },
    });

    const sourceCountMap = new Map<string | null, number>();
    for (const b of bookings) {
      const key = b.sourceId ?? null;
      sourceCountMap.set(key, (sourceCountMap.get(key) ?? 0) + 1);
    }

    const sourceIds = Array.from(sourceCountMap.keys()).filter((k): k is string => k !== null);
    const sourceCats =
      sourceIds.length > 0
        ? await this.prisma.category.findMany({
            where: { id: { in: sourceIds }, deletedAt: null },
            select: { id: true, code: true, name: true },
          })
        : [];

    const sourceLookup = new Map(sourceCats.map((c) => [c.id, c]));
    const bookingSourceBar: CategoryCount[] = [];

    for (const [key, count] of sourceCountMap.entries()) {
      if (key === null) {
        bookingSourceBar.push({ code: 'unknown', name: 'Không rõ', count });
      } else {
        const cat = sourceLookup.get(key);
        bookingSourceBar.push({
          code: cat?.code ?? key,
          name: cat?.name ?? key,
          count,
        });
      }
    }

    return {
      revenueTimeline,
      occupancyTodayPercent,
      roomStatusDonut,
      bookingSourceBar,
    };
  }

  // ── Booking & Occupancy tab ─────────────────────────────────────────────────

  private async getBookingOccupancyTab(
    from: string,
    to: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<BookingOccupancyTabData> {
    const dateRange = getDateRange(from, to);
    const limitedDays = dateRange.slice(0, 31); // max 31 days for heatmap

    // Bookings overlapping [from, to)
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        checkIn: { lt: toDate },
        checkOut: { gt: fromDate },
      },
      select: {
        checkIn: true,
        checkOut: true,
        sourceId: true,
        items: {
          where: { kind: BookingItemKind.ROOM, roomId: { not: null } },
          select: {
            roomId: true,
            amount: true,
            room: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    // bookingTrend: count bookings that start within [from, to)
    const trendMap = new Map<string, number>();
    for (const b of bookings) {
      const day = toIsoDate(toMidnightUtc(b.checkIn));
      if (day >= from && day < to) {
        trendMap.set(day, (trendMap.get(day) ?? 0) + 1);
      }
    }

    const bookingTrend = limitedDays.map((date) => ({
      date,
      count: trendMap.get(date) ?? 0,
    }));

    // sourceDonut
    const sourceCountMap = new Map<string | null, number>();
    for (const b of bookings) {
      const key = b.sourceId ?? null;
      sourceCountMap.set(key, (sourceCountMap.get(key) ?? 0) + 1);
    }

    const sourceIds = Array.from(sourceCountMap.keys()).filter((k): k is string => k !== null);
    const sourceCats =
      sourceIds.length > 0
        ? await this.prisma.category.findMany({
            where: { id: { in: sourceIds }, deletedAt: null },
            select: { id: true, code: true, name: true },
          })
        : [];

    const sourceLookup = new Map(sourceCats.map((c) => [c.id, c]));
    const sourceDonut: CategoryCount[] = [];
    for (const [key, count] of sourceCountMap.entries()) {
      if (key === null) {
        sourceDonut.push({ code: 'unknown', name: 'Không rõ', count });
      } else {
        const cat = sourceLookup.get(key);
        sourceDonut.push({ code: cat?.code ?? key, name: cat?.name ?? key, count });
      }
    }

    // occupancyHeatmap: Room × Day matrix (first 20 rooms, max 31 days)
    const rooms = await this.prisma.room.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true },
      orderBy: { code: 'asc' },
      take: 20,
    });

    // Build a set of (roomId, date) pairs that are occupied
    const occupiedSet = new Set<string>();
    for (const b of bookings) {
      const bCheckIn = toMidnightUtc(b.checkIn);
      const bCheckOut = toMidnightUtc(b.checkOut);
      for (const item of b.items) {
        if (!item.roomId) continue;
        let cur = new Date(bCheckIn);
        while (cur < bCheckOut) {
          const day = toIsoDate(cur);
          occupiedSet.add(`${item.roomId}::${day}`);
          cur = new Date(cur.getTime() + MS_PER_DAY);
        }
      }
    }

    const occupancyHeatmap: OccupancyHeatmapRoom[] = rooms.map((room) => ({
      roomCode: room.code,
      days: limitedDays.map((date) => ({
        date,
        occupied: occupiedSet.has(`${room.id}::${date}`),
      })),
    }));

    // topRevenueRooms: sum BookingItem(ROOM).amount per room, take top 8
    const roomRevMap = new Map<
      string,
      { roomId: string; code: string; name: string; revenue: Prisma.Decimal }
    >();

    for (const b of bookings) {
      for (const item of b.items) {
        if (!item.roomId || !item.room) continue;
        const existing = roomRevMap.get(item.roomId);
        if (existing) {
          existing.revenue = existing.revenue.add(item.amount);
        } else {
          roomRevMap.set(item.roomId, {
            roomId: item.roomId,
            code: item.room.code,
            name: item.room.name,
            revenue: new Prisma.Decimal(item.amount),
          });
        }
      }
    }

    const topRevenueRooms = Array.from(roomRevMap.values())
      .sort((a, b) => (b.revenue.gt(a.revenue) ? 1 : -1))
      .slice(0, 8)
      .map((r) => ({
        roomId: r.roomId,
        code: r.code,
        name: r.name,
        revenue: r.revenue.toString(),
      }));

    return {
      bookingTrend,
      occupancyHeatmap,
      topRevenueRooms,
      sourceDonut,
    };
  }

  // ── Finance tab ─────────────────────────────────────────────────────────────

  private async getFinanceTab(
    from: string,
    to: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<FinanceTabData> {
    const dateRange = getDateRange(from, to);

    // FinanceTx in range
    const txs = await this.prisma.financeTx.findMany({
      where: {
        deletedAt: null,
        occurredAt: { gte: fromDate, lt: toDate },
      },
      include: {
        group: { select: { id: true, code: true, name: true } },
      },
    });

    const revenueByDay = new Map<string, Prisma.Decimal>();
    const expenseByDay = new Map<string, Prisma.Decimal>();
    const expenseGroupMap = new Map<
      string,
      { code: string; name: string; amount: Prisma.Decimal }
    >();

    let monthRevenue = new Prisma.Decimal(0);

    for (const tx of txs) {
      const day = toIsoDate(tx.occurredAt);
      const amt = new Prisma.Decimal(tx.amount);

      if (tx.type === FinanceTxType.INCOME) {
        monthRevenue = monthRevenue.add(amt);
        revenueByDay.set(day, (revenueByDay.get(day) ?? new Prisma.Decimal(0)).add(amt));
      } else {
        expenseByDay.set(day, (expenseByDay.get(day) ?? new Prisma.Decimal(0)).add(amt));

        const existing = expenseGroupMap.get(tx.group.code);
        if (existing) {
          existing.amount = existing.amount.add(amt);
        } else {
          expenseGroupMap.set(tx.group.code, {
            code: tx.group.code,
            name: tx.group.name,
            amount: amt,
          });
        }
      }
    }

    const revenueExpenseTimeline: RevenueDayPoint[] = dateRange.map((date) => {
      const rev = revenueByDay.get(date) ?? new Prisma.Decimal(0);
      const exp = expenseByDay.get(date) ?? new Prisma.Decimal(0);
      return {
        date,
        revenue: rev.toString(),
        expense: exp.toString(),
        profit: rev.sub(exp).toString(),
      };
    });

    // targetProgressPercent: from Setting.monthlyRevenueTarget
    const setting = await this.prisma.setting.findUnique({
      where: { id: 'singleton' },
      select: { monthlyRevenueTarget: true },
    });

    let targetProgressPercent = 0;
    if (
      setting?.monthlyRevenueTarget &&
      !new Prisma.Decimal(setting.monthlyRevenueTarget).isZero()
    ) {
      const target = new Prisma.Decimal(setting.monthlyRevenueTarget);
      targetProgressPercent = Math.min(
        100,
        Math.round(monthRevenue.div(target).mul(100).toNumber()),
      );
    }

    const expenseByGroupBar = Array.from(expenseGroupMap.values()).map((g) => ({
      code: g.code,
      name: g.name,
      amount: g.amount.toString(),
    }));

    // revenueBySourceBar: revenue from bookings grouped by Booking.sourceId
    // We sum booking.totalAmount (or BookingItem ROOM amounts) for bookings overlapping range,
    // grouped by source
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        checkIn: { lt: toDate },
        checkOut: { gt: fromDate },
      },
      select: {
        sourceId: true,
        source: { select: { id: true, code: true, name: true } },
        items: {
          where: { kind: BookingItemKind.ROOM },
          select: { amount: true },
        },
      },
    });

    const sourceRevMap = new Map<string, { code: string; name: string; amount: Prisma.Decimal }>();

    for (const b of bookings) {
      const sourceKey = b.sourceId ?? '__unknown__';
      const sourceCode = b.source?.code ?? 'unknown';
      const sourceName = b.source?.name ?? 'Không rõ';

      const roomRevenue = b.items.reduce((acc, i) => acc.add(i.amount), new Prisma.Decimal(0));

      const existing = sourceRevMap.get(sourceKey);
      if (existing) {
        existing.amount = existing.amount.add(roomRevenue);
      } else {
        sourceRevMap.set(sourceKey, { code: sourceCode, name: sourceName, amount: roomRevenue });
      }
    }

    const revenueBySourceBar = Array.from(sourceRevMap.values()).map((s) => ({
      code: s.code,
      name: s.name,
      amount: s.amount.toString(),
    }));

    return {
      revenueExpenseTimeline,
      targetProgressPercent,
      expenseByGroupBar,
      revenueBySourceBar,
    };
  }

  // ── Housekeeping tab ────────────────────────────────────────────────────────

  private async getHousekeepingTab(
    from: string,
    to: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<HousekeepingTabData> {
    const dateRange = getDateRange(from, to);

    // Today's progress
    const today = toIsoDate(new Date());
    const todayStart = new Date(today + 'T00:00:00Z');
    const todayEnd = new Date(todayStart.getTime() + MS_PER_DAY);

    const [todayTotal, todayDone] = await Promise.all([
      this.prisma.housekeepingTask.count({
        where: {
          deletedAt: null,
          scheduledAt: { gte: todayStart, lt: todayEnd },
        },
      }),
      this.prisma.housekeepingTask.count({
        where: {
          deletedAt: null,
          scheduledAt: { gte: todayStart, lt: todayEnd },
          status: { code: 'done' },
        },
      }),
    ]);

    const todayProgressPercent = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

    // All tasks in range
    const tasks = await this.prisma.housekeepingTask.findMany({
      where: {
        deletedAt: null,
        scheduledAt: { gte: fromDate, lt: toDate },
      },
      include: {
        status: { select: { id: true, code: true, name: true } },
        assignee: { select: { id: true, fullName: true } },
      },
    });

    // workloadHeatmap: group by scheduledAt date + priority
    const heatmapMap = new Map<string, { high: number; normal: number; low: number }>();

    for (const t of tasks) {
      const day = toIsoDate(toMidnightUtc(t.scheduledAt));
      const counts = heatmapMap.get(day) ?? { high: 0, normal: 0, low: 0 };
      if (t.priority === 'high') counts.high += 1;
      else if (t.priority === 'low') counts.low += 1;
      else counts.normal += 1;
      heatmapMap.set(day, counts);
    }

    const workloadHeatmap = dateRange.map((date) => ({
      date,
      counts: heatmapMap.get(date) ?? { high: 0, normal: 0, low: 0 },
    }));

    // staffEfficiencyBar: done tasks grouped by assigneeId
    const doneTasks = tasks.filter((t) => t.status.code === 'done' && t.assigneeId !== null);

    const assigneeMap = new Map<
      string,
      {
        staffId: string;
        fullName: string;
        doneCount: number;
        totalMinutes: number;
        countWithTime: number;
      }
    >();

    for (const t of doneTasks) {
      if (!t.assigneeId || !t.assignee) continue;

      let minutesDelta = 0;
      let hasTime = false;

      if (t.startTime && t.endTime) {
        // Parse "HH:mm" strings
        const [startH, startM] = t.startTime.split(':').map(Number);
        const [endH, endM] = t.endTime.split(':').map(Number);
        if (
          startH !== undefined &&
          startM !== undefined &&
          endH !== undefined &&
          endM !== undefined
        ) {
          minutesDelta = endH * 60 + endM - (startH * 60 + startM);
          if (minutesDelta > 0) hasTime = true;
        }
      }

      const existing = assigneeMap.get(t.assigneeId);
      if (existing) {
        existing.doneCount += 1;
        if (hasTime) {
          existing.totalMinutes += minutesDelta;
          existing.countWithTime += 1;
        }
      } else {
        assigneeMap.set(t.assigneeId, {
          staffId: t.assigneeId,
          fullName: t.assignee.fullName,
          doneCount: 1,
          totalMinutes: hasTime ? minutesDelta : 0,
          countWithTime: hasTime ? 1 : 0,
        });
      }
    }

    const staffEfficiencyBar = Array.from(assigneeMap.values())
      .sort((a, b) => b.doneCount - a.doneCount)
      .map((s) => ({
        staffId: s.staffId,
        fullName: s.fullName,
        doneCount: s.doneCount,
        avgMinutes: s.countWithTime > 0 ? Math.round(s.totalMinutes / s.countWithTime) : 0,
      }));

    // cleaningStatusDonut: rooms grouped by cleaningStatusId
    const allRooms = await this.prisma.room.findMany({
      where: { deletedAt: null },
      select: { cleaningStatusId: true },
    });

    const cleaningCountMap = new Map<string, number>();
    for (const r of allRooms) {
      cleaningCountMap.set(r.cleaningStatusId, (cleaningCountMap.get(r.cleaningStatusId) ?? 0) + 1);
    }

    const cleaningIds = Array.from(cleaningCountMap.keys());
    const cleaningCats =
      cleaningIds.length > 0
        ? await this.prisma.category.findMany({
            where: {
              id: { in: cleaningIds },
              group: CategoryGroup.CLEANING_STATUS,
              deletedAt: null,
            },
            select: { id: true, code: true, name: true },
          })
        : [];

    const cleaningLookup = new Map(cleaningCats.map((c) => [c.id, c]));
    const cleaningStatusDonut = cleaningIds.map((id) => {
      const cat = cleaningLookup.get(id);
      return {
        code: cat?.code ?? id,
        name: cat?.name ?? id,
        count: cleaningCountMap.get(id) ?? 0,
      };
    });

    return {
      todayProgressPercent,
      workloadHeatmap,
      staffEfficiencyBar,
      cleaningStatusDonut,
    };
  }
}
