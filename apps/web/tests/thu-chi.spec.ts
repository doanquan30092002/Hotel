import { test, expect } from '@playwright/test';

/**
 * Thu chi (Finance) page — offline-friendly Playwright tests.
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

const MOCK_FINANCE_GROUPS = {
  data: [
    {
      id: 'fg1',
      code: 'room_revenue',
      name: 'Doanh thu phòng',
      group: 'FINANCE_GROUP',
      sortOrder: 0,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'fg2',
      code: 'operation_expense',
      name: 'Chi vận hành',
      group: 'FINANCE_GROUP',
      sortOrder: 1,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'fg3',
      code: 'payroll',
      name: 'Lương',
      group: 'FINANCE_GROUP',
      sortOrder: 2,
      active: true,
      meta: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 100, total: 3, totalPages: 1 },
};

const MOCK_SUMMARY = {
  data: {
    from: '2026-05-01',
    to: '2026-06-01',
    totalIncome: '15660000',
    totalExpense: '16550000',
    payrollExpense: '14300000',
    netProfit: '-890000',
    countTransactions: 17,
    byGroup: [],
  },
};

const MOCK_FINANCE_LIST = {
  data: [
    {
      id: 'tx1',
      code: 'TC001',
      type: 'INCOME' as const,
      group: { id: 'fg1', code: 'room_revenue', name: 'Doanh thu phòng' },
      booking: { id: 'bk1', code: 'BK001' },
      method: { id: 'm1', code: 'cash', name: 'Tiền mặt' },
      description: 'Thu tiền phòng BK001',
      amount: '500000',
      occurredAt: '2026-05-23',
      createdBy: { id: 'u1', fullName: 'Admin Test', role: 'ADMIN' },
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'tx2',
      code: 'TC002',
      type: 'EXPENSE' as const,
      group: { id: 'fg2', code: 'operation_expense', name: 'Chi vận hành' },
      booking: null,
      method: null,
      description: 'Mua vật tư dọn phòng',
      amount: '150000',
      occurredAt: '2026-05-22',
      createdBy: { id: 'u1', fullName: 'Admin Test', role: 'ADMIN' },
      note: 'Chổi, giẻ lau',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'tx3',
      code: 'TC003',
      type: 'INCOME' as const,
      group: { id: 'fg1', code: 'room_revenue', name: 'Doanh thu phòng' },
      booking: { id: 'bk2', code: 'BK002' },
      method: { id: 'm2', code: 'transfer', name: 'Chuyển khoản' },
      description: 'Thu đặt cọc BK002',
      amount: '1000000',
      occurredAt: '2026-05-21',
      createdBy: null,
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'tx4',
      code: 'TC004',
      type: 'EXPENSE' as const,
      group: { id: 'fg3', code: 'payroll', name: 'Lương' },
      booking: null,
      method: { id: 'm2', code: 'transfer', name: 'Chuyển khoản' },
      description: 'Trả lương tháng 5',
      amount: '14300000',
      occurredAt: '2026-05-31',
      createdBy: { id: 'u1', fullName: 'Admin Test', role: 'ADMIN' },
      note: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 10, total: 4, totalPages: 1 },
};

const MOCK_BOOKING_PAYMENTS = {
  data: [
    {
      paymentId: 'pay1',
      bookingId: 'bk1',
      bookingCode: 'BK001',
      customerName: 'Nguyễn Văn A',
      amount: '500000',
      paidAt: '2026-05-23T10:00:00Z',
      method: { id: 'm1', code: 'cash', name: 'Tiền mặt' },
      roomLabel: 'Standard 101',
    },
    {
      paymentId: 'pay2',
      bookingId: 'bk2',
      bookingCode: 'BK002',
      customerName: 'Trần Thị B',
      amount: '1000000',
      paidAt: '2026-05-21T14:00:00Z',
      method: { id: 'm2', code: 'transfer', name: 'Chuyển khoản' },
      roomLabel: 'Deluxe 201',
    },
    {
      paymentId: 'pay3',
      bookingId: 'bk3',
      bookingCode: 'BK003',
      customerName: null,
      amount: '2000000',
      paidAt: '2026-05-20T09:30:00Z',
      method: { id: 'm2', code: 'transfer', name: 'Chuyển khoản' },
      roomLabel: 'Bungalow 301',
    },
  ],
  meta: { page: 1, pageSize: 12, total: 3, totalPages: 1 },
};

const MOCK_BOOKINGS = {
  data: [
    {
      id: 'bk1',
      code: 'BK001',
      customer: { id: 'c1', code: 'KH001', fullName: 'Nguyễn Văn A', phone: null },
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
      paidAmount: '500000',
      remainingAmount: '500000',
      note: null,
      itemCount: 1,
      paymentCount: 1,
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

  // Finance list catch-all — registered FIRST so it fires LAST (LIFO ordering in Playwright)
  await page.route('**/api/v1/finance**', (route) => {
    const url = route.request().url();
    // Detail endpoint has id after /finance/
    if (/\/finance\/[a-z0-9-]+$/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_FINANCE_LIST.data[0] }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_FINANCE_LIST),
    });
  });

  // Finance summary — registered AFTER catch-all so it fires FIRST (LIFO)
  await page.route('**/api/v1/finance/summary**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SUMMARY),
    }),
  );

  // Finance booking-payments — registered LAST so it fires FIRST (LIFO)
  await page.route('**/api/v1/finance/booking-payments**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_BOOKING_PAYMENTS),
    }),
  );

  // Categories — finance groups + payment methods + generic fallback
  await page.route('**/api/v1/categories**', (route) => {
    const url = route.request().url();
    if (url.includes('FINANCE_GROUP')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_FINANCE_GROUPS),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } }),
    });
  });

  // Bookings
  await page.route('**/api/v1/bookings**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_BOOKINGS),
    }),
  );
}

async function gotoThuChiAsAdmin(page: import('@playwright/test').Page) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, ADMIN_AUTH);
  await setupMocks(page);
  await page.goto('/thu-chi');
}

async function gotoThuChiAsReceptionist(page: import('@playwright/test').Page) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, RECEPTIONIST_AUTH);
  await setupMocks(page, 'RECEPTIONIST');
  await page.goto('/thu-chi');
}

test.describe('Thu chi page (offline-friendly)', () => {
  test('unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });
    await page.goto('/thu-chi');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('heading "Thu chi" is visible', async ({ page }) => {
    await gotoThuChiAsAdmin(page);
    await expect(page.getByText('Thu chi vận hành').first()).toBeVisible({ timeout: 8000 });
  });

  test('KPI card "Tổng tiền thu" shows summary value', async ({ page }) => {
    await gotoThuChiAsAdmin(page);
    await expect(page.getByText('Tổng tiền thu')).toBeVisible({ timeout: 8000 });
    // 15.660.000 đ formatted
    await expect(page.getByText(/15\.660\.000/)).toBeVisible({ timeout: 8000 });
  });

  test('KPI card "Lợi nhuận ròng" is red when negative', async ({ page }) => {
    await gotoThuChiAsAdmin(page);
    await expect(page.getByText('Lợi nhuận ròng')).toBeVisible({ timeout: 8000 });
    // netProfit is -890000 → should show "Âm — cần chú ý"
    await expect(page.getByText('Âm — cần chú ý')).toBeVisible({ timeout: 8000 });
  });

  test('table shows TC001 in finance list', async ({ page }) => {
    await gotoThuChiAsAdmin(page);
    await expect(page.getByText('TC001')).toBeVisible({ timeout: 8000 });
  });

  test('table shows TC002 with Chi badge', async ({ page }) => {
    await gotoThuChiAsAdmin(page);
    await expect(page.getByText('TC002')).toBeVisible({ timeout: 8000 });
    // "Chi" badge for EXPENSE
    const chiBadges = page.getByText('Chi');
    await expect(chiBadges.first()).toBeVisible({ timeout: 8000 });
  });

  test('booking payments panel shows BK001', async ({ page }) => {
    await gotoThuChiAsAdmin(page);
    await expect(page.getByText('Thanh toán booking')).toBeVisible({ timeout: 8000 });
    // booking payment row shows "BK001 – Standard 101"
    await expect(page.getByText(/BK001 – Standard/)).toBeVisible({ timeout: 8000 });
  });

  test('type filter dropdown opens and shows options', async ({ page }) => {
    await gotoThuChiAsAdmin(page);
    const trigger = page.getByLabel('Lọc loại thu chi');
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await trigger.click();
    await expect(page.getByRole('option', { name: 'Thu' })).toBeVisible({ timeout: 4000 });
    await expect(page.getByRole('option', { name: 'Chi' })).toBeVisible();
  });

  test('group filter dropdown opens and shows finance groups', async ({ page }) => {
    await gotoThuChiAsAdmin(page);
    const trigger = page.getByLabel('Lọc nhóm');
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await trigger.click();
    await expect(page.getByRole('option', { name: 'Doanh thu phòng' })).toBeVisible({
      timeout: 4000,
    });
    await expect(page.getByRole('option', { name: 'Chi vận hành' })).toBeVisible();
  });

  test('"Tạo phiếu thu chi" button is visible for ADMIN', async ({ page }) => {
    await gotoThuChiAsAdmin(page);
    const btn = page.getByRole('button', { name: 'Tạo phiếu thu chi mới' });
    await expect(btn).toBeVisible({ timeout: 8000 });
  });

  test('clicking "Tạo phiếu thu chi" opens the form dialog', async ({ page }) => {
    await gotoThuChiAsAdmin(page);
    const btn = page.getByRole('button', { name: 'Tạo phiếu thu chi mới' });
    await expect(btn).toBeVisible({ timeout: 8000 });
    await btn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Tạo phiếu thu chi' })).toBeVisible({
      timeout: 5000,
    });
  });

  test('dialog Cancel (Huỷ) button works', async ({ page }) => {
    await gotoThuChiAsAdmin(page);
    const btn = page.getByRole('button', { name: 'Tạo phiếu thu chi mới' });
    await btn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    const cancelBtn = page.getByRole('button', { name: 'Huỷ' });
    await cancelBtn.click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
  });

  test('pagination footer is always visible with pageSize picker', async ({ page }) => {
    await gotoThuChiAsAdmin(page);
    await expect(page.getByText(/Trang 1/)).toBeVisible({ timeout: 8000 });
    const pageSizePicker = page.getByLabel('Số dòng mỗi trang');
    await expect(pageSizePicker).toBeVisible({ timeout: 8000 });
  });

  test('RECEPTIONIST sees permission denied panel (not ADMIN/MANAGER)', async ({ page }) => {
    await gotoThuChiAsReceptionist(page);
    await expect(page.getByText('Bạn không có quyền truy cập')).toBeVisible({ timeout: 8000 });
  });
});
