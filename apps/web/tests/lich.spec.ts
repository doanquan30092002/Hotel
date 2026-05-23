import { test, expect } from '@playwright/test';

/**
 * Lịch booking page — offline-friendly Playwright tests.
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

const MOCK_ROOMS = [
  {
    id: 'r1',
    code: 'P101',
    name: 'Standard 101',
    type: { id: 't1', code: 'standard', name: 'Standard' },
    area: { id: 'a1', code: 'tang1', name: 'Tầng 1' },
  },
  {
    id: 'r2',
    code: 'P201',
    name: 'Deluxe 201',
    type: { id: 't2', code: 'deluxe', name: 'Deluxe' },
    area: null,
  },
  {
    id: 'r3',
    code: 'V101',
    name: 'Villa 101',
    type: { id: 't3', code: 'villa', name: 'Villa' },
    area: { id: 'a2', code: 'khu-b', name: 'Khu B' },
  },
];

const MOCK_BOOKINGS = [
  {
    id: 'bk1',
    code: 'BK001',
    status: { id: 'st2', code: 'confirmed', name: 'Đã xác nhận' },
    source: { id: 'src1', code: 'walkin', name: 'Walk-in' },
    customer: { id: 'c1', code: 'KH001', fullName: 'Nguyễn Văn An', phone: '0901234567' },
    checkIn: '2026-05-20',
    checkOut: '2026-05-23',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    rooms: [{ roomId: 'r1', roomCode: 'P101', roomName: 'Standard 101' }],
  },
  {
    id: 'bk2',
    code: 'BK002',
    status: { id: 'st3', code: 'checked_in', name: 'Đang ở' },
    source: null,
    customer: { id: 'c2', code: 'KH002', fullName: 'Trần Thị Bình', phone: null },
    checkIn: '2026-05-22',
    checkOut: '2026-05-28',
    checkInTime: null,
    checkOutTime: null,
    rooms: [{ roomId: 'r2', roomCode: 'P201', roomName: 'Deluxe 201' }],
  },
];

const MOCK_CALENDAR_RESPONSE = {
  data: {
    view: 'month',
    from: '2026-05-01',
    to: '2026-05-31',
    rooms: MOCK_ROOMS,
    bookings: MOCK_BOOKINGS,
    stats: {
      totalBookings: 2,
      occupancyPercent: 81,
      relatedShifts: 3,
    },
  },
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
      id: 'st2',
      code: 'confirmed',
      name: 'Đã xác nhận',
      group: 'BOOKING_STATUS',
      sortOrder: 1,
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
  meta: { page: 1, pageSize: 100, total: 3, totalPages: 1 },
};

async function setupMocks(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ME_ADMIN),
    }),
  );

  await page.route('**/api/v1/calendar**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CALENDAR_RESPONSE),
    }),
  );

  await page.route('**/api/v1/categories**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CATEGORIES_RESPONSE),
    }),
  );
}

async function gotoLichAs(page: import('@playwright/test').Page) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, ADMIN_AUTH);
  await setupMocks(page);
  await page.goto('/lich');
}

test.describe('Lịch booking page (offline-friendly)', () => {
  test('unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });
    await page.goto('/lich');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('page renders heading Calendar booking', async ({ page }) => {
    await gotoLichAs(page);
    await expect(page.getByText('Lịch booking').first()).toBeVisible({ timeout: 8000 });
  });

  test('view switcher shows 3 buttons Tháng / Tuần / Ngày', async ({ page }) => {
    await gotoLichAs(page);
    await expect(page.getByRole('button', { name: 'Xem theo Tháng' })).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByRole('button', { name: 'Xem theo Tuần' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xem theo Ngày' })).toBeVisible();
  });

  test('clicking Tuần switches to week view', async ({ page }) => {
    await gotoLichAs(page);
    const weekBtn = page.getByRole('button', { name: 'Xem theo Tuần' });
    await weekBtn.click();
    await expect(weekBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Xem theo Tháng' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('clicking Ngày switches to day view', async ({ page }) => {
    await gotoLichAs(page);
    const dayBtn = page.getByRole('button', { name: 'Xem theo Ngày' });
    await dayBtn.click();
    await expect(dayBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking Hôm nay recenters to today', async ({ page }) => {
    await gotoLichAs(page);
    // navigate away first
    await page.getByRole('button', { name: 'Kỳ tiếp' }).click();
    // then click today
    await page.getByRole('button', { name: 'Về hôm nay' }).click();
    // should still show KPI cards
    await expect(page.getByText('Công suất ước tính')).toBeVisible({ timeout: 8000 });
  });

  test('KPI cards show stats values', async ({ page }) => {
    await gotoLichAs(page);
    // totalBookings = 2, occupancyPercent = 81%, relatedShifts = 3
    await expect(page.getByText('81%')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Công suất ước tính')).toBeVisible();
    await expect(page.getByText('Lịch đợt liên quan')).toBeVisible();
  });

  test('status legend chips visible', async ({ page }) => {
    await gotoLichAs(page);
    const legend = page.getByLabel('Chú thích trạng thái');
    await expect(legend).toBeVisible({ timeout: 8000 });
    await expect(legend.getByText('Chờ xác nhận')).toBeVisible();
    await expect(legend.getByText('Đã xác nhận')).toBeVisible();
    await expect(legend.getByText('Đang ở')).toBeVisible();
    await expect(legend.getByText('Đã trả phòng')).toBeVisible();
    await expect(legend.getByText('Đã huỷ')).toBeVisible();
  });

  test('booking block BK001 appears in month grid', async ({ page }) => {
    await gotoLichAs(page);
    // BK001 should render as a bar with booking code
    await expect(page.getByTitle(/BK001/).first()).toBeVisible({ timeout: 8000 });
  });

  test('search input is present and accepts input', async ({ page }) => {
    await gotoLichAs(page);
    const input = page.getByLabel('Tìm kiếm lịch booking');
    await expect(input).toBeVisible({ timeout: 8000 });
    await input.fill('BK001');
    await expect(input).toHaveValue('BK001');
  });

  test('status filter dropdown opens', async ({ page }) => {
    await gotoLichAs(page);
    const trigger = page.getByLabel('Lọc trạng thái');
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await trigger.click();
    // Wait for dropdown content with a status item
    await expect(page.getByRole('option', { name: 'Chờ xác nhận' })).toBeVisible({ timeout: 4000 });
  });
});
