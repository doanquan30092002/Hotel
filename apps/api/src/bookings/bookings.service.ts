import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { BookingItemKind, CategoryGroup, Prisma } from '@prisma/client';

import { paginate } from '../common/dto/paginated.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CheckInDto, CheckOutDto } from './dto/check-in-out.dto';
import { BookingItemDto } from './dto/booking-item.dto';
import { BookingPaymentDto } from './dto/booking-payment.dto';
import { CreateBookingDto, CreateBookingCustomerDto } from './dto/create-booking.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingEntity } from './entities/booking.entity';

// ── include constants ──────────────────────────────────────────────────────────

const BOOKING_INCLUDE_LIST = {
  customer: { select: { id: true, code: true, fullName: true, phone: true } },
  source: { select: { id: true, code: true, name: true } },
  status: { select: { id: true, code: true, name: true } },
  priceType: { select: { id: true, code: true, name: true } },
  package: { select: { id: true, code: true, name: true } },
  _count: { select: { items: true, payments: { where: { deletedAt: null } } } },
} as const;

const BOOKING_INCLUDE_DETAIL = {
  customer: { select: { id: true, code: true, fullName: true, phone: true } },
  source: { select: { id: true, code: true, name: true } },
  status: { select: { id: true, code: true, name: true } },
  priceType: { select: { id: true, code: true, name: true } },
  package: { select: { id: true, code: true, name: true } },
  _count: { select: { items: true, payments: { where: { deletedAt: null } } } },
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      room: { select: { id: true, code: true, name: true } },
      service: { select: { id: true, code: true, name: true } },
      surchargeType: { select: { id: true, code: true, name: true } },
    },
  },
  payments: {
    where: { deletedAt: null },
    orderBy: { paidAt: 'asc' as const },
    include: {
      method: { select: { id: true, code: true, name: true } },
    },
  },
} as const;

// Statuses that count as "blocking" for room overlap check
const NON_BLOCKING_STATUS_CODES = ['cancelled', 'checked_out'];

@Injectable()
export class BookingsService {
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

  /**
   * Generate next booking code: BK001, BK002, ...
   * Uses count + 1, retries on P2002 collision.
   */
  private async nextCode(): Promise<string> {
    const count = await this.prisma.booking.count({ where: { deletedAt: null } });
    const candidate = `BK${String(count + 1).padStart(3, '0')}`;

    // Check if candidate already exists (e.g. after soft-deletes shift the count)
    const exists = await this.prisma.booking.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;

    // Fallback: find max numeric code and increment
    const last = await this.prisma.booking.findFirst({
      where: { code: { startsWith: 'BK' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    if (!last) return candidate;
    const num = parseInt(last.code.replace('BK', ''), 10);
    return `BK${String(num + 1).padStart(3, '0')}`;
  }

  /**
   * Generate next customer code: KH001, KH002, ...
   */
  private async nextCustomerCode(): Promise<string> {
    const count = await this.prisma.customer.count({ where: { deletedAt: null } });
    const candidate = `KH${String(count + 1).padStart(3, '0')}`;
    const exists = await this.prisma.customer.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;

    const last = await this.prisma.customer.findFirst({
      where: { code: { startsWith: 'KH' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    if (!last) return candidate;
    const num = parseInt(last.code.replace('KH', ''), 10);
    return `KH${String(num + 1).padStart(3, '0')}`;
  }

  /**
   * Compute totals from booking items and payments.
   * Items: ROOM + SERVICE + SURCHARGE are additive; DISCOUNT subtracts.
   */
  private computeTotals(
    items: BookingItemDto[],
    payments: BookingPaymentDto[],
  ): { totalAmount: Prisma.Decimal; paidAmount: Prisma.Decimal; remainingAmount: Prisma.Decimal } {
    let total = new Prisma.Decimal(0);
    for (const item of items) {
      const amount = new Prisma.Decimal(item.quantity).mul(new Prisma.Decimal(item.unitPrice));
      if (item.kind === BookingItemKind.DISCOUNT) {
        total = total.sub(amount);
      } else {
        total = total.add(amount);
      }
    }
    if (total.lessThan(0)) total = new Prisma.Decimal(0);

    let paid = new Prisma.Decimal(0);
    for (const p of payments) {
      paid = paid.add(new Prisma.Decimal(p.amount));
    }

    const remaining = total.sub(paid).lessThan(0) ? new Prisma.Decimal(0) : total.sub(paid);

    return { totalAmount: total, paidAmount: paid, remainingAmount: remaining };
  }

  /**
   * Check for overlapping bookings on the same room.
   * Overlap condition: existing.checkIn < newCheckOut AND existing.checkOut > newCheckIn
   */
  private async assertNoRoomOverlap(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string,
  ): Promise<void> {
    // Get non-blocking status ids
    const nonBlockingStatuses = await this.prisma.category.findMany({
      where: {
        group: CategoryGroup.BOOKING_STATUS,
        code: { in: NON_BLOCKING_STATUS_CODES },
        deletedAt: null,
      },
      select: { id: true },
    });
    const nonBlockingIds = nonBlockingStatuses.map((s) => s.id);

    const overlap = await this.prisma.booking.findFirst({
      where: {
        deletedAt: null,
        statusId: { notIn: nonBlockingIds },
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        items: {
          some: {
            kind: BookingItemKind.ROOM,
            roomId,
          },
        },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { code: true },
    });

    if (overlap) {
      throw new ConflictException(
        `Phòng đã được đặt trong khoảng thời gian này (booking ${overlap.code})`,
      );
    }
  }

  /**
   * Resolve customer from the customer block in CreateBookingDto.
   * Priority: customerId > match by phone/idNumber > create new.
   */
  private async resolveCustomer(dto: CreateBookingCustomerDto): Promise<string | null> {
    if (dto.customerId) {
      const existing = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, deletedAt: null },
        select: { id: true },
      });
      if (!existing) {
        throw new BadRequestException('customerId không tìm thấy khách hàng');
      }
      return existing.id;
    }

    // Try match by phone
    if (dto.phone) {
      const byPhone = await this.prisma.customer.findFirst({
        where: { phone: dto.phone, deletedAt: null },
        select: { id: true },
      });
      if (byPhone) return byPhone.id;
    }

    // Try match by idNumber
    if (dto.idNumber) {
      const byId = await this.prisma.customer.findFirst({
        where: { idNumber: dto.idNumber, deletedAt: null },
        select: { id: true },
      });
      if (byId) return byId.id;
    }

    // Need to create new customer (only if we have at least a name)
    if (!dto.fullName && !dto.phone) {
      return null;
    }

    // Validate sourceId if provided
    if (dto.sourceId) {
      await this.assertCategoryGroup(dto.sourceId, CategoryGroup.GUEST_SOURCE, 'customer.sourceId');
    }

    const code = await this.nextCustomerCode();
    const customer = await this.prisma.customer.create({
      data: {
        code,
        fullName: dto.fullName ?? dto.phone ?? 'Khách vãng lai',
        phone: dto.phone ?? null,
        idNumber: dto.idNumber ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        sourceId: dto.sourceId ?? null,
      },
      select: { id: true },
    });
    return customer.id;
  }

  /**
   * Build items create data array for Prisma.
   */
  private buildItemsData(items: BookingItemDto[]): Prisma.BookingItemCreateManyBookingInput[] {
    return items.map((item) => ({
      kind: item.kind,
      roomId: item.roomId ?? null,
      serviceId: item.serviceId ?? null,
      surchargeTypeId: item.surchargeTypeId ?? null,
      refCode: item.refCode ?? null,
      refName: item.refName ?? null,
      quantity: new Prisma.Decimal(item.quantity),
      unitPrice: new Prisma.Decimal(item.unitPrice),
      amount: new Prisma.Decimal(item.quantity).mul(new Prisma.Decimal(item.unitPrice)),
      note: item.note ?? null,
    }));
  }

  /**
   * Build payments create data array for Prisma.
   */
  private buildPaymentsData(payments: BookingPaymentDto[]): Prisma.PaymentCreateManyBookingInput[] {
    return payments.map((p) => ({
      methodId: p.methodId,
      amount: new Prisma.Decimal(p.amount),
      paidAt: p.paidAt ? new Date(p.paidAt) : new Date(),
      note: p.note ?? null,
    }));
  }

  /**
   * Validate all FK groups for a booking creation/update.
   */
  private async validateBookingFks(dto: {
    statusId?: string;
    sourceId?: string;
    priceTypeId?: string;
    packageId?: string;
  }): Promise<void> {
    if (dto.statusId) {
      await this.assertCategoryGroup(dto.statusId, CategoryGroup.BOOKING_STATUS, 'statusId');
    }
    if (dto.sourceId) {
      await this.assertCategoryGroup(dto.sourceId, CategoryGroup.BOOKING_SOURCE, 'sourceId');
    }
    if (dto.priceTypeId) {
      await this.assertCategoryGroup(dto.priceTypeId, CategoryGroup.PRICE_TYPE, 'priceTypeId');
    }
    if (dto.packageId) {
      const pkg = await this.prisma.pricePackage.findFirst({
        where: { id: dto.packageId, deletedAt: null },
        select: { id: true },
      });
      if (!pkg) {
        throw new BadRequestException('packageId không tìm thấy gói mẫu');
      }
    }
  }

  /**
   * Validate items FK (roomId, serviceId, surchargeTypeId).
   */
  private async validateItemsFks(items: BookingItemDto[]): Promise<void> {
    for (const item of items) {
      if (item.kind === BookingItemKind.ROOM && item.roomId) {
        const room = await this.prisma.room.findFirst({
          where: { id: item.roomId, deletedAt: null },
          select: {
            id: true,
            code: true,
            status: { select: { code: true } },
          },
        });
        if (!room) {
          throw new BadRequestException(`roomId '${item.roomId}' không tồn tại`);
        }
        if (room.status.code === 'disabled') {
          throw new ConflictException(`Phòng ${room.code} đã ngưng kinh doanh, không thể đặt`);
        }
      }
      if (item.kind === BookingItemKind.SERVICE && item.serviceId) {
        const service = await this.prisma.service.findFirst({
          where: { id: item.serviceId, deletedAt: null },
          select: { id: true },
        });
        if (!service) {
          throw new BadRequestException(`serviceId '${item.serviceId}' không tồn tại`);
        }
      }
      if (item.kind === BookingItemKind.SURCHARGE && item.surchargeTypeId) {
        await this.assertCategoryGroup(
          item.surchargeTypeId,
          CategoryGroup.SURCHARGE_TYPE,
          'surchargeTypeId',
        );
      }
    }
  }

  /**
   * Validate payments FK (methodId).
   */
  private async validatePaymentsFks(payments: BookingPaymentDto[]): Promise<void> {
    for (const p of payments) {
      await this.assertCategoryGroup(p.methodId, CategoryGroup.PAYMENT_METHOD, 'methodId');
    }
  }

  /**
   * Re-compute totals from DB items + payments for a booking and persist.
   */
  private async recomputeAndSave(bookingId: string, tx: Prisma.TransactionClient): Promise<void> {
    const items = await tx.bookingItem.findMany({
      where: { bookingId },
      select: { kind: true, amount: true },
    });
    const payments = await tx.payment.findMany({
      where: { bookingId, deletedAt: null },
      select: { amount: true },
    });

    let total = new Prisma.Decimal(0);
    for (const item of items) {
      if (item.kind === BookingItemKind.DISCOUNT) {
        total = total.sub(item.amount);
      } else {
        total = total.add(item.amount);
      }
    }
    if (total.lessThan(0)) total = new Prisma.Decimal(0);

    let paid = new Prisma.Decimal(0);
    for (const p of payments) {
      paid = paid.add(p.amount);
    }
    const remaining = total.sub(paid).lessThan(0) ? new Prisma.Decimal(0) : total.sub(paid);

    await tx.booking.update({
      where: { id: bookingId },
      data: { totalAmount: total, paidAmount: paid, remainingAmount: remaining },
    });
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async list(query: QueryBookingDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BookingWhereInput = {
      deletedAt: null,
      ...(query.statusId ? { statusId: query.statusId } : {}),
      ...(query.sourceId ? { sourceId: query.sourceId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.roomId
        ? { items: { some: { kind: BookingItemKind.ROOM, roomId: query.roomId } } }
        : {}),
      ...(query.from || query.to
        ? {
            checkIn: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword, mode: 'insensitive' } },
              {
                customer: {
                  OR: [
                    { fullName: { contains: query.keyword, mode: 'insensitive' } },
                    { phone: { contains: query.keyword, mode: 'insensitive' } },
                    { idNumber: { contains: query.keyword, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: BOOKING_INCLUDE_LIST,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return paginate(rows.map(BookingEntity.fromList), total, page, pageSize);
  }

  async findOne(id: string): Promise<BookingEntity> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
      include: BOOKING_INCLUDE_DETAIL,
    });

    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    return BookingEntity.fromDetail(booking);
  }

  async create(dto: CreateBookingDto): Promise<BookingEntity> {
    // Validate dates
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);
    if (checkOut <= checkIn) {
      throw new UnprocessableEntityException('checkOut phải sau checkIn');
    }

    // Validate FK groups
    await this.validateBookingFks(dto);

    // Validate item FKs
    await this.validateItemsFks(dto.items);

    // Validate payment FKs
    if (dto.payments && dto.payments.length > 0) {
      await this.validatePaymentsFks(dto.payments);
    }

    // Anti-overlap check for ROOM items
    for (const item of dto.items) {
      if (item.kind === BookingItemKind.ROOM && item.roomId) {
        await this.assertNoRoomOverlap(item.roomId, checkIn, checkOut);
      }
    }

    // Resolve customer
    const customerId = await this.resolveCustomer(dto.customer);

    // Compute totals
    const { totalAmount, paidAmount, remainingAmount } = this.computeTotals(
      dto.items,
      dto.payments ?? [],
    );

    // Generate code
    const code = await this.nextCode();

    // Transactional create
    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          code,
          customerId,
          sourceId: dto.sourceId ?? null,
          statusId: dto.statusId,
          priceTypeId: dto.priceTypeId ?? null,
          packageId: dto.packageId ?? null,
          checkIn,
          checkOut,
          checkInTime: dto.checkInTime ?? null,
          checkOutTime: dto.checkOutTime ?? null,
          adults: dto.adults,
          children: dto.children,
          numRooms: dto.numRooms,
          totalAmount,
          paidAmount,
          remainingAmount,
          note: dto.note ?? null,
          items: {
            createMany: { data: this.buildItemsData(dto.items) },
          },
          ...(dto.payments && dto.payments.length > 0
            ? {
                payments: {
                  createMany: { data: this.buildPaymentsData(dto.payments) },
                },
              }
            : {}),
        },
        include: BOOKING_INCLUDE_DETAIL,
      });
      return created;
    });

    return BookingEntity.fromDetail(booking);
  }

  async update(id: string, dto: UpdateBookingDto): Promise<BookingEntity> {
    const existing = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Booking không tồn tại');
    }

    // Validate dates
    const checkIn = dto.checkIn ? new Date(dto.checkIn) : existing.checkIn;
    const checkOut = dto.checkOut ? new Date(dto.checkOut) : existing.checkOut;
    if (checkOut <= checkIn) {
      throw new UnprocessableEntityException('checkOut phải sau checkIn');
    }

    // Validate FK groups
    await this.validateBookingFks(dto);

    // Validate item FKs if provided
    if (dto.items !== undefined) {
      await this.validateItemsFks(dto.items);
    }

    // Validate payment FKs if provided
    if (dto.payments !== undefined && dto.payments.length > 0) {
      await this.validatePaymentsFks(dto.payments);
    }

    // Anti-overlap for ROOM items being updated
    const itemsForOverlap = dto.items ?? [];
    for (const item of itemsForOverlap) {
      if (item.kind === BookingItemKind.ROOM && item.roomId) {
        await this.assertNoRoomOverlap(item.roomId, checkIn, checkOut, id);
      }
    }

    // Resolve customer if customer block provided
    let customerId: string | null | undefined = undefined;
    if (dto.customer !== undefined) {
      customerId = await this.resolveCustomer(dto.customer);
    }

    await this.prisma.$transaction(async (tx) => {
      // If items provided — replace collection
      if (dto.items !== undefined) {
        await tx.bookingItem.deleteMany({ where: { bookingId: id } });
        if (dto.items.length > 0) {
          await tx.bookingItem.createMany({
            data: this.buildItemsData(dto.items).map((d) => ({ ...d, bookingId: id })),
          });
        }
      }

      // If payments provided — soft-delete old + create new
      if (dto.payments !== undefined) {
        await tx.payment.updateMany({
          where: { bookingId: id, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        if (dto.payments.length > 0) {
          await tx.payment.createMany({
            data: this.buildPaymentsData(dto.payments).map((d) => ({ ...d, bookingId: id })),
          });
        }
      }

      // Update top-level fields
      await tx.booking.update({
        where: { id },
        data: {
          ...(dto.sourceId !== undefined ? { sourceId: dto.sourceId } : {}),
          ...(dto.statusId !== undefined ? { statusId: dto.statusId } : {}),
          ...(dto.priceTypeId !== undefined ? { priceTypeId: dto.priceTypeId } : {}),
          ...('packageId' in dto ? { packageId: dto.packageId ?? null } : {}),
          ...(dto.checkIn !== undefined ? { checkIn } : {}),
          ...(dto.checkOut !== undefined ? { checkOut } : {}),
          ...(dto.checkInTime !== undefined ? { checkInTime: dto.checkInTime } : {}),
          ...(dto.checkOutTime !== undefined ? { checkOutTime: dto.checkOutTime } : {}),
          ...(dto.adults !== undefined ? { adults: dto.adults } : {}),
          ...(dto.children !== undefined ? { children: dto.children } : {}),
          ...(dto.numRooms !== undefined ? { numRooms: dto.numRooms } : {}),
          ...('note' in dto ? { note: dto.note ?? null } : {}),
          ...(customerId !== undefined ? { customerId } : {}),
        },
      });

      // Re-compute totals if items or payments changed
      if (dto.items !== undefined || dto.payments !== undefined) {
        await this.recomputeAndSave(id, tx);
      }
    });

    // Re-fetch to get updated totals and includes
    return this.findOne(id);
  }

  async changeStatus(id: string, dto: ChangeStatusDto): Promise<BookingEntity> {
    const existing = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Booking không tồn tại');
    }

    await this.assertCategoryGroup(dto.statusId, CategoryGroup.BOOKING_STATUS, 'statusId');

    await this.prisma.booking.update({
      where: { id },
      data: { statusId: dto.statusId },
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Booking không tồn tại');
    }

    await this.prisma.booking.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addPayment(bookingId: string, dto: CreatePaymentDto): Promise<BookingEntity> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
    });
    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    await this.assertCategoryGroup(dto.methodId, CategoryGroup.PAYMENT_METHOD, 'methodId');

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          bookingId,
          methodId: dto.methodId,
          amount: new Prisma.Decimal(dto.amount),
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          note: dto.note ?? null,
        },
      });
      await this.recomputeAndSave(bookingId, tx);
    });

    return this.findOne(bookingId);
  }

  async removePayment(bookingId: string, paymentId: string): Promise<BookingEntity> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
    });
    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, bookingId, deletedAt: null },
    });
    if (!payment) {
      throw new NotFoundException('Thanh toán không tồn tại');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: { deletedAt: new Date() },
      });
      await this.recomputeAndSave(bookingId, tx);
    });

    return this.findOne(bookingId);
  }

  async checkIn(id: string, dto: CheckInDto): Promise<BookingEntity> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
    });
    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    // Find the checked_in status
    const checkedInStatus = await this.prisma.category.findFirst({
      where: { group: CategoryGroup.BOOKING_STATUS, code: 'checked_in', deletedAt: null },
      select: { id: true },
    });
    if (!checkedInStatus) {
      throw new BadRequestException('Không tìm thấy trạng thái checked_in');
    }

    await this.prisma.booking.update({
      where: { id },
      data: {
        checkInTime: dto.checkInTime ?? null,
        statusId: checkedInStatus.id,
      },
    });

    return this.findOne(id);
  }

  async checkOut(id: string, dto: CheckOutDto): Promise<BookingEntity> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
    });
    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    // Find the checked_out status
    const checkedOutStatus = await this.prisma.category.findFirst({
      where: { group: CategoryGroup.BOOKING_STATUS, code: 'checked_out', deletedAt: null },
      select: { id: true },
    });
    if (!checkedOutStatus) {
      throw new BadRequestException('Không tìm thấy trạng thái checked_out');
    }

    await this.prisma.booking.update({
      where: { id },
      data: {
        checkOutTime: dto.checkOutTime ?? null,
        statusId: checkedOutStatus.id,
      },
    });

    return this.findOne(id);
  }
}
