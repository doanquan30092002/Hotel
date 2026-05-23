import { test, expect } from '@playwright/test';

/**
 * Bảng lương (Payroll) page — offline-friendly Playwright tests.
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

const MOCK_PAYROLL_STATUSES = {
  data: [
    {
      id: 'ps1',
      code: 'draft',
      name: 'Bản nháp',
      group: 'PAYROLL_STATUS',
      sortOrder: 0,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ps2',
      code: 'pending',
      name: 'Chờ chi',
      group: 'PAYROLL_STATUS',
      sortOrder: 1,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ps3',
      code: 'paid',
      name: 'Đã chi',
      group: 'PAYROLL_STATUS',
      sortOrder: 2,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 100, total: 3, totalPages: 1 },
};

const MOCK_PAYROLL_LIST = {
  data: [
    {
      id: 'bl1',
      code: 'BL001',
      month: '2026-05',
      staff: {
        id: 's1',
        code: 'NS001',
        fullName: 'Nguyễn Hữu An',
        avatarUrl: null,
        position: { id: 'pos1', code: 'quan_ly_ca', name: 'Quản lý ca' },
      },
      workingDays: 26,
      baseSalary: '10000000',
      allowance: '1500000',
      bonus: '0',
      penalty: '0',
      netSalary: '11500000',
      status: { id: 'ps3', code: 'paid', name: 'Đã chi' },
      paidAt: '2026-05-31T00:00:00Z',
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'bl2',
      code: 'BL002',
      month: '2026-05',
      staff: {
        id: 's2',
        code: 'NS002',
        fullName: 'Lê Trần Mỹ',
        avatarUrl: null,
        position: null,
      },
      workingDays: 25,
      baseSalary: '8000000',
      allowance: '500000',
      bonus: '500000',
      penalty: '0',
      netSalary: '9000000',
      status: { id: 'ps2', code: 'pending', name: 'Chờ chi' },
      paidAt: null,
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'bl3',
      code: 'BL003',
      month: '2026-05',
      staff: {
        id: 's3',
        code: 'NS003',
        fullName: 'Phạm Quốc Việt',
        avatarUrl: null,
        position: null,
      },
      workingDays: 28,
      baseSalary: '8200000',
      allowance: '300000',
      bonus: '0',
      penalty: '500000',
      netSalary: '8000000',
      status: { id: 'ps1', code: 'draft', name: 'Bản nháp' },
      paidAt: null,
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 10, total: 6, totalPages: 1 },
};

const MOCK_STAFF_LIST = {
  data: [
    {
      id: 's1',
      code: 'NS001',
      fullName: 'Nguyễn Hữu An',
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
  ],
  meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
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

  // Staff list — used by PayrollFormDialog
  await page.route('**/api/v1/staff**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_STAFF_LIST),
    }),
  );

  // Payroll list catch-all — registered FIRST so fires LAST
  await page.route('**/api/v1/payroll**', (route) => {
    const url = route.request().url();
    // Detail endpoint
    if (/\/payroll\/[a-z0-9-]+$/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_PAYROLL_LIST.data[0] }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PAYROLL_LIST),
    });
  });

  // Categories — PAYROLL_STATUS and STAFF_*
  await page.route('**/api/v1/categories**', (route) => {
    const url = route.request().url();
    if (url.includes('PAYROLL_STATUS')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PAYROLL_STATUSES),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } }),
    });
  });
}

async function gotoLuongAsAdmin(page: import('@playwright/test').Page) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, ADMIN_AUTH);
  await setupMocks(page);
  await page.goto('/luong');
}

async function gotoLuongAsReceptionist(page: import('@playwright/test').Page) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, RECEPTIONIST_AUTH);
  await setupMocks(page, 'RECEPTIONIST');
  await page.goto('/luong');
}

test.describe('Bảng lương page (offline-friendly)', () => {
  test('1. unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });
    await page.goto('/luong');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('2. heading "Bảng lương" is visible', async ({ page }) => {
    await gotoLuongAsAdmin(page);
    await expect(page.getByText('Bảng lương').first()).toBeVisible({ timeout: 8000 });
  });

  test('3. table shows BL001', async ({ page }) => {
    await gotoLuongAsAdmin(page);
    await expect(page.getByText('BL001')).toBeVisible({ timeout: 8000 });
  });

  test('4. KPI "Tổng thực nhận" displays formatted VND', async ({ page }) => {
    await gotoLuongAsAdmin(page);
    await expect(page.getByText('Tổng thực nhận')).toBeVisible({ timeout: 8000 });
    // 11.500.000 + 9.000.000 + 8.000.000 = 28.500.000
    await expect(page.getByText(/28\.500\.000/)).toBeVisible({ timeout: 8000 });
  });

  test('5. status badge "Đã chi" (emerald) is visible', async ({ page }) => {
    await gotoLuongAsAdmin(page);
    const paidBadges = page.getByText('Đã chi');
    await expect(paidBadges.first()).toBeVisible({ timeout: 8000 });
  });

  test('6. search input is present', async ({ page }) => {
    await gotoLuongAsAdmin(page);
    const searchInput = page.getByLabel('Tìm kiếm bảng lương');
    await expect(searchInput).toBeVisible({ timeout: 8000 });
  });

  test('7. month picker input is present', async ({ page }) => {
    await gotoLuongAsAdmin(page);
    const monthInput = page.getByLabel('Lọc theo tháng');
    await expect(monthInput).toBeVisible({ timeout: 8000 });
  });

  test('8. "Tạo bảng lương tháng" button opens generate dialog', async ({ page }) => {
    await gotoLuongAsAdmin(page);
    const btn = page.getByRole('button', { name: 'Tạo bảng lương theo tháng' });
    await expect(btn).toBeVisible({ timeout: 8000 });
    await btn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Tạo bảng lương theo tháng' })).toBeVisible({
      timeout: 5000,
    });
  });

  test('9. "Thêm bảng lương" button opens form dialog', async ({ page }) => {
    await gotoLuongAsAdmin(page);
    const btn = page.getByRole('button', { name: 'Thêm bảng lương mới' });
    await expect(btn).toBeVisible({ timeout: 8000 });
    await btn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Thêm bảng lương' })).toBeVisible({
      timeout: 5000,
    });
  });

  test('10. pagination footer with pageSize picker is visible', async ({ page }) => {
    await gotoLuongAsAdmin(page);
    await expect(page.getByText(/Trang 1/)).toBeVisible({ timeout: 8000 });
    const pageSizePicker = page.getByLabel('Số dòng mỗi trang');
    await expect(pageSizePicker).toBeVisible({ timeout: 8000 });
  });
});
