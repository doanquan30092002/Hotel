import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { BookingItemKind, Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';

import { PrismaService } from '../prisma/prisma.service';
import { QueryReportDto } from './dto/query-report.dto';
import {
  ByStatusBooking,
  ReportRow,
  ReportSummaryData,
  ReportTotals,
  TopRoom,
  TopSource,
} from './entities/report.entity';

const MS_PER_DAY = 86_400_000;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Date helpers ─────────────────────────────────────────────────────────────

  private parseDate(iso: string): Date {
    return new Date(`${iso}T00:00:00.000Z`);
  }

  private daysBetween(a: Date, b: Date): number {
    return Math.ceil((b.getTime() - a.getTime()) / MS_PER_DAY);
  }

  // ── Main summary ─────────────────────────────────────────────────────────────

  async getSummary(query: QueryReportDto): Promise<{ data: ReportSummaryData }> {
    if (query.from >= query.to) {
      throw new UnprocessableEntityException('to phải sau from');
    }

    const from = this.parseDate(query.from);
    const to = this.parseDate(query.to);
    const totalDays = Math.max(1, this.daysBetween(from, to));

    // ── 1. Rooms list ──────────────────────────────────────────────────────────
    const rooms = await this.prisma.room.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true },
    });
    const totalRoomSlots = rooms.length * totalDays;

    // ── 2. Bookings with items ─────────────────────────────────────────────────
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        checkIn: { lt: to },
        checkOut: { gt: from },
      },
      select: {
        id: true,
        statusId: true,
        status: { select: { code: true, name: true } },
        sourceId: true,
        source: { select: { code: true, name: true } },
        checkIn: true,
        checkOut: true,
        totalAmount: true,
        items: {
          select: {
            kind: true,
            amount: true,
            roomId: true,
            room: { select: { code: true, name: true } },
          },
        },
      },
    });

    // ── 3. All bookings count in range (not just overlap) ─────────────────────
    const totalBookings = await this.prisma.booking.count({
      where: {
        deletedAt: null,
        checkIn: { gte: from, lt: to },
      },
    });

    // ── 4. Aggregate booking items ─────────────────────────────────────────────
    let totalRoomRevenue = new Prisma.Decimal(0);
    let totalServiceRevenue = new Prisma.Decimal(0);
    let totalSurcharge = new Prisma.Decimal(0);
    let totalDiscount = new Prisma.Decimal(0);
    let bookedNights = 0;

    // Top rooms aggregation: roomId → { code, name, revenue, nights }
    const roomRevenueMap = new Map<
      string,
      { code: string; name: string; revenue: Prisma.Decimal; nights: number }
    >();

    // Top sources aggregation: sourceId|'unknown' → { code, name, count, revenue }
    const sourceMap = new Map<
      string,
      { code: string; name: string; bookings: number; revenue: Prisma.Decimal }
    >();

    // byStatus: statusId → { code, name, count }
    const statusMap = new Map<string, { code: string; name: string; count: number }>();

    for (const booking of bookings) {
      // Overlap nights calculation
      const start = new Date(Math.max(from.getTime(), booking.checkIn.getTime()));
      const end = new Date(Math.min(to.getTime(), booking.checkOut.getTime()));
      const nights = Math.max(0, this.daysBetween(start, end));

      // Count ROOM items in this booking
      const roomItems = booking.items.filter(
        (i) => i.kind === BookingItemKind.ROOM && i.roomId !== null,
      );
      const roomItemsCount = roomItems.length;
      bookedNights += nights * roomItemsCount;

      // Aggregate item amounts
      for (const item of booking.items) {
        const amt = new Prisma.Decimal(item.amount);
        if (item.kind === BookingItemKind.ROOM) {
          totalRoomRevenue = totalRoomRevenue.add(amt);
          // Per room revenue/nights
          if (item.roomId && item.room) {
            const existing = roomRevenueMap.get(item.roomId);
            if (existing) {
              existing.revenue = existing.revenue.add(amt);
              existing.nights += nights;
            } else {
              roomRevenueMap.set(item.roomId, {
                code: item.room.code,
                name: item.room.name,
                revenue: new Prisma.Decimal(amt),
                nights,
              });
            }
          }
        } else if (item.kind === BookingItemKind.SERVICE) {
          totalServiceRevenue = totalServiceRevenue.add(amt);
        } else if (item.kind === BookingItemKind.SURCHARGE) {
          totalSurcharge = totalSurcharge.add(amt);
        } else if (item.kind === BookingItemKind.DISCOUNT) {
          totalDiscount = totalDiscount.add(amt);
        }
      }

      // Source aggregation
      const sourceKey = booking.sourceId ?? 'unknown';
      const sourceName = booking.source?.name ?? 'Không rõ';
      const sourceCode = booking.source?.code ?? 'unknown';
      const existingSource = sourceMap.get(sourceKey);
      if (existingSource) {
        existingSource.bookings += 1;
        existingSource.revenue = existingSource.revenue.add(
          new Prisma.Decimal(booking.totalAmount),
        );
      } else {
        sourceMap.set(sourceKey, {
          code: sourceCode,
          name: sourceName,
          bookings: 1,
          revenue: new Prisma.Decimal(booking.totalAmount),
        });
      }

      // Status aggregation
      const statusKey = booking.statusId;
      const existingStatus = statusMap.get(statusKey);
      if (existingStatus) {
        existingStatus.count += 1;
      } else {
        statusMap.set(statusKey, {
          code: booking.status.code,
          name: booking.status.name,
          count: 1,
        });
      }
    }

    const grossRevenue = totalRoomRevenue
      .add(totalServiceRevenue)
      .add(totalSurcharge)
      .sub(totalDiscount);

    const occupancyPercent =
      totalRoomSlots > 0 ? Math.round((bookedNights / totalRoomSlots) * 100) : 0;

    const averageDailyRate = bookedNights > 0 ? totalRoomRevenue.div(bookedNights).toFixed(2) : '0';

    // ── 5. Finance transactions ────────────────────────────────────────────────
    const financeTxs = await this.prisma.financeTx.findMany({
      where: {
        deletedAt: null,
        occurredAt: { gte: from, lt: to },
      },
      select: {
        type: true,
        amount: true,
        group: { select: { code: true } },
      },
    });

    let totalIncomeFinance = new Prisma.Decimal(0);
    let totalExpenseFinance = new Prisma.Decimal(0);
    let payrollExpense = new Prisma.Decimal(0);

    for (const tx of financeTxs) {
      const amt = new Prisma.Decimal(tx.amount);
      if (tx.type === 'INCOME') {
        totalIncomeFinance = totalIncomeFinance.add(amt);
      } else {
        totalExpenseFinance = totalExpenseFinance.add(amt);
        if (tx.group.code === 'payroll_expense') {
          payrollExpense = payrollExpense.add(amt);
        }
      }
    }

    const operationalExpense = totalExpenseFinance.sub(payrollExpense);
    const netProfit = totalIncomeFinance.sub(totalExpenseFinance);

    // ── 6. Top rooms (top 10 by revenue) ──────────────────────────────────────
    const topRooms: TopRoom[] = Array.from(roomRevenueMap.values())
      .sort((a, b) => (b.revenue.greaterThan(a.revenue) ? 1 : -1))
      .slice(0, 10)
      .map((r) => ({
        code: r.code,
        name: r.name,
        revenue: r.revenue.toString(),
        nights: r.nights,
      }));

    // ── 7. Top sources (top 10 by booking count) ──────────────────────────────
    const topSources: TopSource[] = Array.from(sourceMap.values())
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10)
      .map((s) => ({
        code: s.code,
        name: s.name,
        bookings: s.bookings,
        revenue: s.revenue.toString(),
      }));

    // ── 8. By status ──────────────────────────────────────────────────────────
    const byStatusBookings: ByStatusBooking[] = Array.from(statusMap.values()).map((s) => ({
      code: s.code,
      name: s.name,
      count: s.count,
    }));

    // ── 9. Summary rows ───────────────────────────────────────────────────────
    const totals: ReportTotals = {
      totalBookings,
      totalRoomRevenue: totalRoomRevenue.toString(),
      totalServiceRevenue: totalServiceRevenue.toString(),
      totalSurcharge: totalSurcharge.toString(),
      totalDiscount: totalDiscount.toString(),
      grossRevenue: grossRevenue.toString(),
      totalIncomeFinance: totalIncomeFinance.toString(),
      totalExpenseFinance: totalExpenseFinance.toString(),
      payrollExpense: payrollExpense.toString(),
      operationalExpense: operationalExpense.toString(),
      netProfit: netProfit.toString(),
      occupancyPercent,
      averageDailyRate,
    };

    const rows: ReportRow[] = [
      { label: 'Số booking', value: String(totalBookings), note: 'Trong khoảng' },
      {
        label: 'Tiền thu mặt',
        value: grossRevenue.toString(),
        note: 'Phòng + dịch vụ + phụ thu - giảm giá',
      },
      { label: 'Chi vận hành', value: operationalExpense.toString(), note: 'Không gồm lương' },
      { label: 'Lương đã chi', value: payrollExpense.toString(), note: 'Chi phí nhân sự' },
      {
        label: 'Lợi nhuận cuối',
        value: netProfit.toString(),
        note: 'Thu tài chính - Chi tài chính',
      },
      { label: 'Công suất trung bình', value: `${occupancyPercent}%`, note: 'Tỉ lệ phòng đặt' },
    ];

    return {
      data: {
        from: query.from,
        to: query.to,
        totals,
        topRooms,
        topSources,
        byStatusBookings,
        rows,
      },
    };
  }

  // ── XLSX / CSV export ─────────────────────────────────────────────────────────

  async generateXlsx(query: QueryReportDto): Promise<Buffer> {
    const report = await this.getSummary(query);
    const { totals, topRooms, topSources } = report.data;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hotel Management';
    workbook.created = new Date();

    // ── Sheet 1: Tổng quan ────────────────────────────────────────────────────
    const overview = workbook.addWorksheet('Tổng quan');
    overview.columns = [
      { header: 'Chỉ tiêu', key: 'label', width: 30 },
      { header: 'Giá trị', key: 'value', width: 25 },
      { header: 'Ghi chú', key: 'note', width: 40 },
    ];

    const overviewRows: Array<{ label: string; value: string; note: string }> = [
      { label: 'Từ ngày', value: query.from, note: '' },
      { label: 'Đến ngày', value: query.to, note: '' },
      { label: 'Số booking', value: String(totals.totalBookings), note: 'Trong khoảng' },
      {
        label: 'Doanh thu phòng',
        value: totals.totalRoomRevenue,
        note: 'Tổng tiền phòng',
      },
      { label: 'Doanh thu dịch vụ', value: totals.totalServiceRevenue, note: '' },
      { label: 'Phụ thu', value: totals.totalSurcharge, note: '' },
      { label: 'Giảm giá', value: totals.totalDiscount, note: '' },
      { label: 'Tổng thu gộp', value: totals.grossRevenue, note: 'Phòng + DV + PhuThu - GiamGia' },
      { label: 'Thu tài chính', value: totals.totalIncomeFinance, note: '' },
      { label: 'Chi tài chính', value: totals.totalExpenseFinance, note: '' },
      { label: 'Chi lương', value: totals.payrollExpense, note: '' },
      { label: 'Chi vận hành', value: totals.operationalExpense, note: 'Không gồm lương' },
      {
        label: 'Lợi nhuận',
        value: totals.netProfit,
        note: 'Thu tài chính - Chi tài chính',
      },
      {
        label: 'Công suất phòng',
        value: `${totals.occupancyPercent}%`,
        note: 'Tỉ lệ phòng đặt',
      },
      { label: 'ADR (Giá phòng TB/đêm)', value: totals.averageDailyRate, note: '' },
    ];

    for (const row of overviewRows) {
      overview.addRow(row);
    }

    // Style header row
    const headerRow = overview.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    // ── Sheet 2: Top phòng ────────────────────────────────────────────────────
    const roomSheet = workbook.addWorksheet('Top phòng');
    roomSheet.columns = [
      { header: 'Mã', key: 'code', width: 12 },
      { header: 'Tên phòng', key: 'name', width: 25 },
      { header: 'Doanh thu', key: 'revenue', width: 18 },
      { header: 'Số đêm', key: 'nights', width: 12 },
    ];
    for (const room of topRooms) {
      roomSheet.addRow(room);
    }
    const roomHeader = roomSheet.getRow(1);
    roomHeader.font = { bold: true };
    roomHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    // ── Sheet 3: Theo nguồn ───────────────────────────────────────────────────
    const sourceSheet = workbook.addWorksheet('Theo nguồn');
    sourceSheet.columns = [
      { header: 'Mã', key: 'code', width: 15 },
      { header: 'Tên nguồn', key: 'name', width: 25 },
      { header: 'Số booking', key: 'bookings', width: 14 },
      { header: 'Doanh thu', key: 'revenue', width: 18 },
    ];
    for (const src of topSources) {
      sourceSheet.addRow(src);
    }
    const sourceHeader = sourceSheet.getRow(1);
    sourceHeader.font = { bold: true };
    sourceHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateCsv(query: QueryReportDto): Promise<Buffer> {
    const report = await this.getSummary(query);
    const { rows } = report.data;

    const BOM = '﻿';
    const header = 'label,value,note\n';
    const csvRows = rows
      .map((r) => {
        const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
        return `${escape(r.label)},${escape(r.value)},${escape(r.note)}`;
      })
      .join('\n');

    return Buffer.from(BOM + header + csvRows, 'utf-8');
  }
}
