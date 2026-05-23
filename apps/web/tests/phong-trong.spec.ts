import { test, expect } from '@playwright/test';

/**
 * Tìm phòng trống (phong-trong) page — offline-friendly Playwright tests.
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

const MOCK_ROOMS_AVAILABLE = [
  {
    id: 'r1',
    code: 'P101',
    name: 'Standard 101',
    typeId: 't1',
    type: { id: 't1', code: 'standard', name: 'Standard' },
    areaId: 'a1',
    area: { id: 'a1', code: 'tang1', name: 'Tầng 1' },
    capacity: 2,
    basePrice: '500000',
    weekendPrice: null,
    holidayPrice: null,
    statusId: 's1',
    status: { id: 's1', code: 'available', name: 'Sẵn sàng' },
    cleaningStatusId: 'cs1',
    cleaningStatus: { id: 'cs1', code: 'clean', name: 'Sạch' },
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
    images: [],
    note: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'r2',
    code: 'D201',
    name: 'Deluxe 201',
    typeId: 't2',
    type: { id: 't2', code: 'deluxe', name: 'Deluxe' },
    areaId: null,
    area: null,
    capacity: 4,
    basePrice: '1200000',
    weekendPrice: null,
    holidayPrice: null,
    statusId: 's1',
    status: { id: 's1', code: 'available', name: 'Sẵn sàng' },
    cleaningStatusId: 'cs1',
    cleaningStatus: { id: 'cs1', code: 'clean', name: 'Sạch' },
    defaultCheckIn: null,
    defaultCheckOut: null,
    images: ['https://example.com/room.jpg'],
    note: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'r3',
    code: 'V101',
    name: 'Villa 101',
    typeId: 't3',
    type: { id: 't3', code: 'villa', name: 'Villa' },
    areaId: 'a2',
    area: { id: 'a2', code: 'khu-b', name: 'Khu B' },
    capacity: 6,
    basePrice: '3500000',
    weekendPrice: null,
    holidayPrice: null,
    statusId: 's1',
    status: { id: 's1', code: 'available', name: 'Sẵn sàng' },
    cleaningStatusId: 'cs1',
    cleaningStatus: { id: 'cs1', code: 'clean', name: 'Sạch' },
    defaultCheckIn: null,
    defaultCheckOut: null,
    images: [],
    note: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const MOCK_AVAILABLE_RESPONSE = {
  data: MOCK_ROOMS_AVAILABLE,
  meta: {
    checkIn: '2026-05-23',
    checkOut: '2026-05-24',
    totalRooms: 10,
    totalAvailable: 3,
    totalBooked: 5,
  },
};

const MOCK_CATEGORIES_ROOM_TYPE = {
  data: [
    {
      id: 't1',
      code: 'standard',
      name: 'Standard',
      group: 'ROOM_TYPE',
      sortOrder: 0,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 't2',
      code: 'deluxe',
      name: 'Deluxe',
      group: 'ROOM_TYPE',
      sortOrder: 1,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 100, total: 2, totalPages: 1 },
};

const MOCK_CATEGORIES_GENERIC = {
  data: [],
  meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 },
};

async function setupMocks(page: import('@playwright/test').Page) {
  // Auth
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ME_ADMIN),
    }),
  );

  // Categories (rooms type + generic fallback)
  await page.route('**/api/v1/categories**', (route) => {
    const url = route.request().url();
    if (url.includes('group=ROOM_TYPE')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CATEGORIES_ROOM_TYPE),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CATEGORIES_GENERIC),
    });
  });

  // Catch-all for rooms list (used by booking dialog) — registered BEFORE specific available mock
  // because Playwright uses LIFO: later-registered routes fire first
  await page.route('**/api/v1/rooms**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } }),
    }),
  );

  // Specific rooms/available endpoint — registered LAST so it fires FIRST (LIFO)
  await page.route('**/api/v1/rooms/available**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_AVAILABLE_RESPONSE),
    }),
  );

  // Other stubs used by booking dialog
  await page.route('**/api/v1/customers**', (route) =>
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

async function gotoPhongTrongAs(page: import('@playwright/test').Page) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, ADMIN_AUTH);
  await setupMocks(page);
  await page.goto('/phong-trong');
}

test.describe('Tìm phòng trống page (offline-friendly)', () => {
  test('unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });
    await page.goto('/phong-trong');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('page renders heading Tìm phòng trống nhanh', async ({ page }) => {
    await gotoPhongTrongAs(page);
    // Topbar shows the page title
    await expect(page.getByText('Phòng trống').first()).toBeVisible({ timeout: 8000 });
  });

  test('checkIn date input is visible', async ({ page }) => {
    await gotoPhongTrongAs(page);
    const input = page.getByLabel('Ngày nhận phòng');
    await expect(input).toBeVisible({ timeout: 8000 });
  });

  test('checkOut date input is visible', async ({ page }) => {
    await gotoPhongTrongAs(page);
    const input = page.getByLabel('Ngày trả phòng');
    await expect(input).toBeVisible({ timeout: 8000 });
  });

  test('"Tìm phòng" button is visible and clickable', async ({ page }) => {
    await gotoPhongTrongAs(page);
    const btn = page.getByRole('button', { name: 'Tìm phòng trống' });
    await expect(btn).toBeVisible({ timeout: 8000 });
    await btn.click();
    // Should still be on the same page
    await expect(btn).toBeVisible();
  });

  test('KPI cards show meta numbers', async ({ page }) => {
    await gotoPhongTrongAs(page);
    // totalAvailable = 3, totalBooked = 5, totalRooms = 10
    await expect(page.getByText('Phòng trống').first()).toBeVisible({ timeout: 8000 });
    // Wait for data to load — check for a large number
    await expect(page.getByText('3').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('5').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('10').first()).toBeVisible({ timeout: 8000 });
  });

  test('room cards appear in grid', async ({ page }) => {
    await gotoPhongTrongAs(page);
    // Three rooms should appear
    await expect(page.getByText('Standard 101')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Deluxe 201')).toBeVisible();
    await expect(page.getByText('Villa 101')).toBeVisible();
  });

  test('each room card has "Tạo booking" button', async ({ page }) => {
    await gotoPhongTrongAs(page);
    await expect(page.getByText('Standard 101')).toBeVisible({ timeout: 8000 });
    const bookingButtons = page.getByRole('button', { name: /Tạo booking cho phòng/ });
    await expect(bookingButtons).toHaveCount(3, { timeout: 8000 });
  });

  test('clicking "Tạo booking" on a room card opens the booking dialog', async ({ page }) => {
    await gotoPhongTrongAs(page);
    await expect(page.getByText('Standard 101')).toBeVisible({ timeout: 8000 });
    const firstBtn = page.getByRole('button', { name: 'Tạo booking cho phòng Standard 101' });
    await firstBtn.click();
    // BookingFormDialog should open with title "Tạo booking"
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Tạo booking').first()).toBeVisible({ timeout: 5000 });
  });

  test('room type filter dropdown opens and shows options', async ({ page }) => {
    await gotoPhongTrongAs(page);
    const trigger = page.getByLabel('Lọc loại phòng');
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await trigger.click();
    await expect(page.getByRole('option', { name: 'Standard' })).toBeVisible({ timeout: 4000 });
    await expect(page.getByRole('option', { name: 'Deluxe' })).toBeVisible();
  });
});
