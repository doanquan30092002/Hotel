import { test, expect } from '@playwright/test';

/**
 * Dashboard Tổng quan — offline-friendly Playwright tests.
 * All API calls are intercepted/mocked — no live BE required.
 * 12 tests total.
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
      email: 'recep@hotel.local',
      fullName: 'Recep Test',
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
    id: 'u2',
    email: 'recep@hotel.local',
    fullName: 'Recep Test',
    role: 'RECEPTIONIST',
    status: 'ACTIVE',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
};

// Full mock fixture matching the actual BE DashboardResponse shape
const MOCK_DASHBOARD = {
  data: {
    from: '2026-05-01',
    to: '2026-06-01',
    tab: 'overview',
    kpi: {
      occupancyPercent: 40,
      vacantNights: 5,
      todayCheckIns: 4,
      monthRevenue: '37810000',
      monthExpense: '12500000',
      totalBookings: 42,
    },
    overview: {
      revenueTimeline: [
        { date: '2026-05-01', revenue: '6150000', expense: '2000000', profit: '4150000' },
        { date: '2026-05-02', revenue: '8200000', expense: '2500000', profit: '5700000' },
        { date: '2026-05-03', revenue: '4300000', expense: '1800000', profit: '2500000' },
        { date: '2026-05-04', revenue: '9100000', expense: '3000000', profit: '6100000' },
        { date: '2026-05-05', revenue: '5500000', expense: '2200000', profit: '3300000' },
      ],
      occupancyTodayPercent: 40,
      roomStatusDonut: [
        { code: 'available', name: 'Sẵn sàng', count: 5 },
        { code: 'occupied', name: 'Đang ở', count: 4 },
        { code: 'maintenance', name: 'Bảo trì', count: 1 },
      ],
      bookingSourceBar: [
        { code: 'walkin', name: 'Walk-in', count: 20 },
        { code: 'online', name: 'Online', count: 15 },
        { code: 'phone', name: 'Điện thoại', count: 7 },
      ],
    },
    bookingOccupancy: {
      bookingTrend: [
        { date: '2026-05-01', count: 3 },
        { date: '2026-05-02', count: 5 },
        { date: '2026-05-03', count: 2 },
        { date: '2026-05-04', count: 7 },
        { date: '2026-05-05', count: 4 },
      ],
      occupancyHeatmap: [
        {
          roomCode: 'P101',
          days: [
            { date: '2026-05-01', occupied: true },
            { date: '2026-05-02', occupied: false },
            { date: '2026-05-03', occupied: true },
          ],
        },
        {
          roomCode: 'P102',
          days: [
            { date: '2026-05-01', occupied: false },
            { date: '2026-05-02', occupied: true },
            { date: '2026-05-03', occupied: false },
          ],
        },
      ],
      topRevenueRooms: [
        { roomId: 'r1', code: 'P101', name: 'Phòng tiêu chuẩn 101', revenue: '12500000' },
        { roomId: 'r2', code: 'V101', name: 'Phòng VIP 101', revenue: '9800000' },
      ],
      sourceDonut: [
        { code: 'walkin', name: 'Walk-in', count: 22 },
        { code: 'online', name: 'Trực tuyến', count: 14 },
        { code: 'phone', name: 'Điện thoại', count: 6 },
      ],
    },
    finance: {
      revenueExpenseTimeline: [
        { date: '2026-05-01', revenue: '6150000', expense: '2100000', profit: '4050000' },
        { date: '2026-05-02', revenue: '8200000', expense: '3400000', profit: '4800000' },
      ],
      targetProgressPercent: 4,
      expenseByGroupBar: [
        { code: 'ops', name: 'Vận hành', amount: '8000000' },
        { code: 'salary', name: 'Lương', amount: '4500000' },
      ],
      revenueBySourceBar: [
        { code: 'room', name: 'Phòng', amount: '30000000' },
        { code: 'service', name: 'Dịch vụ', amount: '7810000' },
      ],
    },
    housekeeping: {
      todayProgressPercent: 20,
      workloadHeatmap: [
        { date: '2026-05-01', counts: { high: 2, normal: 5, low: 1 } },
        { date: '2026-05-02', counts: { high: 1, normal: 3, low: 2 } },
      ],
      staffEfficiencyBar: [
        { staffId: 'u3', fullName: 'Nguyễn Thị Lan', doneCount: 8, avgMinutes: 35 },
        { staffId: 'u4', fullName: 'Trần Văn Bình', doneCount: 7, avgMinutes: 40 },
      ],
      cleaningStatusDonut: [
        { code: 'clean', name: 'Sạch', count: 6 },
        { code: 'dirty', name: 'Cần dọn', count: 3 },
        { code: 'in_progress', name: 'Đang dọn', count: 1 },
      ],
    },
  },
};

async function setupMocksAdmin(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ME_ADMIN),
    }),
  );

  await page.route('**/api/v1/dashboard**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DASHBOARD),
    }),
  );
}

async function setupMocksReceptionist(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ME_RECEPTIONIST),
    }),
  );

  await page.route('**/api/v1/dashboard**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DASHBOARD),
    }),
  );
}

async function setupMocks500(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ME_ADMIN),
    }),
  );

  await page.route('**/api/v1/dashboard**', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      }),
    }),
  );
}

async function gotoAsAdmin(page: import('@playwright/test').Page) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, ADMIN_AUTH);
  await setupMocksAdmin(page);
  await page.goto('/tong-quan');
}

async function gotoAsReceptionist(page: import('@playwright/test').Page) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, RECEPTIONIST_AUTH);
  await setupMocksReceptionist(page);
  await page.goto('/tong-quan');
}

test.describe('Dashboard Tổng quan (offline-friendly)', () => {
  test('1. unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });
    await page.goto('/tong-quan');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('2. heading "Dashboard tổng quan" is visible', async ({ page }) => {
    await gotoAsAdmin(page);
    await expect(page.getByText('Dashboard tổng quan').first()).toBeVisible({ timeout: 8000 });
  });

  test('3. 4 tab buttons are visible', async ({ page }) => {
    await gotoAsAdmin(page);
    await expect(page.getByRole('tab', { name: 'Tổng quan' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('tab', { name: 'Booking & Công suất' })).toBeVisible({
      timeout: 4000,
    });
    await expect(page.getByRole('tab', { name: 'Tài chính' })).toBeVisible({ timeout: 4000 });
    await expect(page.getByRole('tab', { name: 'Buồng phòng' })).toBeVisible({ timeout: 4000 });
  });

  test('4. KPI cards visible — 6 labels present', async ({ page }) => {
    await gotoAsAdmin(page);
    await expect(page.getByText('Tổng booking').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Công suất phòng').first()).toBeVisible();
    await expect(page.getByText('Check-in hôm nay').first()).toBeVisible();
    await expect(page.getByText('Doanh thu tháng').first()).toBeVisible();
    await expect(page.getByText('Chi phí tháng').first()).toBeVisible();
    await expect(page.getByText('Phòng trống sạch').first()).toBeVisible();
  });

  test('5. default tab "Tổng quan" shows chart SVG', async ({ page }) => {
    await gotoAsAdmin(page);
    const tabBtn = page.getByRole('tab', { name: 'Tổng quan' });
    await expect(tabBtn).toHaveAttribute('aria-selected', 'true');
    // Recharts renders SVG elements
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 8000 });
  });

  test('6. switch to "Booking & Công suất" tab — heatmap visible', async ({ page }) => {
    await gotoAsAdmin(page);
    const tabBtn = page.getByRole('tab', { name: 'Booking & Công suất' });
    await expect(tabBtn).toBeVisible({ timeout: 8000 });
    await tabBtn.click();
    await expect(tabBtn).toHaveAttribute('aria-selected', 'true');
    // Heatmap heading should appear
    await expect(page.getByText('Heatmap công suất').first()).toBeVisible({ timeout: 5000 });
    // Heatmap cells with room code P101
    await expect(page.getByText('P101').first()).toBeVisible({ timeout: 5000 });
  });

  test('7. switch to "Tài chính" tab — Target gauge visible', async ({ page }) => {
    await gotoAsAdmin(page);
    const tabBtn = page.getByRole('tab', { name: 'Tài chính' });
    await expect(tabBtn).toBeVisible({ timeout: 8000 });
    await tabBtn.click();
    await expect(tabBtn).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Target doanh thu tháng').first()).toBeVisible({ timeout: 5000 });
    // The gauge shows percent: 4%
    await expect(page.getByText('4%').first()).toBeVisible({ timeout: 5000 });
  });

  test('8. switch to "Buồng phòng" tab — Tiến độ gauge visible', async ({ page }) => {
    await gotoAsAdmin(page);
    const tabBtn = page.getByRole('tab', { name: 'Buồng phòng' });
    await expect(tabBtn).toBeVisible({ timeout: 8000 });
    await tabBtn.click();
    await expect(tabBtn).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Tiến độ dọn phòng hôm nay').first()).toBeVisible({
      timeout: 5000,
    });
    // The gauge shows todayProgressPercent: 20%
    await expect(page.getByText('20%').first()).toBeVisible({ timeout: 5000 });
  });

  test('9. from/to date inputs are editable', async ({ page }) => {
    await gotoAsAdmin(page);
    const fromInput = page.getByLabel('Từ ngày');
    const toInput = page.getByLabel('Đến ngày');
    await expect(fromInput).toBeVisible({ timeout: 8000 });
    await expect(toInput).toBeVisible({ timeout: 4000 });
    await fromInput.fill('2026-04-01');
    await expect(fromInput).toHaveValue('2026-04-01');
    await toInput.fill('2026-04-30');
    await expect(toInput).toHaveValue('2026-04-30');
  });

  test('10. "7 ngày gần nhất" preset button changes from date', async ({ page }) => {
    await gotoAsAdmin(page);
    const fromInput = page.getByLabel('Từ ngày');
    await expect(fromInput).toBeVisible({ timeout: 8000 });

    const beforeValue = await fromInput.inputValue();

    const sevenDaysBtn = page.getByRole('button', { name: '7 ngày gần nhất' });
    await expect(sevenDaysBtn).toBeVisible({ timeout: 4000 });
    await sevenDaysBtn.click();

    const afterValue = await fromInput.inputValue();
    expect(afterValue.length).toBeGreaterThan(0);
    expect(afterValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Default is start-of-month; 7-day preset is today-7, which differs unless today IS start-of-month
    // Just verify it's a valid date that changed
    expect(afterValue).not.toBe(beforeValue);
  });

  test('11. RECEPTIONIST sees PermissionDenied screen', async ({ page }) => {
    await gotoAsReceptionist(page);
    await expect(page.getByText('Bạn không có quyền truy cập').first()).toBeVisible({
      timeout: 8000,
    });
  });

  test('12. error state with mocked 500 shows Retry button', async ({ page }) => {
    await page.addInitScript((a: string) => {
      window.localStorage.setItem('hotel.auth', a);
    }, ADMIN_AUTH);
    await setupMocks500(page);
    await page.goto('/tong-quan');
    // The error state inside the tab content shows "Thử lại"
    await expect(page.getByRole('button', { name: 'Thử lại' }).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
