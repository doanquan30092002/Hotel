import { test, expect } from '@playwright/test';

/**
 * Dịch vụ (services) page — offline-friendly Playwright tests.
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

const MOCK_SERVICES = [
  {
    id: 's1',
    code: 'SV001',
    name: 'Tắm trắng sinh học',
    groupId: 'g1',
    group: { id: 'g1', code: 'spa', name: 'Dịch vụ' },
    unitId: 'u1',
    unit: { id: 'u1', code: 'lan', name: 'lần' },
    price: '80000',
    active: true,
    note: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 's2',
    code: 'SV002',
    name: 'Minibar',
    groupId: 'g1',
    group: { id: 'g1', code: 'spa', name: 'Dịch vụ' },
    unitId: 'u2',
    unit: { id: 'u2', code: 'lan', name: 'lần' },
    price: '50000',
    active: false,
    note: 'Hết hàng',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const MOCK_SERVICES_RESPONSE = {
  data: MOCK_SERVICES,
  meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
};

const MOCK_CATEGORIES_RESPONSE = {
  data: [
    {
      id: 'g1',
      code: 'spa',
      name: 'Dịch vụ',
      group: 'SERVICE_GROUP',
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

type MockRole = 'ADMIN' | 'HOUSEKEEPING';

async function setupMocks(page: import('@playwright/test').Page, role: MockRole = 'ADMIN') {
  const meResponse = role === 'ADMIN' ? MOCK_ME_ADMIN : MOCK_ME_HOUSEKEEPING;

  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(meResponse),
    }),
  );

  await page.route('**/api/v1/services**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SERVICES_RESPONSE),
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

async function gotoDichVuAs(page: import('@playwright/test').Page, role: MockRole, auth: string) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, auth);
  await setupMocks(page, role);
  await page.goto('/dich-vu');
}

test.describe('Dịch vụ page (offline-friendly)', () => {
  test('unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });
    await page.goto('/dich-vu');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('page loads and shows page heading Dịch vụ', async ({ page }) => {
    await gotoDichVuAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByText('Dịch vụ').first()).toBeVisible({ timeout: 8000 });
  });

  test('table headers are visible', async ({ page }) => {
    await gotoDichVuAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByRole('table')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Tên dịch vụ')).toBeVisible();
    await expect(page.getByText('Nhóm dịch vụ')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Đơn vị' })).toBeVisible();
    await expect(page.getByText('Đơn giá')).toBeVisible();
    await expect(page.getByText('Trạng thái')).toBeVisible();
  });

  test('service data is displayed in table', async ({ page }) => {
    await gotoDichVuAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByText('SV001')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Tắm trắng sinh học')).toBeVisible();
    await expect(page.getByText('80.000 đ')).toBeVisible();
  });

  test('search input is visible and accepts input', async ({ page }) => {
    await gotoDichVuAs(page, 'ADMIN', ADMIN_AUTH);
    const searchInput = page.getByLabel('Tìm kiếm dịch vụ');
    await expect(searchInput).toBeVisible({ timeout: 8000 });
    await searchInput.fill('tắm');
    await expect(searchInput).toHaveValue('tắm');
  });

  test('group filter select is visible', async ({ page }) => {
    await gotoDichVuAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Lọc nhóm dịch vụ')).toBeVisible({ timeout: 8000 });
  });

  test('unit filter select is visible', async ({ page }) => {
    await gotoDichVuAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Lọc đơn vị')).toBeVisible({ timeout: 8000 });
  });

  test('ADMIN sees Thêm dịch vụ button', async ({ page }) => {
    await gotoDichVuAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Thêm dịch vụ mới')).toBeVisible({ timeout: 8000 });
  });

  test('open create dialog on add button click', async ({ page }) => {
    await gotoDichVuAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Thêm dịch vụ mới')).toBeVisible({ timeout: 8000 });
    await page.getByLabel('Thêm dịch vụ mới').click();
    await expect(page.getByRole('dialog').getByText('Thêm dịch vụ mới')).toBeVisible({
      timeout: 5000,
    });
  });

  test('create dialog shows validation errors on empty submit', async ({ page }) => {
    await gotoDichVuAs(page, 'ADMIN', ADMIN_AUTH);
    await page.getByLabel('Thêm dịch vụ mới').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    // Submit empty form
    await page.getByRole('button', { name: 'Thêm dịch vụ' }).last().click();
    await expect(page.getByText('Vui lòng nhập mã dịch vụ')).toBeVisible({ timeout: 3000 });
  });

  test('pagination footer is always visible', async ({ page }) => {
    await gotoDichVuAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Số dòng mỗi trang')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Trang trước')).toBeVisible();
    await expect(page.getByLabel('Trang tiếp')).toBeVisible();
  });

  test('HOUSEKEEPING does not see Thêm dịch vụ button and no edit/delete', async ({ page }) => {
    await gotoDichVuAs(page, 'HOUSEKEEPING', HOUSEKEEPING_AUTH);
    await expect(page.getByText('SV001')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Thêm dịch vụ mới')).not.toBeVisible();
    await expect(page.getByLabel('Sửa dịch vụ SV001')).not.toBeVisible();
    await expect(page.getByLabel('Xoá dịch vụ SV001')).not.toBeVisible();
  });

  test('ADMIN sees Edit and Delete buttons', async ({ page }) => {
    await gotoDichVuAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Sửa dịch vụ SV001')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Xoá dịch vụ SV001')).toBeVisible();
  });
});
