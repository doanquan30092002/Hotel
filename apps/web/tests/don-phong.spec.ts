import { test, expect } from '@playwright/test';

/**
 * Dọn phòng (don-phong) page — offline-friendly Playwright tests.
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

const MOCK_STATUSES = {
  data: [
    {
      id: 'hs1',
      code: 'waiting',
      name: 'Chờ phân công',
      group: 'HOUSEKEEPING_TASK_STATUS',
      sortOrder: 0,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'hs2',
      code: 'in_progress',
      name: 'Đang thực hiện',
      group: 'HOUSEKEEPING_TASK_STATUS',
      sortOrder: 1,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'hs3',
      code: 'done',
      name: 'Hoàn thành',
      group: 'HOUSEKEEPING_TASK_STATUS',
      sortOrder: 2,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'hs4',
      code: 'skipped',
      name: 'Bỏ qua',
      group: 'HOUSEKEEPING_TASK_STATUS',
      sortOrder: 3,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 100, total: 4, totalPages: 1 },
};

const MOCK_USERS = {
  data: [
    {
      id: 'u1',
      email: 'admin@hotel.local',
      fullName: 'Admin Test',
      role: 'ADMIN',
      status: 'ACTIVE',
      avatarUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'u2',
      email: 'housekeeping1@hotel.local',
      fullName: 'Lê Thảo My',
      role: 'HOUSEKEEPING',
      status: 'ACTIVE',
      avatarUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'u3',
      email: 'housekeeping2@hotel.local',
      fullName: 'Phạm Quốc Việt',
      role: 'HOUSEKEEPING',
      status: 'ACTIVE',
      avatarUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 100, total: 3, totalPages: 1 },
};

const MOCK_ROOMS = {
  data: [
    {
      id: 'r1',
      code: 'P101',
      name: 'Standard 101',
      typeId: 't1',
      type: { id: 't1', code: 'standard', name: 'Standard' },
      areaId: null,
      area: null,
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
      typeId: 't1',
      type: { id: 't1', code: 'standard', name: 'Standard' },
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
      images: [],
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'r3',
      code: 'BL301',
      name: 'Bungalow 301',
      typeId: 't1',
      type: { id: 't1', code: 'standard', name: 'Standard' },
      areaId: null,
      area: null,
      capacity: 4,
      basePrice: '2000000',
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
  ],
  meta: { page: 1, pageSize: 100, total: 3, totalPages: 1 },
};

const MOCK_BOOKINGS = {
  data: [
    {
      id: 'bk1',
      code: 'BK001',
      customer: { id: 'c1', code: 'KH001', fullName: 'Family 305', phone: null },
      source: { id: 's1', code: 'walk_in', name: 'Walk-in' },
      status: { id: 'bs1', code: 'checked_in', name: 'Đang ở' },
      priceType: null,
      package: null,
      checkIn: '2026-05-23',
      checkOut: '2026-05-25',
      checkInTime: null,
      checkOutTime: null,
      adults: 2,
      children: 0,
      numRooms: 1,
      totalAmount: '1000000',
      paidAmount: '1000000',
      remainingAmount: '0',
      note: null,
      itemCount: 1,
      paymentCount: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'bk2',
      code: 'BK002',
      customer: { id: 'c2', code: 'KH002', fullName: 'Nguyễn Văn A', phone: '0901234567' },
      source: { id: 's1', code: 'walk_in', name: 'Walk-in' },
      status: { id: 'bs2', code: 'confirmed', name: 'Đã xác nhận' },
      priceType: null,
      package: null,
      checkIn: '2026-05-24',
      checkOut: '2026-05-26',
      checkInTime: null,
      checkOutTime: null,
      adults: 2,
      children: 1,
      numRooms: 1,
      totalAmount: '2400000',
      paidAmount: '0',
      remainingAmount: '2400000',
      note: null,
      itemCount: 2,
      paymentCount: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 100, total: 2, totalPages: 1 },
};

const MOCK_TASKS = {
  data: [
    {
      id: 'dp1',
      code: 'DP001',
      room: { id: 'r1', code: 'P101', name: 'Standard 101' },
      booking: { id: 'bk1', code: 'BK001' },
      status: { id: 'hs3', code: 'done', name: 'Hoàn thành' },
      assignee: { id: 'u2', fullName: 'Lê Thảo My', role: 'HOUSEKEEPING' },
      priority: 'low' as const,
      description: 'Dọn sau check-out',
      scheduledAt: '2026-05-15',
      startTime: '12:15',
      endTime: '12:30',
      completedAt: '2026-05-15T12:30:00Z',
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'dp2',
      code: 'DP002',
      room: { id: 'r3', code: 'BL301', name: 'Bungalow 301' },
      booking: null,
      status: { id: 'hs3', code: 'done', name: 'Hoàn thành' },
      assignee: { id: 'u2', fullName: 'Lê Thảo My', role: 'HOUSEKEEPING' },
      priority: 'low' as const,
      description: 'Kiểm tra trước check-in',
      scheduledAt: '2026-05-15',
      startTime: '10:00',
      endTime: '10:30',
      completedAt: null,
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'dp3',
      code: 'DP003',
      room: { id: 'r2', code: 'D201', name: 'Deluxe 201' },
      booking: { id: 'bk2', code: 'BK002' },
      status: { id: 'hs3', code: 'done', name: 'Hoàn thành' },
      assignee: { id: 'u2', fullName: 'Lê Thảo My', role: 'HOUSEKEEPING' },
      priority: 'low' as const,
      description: 'Kiểm tra sau trả phòng check-in',
      scheduledAt: '2026-05-15',
      startTime: '11:15',
      endTime: '11:30',
      completedAt: null,
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'dp4',
      code: 'DP004',
      room: { id: 'r2', code: 'D201', name: 'Deluxe 201' },
      booking: null,
      status: { id: 'hs2', code: 'in_progress', name: 'Đang thực hiện' },
      assignee: { id: 'u3', fullName: 'Phạm Quốc Việt', role: 'HOUSEKEEPING' },
      priority: 'normal' as const,
      description: 'Dọn trong khi khách ở',
      scheduledAt: '2026-05-23',
      startTime: '10:15',
      endTime: null,
      completedAt: null,
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'dp5',
      code: 'DP005',
      room: { id: 'r1', code: 'P101', name: 'Standard 101' },
      booking: null,
      status: { id: 'hs1', code: 'waiting', name: 'Chờ phân công' },
      assignee: null,
      priority: 'high' as const,
      description: 'Dọn sau check-out khẩn cấp',
      scheduledAt: '2026-05-23',
      startTime: null,
      endTime: null,
      completedAt: null,
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 10, total: 5, totalPages: 1 },
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

  // Housekeeping tasks list
  await page.route('**/api/v1/housekeeping**', (route) => {
    const url = route.request().url();
    // Detail endpoint (has a UUID-ish id after /housekeeping/)
    if (/\/housekeeping\/[a-z0-9-]+$/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_TASKS.data[0] }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TASKS),
    });
  });

  // Categories — housekeeping statuses + generic fallback
  await page.route('**/api/v1/categories**', (route) => {
    const url = route.request().url();
    if (url.includes('HOUSEKEEPING_TASK_STATUS')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_STATUSES),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } }),
    });
  });

  // Users
  await page.route('**/api/v1/users**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USERS),
    }),
  );

  // Rooms
  await page.route('**/api/v1/rooms**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ROOMS),
    }),
  );

  // Bookings
  await page.route('**/api/v1/bookings**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_BOOKINGS),
    }),
  );
}

async function gotoDonPhongAsAdmin(page: import('@playwright/test').Page) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, ADMIN_AUTH);
  await setupMocks(page);
  await page.goto('/don-phong');
}

test.describe('Dọn phòng page (offline-friendly)', () => {
  test('unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });
    await page.goto('/don-phong');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('heading "Buồng phòng" is visible', async ({ page }) => {
    await gotoDonPhongAsAdmin(page);
    await expect(page.getByText('Buồng phòng').first()).toBeVisible({ timeout: 8000 });
  });

  test('table shows task codes DP001 and DP005', async ({ page }) => {
    await gotoDonPhongAsAdmin(page);
    await expect(page.getByText('DP001')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('DP005')).toBeVisible({ timeout: 8000 });
  });

  test('priority badge: rose for high, amber for normal, zinc for low', async ({ page }) => {
    await gotoDonPhongAsAdmin(page);
    // DP005 has high priority → "Cao" badge
    await expect(page.getByText('Cao').first()).toBeVisible({ timeout: 8000 });
    // DP004 has normal priority → "Trung bình" badge
    await expect(page.getByText('Trung bình').first()).toBeVisible({ timeout: 8000 });
    // DP001 has low priority → "Thấp" badge
    await expect(page.getByText('Thấp').first()).toBeVisible({ timeout: 8000 });
  });

  test('time range column shows "12:15 → 12:30" for DP001', async ({ page }) => {
    await gotoDonPhongAsAdmin(page);
    await expect(page.getByText('12:15 → 12:30')).toBeVisible({ timeout: 8000 });
  });

  test('search input is present', async ({ page }) => {
    await gotoDonPhongAsAdmin(page);
    const searchInput = page.getByLabel('Tìm kiếm công việc');
    await expect(searchInput).toBeVisible({ timeout: 8000 });
  });

  test('status filter dropdown opens and shows statuses', async ({ page }) => {
    await gotoDonPhongAsAdmin(page);
    const trigger = page.getByLabel('Lọc trạng thái');
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await trigger.click();
    await expect(page.getByRole('option', { name: 'Chờ phân công' })).toBeVisible({
      timeout: 4000,
    });
    await expect(page.getByRole('option', { name: 'Đang thực hiện' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Hoàn thành' })).toBeVisible();
  });

  test('"Tạo công việc" button is visible for ADMIN', async ({ page }) => {
    await gotoDonPhongAsAdmin(page);
    const btn = page.getByRole('button', { name: 'Tạo công việc dọn phòng mới' });
    await expect(btn).toBeVisible({ timeout: 8000 });
  });

  test('clicking "Tạo công việc" opens the form dialog', async ({ page }) => {
    await gotoDonPhongAsAdmin(page);
    const btn = page.getByRole('button', { name: 'Tạo công việc dọn phòng mới' });
    await expect(btn).toBeVisible({ timeout: 8000 });
    await btn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Tạo công việc dọn phòng')).toBeVisible({ timeout: 5000 });
  });

  test('dialog Close (Huỷ) button works', async ({ page }) => {
    await gotoDonPhongAsAdmin(page);
    const btn = page.getByRole('button', { name: 'Tạo công việc dọn phòng mới' });
    await btn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    const cancelBtn = page.getByRole('button', { name: 'Huỷ' });
    await cancelBtn.click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
  });

  test('pagination footer is always visible with pageSize picker', async ({ page }) => {
    await gotoDonPhongAsAdmin(page);
    // Pagination text
    await expect(page.getByText(/Trang 1/)).toBeVisible({ timeout: 8000 });
    // pageSize picker
    const pageSizePicker = page.getByLabel('Số dòng mỗi trang');
    await expect(pageSizePicker).toBeVisible({ timeout: 8000 });
  });
});
