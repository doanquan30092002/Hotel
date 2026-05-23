// Booking domain types — mirror BE DTOs

export type BookingItemKind = 'ROOM' | 'SERVICE' | 'SURCHARGE' | 'DISCOUNT';

export interface CategoryRef {
  id: string;
  code: string;
  name: string;
}

export interface RoomRef {
  id: string;
  code: string;
  name: string;
}

export interface CustomerRef {
  id: string;
  code: string;
  fullName: string;
  phone: string | null;
}

export interface BookingItem {
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
  quantity: string;
  unitPrice: string;
  amount: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  methodId: string;
  method: CategoryRef;
  amount: string;
  paidAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  code: string;
  customer: CustomerRef | null;
  source: CategoryRef | null;
  status: CategoryRef;
  priceType: CategoryRef | null;
  package: { id: string; code: string; name: string } | null;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  adults: number;
  children: number;
  numRooms: number;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  note: string | null;
  itemCount?: number;
  paymentCount?: number;
  items?: BookingItem[];
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface BookingListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  statusId?: string;
  sourceId?: string;
  customerId?: string;
  roomId?: string;
  from?: string;
  to?: string;
}

// ─── Create/Update input shapes ───────────────────────────────────────────────

export interface BookingItemInput {
  kind: BookingItemKind;
  roomId?: string;
  serviceId?: string;
  surchargeTypeId?: string;
  refCode?: string;
  refName?: string;
  quantity: number;
  unitPrice: number;
  note?: string;
}

export interface BookingPaymentInput {
  methodId: string;
  amount: number;
  paidAt?: string;
  note?: string;
}

export interface BookingCustomerInput {
  customerId?: string;
  fullName?: string;
  phone?: string;
  idNumber?: string;
  email?: string;
  address?: string;
  sourceId?: string;
}

export interface CreateBookingInput {
  sourceId?: string;
  statusId: string;
  priceTypeId?: string;
  packageId?: string;
  checkIn: string;
  checkOut: string;
  checkInTime?: string;
  checkOutTime?: string;
  adults: number;
  children: number;
  numRooms: number;
  note?: string;
  customer: BookingCustomerInput;
  items: BookingItemInput[];
  payments?: BookingPaymentInput[];
}

export type UpdateBookingInput = Partial<Omit<CreateBookingInput, 'statusId'>> & {
  statusId?: string;
};
