import { test, expect } from '@playwright/test';

/**
 * Khách hàng (customers) page — offline-friendly Playwright tests.
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

const HOUSEKEEPING_AUTH = JSON.stringify({
  state: {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: 'u3',
      email: 'housekeeping@hotel.local',
      fullName: 'Housekeeping Test',
      role: 'HOUSEKEEPING',
      status: 'ACTIVE',
      avatarUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
  },
  version: 0,
});

const MOCK_CUSTOMERS = [
  {
    id: 'c1',
    code: 'KH001',
    fullName: 'Nguyễn Minh Anh',
    phone: '0901234567',
    idNumber: '001234567890',
    email: 'minh.anh@example.com',
    address: 'Quận 1, TP.HCM',
    nationality: 'Việt Nam',
    sourceId: 'src1',
    source: { id: 'src1', code: 'facebook', name: 'Facebook' },
    note: null,
    docs: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    code: 'KH002',
    fullName: 'Trần Hà Linh',
    phone: '0912345678',
    idNumber: '001234567891',
    email: 'ha.linh@example.com',
    address: 'Đà Nẵng',
    nationality: 'Việt Nam',
    sourceId: null,
    source: null,
    note: null,
    docs: ['https://example.com/doc1.pdf'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const MOCK_CUSTOMERS_RESPONSE = {
  data: MOCK_CUSTOMERS,
  meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
};

const MOCK_CATEGORIES_RESPONSE = {
  data: [
    {
      id: 'src1',
      code: 'facebook',
      name: 'Facebook',
      group: 'GUEST_SOURCE',
      sortOrder: 0,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
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

const MOCK_ME_HOUSEKEEPING = {
  data: {
    id: 'u3',
    email: 'housekeeping@hotel.local',
    fullName: 'Housekeeping Test',
    role: 'HOUSEKEEPING',
    status: 'ACTIVE',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
};

type MockRole = 'ADMIN' | 'RECEPTIONIST' | 'HOUSEKEEPING';

async function setupMocks(page: import('@playwright/test').Page, role: MockRole = 'ADMIN') {
  const meResponse =
    role === 'ADMIN'
      ? MOCK_ME_ADMIN
      : role === 'RECEPTIONIST'
        ? MOCK_ME_RECEPTIONIST
        : MOCK_ME_HOUSEKEEPING;

  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(meResponse),
    }),
  );

  await page.route('**/api/v1/customers**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CUSTOMERS_RESPONSE),
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

async function gotoKhachHangAs(
  page: import('@playwright/test').Page,
  role: MockRole,
  auth: string,
) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, auth);
  await setupMocks(page, role);
  await page.goto('/khach-hang');
}

test.describe('Khách hàng page (offline-friendly)', () => {
  test('unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });
    await page.goto('/khach-hang');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('page loads with customer list for admin', async ({ page }) => {
    await gotoKhachHangAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByText('KH001')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Nguyễn Minh Anh')).toBeVisible();
  });

  test('search input is visible and accepts input', async ({ page }) => {
    await gotoKhachHangAs(page, 'ADMIN', ADMIN_AUTH);
    const searchInput = page.getByLabel('Tìm kiếm khách hàng');
    await expect(searchInput).toBeVisible({ timeout: 8000 });
    await searchInput.fill('Nguyễn');
    await expect(searchInput).toHaveValue('Nguyễn');
  });

  test('view toggle Bảng/Lưới is visible', async ({ page }) => {
    await gotoKhachHangAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Xem dạng bảng')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Xem dạng lưới')).toBeVisible();
  });

  test('can switch to grid view', async ({ page }) => {
    await gotoKhachHangAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Xem dạng lưới')).toBeVisible({ timeout: 8000 });
    await page.getByLabel('Xem dạng lưới').click();
    // In grid view the full name is still visible in the card
    await expect(page.getByText('Nguyễn Minh Anh').first()).toBeVisible({ timeout: 5000 });
  });

  test('ADMIN sees Edit and Delete buttons', async ({ page }) => {
    await gotoKhachHangAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Sửa khách KH001').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Xoá khách KH001').first()).toBeVisible();
  });

  test('RECEPTIONIST sees Edit but not Delete', async ({ page }) => {
    await gotoKhachHangAs(page, 'RECEPTIONIST', RECEPTIONIST_AUTH);
    await expect(page.getByLabel('Tìm kiếm khách hàng')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Sửa khách KH001').first()).toBeVisible();
    await expect(page.getByLabel('Xoá khách KH001')).not.toBeVisible();
  });

  test('HOUSEKEEPING does not see Add button', async ({ page }) => {
    await gotoKhachHangAs(page, 'HOUSEKEEPING', HOUSEKEEPING_AUTH);
    await expect(page.getByLabel('Tìm kiếm khách hàng')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Thêm khách hàng mới')).not.toBeVisible();
  });

  test('open create dialog on add button click', async ({ page }) => {
    await gotoKhachHangAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Thêm khách hàng mới')).toBeVisible({ timeout: 8000 });
    await page.getByLabel('Thêm khách hàng mới').click();
    await expect(page.getByRole('dialog').getByText('Thêm khách hàng mới')).toBeVisible({
      timeout: 5000,
    });
  });

  test('source filter select is visible', async ({ page }) => {
    await gotoKhachHangAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Lọc nguồn khách')).toBeVisible({ timeout: 8000 });
  });
});
