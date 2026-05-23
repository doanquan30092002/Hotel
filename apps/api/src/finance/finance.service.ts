import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { CategoryGroup, FinanceTxType, Prisma } from '@prisma/client';

import { paginate } from '../common/dto/paginated.dto';
import { PrismaService } from '../prisma/prisma.service';
import { BookingPaymentsQueryDto } from './dto/booking-payments-query.dto';
import { CreateFinanceTxDto } from './dto/create-finance-tx.dto';
import { FinanceSummaryQueryDto } from './dto/finance-summary-query.dto';
import { QueryFinanceTxDto } from './dto/query-finance-tx.dto';
import { UpdateFinanceTxDto } from './dto/update-finance-tx.dto';
import { FinanceTxEntity } from './entities/finance-tx.entity';

// ── include constant ───────────────────────────────────────────────────────────

const TX_INCLUDE = {
  group: { select: { id: true, code: true, name: true } },
  booking: { select: { id: true, code: true } },
  method: { select: { id: true, code: true, name: true } },
  createdBy: { select: { id: true, fullName: true, role: true } },
} as const;

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ── helpers ─────────────────────────────────────────────────────────────────

  private async assertCategoryGroup(
    id: string,
    expectedGroup: CategoryGroup,
    fieldLabel: string,
  ): Promise<void> {
    const cat = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: { group: true },
    });
    if (!cat) {
      throw new BadRequestException(`${fieldLabel} không tìm thấy danh mục tương ứng`);
    }
    if (cat.group !== expectedGroup) {
      throw new BadRequestException(`${fieldLabel} phải thuộc nhóm danh mục ${expectedGroup}`);
    }
  }

  private async assertBookingExists(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      select: { id: true },
    });
    if (!booking) {
      throw new BadRequestException('bookingId không tìm thấy booking tương ứng');
    }
  }

  /**
   * Generate next transaction code: TC001, TC002, ...
   */
  private async nextCode(): Promise<string> {
    const count = await this.prisma.financeTx.count({ where: { deletedAt: null } });
    const candidate = `TC${String(count + 1).padStart(3, '0')}`;

    const exists = await this.prisma.financeTx.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;

    // Fallback: find max numeric code and increment
    const last = await this.prisma.financeTx.findFirst({
      where: { code: { startsWith: 'TC' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    if (!last) return candidate;
    const num = parseInt(last.code.replace('TC', ''), 10);
    return `TC${String(num + 1).padStart(3, '0')}`;
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async list(query: QueryFinanceTxDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.FinanceTxWhereInput = {
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.groupId ? { groupId: query.groupId } : {}),
      ...(query.bookingId ? { bookingId: query.bookingId } : {}),
      ...(query.methodId ? { methodId: query.methodId } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword, mode: 'insensitive' } },
              { description: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.financeTx.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        include: TX_INCLUDE,
      }),
      this.prisma.financeTx.count({ where }),
    ]);

    return paginate(rows.map(FinanceTxEntity.from), total, page, pageSize);
  }

  async findOne(id: string): Promise<FinanceTxEntity> {
    const tx = await this.prisma.financeTx.findFirst({
      where: { id, deletedAt: null },
      include: TX_INCLUDE,
    });

    if (!tx) {
      throw new NotFoundException('Giao dịch tài chính không tồn tại');
    }

    return FinanceTxEntity.from(tx);
  }

  async create(dto: CreateFinanceTxDto, createdById: string): Promise<FinanceTxEntity> {
    // Validate FK
    await this.assertCategoryGroup(dto.groupId, CategoryGroup.FINANCE_GROUP, 'groupId');

    if (dto.methodId) {
      await this.assertCategoryGroup(dto.methodId, CategoryGroup.PAYMENT_METHOD, 'methodId');
    }

    if (dto.bookingId) {
      await this.assertBookingExists(dto.bookingId);
    }

    const code = await this.nextCode();

    const tx = await this.prisma.financeTx.create({
      data: {
        code,
        type: dto.type,
        groupId: dto.groupId,
        bookingId: dto.bookingId ?? null,
        methodId: dto.methodId ?? null,
        description: dto.description,
        amount: new Prisma.Decimal(dto.amount),
        occurredAt: new Date(dto.occurredAt),
        createdById,
        note: dto.note ?? null,
      },
      include: TX_INCLUDE,
    });

    return FinanceTxEntity.from(tx);
  }

  async update(id: string, dto: UpdateFinanceTxDto): Promise<FinanceTxEntity> {
    const existing = await this.prisma.financeTx.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Giao dịch tài chính không tồn tại');
    }

    if (dto.groupId !== undefined) {
      await this.assertCategoryGroup(dto.groupId, CategoryGroup.FINANCE_GROUP, 'groupId');
    }

    if (dto.methodId !== undefined && dto.methodId !== null) {
      await this.assertCategoryGroup(dto.methodId, CategoryGroup.PAYMENT_METHOD, 'methodId');
    }

    if (dto.bookingId !== undefined && dto.bookingId !== null) {
      await this.assertBookingExists(dto.bookingId);
    }

    await this.prisma.financeTx.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.groupId !== undefined ? { groupId: dto.groupId } : {}),
        ...('bookingId' in dto ? { bookingId: dto.bookingId ?? null } : {}),
        ...('methodId' in dto ? { methodId: dto.methodId ?? null } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.amount !== undefined ? { amount: new Prisma.Decimal(dto.amount) } : {}),
        ...(dto.occurredAt !== undefined ? { occurredAt: new Date(dto.occurredAt) } : {}),
        ...('note' in dto ? { note: dto.note ?? null } : {}),
      },
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.financeTx.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Giao dịch tài chính không tồn tại');
    }

    await this.prisma.financeTx.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  async getSummary(query: FinanceSummaryQueryDto) {
    if (query.from >= query.to) {
      throw new UnprocessableEntityException('from phải nhỏ hơn to');
    }

    const fromDate = new Date(query.from);
    const toDate = new Date(query.to);

    const txs = await this.prisma.financeTx.findMany({
      where: {
        deletedAt: null,
        occurredAt: {
          gte: fromDate,
          lt: toDate,
        },
      },
      include: {
        group: { select: { id: true, code: true, name: true } },
      },
    });

    let totalIncome = new Prisma.Decimal(0);
    let totalExpense = new Prisma.Decimal(0);
    let payrollExpense = new Prisma.Decimal(0);

    type ByGroupKey = string; // `${type}::${groupId}`
    const byGroupMap = new Map<
      ByGroupKey,
      {
        groupId: string;
        groupCode: string;
        groupName: string;
        type: FinanceTxType;
        amount: Prisma.Decimal;
        count: number;
      }
    >();

    for (const tx of txs) {
      const amt = new Prisma.Decimal(tx.amount);

      if (tx.type === FinanceTxType.INCOME) {
        totalIncome = totalIncome.add(amt);
      } else {
        totalExpense = totalExpense.add(amt);
        if (tx.group.code === 'payroll_expense') {
          payrollExpense = payrollExpense.add(amt);
        }
      }

      const key: ByGroupKey = `${tx.type}::${tx.groupId}`;
      const existing = byGroupMap.get(key);
      if (existing) {
        existing.amount = existing.amount.add(amt);
        existing.count += 1;
      } else {
        byGroupMap.set(key, {
          groupId: tx.groupId,
          groupCode: tx.group.code,
          groupName: tx.group.name,
          type: tx.type,
          amount: amt,
          count: 1,
        });
      }
    }

    const netProfit = totalIncome.sub(totalExpense);

    const byGroup = Array.from(byGroupMap.values()).map((g) => ({
      groupId: g.groupId,
      groupCode: g.groupCode,
      groupName: g.groupName,
      type: g.type,
      amount: g.amount.toString(),
      count: g.count,
    }));

    return {
      data: {
        from: query.from,
        to: query.to,
        totalIncome: totalIncome.toString(),
        totalExpense: totalExpense.toString(),
        payrollExpense: payrollExpense.toString(),
        netProfit: netProfit.toString(),
        countTransactions: txs.length,
        byGroup,
      },
    };
  }

  // ── Booking Payments ────────────────────────────────────────────────────────

  async getBookingPayments(query: BookingPaymentsQueryDto) {
    const limit = query.limit ?? 20;

    const whereClause: Prisma.PaymentWhereInput = {
      deletedAt: null,
      ...(query.from || query.to
        ? {
            paidAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const payments = await this.prisma.payment.findMany({
      where: whereClause,
      include: {
        method: { select: { id: true, code: true, name: true } },
        booking: {
          select: {
            id: true,
            code: true,
            customer: { select: { fullName: true } },
            items: {
              where: { kind: 'ROOM' },
              take: 1,
              include: { room: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: limit,
    });

    const data = payments.map((p) => {
      const firstRoomItem = p.booking.items[0];
      const roomLabel = firstRoomItem?.room?.name ?? '—';

      return {
        paymentId: p.id,
        bookingId: p.booking.id,
        bookingCode: p.booking.code,
        customerName: p.booking.customer?.fullName ?? null,
        amount: p.amount.toString(),
        paidAt: p.paidAt.toISOString(),
        method: p.method,
        roomLabel,
      };
    });

    return { data };
  }
}
