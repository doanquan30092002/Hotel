import { test, expect } from '@playwright/test';

/**
 * Phòng (rooms) page — offline-friendly Playwright tests.
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

const MOCK_ROOMS = [
  {
    id: 'r1',
    code: 'P101',
    name: 'Phòng 101 – Standard',
    typeId: 'type1',
    type: { id: 'type1', code: 'single', name: 'Phòng đơn' },
    areaId: 'area1',
    area: { id: 'area1', code: 'f1', name: 'Tầng 1' },
    capacity: 2,
    basePrice: '850000',
    weekendPrice: '950000',
    holidayPrice: '1150000',
    statusId: 'status1',
    status: { id: 'status1', code: 'ready', name: 'Sẵn sàng' },
    cleaningStatusId: 'clean1',
    cleaningStatus: { id: 'clean1', code: 'clean', name: 'Sạch' },
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
    images: [],
    note: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'r2',
    code: 'P201',
    name: 'Phòng 201 – Deluxe',
    typeId: 'type2',
    type: { id: 'type2', code: 'double', name: 'Phòng đôi' },
    areaId: 'area2',
    area: { id: 'area2', code: 'f2', name: 'Tầng 2' },
    capacity: 3,
    basePrice: '1500000',
    weekendPrice: '1700000',
    holidayPrice: null,
    statusId: 'status2',
    status: { id: 'status2', code: 'occupied', name: 'Đang ở' },
    cleaningStatusId: 'clean2',
    cleaningStatus: { id: 'clean2', code: 'dirty', name: 'Cần dọn' },
    defaultCheckIn: '14:00',
    defaultCheckOut: '12:00',
    images: [],
    note: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const MOCK_ROOMS_RESPONSE = {
  data: MOCK_ROOMS,
  meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
};

const MOCK_CATEGORIES_RESPONSE = (group: string) => ({
  data: [
    {
      id: `${group}-1`,
      code: 'c1',
      name: 'Danh mục 1',
      group,
      sortOrder: 0,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
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

  // Mock /auth/me — must return the correct role so the layout setSession stays consistent
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(meResponse),
    }),
  );

  // Mock rooms list
  await page.route('**/api/v1/rooms**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ROOMS_RESPONSE),
    }),
  );

  // Mock categories (all groups)
  await page.route('**/api/v1/categories**', (route) => {
    const url = new URL(route.request().url());
    const group = url.searchParams.get('group') ?? 'ROOM_TYPE';
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CATEGORIES_RESPONSE(group)),
    });
  });
}

/**
 * Navigate to /phong with admin auth and all API mocks active.
 * Uses addInitScript to inject localStorage BEFORE page JS runs.
 */
async function gotoPhongAsAdmin(page: import('@playwright/test').Page) {
  await page.addInitScript((auth: string) => {
    window.localStorage.setItem('hotel.auth', auth);
  }, ADMIN_AUTH);
  await setupMocks(page, 'ADMIN');
  await page.goto('/phong');
}

async function gotoPhongAsReceptionist(page: import('@playwright/test').Page) {
  await page.addInitScript((auth: string) => {
    window.localStorage.setItem('hotel.auth', auth);
  }, RECEPTIONIST_AUTH);
  await setupMocks(page, 'RECEPTIONIST');
  await page.goto('/phong');
}

test.describe('Phòng page (offline-friendly)', () => {
  test('unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    // No auth set → clear localStorage via addInitScript (runs before JS)
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });

    await page.goto('/phong');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('page loads with room list for admin', async ({ page }) => {
    await gotoPhongAsAdmin(page);

    // Table view should be default — check for room codes
    await expect(page.getByText('P101')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('P201')).toBeVisible();
  });

  test('search input is visible', async ({ page }) => {
    await gotoPhongAsAdmin(page);
    await expect(page.getByLabel('Tìm kiếm phòng')).toBeVisible({ timeout: 8000 });
  });

  test('view toggle Bảng/Lưới is visible', async ({ page }) => {
    await gotoPhongAsAdmin(page);
    await expect(page.getByLabel('Xem dạng bảng')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Xem dạng lưới')).toBeVisible();
  });

  test('can switch to grid view', async ({ page }) => {
    await gotoPhongAsAdmin(page);

    await expect(page.getByLabel('Xem dạng lưới')).toBeVisible({ timeout: 8000 });
    await page.getByLabel('Xem dạng lưới').click();

    // Room name should be visible in grid
    await expect(page.getByText('Phòng 101 – Standard')).toBeVisible({ timeout: 5000 });
  });

  test('add button visible for ADMIN', async ({ page }) => {
    await gotoPhongAsAdmin(page);
    await expect(page.getByLabel('Thêm phòng mới')).toBeVisible({ timeout: 8000 });
  });

  test('add button hidden for RECEPTIONIST', async ({ page }) => {
    await gotoPhongAsReceptionist(page);

    // Wait for page to fully load by checking search input
    await expect(page.getByLabel('Tìm kiếm phòng')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Thêm phòng mới')).not.toBeVisible();
  });

  test('edit and delete buttons visible for ADMIN', async ({ page }) => {
    await gotoPhongAsAdmin(page);

    // Table should have loaded — edit/delete buttons present
    await expect(page.getByLabel('Sửa phòng P101').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Xoá phòng P101').first()).toBeVisible();
  });

  test('only view button visible for RECEPTIONIST', async ({ page }) => {
    await gotoPhongAsReceptionist(page);

    await expect(page.getByLabel('Xem chi tiết phòng P101').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Sửa phòng P101')).not.toBeVisible();
    await expect(page.getByLabel('Xoá phòng P101')).not.toBeVisible();
  });

  test('filter selects are visible', async ({ page }) => {
    await gotoPhongAsAdmin(page);

    await expect(page.getByLabel('Lọc loại phòng')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Lọc trạng thái')).toBeVisible();
    await expect(page.getByLabel('Lọc khu vực')).toBeVisible();
  });

  test('open create dialog on add button click', async ({ page }) => {
    await gotoPhongAsAdmin(page);

    await expect(page.getByLabel('Thêm phòng mới')).toBeVisible({ timeout: 8000 });
    await page.getByLabel('Thêm phòng mới').click();
    // Dialog title "Thêm phòng mới" appears in the dialog header
    await expect(page.getByRole('dialog').getByText('Thêm phòng mới')).toBeVisible({
      timeout: 5000,
    });
  });
});
