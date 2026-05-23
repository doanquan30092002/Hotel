import { test, expect } from '@playwright/test';

/**
 * Nhân sự (Staff) page — offline-friendly Playwright tests.
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
    accessToken: 'mock-access-token-rec',
    refreshToken: 'mock-refresh-token-rec',
    user: {
      id: 'u3',
      email: 'receptionist@hotel.local',
      fullName: 'Lễ Tân Test',
      role: 'RECEPTIONIST',
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

const MOCK_ME_RECEPTIONIST = {
  data: {
    id: 'u3',
    email: 'receptionist@hotel.local',
    fullName: 'Lễ Tân Test',
    role: 'RECEPTIONIST',
    status: 'ACTIVE',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
};

const MOCK_DEPARTMENTS = {
  data: [
    {
      id: 'dept1',
      code: 'buong_phong',
      name: 'Buồng phòng',
      group: 'STAFF_DEPARTMENT',
      sortOrder: 0,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'dept2',
      code: 'quan_ly',
      name: 'Quản lý',
      group: 'STAFF_DEPARTMENT',
      sortOrder: 1,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 100, total: 2, totalPages: 1 },
};

const MOCK_POSITIONS = {
  data: [
    {
      id: 'pos1',
      code: 'quan_ly_ca',
      name: 'Quản lý ca',
      group: 'STAFF_POSITION',
      sortOrder: 0,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
};

const MOCK_STAFF_LIST = {
  data: [
    {
      id: 's1',
      code: 'NS001',
      fullName: 'Nguyễn Hữu An',
      department: { id: 'dept2', code: 'quan_ly', name: 'Quản lý' },
      position: { id: 'pos1', code: 'quan_ly_ca', name: 'Quản lý ca' },
      phone: '0900000001',
      email: 'an@hotel.local',
      shiftType: 'day' as const,
      joinDate: '2024-01-01',
      baseSalary: '10000000',
      allowance: '1500000',
      active: true,
      avatarUrl: null,
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 's2',
      code: 'NS002',
      fullName: 'Lê Trần Mỹ',
      department: { id: 'dept1', code: 'buong_phong', name: 'Buồng phòng' },
      position: null,
      phone: '0900000002',
      email: null,
      shiftType: 'full' as const,
      joinDate: '2024-03-01',
      baseSalary: '8000000',
      allowance: '500000',
      active: true,
      avatarUrl: null,
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 's3',
      code: 'NS003',
      fullName: 'Phạm Quốc Việt',
      department: { id: 'dept1', code: 'buong_phong', name: 'Buồng phòng' },
      position: null,
      phone: '0900000003',
      email: null,
      shiftType: 'night' as const,
      joinDate: '2024-06-01',
      baseSalary: '8200000',
      allowance: '300000',
      active: false,
      avatarUrl: null,
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 10, total: 3, totalPages: 1 },
};

async function setupMocks(
  page: import('@playwright/test').Page,
  role: 'ADMIN' | 'RECEPTIONIST' = 'ADMIN',
) {
  const mockMe = role === 'ADMIN' ? MOCK_ME_ADMIN : MOCK_ME_RECEPTIONIST;

  // Auth
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMe),
    }),
  );

  // Staff catch-all — registered FIRST so it fires LAST (LIFO)
  await page.route('**/api/v1/staff**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_STAFF_LIST),
    }),
  );

  // Categories — registered AFTER catch-all so specific ones fire first (LIFO)
  await page.route('**/api/v1/categories**', (route) => {
    const url = route.request().url();
    if (url.includes('STAFF_DEPARTMENT')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DEPARTMENTS),
      });
    }
    if (url.includes('STAFF_POSITION')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_POSITIONS),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } }),
    });
  });
}

async function gotoNhanSuAsAdmin(page: import('@playwright/test').Page) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, ADMIN_AUTH);
  await setupMocks(page);
  await page.goto('/nhan-su');
}

async function gotoNhanSuAsReceptionist(page: import('@playwright/test').Page) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, RECEPTIONIST_AUTH);
  await setupMocks(page, 'RECEPTIONIST');
  await page.goto('/nhan-su');
}

test.describe('Nhân sự page (offline-friendly)', () => {
  test('1. unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });
    await page.goto('/nhan-su');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('2. heading "Nhân sự" is visible', async ({ page }) => {
    await gotoNhanSuAsAdmin(page);
    await expect(page.getByText('Nhân sự').first()).toBeVisible({ timeout: 8000 });
  });

  test('3. table shows NS001', async ({ page }) => {
    await gotoNhanSuAsAdmin(page);
    await expect(page.getByText('NS001')).toBeVisible({ timeout: 8000 });
  });

  test('4. KPI "Nhân sự đang làm" is visible', async ({ page }) => {
    await gotoNhanSuAsAdmin(page);
    await expect(page.getByText('Nhân sự đang làm')).toBeVisible({ timeout: 8000 });
  });

  test('5. status badge "Đang làm" (sky) is visible', async ({ page }) => {
    await gotoNhanSuAsAdmin(page);
    const badges = page.getByText('Đang làm');
    await expect(badges.first()).toBeVisible({ timeout: 8000 });
  });

  test('6. search input is present', async ({ page }) => {
    await gotoNhanSuAsAdmin(page);
    const searchInput = page.getByLabel('Tìm kiếm nhân sự');
    await expect(searchInput).toBeVisible({ timeout: 8000 });
  });

  test('7. department filter dropdown opens', async ({ page }) => {
    await gotoNhanSuAsAdmin(page);
    const trigger = page.getByLabel('Lọc bộ phận');
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await trigger.click();
    await expect(page.getByRole('option', { name: 'Buồng phòng' })).toBeVisible({ timeout: 4000 });
  });

  test('8. "Thêm nhân sự" button is visible for ADMIN', async ({ page }) => {
    await gotoNhanSuAsAdmin(page);
    const btn = page.getByRole('button', { name: 'Thêm nhân sự mới' });
    await expect(btn).toBeVisible({ timeout: 8000 });
  });

  test('9. clicking "Thêm nhân sự" opens form dialog', async ({ page }) => {
    await gotoNhanSuAsAdmin(page);
    const btn = page.getByRole('button', { name: 'Thêm nhân sự mới' });
    await expect(btn).toBeVisible({ timeout: 8000 });
    await btn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Thêm nhân sự' })).toBeVisible({
      timeout: 5000,
    });
  });

  test('10. RECEPTIONIST sees PermissionDenied panel', async ({ page }) => {
    await gotoNhanSuAsReceptionist(page);
    await expect(page.getByText('Bạn không có quyền truy cập')).toBeVisible({ timeout: 8000 });
  });
});
