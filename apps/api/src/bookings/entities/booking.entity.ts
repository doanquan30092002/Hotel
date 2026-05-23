import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { BookingItemKind } from '@prisma/client';

interface CategoryRef {
  id: string;
  code: string;
  name: string;
}

interface CustomerRef {
  id: string;
  code: string;
  fullName: string;
  phone: string | null;
}

interface RoomRef {
  id: string;
  code: string;
  name: string;
}

interface PrismaBookingItem {
  id: string;
  bookingId: string;
  kind: BookingItemKind;
  roomId: string | null;
  room: RoomRef | null;
  serviceId: string | null;
  service: { id: string; code: string; name: string } | null;
  surchargeTypeId: string | null;
  surchargeType: CategoryRef | null;
  refCode: string | null;
  refName: string | null;
  quantity: { toString(): string };
  unitPrice: { toString(): string };
  amount: { toString(): string };
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaPayment {
  id: string;
  bookingId: string;
  methodId: string;
  method: CategoryRef;
  amount: { toString(): string };
  paidAt: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaBooking {
  id: string;
  code: string;
  customerId: string | null;
  customer: CustomerRef | null;
  sourceId: string | null;
  source: CategoryRef | null;
  statusId: string;
  status: CategoryRef;
  priceTypeId: string | null;
  priceType: CategoryRef | null;
  packageId: string | null;
  package: { id: string; code: string; name: string } | null;
  checkIn: Date;
  checkOut: Date;
  checkInTime: string | null;
  checkOutTime: string | null;
  adults: number;
  children: number;
  numRooms: number;
  totalAmount: { toString(): string };
  paidAmount: { toString(): string };
  remainingAmount: { toString(): string };
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  // _count may be present on list queries
  _count?: { items: number; payments: number };
  // items and payments may be present on detail queries
  items?: PrismaBookingItem[];
  payments?: PrismaPayment[];
}

export class BookingItemEntity {
  @ApiProperty() id!: string;
  @ApiProperty() bookingId!: string;
  @ApiProperty({ enum: BookingItemKind }) kind!: BookingItemKind;
  @ApiPropertyOptional({ nullable: true }) roomId!: string | null;
  @ApiPropertyOptional({ nullable: true }) room!: RoomRef | null;
  @ApiPropertyOptional({ nullable: true }) serviceId!: string | null;
  @ApiPropertyOptional({ nullable: true }) service!: {
    id: string;
    code: string;
    name: string;
  } | null;
  @ApiPropertyOptional({ nullable: true }) surchargeTypeId!: string | null;
  @ApiPropertyOptional({ nullable: true }) surchargeType!: CategoryRef | null;
  @ApiPropertyOptional({ nullable: true }) refCode!: string | null;
  @ApiPropertyOptional({ nullable: true }) refName!: string | null;
  @ApiProperty() quantity!: string;
  @ApiProperty() unitPrice!: string;
  @ApiProperty() amount!: string;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static from(item: PrismaBookingItem): BookingItemEntity {
    const e = new BookingItemEntity();
    e.id = item.id;
    e.bookingId = item.bookingId;
    e.kind = item.kind;
    e.roomId = item.roomId;
    e.room = item.room;
    e.serviceId = item.serviceId;
    e.service = item.service;
    e.surchargeTypeId = item.surchargeTypeId;
    e.surchargeType = item.surchargeType;
    e.refCode = item.refCode;
    e.refName = item.refName;
    e.quantity = item.quantity.toString();
    e.unitPrice = item.unitPrice.toString();
    e.amount = item.amount.toString();
    e.note = item.note;
    e.createdAt = item.createdAt.toISOString();
    e.updatedAt = item.updatedAt.toISOString();
    return e;
  }
}

export class PaymentEntity {
  @ApiProperty() id!: string;
  @ApiProperty() bookingId!: string;
  @ApiProperty() methodId!: string;
  @ApiProperty({ type: Object }) method!: CategoryRef;
  @ApiProperty() amount!: string;
  @ApiProperty() paidAt!: string;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static from(p: PrismaPayment): PaymentEntity {
    const e = new PaymentEntity();
    e.id = p.id;
    e.bookingId = p.bookingId;
    e.methodId = p.methodId;
    e.method = p.method;
    e.amount = p.amount.toString();
    e.paidAt = p.paidAt.toISOString();
    e.note = p.note;
    e.createdAt = p.createdAt.toISOString();
    e.updatedAt = p.updatedAt.toISOString();
    return e;
  }
}

export class BookingEntity {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiPropertyOptional({ nullable: true }) customer!: CustomerRef | null;
  @ApiPropertyOptional({ nullable: true }) source!: CategoryRef | null;
  @ApiProperty({ type: Object }) status!: CategoryRef;
  @ApiPropertyOptional({ nullable: true }) priceType!: CategoryRef | null;
  @ApiPropertyOptional({ nullable: true }) package!: {
    id: string;
    code: string;
    name: string;
  } | null;
  @ApiProperty() checkIn!: string;
  @ApiProperty() checkOut!: string;
  @ApiPropertyOptional({ nullable: true }) checkInTime!: string | null;
  @ApiPropertyOptional({ nullable: true }) checkOutTime!: string | null;
  @ApiProperty() adults!: number;
  @ApiProperty() children!: number;
  @ApiProperty() numRooms!: number;
  @ApiProperty() totalAmount!: string;
  @ApiProperty() paidAmount!: string;
  @ApiProperty() remainingAmount!: string;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiPropertyOptional() itemCount?: number;
  @ApiPropertyOptional() paymentCount?: number;
  @ApiPropertyOptional({ type: [BookingItemEntity] }) items?: BookingItemEntity[];
  @ApiPropertyOptional({ type: [PaymentEntity] }) payments?: PaymentEntity[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static fromList(b: PrismaBooking): BookingEntity {
    const e = new BookingEntity();
    e.id = b.id;
    e.code = b.code;
    e.customer = b.customer;
    e.source = b.source;
    e.status = b.status;
    e.priceType = b.priceType;
    e.package = b.package;
    e.checkIn = b.checkIn.toISOString().slice(0, 10);
    e.checkOut = b.checkOut.toISOString().slice(0, 10);
    e.checkInTime = b.checkInTime;
    e.checkOutTime = b.checkOutTime;
    e.adults = b.adults;
    e.children = b.children;
    e.numRooms = b.numRooms;
    e.totalAmount = b.totalAmount.toString();
    e.paidAmount = b.paidAmount.toString();
    e.remainingAmount = b.remainingAmount.toString();
    e.note = b.note;
    e.itemCount = b._count?.items ?? 0;
    e.paymentCount = b._count?.payments ?? 0;
    e.createdAt = b.createdAt.toISOString();
    e.updatedAt = b.updatedAt.toISOString();
    return e;
  }

  static fromDetail(b: PrismaBooking): BookingEntity {
    const e = BookingEntity.fromList(b);
    e.items = (b.items ?? []).map(BookingItemEntity.from);
    e.payments = (b.payments ?? []).map(PaymentEntity.from);
    return e;
  }
}
