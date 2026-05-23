import { test, expect } from '@playwright/test';

/**
 * Booking page — offline-friendly Playwright tests.
 * All API calls are intercepted/mocked so no live BE is required.
 */

const ADMIN_AUTH = JSON.stringify({
  state: {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: 'u1',
      email: 'admin@hotel.local',
      fullName: 'Admin Test',
      role: 'ADMIN',
      status: 'ACTIVE',
      avatarUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
  },
  version: 0,
});

const RECEPTIONIST_AUTH = JSON.stringify({
  state: {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: 'u2',
      email: 'receptionist@hotel.local',
      fullName: 'Receptionist Test',
      role: 'RECEPTIONIST',
      status: 'ACTIVE',
      avatarUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
  },
  version: 0,
});

const MOCK_BOOKINGS = [
  {
    id: 'bk1',
    code: 'BK001',
    customer: { id: 'c1', code: 'KH001', fullName: 'Nguyễn Văn An', phone: '0901234567' },
    source: { id: 'src1', code: 'walkin', name: 'Walk-in' },
    status: { id: 'st1', code: 'pending', name: 'Chờ xác nhận' },
    priceType: { id: 'pt1', code: 'standard', name: 'Giá chính ngày' },
    package: null,
    checkIn: '2026-05-25',
    checkOut: '2026-05-27',
    checkInTime: null,
    checkOutTime: null,
    adults: 2,
    children: 0,
    numRooms: 1,
    totalAmount: '1800000',
    paidAmount: '900000',
    remainingAmount: '900000',
    note: null,
    itemCount: 1,
    paymentCount: 1,
    items: [
      {
        id: 'bi1',
        bookingId: 'bk1',
        kind: 'ROOM',
        roomId: 'r1',
        room: { id: 'r1', code: 'P101', name: 'Standard 101' },
        serviceId: null,
        service: null,
        surchargeTypeId: null,
        surchargeType: null,
        refCode: 'P101',
        refName: 'Standard 101',
        quantity: '2',
        unitPrice: '900000',
        amount: '1800000',
        note: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    payments: [],
    createdAt: '2026-05-23T10:00:00Z',
    updatedAt: '2026-05-23T10:00:00Z',
  },
  {
    id: 'bk2',
    code: 'BK002',
    customer: { id: 'c2', code: 'KH002', fullName: 'Trần Thị Bình', phone: '0907654321' },
    source: { id: 'src2', code: 'facebook', name: 'Facebook' },
    status: { id: 'st3', code: 'checked_in', name: 'Đang ở' },
    priceType: null,
    package: null,
    checkIn: '2026-05-22',
    checkOut: '2026-05-24',
    checkInTime: '14:00',
    checkOutTime: null,
    adults: 1,
    children: 1,
    numRooms: 1,
    totalAmount: '2500000',
    paidAmount: '2500000',
    remainingAmount: '0',
    note: 'Yêu cầu phòng yên tĩnh',
    itemCount: 1,
    paymentCount: 2,
    items: [
      {
        id: 'bi2',
        bookingId: 'bk2',
        kind: 'ROOM',
        roomId: 'r2',
        room: { id: 'r2', code: 'F301', name: 'Family 301' },
        serviceId: null,
        service: null,
        surchargeTypeId: null,
        surchargeType: null,
        refCode: 'F301',
        refName: 'Family 301',
        quantity: '2',
        unitPrice: '1250000',
        amount: '2500000',
        note: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    payments: [],
    createdAt: '2026-05-22T09:00:00Z',
    updatedAt: '2026-05-22T09:00:00Z',
  },
];

const MOCK_BOOKINGS_RESPONSE = {
  data: MOCK_BOOKINGS,
  meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
};

const MOCK_CATEGORIES_RESPONSE = {
  data: [
    {
      id: 'st1',
      code: 'pending',
      name: 'Chờ xác nhận',
      group: 'BOOKING_STATUS',
      sortOrder: 0,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'st3',
      code: 'checked_in',
      name: 'Đang ở',
      group: 'BOOKING_STATUS',
      sortOrder: 2,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 100, total: 2, totalPages: 1 },
};

const MOCK_ME_ADMIN = {
  data: {
    id: 'u1',
    email: 'admin@hotel.local',
    fullName: 'Admin Test',
    role: 'ADMIN',
    status: 'ACTIVE',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
};

const MOCK_ME_RECEPTIONIST = {
  data: {
    id: 'u2',
    email: 'receptionist@hotel.local',
    fullName: 'Receptionist Test',
    role: 'RECEPTIONIST',
    status: 'ACTIVE',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
};

type MockRole = 'ADMIN' | 'RECEPTIONIST';

async function setupMocks(page: import('@playwright/test').Page, role: MockRole = 'ADMIN') {
  const meResponse = role === 'ADMIN' ? MOCK_ME_ADMIN : MOCK_ME_RECEPTIONIST;

  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(meResponse),
    }),
  );

  await page.route('**/api/v1/bookings**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_BOOKINGS_RESPONSE),
    }),
  );

  await page.route('**/api/v1/categories**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CATEGORIES_RESPONSE),
    }),
  );

  // Mock other endpoints used in the dialog
  await page.route('**/api/v1/customers**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } }),
    }),
  );

  await page.route('**/api/v1/rooms**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } }),
    }),
  );

  await page.route('**/api/v1/services**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } }),
    }),
  );

  await page.route('**/api/v1/packages**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } }),
    }),
  );
}

async function gotoBookingAs(page: import('@playwright/test').Page, role: MockRole, auth: string) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, auth);
  await setupMocks(page, role);
  await page.goto('/booking');
}

test.describe('Booking page (offline-friendly)', () => {
  test('unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });
    await page.goto('/booking');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('page renders heading Quản lý booking', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByText('Quản lý booking').first()).toBeVisible({ timeout: 8000 });
  });

  test('table shows BK001 booking code', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByText('BK001')).toBeVisible({ timeout: 8000 });
  });

  test('table shows BK002 booking code', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByText('BK002')).toBeVisible({ timeout: 8000 });
  });

  test('table shows customer names', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByText('Nguyễn Văn An')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Trần Thị Bình')).toBeVisible({ timeout: 8000 });
  });

  test('status badge amber shown for pending booking (BK001)', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    const pendingBadge = page.getByText('Chờ xác nhận').first();
    await expect(pendingBadge).toBeVisible({ timeout: 8000 });
    await expect(pendingBadge).toHaveClass(/bg-amber-100/);
  });

  test('status badge emerald shown for checked_in booking (BK002)', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    const checkedInBadge = page.getByText('Đang ở').first();
    await expect(checkedInBadge).toBeVisible({ timeout: 8000 });
    await expect(checkedInBadge).toHaveClass(/bg-emerald-100/);
  });

  test('search input is present', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    const searchInput = page.getByLabel('Tìm kiếm booking');
    await expect(searchInput).toBeVisible({ timeout: 8000 });
    await searchInput.fill('BK001');
    await expect(searchInput).toHaveValue('BK001');
  });

  test('status filter dropdown is visible', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Lọc trạng thái booking')).toBeVisible({ timeout: 8000 });
  });

  test('ADMIN sees Tạo booking button', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Tạo booking mới')).toBeVisible({ timeout: 8000 });
  });

  test('click Tạo booking opens dialog with title Tạo booking', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    await page.getByLabel('Tạo booking mới').click();
    await expect(page.getByRole('dialog').getByText('Tạo booking')).toBeVisible({ timeout: 5000 });
  });

  test('dialog has 4 chip buttons for item kinds', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    await page.getByLabel('Tạo booking mới').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel('Thêm thuê phòng')).toBeVisible();
    await expect(page.getByLabel('Thêm dịch vụ')).toBeVisible();
    await expect(page.getByLabel('Thêm phụ thu')).toBeVisible();
    await expect(page.getByLabel('Thêm giảm trừ')).toBeVisible();
  });

  test('dialog Close button works', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    await page.getByLabel('Tạo booking mới').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Huỷ' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
  });

  test('pagination footer is always visible with pageSize picker', async ({ page }) => {
    await gotoBookingAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Số dòng mỗi trang')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Trang trước')).toBeVisible();
    await expect(page.getByLabel('Trang tiếp')).toBeVisible();
  });

  test('RECEPTIONIST sees Add button but no Delete icon for BK001', async ({ page }) => {
    await gotoBookingAs(page, 'RECEPTIONIST', RECEPTIONIST_AUTH);
    await expect(page.getByText('BK001')).toBeVisible({ timeout: 8000 });
    // RECEPTIONIST can create
    await expect(page.getByLabel('Tạo booking mới')).toBeVisible();
    // RECEPTIONIST cannot delete
    await expect(page.getByLabel('Xoá booking BK001')).not.toBeVisible();
  });
});
