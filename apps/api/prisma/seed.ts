import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

for (const candidate of [resolve(__dirname, '../../../.env'), resolve(__dirname, '../.env')]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
    break;
  }
}

import { CategoryGroup, Prisma, PrismaClient, UserRole } from '@prisma/client';
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
