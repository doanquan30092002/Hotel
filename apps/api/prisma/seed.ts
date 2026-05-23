import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

for (const candidate of [resolve(__dirname, '../../../.env'), resolve(__dirname, '../.env')]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
    break;
  }
}

import {
  BookingItemKind,
  CategoryGroup,
  FinanceTxType,
  Prisma,
  PrismaClient,
  UploadKind,
  UserRole,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

interface CategorySeed {
  group: CategoryGroup;
  code: string;
  name: string;
  sortOrder: number;
  meta?: Record<string, unknown>;
}

const CATEGORY_SEEDS: CategorySeed[] = [
  // ROOM_TYPE
  { group: CategoryGroup.ROOM_TYPE, code: 'single', name: 'Phòng đơn', sortOrder: 0 },
  { group: CategoryGroup.ROOM_TYPE, code: 'double', name: 'Phòng đôi', sortOrder: 1 },
  { group: CategoryGroup.ROOM_TYPE, code: 'vip', name: 'Phòng VIP', sortOrder: 2 },
  { group: CategoryGroup.ROOM_TYPE, code: 'family', name: 'Phòng gia đình', sortOrder: 3 },
  { group: CategoryGroup.ROOM_TYPE, code: 'dorm', name: 'Phòng tập thể', sortOrder: 4 },

  // ROOM_AREA
  { group: CategoryGroup.ROOM_AREA, code: 'f1', name: 'Tầng 1', sortOrder: 0 },
  { group: CategoryGroup.ROOM_AREA, code: 'f2', name: 'Tầng 2', sortOrder: 1 },
  { group: CategoryGroup.ROOM_AREA, code: 'f3', name: 'Tầng 3', sortOrder: 2 },
  { group: CategoryGroup.ROOM_AREA, code: 'bungalow', name: 'Bungalow', sortOrder: 3 },

  // ROOM_STATUS
  {
    group: CategoryGroup.ROOM_STATUS,
    code: 'ready',
    name: 'Sẵn sàng',
    sortOrder: 0,
    meta: { color: '#10b981' },
  },
  {
    group: CategoryGroup.ROOM_STATUS,
    code: 'occupied',
    name: 'Đang ở',
    sortOrder: 1,
    meta: { color: '#0ea5e9' },
  },
  {
    group: CategoryGroup.ROOM_STATUS,
    code: 'maintenance',
    name: 'Bảo trì',
    sortOrder: 2,
    meta: { color: '#f97316' },
  },
  {
    group: CategoryGroup.ROOM_STATUS,
    code: 'cleaning',
    name: 'Dọn dẹp',
    sortOrder: 3,
    meta: { color: '#f59e0b' },
  },
  {
    group: CategoryGroup.ROOM_STATUS,
    code: 'disabled',
    name: 'Ngưng',
    sortOrder: 4,
    meta: { color: '#f43f5e' },
  },

  // CLEANING_STATUS
  { group: CategoryGroup.CLEANING_STATUS, code: 'clean', name: 'Sạch', sortOrder: 0 },
  { group: CategoryGroup.CLEANING_STATUS, code: 'cleaning', name: 'Đang dọn', sortOrder: 1 },
  { group: CategoryGroup.CLEANING_STATUS, code: 'dirty', name: 'Cần dọn', sortOrder: 2 },

  // PRICE_TYPE
  { group: CategoryGroup.PRICE_TYPE, code: 'per_night', name: 'Giá theo đêm', sortOrder: 0 },
  { group: CategoryGroup.PRICE_TYPE, code: 'per_hour', name: 'Giá theo giờ', sortOrder: 1 },
  { group: CategoryGroup.PRICE_TYPE, code: 'per_week', name: 'Giá theo tuần', sortOrder: 2 },
  { group: CategoryGroup.PRICE_TYPE, code: 'per_month', name: 'Giá theo tháng', sortOrder: 3 },

  // PAYMENT_METHOD
  { group: CategoryGroup.PAYMENT_METHOD, code: 'cash', name: 'Tiền mặt', sortOrder: 0 },
  {
    group: CategoryGroup.PAYMENT_METHOD,
    code: 'bank_transfer',
    name: 'Chuyển khoản',
    sortOrder: 1,
  },
  { group: CategoryGroup.PAYMENT_METHOD, code: 'card', name: 'Thẻ', sortOrder: 2 },
  { group: CategoryGroup.PAYMENT_METHOD, code: 'e_wallet', name: 'Ví điện tử', sortOrder: 3 },

  // BOOKING_SOURCE
  { group: CategoryGroup.BOOKING_SOURCE, code: 'walkin', name: 'Trực tiếp', sortOrder: 0 },
  { group: CategoryGroup.BOOKING_SOURCE, code: 'hotline', name: 'Hotline', sortOrder: 1 },
  { group: CategoryGroup.BOOKING_SOURCE, code: 'website', name: 'Website', sortOrder: 2 },
  { group: CategoryGroup.BOOKING_SOURCE, code: 'bookingdotcom', name: 'Booking.com', sortOrder: 3 },
  { group: CategoryGroup.BOOKING_SOURCE, code: 'agoda', name: 'Agoda', sortOrder: 4 },
  { group: CategoryGroup.BOOKING_SOURCE, code: 'other', name: 'Khác', sortOrder: 5 },

  // BOOKING_STATUS
  {
    group: CategoryGroup.BOOKING_STATUS,
    code: 'pending',
    name: 'Chờ xác nhận',
    sortOrder: 0,
    meta: { color: '#f59e0b' },
  },
  {
    group: CategoryGroup.BOOKING_STATUS,
    code: 'confirmed',
    name: 'Đã xác nhận',
    sortOrder: 1,
    meta: { color: '#0ea5e9' },
  },
  {
    group: CategoryGroup.BOOKING_STATUS,
    code: 'checked_in',
    name: 'Đang ở',
    sortOrder: 2,
    meta: { color: '#10b981' },
  },
  {
    group: CategoryGroup.BOOKING_STATUS,
    code: 'checked_out',
    name: 'Đã trả phòng',
    sortOrder: 3,
    meta: { color: '#71717a' },
  },
  {
    group: CategoryGroup.BOOKING_STATUS,
    code: 'cancelled',
    name: 'Đã huỷ',
    sortOrder: 4,
    meta: { color: '#f43f5e' },
  },

  // HOUSEKEEPING_TASK_STATUS
  { group: CategoryGroup.HOUSEKEEPING_TASK_STATUS, code: 'waiting', name: 'Chờ', sortOrder: 0 },
  {
    group: CategoryGroup.HOUSEKEEPING_TASK_STATUS,
    code: 'in_progress',
    name: 'Đang làm',
    sortOrder: 1,
  },
  { group: CategoryGroup.HOUSEKEEPING_TASK_STATUS, code: 'done', name: 'Xong', sortOrder: 2 },
  { group: CategoryGroup.HOUSEKEEPING_TASK_STATUS, code: 'skipped', name: 'Bỏ qua', sortOrder: 3 },

  // FINANCE_GROUP
  {
    group: CategoryGroup.FINANCE_GROUP,
    code: 'room_revenue',
    name: 'Doanh thu phòng',
    sortOrder: 0,
  },
  {
    group: CategoryGroup.FINANCE_GROUP,
    code: 'service_revenue',
    name: 'Doanh thu dịch vụ',
    sortOrder: 1,
  },
  {
    group: CategoryGroup.FINANCE_GROUP,
    code: 'payroll_expense',
    name: 'Chi tiền lương',
    sortOrder: 2,
  },
  { group: CategoryGroup.FINANCE_GROUP, code: 'utilities', name: 'Chi điện nước', sortOrder: 3 },
  { group: CategoryGroup.FINANCE_GROUP, code: 'supplies', name: 'Chi mua sắm', sortOrder: 4 },
  { group: CategoryGroup.FINANCE_GROUP, code: 'other_expense', name: 'Chi khác', sortOrder: 5 },

  // GUEST_SOURCE
  { group: CategoryGroup.GUEST_SOURCE, code: 'individual', name: 'Khách lẻ', sortOrder: 0 },
  { group: CategoryGroup.GUEST_SOURCE, code: 'group', name: 'Khách đoàn', sortOrder: 1 },
  { group: CategoryGroup.GUEST_SOURCE, code: 'corporate', name: 'Khách công ty', sortOrder: 2 },

  // UNIT
  { group: CategoryGroup.UNIT, code: 'room', name: 'Phòng', sortOrder: 0 },
  { group: CategoryGroup.UNIT, code: 'night', name: 'Đêm', sortOrder: 1 },
  { group: CategoryGroup.UNIT, code: 'person', name: 'Người', sortOrder: 2 },
  { group: CategoryGroup.UNIT, code: 'session', name: 'Lượt', sortOrder: 3 },
  { group: CategoryGroup.UNIT, code: 'hour', name: 'Giờ', sortOrder: 4 },
  { group: CategoryGroup.UNIT, code: 'lan', name: 'Lần', sortOrder: 5 },
  { group: CategoryGroup.UNIT, code: 'suat', name: 'Suất', sortOrder: 6 },
  { group: CategoryGroup.UNIT, code: 'chai', name: 'Chai', sortOrder: 7 },
  { group: CategoryGroup.UNIT, code: 'kg', name: 'Kg', sortOrder: 8 },
  { group: CategoryGroup.UNIT, code: 'goi', name: 'Gói', sortOrder: 9 },

  // SERVICE_GROUP
  { group: CategoryGroup.SERVICE_GROUP, code: 'food', name: 'Ăn uống', sortOrder: 0 },
  { group: CategoryGroup.SERVICE_GROUP, code: 'laundry', name: 'Giặt là', sortOrder: 1 },
  { group: CategoryGroup.SERVICE_GROUP, code: 'transport', name: 'Đưa đón', sortOrder: 2 },
  { group: CategoryGroup.SERVICE_GROUP, code: 'spa', name: 'Spa', sortOrder: 3 },
  { group: CategoryGroup.SERVICE_GROUP, code: 'other', name: 'Khác', sortOrder: 4 },
  { group: CategoryGroup.SERVICE_GROUP, code: 'surcharge', name: 'Phụ thu', sortOrder: 5 },

  // SURCHARGE_TYPE
  { group: CategoryGroup.SURCHARGE_TYPE, code: 'extra_hour', name: 'Phụ thu giờ', sortOrder: 0 },
  {
    group: CategoryGroup.SURCHARGE_TYPE,
    code: 'extra_person',
    name: 'Phụ thu người',
    sortOrder: 1,
  },
  { group: CategoryGroup.SURCHARGE_TYPE, code: 'weekend', name: 'Phụ thu cuối tuần', sortOrder: 2 },
  { group: CategoryGroup.SURCHARGE_TYPE, code: 'holiday', name: 'Phụ thu lễ', sortOrder: 3 },

  // STAFF_POSITION
  { group: CategoryGroup.STAFF_POSITION, code: 'manager', name: 'Quản lý cơ sở', sortOrder: 0 },
  { group: CategoryGroup.STAFF_POSITION, code: 'receptionist', name: 'Lễ tân', sortOrder: 1 },
  { group: CategoryGroup.STAFF_POSITION, code: 'housekeeper', name: 'Buồng phòng', sortOrder: 2 },
  { group: CategoryGroup.STAFF_POSITION, code: 'cook', name: 'Đầu bếp', sortOrder: 3 },

  // PAYROLL_STATUS
  { group: CategoryGroup.PAYROLL_STATUS, code: 'draft', name: 'Bản nháp', sortOrder: 0 },
  { group: CategoryGroup.PAYROLL_STATUS, code: 'pending', name: 'Chờ chi', sortOrder: 1 },
  { group: CategoryGroup.PAYROLL_STATUS, code: 'paid', name: 'Đã chi', sortOrder: 2 },
];

async function seedCategories(): Promise<void> {
  for (const seed of CATEGORY_SEEDS) {
    await prisma.category.upsert({
      where: { group_code: { group: seed.group, code: seed.code } },
      update: { name: seed.name, sortOrder: seed.sortOrder, active: true },
      create: {
        group: seed.group,
        code: seed.code,
        name: seed.name,
        sortOrder: seed.sortOrder,
        active: true,
        meta: (seed.meta as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    });
  }

  console.log(`Seed categories: ${CATEGORY_SEEDS.length} rows upserted`);
}

async function getCategoryIdByGroupCode(group: CategoryGroup, code: string): Promise<string> {
  const cat = await prisma.category.findUnique({
    where: { group_code: { group, code } },
    select: { id: true },
  });
  if (!cat) {
    throw new Error(`Category not found: group=${group} code=${code}`);
  }
  return cat.id;
}

interface RoomSeed {
  code: string;
  name: string;
  typeCode: string;
  areaCode: string | null;
  capacity: number;
  basePrice: number;
  weekendPrice: number;
  holidayPrice: number;
  defaultCheckIn: string;
  defaultCheckOut: string;
}

const ROOM_SEEDS: RoomSeed[] = [
  // Standard rooms — Tầng 1
  {
    code: 'P101',
    name: 'Phòng 101 – Standard',
    typeCode: 'single',
    areaCode: 'f1',
    capacity: 2,
    basePrice: 850000,
    weekendPrice: 950000,
    holidayPrice: 1150000,
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
  },
  {
    code: 'P102',
    name: 'Phòng 102 – Standard',
    typeCode: 'single',
    areaCode: 'f1',
    capacity: 2,
    basePrice: 850000,
    weekendPrice: 950000,
    holidayPrice: 1150000,
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
  },
  // Deluxe rooms — Tầng 2
  {
    code: 'P201',
    name: 'Phòng 201 – Deluxe',
    typeCode: 'double',
    areaCode: 'f2',
    capacity: 2,
    basePrice: 1500000,
    weekendPrice: 1700000,
    holidayPrice: 1900000,
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
  },
  {
    code: 'P202',
    name: 'Phòng 202 – Deluxe',
    typeCode: 'double',
    areaCode: 'f2',
    capacity: 2,
    basePrice: 1500000,
    weekendPrice: 1700000,
    holidayPrice: 1900000,
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
  },
  // Family rooms — Tầng 3
  {
    code: 'P301',
    name: 'Phòng 301 – Family',
    typeCode: 'family',
    areaCode: 'f3',
    capacity: 4,
    basePrice: 1200000,
    weekendPrice: 1400000,
    holidayPrice: 1600000,
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
  },
  {
    code: 'P302',
    name: 'Phòng 302 – Family',
    typeCode: 'family',
    areaCode: 'f3',
    capacity: 4,
    basePrice: 1200000,
    weekendPrice: 1400000,
    holidayPrice: 1600000,
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
  },
  // Bungalow rooms
  {
    code: 'B101',
    name: 'Bungalow 101',
    typeCode: 'dorm',
    areaCode: 'bungalow',
    capacity: 4,
    basePrice: 1800000,
    weekendPrice: 2000000,
    holidayPrice: 2200000,
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
  },
  {
    code: 'B102',
    name: 'Bungalow 102',
    typeCode: 'dorm',
    areaCode: 'bungalow',
    capacity: 4,
    basePrice: 1800000,
    weekendPrice: 2000000,
    holidayPrice: 2200000,
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
  },
  // Villa VIP — Tầng 3
  {
    code: 'V101',
    name: 'Villa VIP 101',
    typeCode: 'vip',
    areaCode: 'f3',
    capacity: 4,
    basePrice: 2500000,
    weekendPrice: 2800000,
    holidayPrice: 3000000,
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
  },
  {
    code: 'V102',
    name: 'Villa VIP 102',
    typeCode: 'vip',
    areaCode: 'f3',
    capacity: 4,
    basePrice: 2500000,
    weekendPrice: 2800000,
    holidayPrice: 3000000,
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
  },
];

async function seedRooms(): Promise<void> {
  const statusId = await getCategoryIdByGroupCode(CategoryGroup.ROOM_STATUS, 'ready');
  const cleaningStatusId = await getCategoryIdByGroupCode(CategoryGroup.CLEANING_STATUS, 'clean');

  for (const seed of ROOM_SEEDS) {
    const typeId = await getCategoryIdByGroupCode(CategoryGroup.ROOM_TYPE, seed.typeCode);
    const areaId = seed.areaCode
      ? await getCategoryIdByGroupCode(CategoryGroup.ROOM_AREA, seed.areaCode)
      : null;

    await prisma.room.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        typeId,
        areaId,
        capacity: seed.capacity,
        basePrice: seed.basePrice,
        weekendPrice: seed.weekendPrice,
        holidayPrice: seed.holidayPrice,
        statusId,
        cleaningStatusId,
        defaultCheckIn: seed.defaultCheckIn,
        defaultCheckOut: seed.defaultCheckOut,
        images: [],
        deletedAt: null,
      },
      create: {
        code: seed.code,
        name: seed.name,
        typeId,
        areaId,
        capacity: seed.capacity,
        basePrice: seed.basePrice,
        weekendPrice: seed.weekendPrice,
        holidayPrice: seed.holidayPrice,
        statusId,
        cleaningStatusId,
        defaultCheckIn: seed.defaultCheckIn,
        defaultCheckOut: seed.defaultCheckOut,
        images: [],
      },
    });
  }

  console.log(`Seed rooms: ${ROOM_SEEDS.length} rows upserted`);
}

interface CustomerSeed {
  code: string;
  fullName: string;
  phone: string;
  idNumber: string;
  email: string;
  address: string;
  sourceCode: 'individual' | 'group' | 'corporate';
}

const CUSTOMER_SEEDS: CustomerSeed[] = [
  {
    code: 'KH001',
    fullName: 'Nguyễn Minh Anh',
    phone: '0901234001',
    idNumber: '001234567001',
    email: 'kh001@example.com',
    address: 'Hà Nội',
    sourceCode: 'individual',
  },
  {
    code: 'KH002',
    fullName: 'Trần Hải Yến',
    phone: '0901234002',
    idNumber: '001234567002',
    email: 'kh002@example.com',
    address: 'Đà Nẵng',
    sourceCode: 'individual',
  },
  {
    code: 'KH003',
    fullName: 'Lê Quốc Bảo',
    phone: '0901234003',
    idNumber: '001234567003',
    email: 'kh003@example.com',
    address: 'Đà Lạt',
    sourceCode: 'group',
  },
  {
    code: 'KH004',
    fullName: 'Phạm Thu Trang',
    phone: '0901234004',
    idNumber: '001234567004',
    email: 'kh004@example.com',
    address: 'Nha Trang',
    sourceCode: 'individual',
  },
  {
    code: 'KH005',
    fullName: 'Ngô Đức Long',
    phone: '0901234005',
    idNumber: '001234567005',
    email: 'kh005@example.com',
    address: 'Bình Dương',
    sourceCode: 'group',
  },
  {
    code: 'KH006',
    fullName: 'Hoàng Gia Linh',
    phone: '0901234006',
    idNumber: '001234567006',
    email: 'kh006@example.com',
    address: 'Cần Thơ',
    sourceCode: 'individual',
  },
  {
    code: 'KH007',
    fullName: 'Vũ Hoài Nam',
    phone: '0901234007',
    idNumber: '001234567007',
    email: 'kh007@example.com',
    address: 'Tây Ninh',
    sourceCode: 'group',
  },
  {
    code: 'KH008',
    fullName: 'Đỗ Khánh Ly',
    phone: '0901234008',
    idNumber: '001234567008',
    email: 'kh008@example.com',
    address: 'Huế',
    sourceCode: 'individual',
  },
  {
    code: 'KH009',
    fullName: 'Công ty Minh Phát',
    phone: '0901234009',
    idNumber: '001234567009',
    email: 'kh009@example.com',
    address: 'Hà Nội',
    sourceCode: 'corporate',
  },
  {
    code: 'KH010',
    fullName: 'Bùi Nhật Hạ',
    phone: '0901234010',
    idNumber: '001234567010',
    email: 'kh010@example.com',
    address: 'TP Thủ Đức',
    sourceCode: 'individual',
  },
];

async function seedCustomers(): Promise<void> {
  for (const seed of CUSTOMER_SEEDS) {
    const sourceId = await getCategoryIdByGroupCode(CategoryGroup.GUEST_SOURCE, seed.sourceCode);

    await prisma.customer.upsert({
      where: { code: seed.code },
      update: {
        fullName: seed.fullName,
        phone: seed.phone,
        idNumber: seed.idNumber,
        email: seed.email,
        address: seed.address,
        sourceId,
        deletedAt: null,
      },
      create: {
        code: seed.code,
        fullName: seed.fullName,
        phone: seed.phone,
        idNumber: seed.idNumber,
        email: seed.email,
        address: seed.address,
        sourceId,
        docs: [],
      },
    });
  }

  console.log(`Seed customers: ${CUSTOMER_SEEDS.length} rows upserted`);
}

interface ServiceSeed {
  code: string;
  name: string;
  groupCode: string;
  unitCode: string;
  price: number;
}

const SERVICE_SEEDS: ServiceSeed[] = [
  { code: 'DV001', name: 'Ăn sáng', groupCode: 'food', unitCode: 'suat', price: 80000 },
  {
    code: 'DV002',
    name: 'Hồ bơi & thư giãn',
    groupCode: 'other',
    unitCode: 'session',
    price: 350000,
  },
  {
    code: 'DV003',
    name: 'Đưa đón sân bay',
    groupCode: 'transport',
    unitCode: 'session',
    price: 200000,
  },
  { code: 'DV004', name: 'BBQ tối', groupCode: 'food', unitCode: 'suat', price: 450000 },
  { code: 'DV005', name: 'Giặt ủi', groupCode: 'laundry', unitCode: 'kg', price: 50000 },
  { code: 'DV006', name: 'Minibar', groupCode: 'other', unitCode: 'lan', price: 250000 },
  { code: 'DV007', name: 'Trang trí phòng', groupCode: 'other', unitCode: 'goi', price: 350000 },
];

async function seedServices(): Promise<void> {
  for (const seed of SERVICE_SEEDS) {
    const groupId = await getCategoryIdByGroupCode(CategoryGroup.SERVICE_GROUP, seed.groupCode);
    const unitId = await getCategoryIdByGroupCode(CategoryGroup.UNIT, seed.unitCode);

    await prisma.service.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        groupId,
        unitId,
        price: seed.price,
        active: true,
        deletedAt: null,
      },
      create: {
        code: seed.code,
        name: seed.name,
        groupId,
        unitId,
        price: seed.price,
        active: true,
      },
    });
  }

  console.log(`Seed services: ${SERVICE_SEEDS.length} rows upserted`);
}

interface PricePackageSeed {
  code: string;
  name: string;
  applyType: string;
  numNights: number;
  numGuests: number;
  totalPrice: number;
  validFrom: string;
  validTo: string;
}

const PRICE_PACKAGE_SEEDS: PricePackageSeed[] = [
  {
    code: 'GOI001',
    name: 'Combo đôi 24/06',
    applyType: 'Deluxe',
    numNights: 1,
    numGuests: 2,
    totalPrice: 1750000,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
  },
  {
    code: 'GOI002',
    name: 'Combo gia đình 3N2D',
    applyType: 'Family',
    numNights: 3,
    numGuests: 4,
    totalPrice: 4500000,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
  },
  {
    code: 'GOI003',
    name: 'Combo cuối tuần bungalow',
    applyType: 'Bungalow',
    numNights: 2,
    numGuests: 2,
    totalPrice: 2550000,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
  },
  {
    code: 'GOI004',
    name: 'Combo honeymoon',
    applyType: 'VillaVIP',
    numNights: 2,
    numGuests: 2,
    totalPrice: 3450000,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
  },
  {
    code: 'GOI005',
    name: 'Combo công tác 2 đêm',
    applyType: 'Standard',
    numNights: 2,
    numGuests: 1,
    totalPrice: 1650000,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
  },
];

async function seedPricePackages(): Promise<void> {
  for (const seed of PRICE_PACKAGE_SEEDS) {
    await prisma.pricePackage.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        applyType: seed.applyType,
        numNights: seed.numNights,
        numGuests: seed.numGuests,
        totalPrice: seed.totalPrice,
        validFrom: new Date(seed.validFrom),
        validTo: new Date(seed.validTo),
        active: true,
        deletedAt: null,
      },
      create: {
        code: seed.code,
        name: seed.name,
        applyType: seed.applyType,
        numNights: seed.numNights,
        numGuests: seed.numGuests,
        totalPrice: seed.totalPrice,
        validFrom: new Date(seed.validFrom),
        validTo: new Date(seed.validTo),
        active: true,
      },
    });
  }

  console.log(`Seed price packages: ${PRICE_PACKAGE_SEEDS.length} rows upserted`);
}

async function seedBookings(): Promise<void> {
  // Resolve category IDs
  const statusCheckedIn = await getCategoryIdByGroupCode(
    CategoryGroup.BOOKING_STATUS,
    'checked_in',
  );
  const statusConfirmed = await getCategoryIdByGroupCode(CategoryGroup.BOOKING_STATUS, 'confirmed');
  const statusPending = await getCategoryIdByGroupCode(CategoryGroup.BOOKING_STATUS, 'pending');
  const sourceWalkin = await getCategoryIdByGroupCode(CategoryGroup.BOOKING_SOURCE, 'walkin');
  const sourceBookingDotCom = await getCategoryIdByGroupCode(
    CategoryGroup.BOOKING_SOURCE,
    'bookingdotcom',
  );
  const sourceAgoda = await getCategoryIdByGroupCode(CategoryGroup.BOOKING_SOURCE, 'agoda');
  const pricePerNight = await getCategoryIdByGroupCode(CategoryGroup.PRICE_TYPE, 'per_night');
  const methodCash = await getCategoryIdByGroupCode(CategoryGroup.PAYMENT_METHOD, 'cash');
  const methodBankTransfer = await getCategoryIdByGroupCode(
    CategoryGroup.PAYMENT_METHOD,
    'bank_transfer',
  );

  // Resolve entity IDs
  const customerKH006 = await prisma.customer.findUniqueOrThrow({
    where: { code: 'KH006' },
    select: { id: true },
  });
  const customerKH001 = await prisma.customer.findUniqueOrThrow({
    where: { code: 'KH001' },
    select: { id: true },
  });
  const customerKH003 = await prisma.customer.findUniqueOrThrow({
    where: { code: 'KH003' },
    select: { id: true },
  });

  const roomP101 = await prisma.room.findUniqueOrThrow({
    where: { code: 'P101' },
    select: { id: true },
  });
  const roomV101 = await prisma.room.findUniqueOrThrow({
    where: { code: 'V101' },
    select: { id: true },
  });
  const roomP301 = await prisma.room.findUniqueOrThrow({
    where: { code: 'P301' },
    select: { id: true },
  });

  const serviceBreakfast = await prisma.service.findUniqueOrThrow({
    where: { code: 'DV001' },
    select: { id: true },
  });
  const serviceBBQ = await prisma.service.findUniqueOrThrow({
    where: { code: 'DV004' },
    select: { id: true },
  });

  // ── BK001 — Checked In ──────────────────────────────────────────────────────
  const bk001Total = new Prisma.Decimal(1700000).add(new Prisma.Decimal(160000)); // 1,860,000
  const bk001Paid = new Prisma.Decimal(1500000);
  const bk001Remaining = bk001Total.sub(bk001Paid); // 360,000

  const bk001 = await prisma.booking.upsert({
    where: { code: 'BK001' },
    update: {
      customerId: customerKH006.id,
      sourceId: sourceWalkin,
      statusId: statusCheckedIn,
      priceTypeId: pricePerNight,
      checkIn: new Date('2026-05-20'),
      checkOut: new Date('2026-05-22'),
      adults: 2,
      children: 0,
      numRooms: 1,
      totalAmount: bk001Total,
      paidAmount: bk001Paid,
      remainingAmount: bk001Remaining,
      deletedAt: null,
    },
    create: {
      code: 'BK001',
      customerId: customerKH006.id,
      sourceId: sourceWalkin,
      statusId: statusCheckedIn,
      priceTypeId: pricePerNight,
      checkIn: new Date('2026-05-20'),
      checkOut: new Date('2026-05-22'),
      adults: 2,
      children: 0,
      numRooms: 1,
      totalAmount: bk001Total,
      paidAmount: bk001Paid,
      remainingAmount: bk001Remaining,
    },
  });

  // Upsert items for BK001 — delete existing and recreate (idempotent pattern)
  await prisma.bookingItem.deleteMany({ where: { bookingId: bk001.id } });
  await prisma.bookingItem.createMany({
    data: [
      {
        bookingId: bk001.id,
        kind: BookingItemKind.ROOM,
        roomId: roomP101.id,
        refCode: 'P101',
        refName: 'Phòng 101 – Standard',
        quantity: new Prisma.Decimal(2),
        unitPrice: new Prisma.Decimal(850000),
        amount: new Prisma.Decimal(1700000),
      },
      {
        bookingId: bk001.id,
        kind: BookingItemKind.SERVICE,
        serviceId: serviceBreakfast.id,
        refCode: 'DV001',
        refName: 'Ăn sáng',
        quantity: new Prisma.Decimal(2),
        unitPrice: new Prisma.Decimal(80000),
        amount: new Prisma.Decimal(160000),
      },
    ],
  });

  // Upsert payments for BK001
  await prisma.payment.deleteMany({ where: { bookingId: bk001.id } });
  await prisma.payment.create({
    data: {
      bookingId: bk001.id,
      methodId: methodCash,
      amount: new Prisma.Decimal(1500000),
      paidAt: new Date('2026-05-20T14:30:00Z'),
    },
  });

  // ── BK002 — Confirmed ───────────────────────────────────────────────────────
  // Room 3 nights + BBQ 3 + discount 500,000
  const bk002RoomAmt = new Prisma.Decimal(2500000).mul(3); // 7,500,000
  const bk002SvcAmt = new Prisma.Decimal(450000).mul(3); // 1,350,000
  const bk002Discount = new Prisma.Decimal(500000);
  const bk002Total = bk002RoomAmt.add(bk002SvcAmt).sub(bk002Discount); // 8,350,000
  const bk002Paid = new Prisma.Decimal(4000000);
  const bk002Remaining = bk002Total.sub(bk002Paid);

  const bk002 = await prisma.booking.upsert({
    where: { code: 'BK002' },
    update: {
      customerId: customerKH001.id,
      sourceId: sourceBookingDotCom,
      statusId: statusConfirmed,
      priceTypeId: pricePerNight,
      checkIn: new Date('2026-06-05'),
      checkOut: new Date('2026-06-08'),
      adults: 2,
      children: 0,
      numRooms: 1,
      totalAmount: bk002Total,
      paidAmount: bk002Paid,
      remainingAmount: bk002Remaining,
      deletedAt: null,
    },
    create: {
      code: 'BK002',
      customerId: customerKH001.id,
      sourceId: sourceBookingDotCom,
      statusId: statusConfirmed,
      priceTypeId: pricePerNight,
      checkIn: new Date('2026-06-05'),
      checkOut: new Date('2026-06-08'),
      adults: 2,
      children: 0,
      numRooms: 1,
      totalAmount: bk002Total,
      paidAmount: bk002Paid,
      remainingAmount: bk002Remaining,
    },
  });

  await prisma.bookingItem.deleteMany({ where: { bookingId: bk002.id } });
  await prisma.bookingItem.createMany({
    data: [
      {
        bookingId: bk002.id,
        kind: BookingItemKind.ROOM,
        roomId: roomV101.id,
        refCode: 'V101',
        refName: 'Villa VIP 101',
        quantity: new Prisma.Decimal(3),
        unitPrice: new Prisma.Decimal(2500000),
        amount: bk002RoomAmt,
      },
      {
        bookingId: bk002.id,
        kind: BookingItemKind.SERVICE,
        serviceId: serviceBBQ.id,
        refCode: 'DV004',
        refName: 'BBQ tối',
        quantity: new Prisma.Decimal(3),
        unitPrice: new Prisma.Decimal(450000),
        amount: bk002SvcAmt,
      },
      {
        bookingId: bk002.id,
        kind: BookingItemKind.DISCOUNT,
        refName: 'Giảm giá khuyến mãi',
        quantity: new Prisma.Decimal(1),
        unitPrice: new Prisma.Decimal(500000),
        amount: bk002Discount,
      },
    ],
  });

  await prisma.payment.deleteMany({ where: { bookingId: bk002.id } });
  await prisma.payment.create({
    data: {
      bookingId: bk002.id,
      methodId: methodBankTransfer,
      amount: new Prisma.Decimal(4000000),
      paidAt: new Date('2026-06-01T10:00:00Z'),
    },
  });

  // ── BK003 — Pending ─────────────────────────────────────────────────────────
  const bk003RoomAmt = new Prisma.Decimal(1200000).mul(2); // 2,400,000
  const bk003Total = bk003RoomAmt;

  const bk003 = await prisma.booking.upsert({
    where: { code: 'BK003' },
    update: {
      customerId: customerKH003.id,
      sourceId: sourceAgoda,
      statusId: statusPending,
      priceTypeId: pricePerNight,
      checkIn: new Date('2026-07-01'),
      checkOut: new Date('2026-07-03'),
      adults: 3,
      children: 1,
      numRooms: 1,
      totalAmount: bk003Total,
      paidAmount: new Prisma.Decimal(0),
      remainingAmount: bk003Total,
      deletedAt: null,
    },
    create: {
      code: 'BK003',
      customerId: customerKH003.id,
      sourceId: sourceAgoda,
      statusId: statusPending,
      priceTypeId: pricePerNight,
      checkIn: new Date('2026-07-01'),
      checkOut: new Date('2026-07-03'),
      adults: 3,
      children: 1,
      numRooms: 1,
      totalAmount: bk003Total,
      paidAmount: new Prisma.Decimal(0),
      remainingAmount: bk003Total,
    },
  });

  await prisma.bookingItem.deleteMany({ where: { bookingId: bk003.id } });
  await prisma.bookingItem.create({
    data: {
      bookingId: bk003.id,
      kind: BookingItemKind.ROOM,
      roomId: roomP301.id,
      refCode: 'P301',
      refName: 'Phòng 301 – Family',
      quantity: new Prisma.Decimal(2),
      unitPrice: new Prisma.Decimal(1200000),
      amount: bk003RoomAmt,
    },
  });

  console.log('Seed bookings: 3 rows upserted (BK001, BK002, BK003)');
}

async function seedHousekeepingTasks(): Promise<void> {
  // Resolve status IDs
  const statusWaiting = await getCategoryIdByGroupCode(
    CategoryGroup.HOUSEKEEPING_TASK_STATUS,
    'waiting',
  );
  const statusInProgress = await getCategoryIdByGroupCode(
    CategoryGroup.HOUSEKEEPING_TASK_STATUS,
    'in_progress',
  );
  const statusDone = await getCategoryIdByGroupCode(CategoryGroup.HOUSEKEEPING_TASK_STATUS, 'done');

  // Resolve room IDs
  const roomP101 = await prisma.room.findUniqueOrThrow({
    where: { code: 'P101' },
    select: { id: true },
  });
  const roomP201 = await prisma.room.findUniqueOrThrow({
    where: { code: 'P201' },
    select: { id: true },
  });
  const roomP301 = await prisma.room.findUniqueOrThrow({
    where: { code: 'P301' },
    select: { id: true },
  });
  const roomB101 = await prisma.room.findUniqueOrThrow({
    where: { code: 'B101' },
    select: { id: true },
  });
  const roomV101 = await prisma.room.findUniqueOrThrow({
    where: { code: 'V101' },
    select: { id: true },
  });

  // Resolve booking ID for BK001
  const bk001 = await prisma.booking.findUniqueOrThrow({
    where: { code: 'BK001' },
    select: { id: true },
  });

  // Resolve admin user for assignee of DP002
  const adminUser = await prisma.user.findFirstOrThrow({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@hotel.local', deletedAt: null },
    select: { id: true },
  });

  const tasks = [
    {
      code: 'DP001',
      roomId: roomP101.id,
      bookingId: bk001.id,
      statusId: statusWaiting,
      assigneeId: null as string | null,
      priority: 'high',
      description: 'Dọn dẹp sau check-out',
      scheduledAt: new Date('2026-05-22'),
      startTime: null as string | null,
      endTime: null as string | null,
      completedAt: null as Date | null,
      note: null as string | null,
    },
    {
      code: 'DP002',
      roomId: roomP201.id,
      bookingId: null as string | null,
      statusId: statusInProgress,
      assigneeId: adminUser.id,
      priority: 'normal',
      description: 'Kiểm tra trước check-in',
      scheduledAt: new Date('2026-05-23'),
      startTime: '10:15',
      endTime: null as string | null,
      completedAt: null as Date | null,
      note: null as string | null,
    },
    {
      code: 'DP003',
      roomId: roomP301.id,
      bookingId: null as string | null,
      statusId: statusDone,
      assigneeId: null as string | null,
      priority: 'normal',
      description: 'Vệ sinh định kỳ',
      scheduledAt: new Date('2026-05-22'),
      startTime: null as string | null,
      endTime: null as string | null,
      completedAt: new Date('2026-05-22T09:00:00Z'),
      note: null as string | null,
    },
    {
      code: 'DP004',
      roomId: roomB101.id,
      bookingId: null as string | null,
      statusId: statusWaiting,
      assigneeId: null as string | null,
      priority: 'normal',
      description: 'Dọn dẹp bungalow',
      scheduledAt: new Date('2026-05-24'),
      startTime: null as string | null,
      endTime: null as string | null,
      completedAt: null as Date | null,
      note: null as string | null,
    },
    {
      code: 'DP005',
      roomId: roomV101.id,
      bookingId: null as string | null,
      statusId: statusWaiting,
      assigneeId: null as string | null,
      priority: 'high',
      description: 'Kiểm tra phòng VIP',
      scheduledAt: new Date('2026-05-25'),
      startTime: null as string | null,
      endTime: null as string | null,
      completedAt: null as Date | null,
      note: null as string | null,
    },
  ];

  for (const seed of tasks) {
    await prisma.housekeepingTask.upsert({
      where: { code: seed.code },
      update: {
        roomId: seed.roomId,
        bookingId: seed.bookingId,
        statusId: seed.statusId,
        assigneeId: seed.assigneeId,
        priority: seed.priority,
        description: seed.description,
        scheduledAt: seed.scheduledAt,
        startTime: seed.startTime,
        endTime: seed.endTime,
        completedAt: seed.completedAt,
        note: seed.note,
        deletedAt: null,
      },
      create: {
        code: seed.code,
        roomId: seed.roomId,
        bookingId: seed.bookingId,
        statusId: seed.statusId,
        assigneeId: seed.assigneeId,
        priority: seed.priority,
        description: seed.description,
        scheduledAt: seed.scheduledAt,
        startTime: seed.startTime,
        endTime: seed.endTime,
        completedAt: seed.completedAt,
        note: seed.note,
      },
    });
  }

  console.log('Seed housekeeping tasks: 5 rows upserted (DP001..DP005)');
}

async function seedFinanceTxs(): Promise<void> {
  // Resolve the admin user for createdById
  const adminUser = await prisma.user.findFirstOrThrow({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@hotel.local', deletedAt: null },
    select: { id: true },
  });

  // Resolve group IDs
  const groupRoomRevenue = await getCategoryIdByGroupCode(
    CategoryGroup.FINANCE_GROUP,
    'room_revenue',
  );
  const groupServiceRevenue = await getCategoryIdByGroupCode(
    CategoryGroup.FINANCE_GROUP,
    'service_revenue',
  );
  const groupPayrollExpense = await getCategoryIdByGroupCode(
    CategoryGroup.FINANCE_GROUP,
    'payroll_expense',
  );
  const groupUtilities = await getCategoryIdByGroupCode(CategoryGroup.FINANCE_GROUP, 'utilities');
  const groupSupplies = await getCategoryIdByGroupCode(CategoryGroup.FINANCE_GROUP, 'supplies');

  // Resolve payment method IDs
  const methodCash = await getCategoryIdByGroupCode(CategoryGroup.PAYMENT_METHOD, 'cash');
  const methodBankTransfer = await getCategoryIdByGroupCode(
    CategoryGroup.PAYMENT_METHOD,
    'bank_transfer',
  );

  // Resolve booking IDs
  const bk001 = await prisma.booking.findUniqueOrThrow({
    where: { code: 'BK001' },
    select: { id: true },
  });
  const bk002 = await prisma.booking.findUniqueOrThrow({
    where: { code: 'BK002' },
    select: { id: true },
  });

  interface FinanceTxSeed {
    code: string;
    type: FinanceTxType;
    groupId: string;
    bookingId: string | null;
    methodId: string | null;
    description: string;
    amount: number;
    occurredAt: string;
    createdById: string;
  }

  const FINANCE_TX_SEEDS: FinanceTxSeed[] = [
    {
      code: 'TC001',
      type: FinanceTxType.INCOME,
      groupId: groupRoomRevenue,
      bookingId: bk001.id,
      methodId: methodCash,
      description: 'Thu phòng BK001',
      amount: 1500000,
      occurredAt: '2026-05-20',
      createdById: adminUser.id,
    },
    {
      code: 'TC002',
      type: FinanceTxType.INCOME,
      groupId: groupServiceRevenue,
      bookingId: bk002.id,
      methodId: methodBankTransfer,
      description: 'Thu dịch vụ BBQ BK002',
      amount: 1350000,
      occurredAt: '2026-05-21',
      createdById: adminUser.id,
    },
    {
      code: 'TC003',
      type: FinanceTxType.INCOME,
      groupId: groupRoomRevenue,
      bookingId: null,
      methodId: methodCash,
      description: 'Tiền cọc walk-in',
      amount: 500000,
      occurredAt: '2026-05-22',
      createdById: adminUser.id,
    },
    {
      code: 'TC004',
      type: FinanceTxType.EXPENSE,
      groupId: groupUtilities,
      bookingId: null,
      methodId: null,
      description: 'Tiền điện tháng 5',
      amount: 850000,
      occurredAt: '2026-05-15',
      createdById: adminUser.id,
    },
    {
      code: 'TC005',
      type: FinanceTxType.EXPENSE,
      groupId: groupSupplies,
      bookingId: null,
      methodId: null,
      description: 'Mua đồ tiêu hao',
      amount: 1200000,
      occurredAt: '2026-05-18',
      createdById: adminUser.id,
    },
    {
      code: 'TC006',
      type: FinanceTxType.EXPENSE,
      groupId: groupPayrollExpense,
      bookingId: null,
      methodId: null,
      description: 'Lương tháng 4',
      amount: 27300000,
      occurredAt: '2026-05-05',
      createdById: adminUser.id,
    },
  ];

  for (const seed of FINANCE_TX_SEEDS) {
    await prisma.financeTx.upsert({
      where: { code: seed.code },
      update: {
        type: seed.type,
        groupId: seed.groupId,
        bookingId: seed.bookingId,
        methodId: seed.methodId,
        description: seed.description,
        amount: new Prisma.Decimal(seed.amount),
        occurredAt: new Date(seed.occurredAt),
        createdById: seed.createdById,
        deletedAt: null,
      },
      create: {
        code: seed.code,
        type: seed.type,
        groupId: seed.groupId,
        bookingId: seed.bookingId,
        methodId: seed.methodId,
        description: seed.description,
        amount: new Prisma.Decimal(seed.amount),
        occurredAt: new Date(seed.occurredAt),
        createdById: seed.createdById,
      },
    });
  }

  console.log(`Seed finance transactions: ${FINANCE_TX_SEEDS.length} rows upserted`);
}

interface StaffSeed {
  code: string;
  fullName: string;
  positionCode: string;
  phone: string;
  joinDate: string;
  baseSalary: number;
  allowance: number;
}

const STAFF_SEEDS: StaffSeed[] = [
  {
    code: 'NS001',
    fullName: 'Nguyễn Hiền An',
    positionCode: 'manager',
    phone: '0900000001',
    joinDate: '2025-01-15',
    baseSalary: 12000000,
    allowance: 1500000,
  },
  {
    code: 'NS002',
    fullName: 'Lê Thảo My',
    positionCode: 'receptionist',
    phone: '0900000002',
    joinDate: '2025-10-01',
    baseSalary: 8500000,
    allowance: 800000,
  },
  {
    code: 'NS003',
    fullName: 'Phạm Quốc Việt',
    positionCode: 'housekeeper',
    phone: '0900000003',
    joinDate: '2025-10-25',
    baseSalary: 8500000,
    allowance: 800000,
  },
  {
    code: 'NS004',
    fullName: 'Trần Minh Khoa',
    positionCode: 'cook',
    phone: '0900000004',
    joinDate: '2025-08-10',
    baseSalary: 9000000,
    allowance: 1000000,
  },
  {
    code: 'NS005',
    fullName: 'Đặng Hoài Thu',
    positionCode: 'cook',
    phone: '0900000005',
    joinDate: '2025-12-15',
    baseSalary: 7000000,
    allowance: 700000,
  },
  {
    code: 'NS006',
    fullName: 'Bùi Khánh Nam',
    positionCode: 'receptionist',
    phone: '0900000006',
    joinDate: '2025-12-22',
    baseSalary: 6500000,
    allowance: 600000,
  },
];

async function seedStaffs(): Promise<void> {
  for (const seed of STAFF_SEEDS) {
    const positionId = await getCategoryIdByGroupCode(
      CategoryGroup.STAFF_POSITION,
      seed.positionCode,
    );

    await prisma.staff.upsert({
      where: { code: seed.code },
      update: {
        fullName: seed.fullName,
        positionId,
        phone: seed.phone,
        joinDate: new Date(seed.joinDate),
        baseSalary: new Prisma.Decimal(seed.baseSalary),
        allowance: new Prisma.Decimal(seed.allowance),
        active: true,
        deletedAt: null,
      },
      create: {
        code: seed.code,
        fullName: seed.fullName,
        positionId,
        phone: seed.phone,
        joinDate: new Date(seed.joinDate),
        baseSalary: new Prisma.Decimal(seed.baseSalary),
        allowance: new Prisma.Decimal(seed.allowance),
        active: true,
      },
    });
  }

  console.log(`Seed staffs: ${STAFF_SEEDS.length} rows upserted`);
}

interface PayrollSeed {
  code: string;
  staffCode: string;
  month: string;
  workingDays: number;
  baseSalary: number;
  allowance: number;
  bonus: number;
  penalty: number;
  netSalary: number;
  statusCode: 'draft' | 'pending' | 'paid';
  paidAt: string | null;
}

const PAYROLL_SEEDS: PayrollSeed[] = [
  {
    code: 'BL001',
    staffCode: 'NS001',
    month: '2026-05',
    workingDays: 28,
    baseSalary: 12000000,
    allowance: 1500000,
    bonus: 3000000,
    penalty: 0,
    netSalary: 16500000,
    statusCode: 'paid',
    paidAt: '2026-05-31T08:00:00Z',
  },
  {
    code: 'BL002',
    staffCode: 'NS002',
    month: '2026-05',
    workingDays: 28,
    baseSalary: 8500000,
    allowance: 800000,
    bonus: 500000,
    penalty: 0,
    netSalary: 9800000,
    statusCode: 'paid',
    paidAt: '2026-05-31T08:00:00Z',
  },
  {
    code: 'BL003',
    staffCode: 'NS003',
    month: '2026-05',
    workingDays: 28,
    baseSalary: 8500000,
    allowance: 800000,
    bonus: 900000,
    penalty: 0,
    netSalary: 10200000,
    statusCode: 'pending',
    paidAt: null,
  },
  {
    code: 'BL004',
    staffCode: 'NS004',
    month: '2026-05',
    workingDays: 28,
    baseSalary: 9000000,
    allowance: 1000000,
    bonus: 800000,
    penalty: 0,
    netSalary: 10800000,
    statusCode: 'pending',
    paidAt: null,
  },
  {
    code: 'BL005',
    staffCode: 'NS005',
    month: '2026-05',
    workingDays: 28,
    baseSalary: 7000000,
    allowance: 700000,
    bonus: 600000,
    penalty: 0,
    netSalary: 8300000,
    statusCode: 'pending',
    paidAt: null,
  },
  {
    code: 'BL006',
    staffCode: 'NS006',
    month: '2026-05',
    workingDays: 28,
    baseSalary: 6500000,
    allowance: 600000,
    bonus: 500000,
    penalty: 0,
    netSalary: 7600000,
    statusCode: 'pending',
    paidAt: null,
  },
];

async function seedPayrolls(): Promise<void> {
  for (const seed of PAYROLL_SEEDS) {
    const statusId = await getCategoryIdByGroupCode(CategoryGroup.PAYROLL_STATUS, seed.statusCode);
    const staff = await prisma.staff.findUniqueOrThrow({
      where: { code: seed.staffCode },
      select: { id: true },
    });

    await prisma.payroll.upsert({
      where: { code: seed.code },
      update: {
        staffId: staff.id,
        month: seed.month,
        workingDays: seed.workingDays,
        baseSalary: new Prisma.Decimal(seed.baseSalary),
        allowance: new Prisma.Decimal(seed.allowance),
        bonus: new Prisma.Decimal(seed.bonus),
        penalty: new Prisma.Decimal(seed.penalty),
        netSalary: new Prisma.Decimal(seed.netSalary),
        statusId,
        paidAt: seed.paidAt ? new Date(seed.paidAt) : null,
        deletedAt: null,
      },
      create: {
        code: seed.code,
        staffId: staff.id,
        month: seed.month,
        workingDays: seed.workingDays,
        baseSalary: new Prisma.Decimal(seed.baseSalary),
        allowance: new Prisma.Decimal(seed.allowance),
        bonus: new Prisma.Decimal(seed.bonus),
        penalty: new Prisma.Decimal(seed.penalty),
        netSalary: new Prisma.Decimal(seed.netSalary),
        statusId,
        paidAt: seed.paidAt ? new Date(seed.paidAt) : null,
      },
    });
  }

  console.log(`Seed payrolls: ${PAYROLL_SEEDS.length} rows upserted`);
}

// ── Uploads seed ──────────────────────────────────────────────────────────────

async function seedUploads(): Promise<void> {
  // Resolve admin user for uploadedBy
  const adminUser = await prisma.user.findFirstOrThrow({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@hotel.local', deletedAt: null },
    select: { id: true },
  });

  // Rooms to attach ROOM_IMAGE uploads to (all 10 seeded rooms)
  const roomCodes = [
    'P101',
    'P102',
    'P201',
    'P202',
    'P301',
    'P302',
    'B101',
    'B102',
    'V101',
    'V102',
  ];

  interface UploadSeed {
    code: string;
    kind: UploadKind;
    entityType: string;
    roomCode: string;
    suffix: string;
    fileSize: number;
    fileIdSuffix: string;
  }

  const fileSizes = [
    234567, 312000, 189500, 421300, 158900, 276400, 398200, 143600, 505000, 267800,
  ];
  const fileIdSuffixes = [
    'abc12345',
    'bcd23456',
    'cde34567',
    'def45678',
    'efg56789',
    'fgh67890',
    'ghi78901',
    'hij89012',
    'ijk90123',
    'jkl01234',
  ];

  const UPLOAD_SEEDS: UploadSeed[] = roomCodes.map((roomCode, i) => ({
    code: `TU${String(i + 1).padStart(3, '0')}`,
    kind: UploadKind.ROOM_IMAGE,
    entityType: 'room',
    roomCode,
    suffix: `${i + 1}`,
    fileSize: fileSizes[i] ?? 250000,
    fileIdSuffix: fileIdSuffixes[i] ?? `xxx${i}`,
  }));

  for (const seed of UPLOAD_SEEDS) {
    // Resolve the actual room record for entityId
    const room = await prisma.room.findUnique({
      where: { code: seed.roomCode },
      select: { id: true },
    });

    if (!room) {
      console.warn(`  seedUploads: room ${seed.roomCode} not found, skipping ${seed.code}`);
      continue;
    }

    const fileName = `Homestay-room-${seed.roomCode}-${seed.suffix}.png`;

    await prisma.upload.upsert({
      where: { code: seed.code },
      update: {
        kind: seed.kind,
        entityType: seed.entityType,
        entityId: room.id,
        fileName,
        fileSize: seed.fileSize,
        mimeType: 'image/png',
        url: `/uploads/rooms/${seed.roomCode}.png`,
        fileId: `upload_${seed.roomCode}_${seed.fileIdSuffix}`,
        uploadedById: adminUser.id,
        deletedAt: null,
      },
      create: {
        code: seed.code,
        kind: seed.kind,
        entityType: seed.entityType,
        entityId: room.id,
        fileName,
        fileSize: seed.fileSize,
        mimeType: 'image/png',
        url: `/uploads/rooms/${seed.roomCode}.png`,
        fileId: `upload_${seed.roomCode}_${seed.fileIdSuffix}`,
        uploadedById: adminUser.id,
      },
    });
  }

  console.log(`Seed uploads: ${UPLOAD_SEEDS.length} rows upserted`);
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@hotel.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const passwordHash = await argon2.hash(adminPassword);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'Quản trị viên',
      role: UserRole.ADMIN,
    },
  });

  await prisma.setting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      propertyName: 'Homestay Là',
      hotline: '0900 000 000',
      email: 'info@hotel.local',
      themeTone: 2,
    },
  });

  await seedCategories();
  await seedRooms();
  await seedCustomers();
  await seedServices();
  await seedPricePackages();
  await seedBookings();
  await seedHousekeepingTasks();
  await seedFinanceTxs();
  await seedStaffs();
  await seedPayrolls();
  await seedUploads();

  console.log(`Seed done. Admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
