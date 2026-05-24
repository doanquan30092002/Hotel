import { test, expect } from '@playwright/test';

/**
 * Dashboard Tổng quan — offline-friendly Playwright tests.
 * All API calls are intercepted/mocked — no live BE required.
 * 12 tests total (baseline 145, target ≥ 157).
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

// Full mock fixture containing data for all 4 tabs
const MOCK_DASHBOARD = {
  data: {
    from: '2026-04-25',
    to: '2026-05-25',
    tab: 'overview',
    overview: {
      totalBookings: 42,
      totalRevenue: '37810000',
      occupancyPercent: 40,
      totalGuests: 128,
      bookingsTrend: [
        { date: '2026-05-01', value: 3 },
        { date: '2026-05-02', value: 5 },
        { date: '2026-05-03', value: 2 },
        { date: '2026-05-04', value: 7 },
        { date: '2026-05-05', value: 4 },
      ],
      revenueTrend: [
        { date: '2026-05-01', value: '6150000' },
        { date: '2026-05-02', value: '8200000' },
        { date: '2026-05-03', value: '4300000' },
        { date: '2026-05-04', value: '9100000' },
        { date: '2026-05-05', value: '5500000' },
      ],
    },
    bookingOccupancy: {
      totalBookings: 42,
      newBookingsTrend: [
        { date: '2026-05-01', value: 3 },
        { date: '2026-05-02', value: 5 },
      ],
      occupancyTrend: [
        { date: '2026-05-01', value: 35 },
        { date: '2026-05-02', value: 42 },
      ],
      statusBreakdown: [
        { statusCode: 'confirmed', statusName: 'Đã xác nhận', count: 18 },
        { statusCode: 'checked_in', statusName: 'Đang ở', count: 12 },
        { statusCode: 'pending', statusName: 'Chờ xác nhận', count: 8 },
        { statusCode: 'cancelled', statusName: 'Đã huỷ', count: 4 },
      ],
      sourceBreakdown: [
        { sourceCode: 'direct', sourceName: 'Trực tiếp', count: 22 },
        { sourceCode: 'online', sourceName: 'Trực tuyến', count: 14 },
        { sourceCode: 'phone', sourceName: 'Điện thoại', count: 6 },
      ],
      topRooms: [
        {
          roomId: 'r1',
          roomCode: 'P101',
          roomName: 'Phòng tiêu chuẩn 101',
          bookingCount: 8,
          revenue: '12500000',
        },
        {
          roomId: 'r2',
          roomCode: 'V101',
          roomName: 'Phòng VIP 101',
          bookingCount: 6,
          revenue: '9800000',
        },
      ],
    },
    finance: {
      totalIncome: '37810000',
      totalExpense: '12500000',
      netProfit: '25310000',
      incomeTrend: [
        { date: '2026-05-01', value: '6150000' },
        { date: '2026-05-02', value: '8200000' },
      ],
      expenseTrend: [
        { date: '2026-05-01', value: '2100000' },
        { date: '2026-05-02', value: '3400000' },
      ],
      incomeByGroup: [
        { groupCode: 'room', groupName: 'Phòng', amount: '30000000' },
        { groupCode: 'service', groupName: 'Dịch vụ', amount: '7810000' },
      ],
      expenseByGroup: [
        { groupCode: 'ops', groupName: 'Vận hành', amount: '8000000' },
        { groupCode: 'salary', groupName: 'Lương', amount: '4500000' },
      ],
    },
    housekeeping: {
      totalTasks: 20,
      completionRate: 75,
      avgCompletionHours: 1.5,
      byStatus: [
        { statusCode: 'done', statusName: 'Hoàn thành', count: 15 },
        { statusCode: 'in_progress', statusName: 'Đang làm', count: 3 },
        { statusCode: 'waiting', statusName: 'Chờ', count: 2 },
      ],
      byPriority: [
        { priority: 'high', count: 5 },
        { priority: 'normal', count: 12 },
        { priority: 'low', count: 3 },
      ],
      topAssignees: [
        { assigneeId: 'u3', assigneeName: 'Nguyễn Thị Lan', doneCount: 8 },
        { assigneeId: 'u4', assigneeName: 'Trần Văn Bình', doneCount: 7 },
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

  test('4. clicking "Tài chính" tab switches active tab', async ({ page }) => {
    await gotoAsAdmin(page);
    const tabBtn = page.getByRole('tab', { name: 'Tài chính' });
    await expect(tabBtn).toBeVisible({ timeout: 8000 });
    await tabBtn.click();
    await expect(tabBtn).toHaveAttribute('aria-selected', 'true');
    // Finance KPI labels should appear
    await expect(page.getByText('Tổng thu').first()).toBeVisible({ timeout: 5000 });
  });

  test('5. clicking "Buồng phòng" tab switches active tab', async ({ page }) => {
    await gotoAsAdmin(page);
    const tabBtn = page.getByRole('tab', { name: 'Buồng phòng' });
    await expect(tabBtn).toBeVisible({ timeout: 8000 });
    await tabBtn.click();
    await expect(tabBtn).toHaveAttribute('aria-selected', 'true');
    // Housekeeping KPI labels should appear
    await expect(page.getByText('Tổng công việc').first()).toBeVisible({ timeout: 5000 });
  });

  test('6. KPI "Tổng booking" is visible on overview tab', async ({ page }) => {
    await gotoAsAdmin(page);
    await expect(page.getByText('Tổng booking').first()).toBeVisible({ timeout: 8000 });
    // Mock data has totalBookings: 42
    await expect(page.getByText('42').first()).toBeVisible({ timeout: 5000 });
  });

  test('7. KPI "Doanh thu" shows formatted VND', async ({ page }) => {
    await gotoAsAdmin(page);
    await expect(page.getByText('Doanh thu').first()).toBeVisible({ timeout: 8000 });
    // formatVnd('37810000') = '37.810.000 đ'
    await expect(page.getByText(/37\.810\.000/).first()).toBeVisible({ timeout: 5000 });
  });

  test('8. date range "Từ ngày" input is present', async ({ page }) => {
    await gotoAsAdmin(page);
    const fromInput = page.getByLabel('Từ ngày');
    await expect(fromInput).toBeVisible({ timeout: 8000 });
  });

  test('9. preset "7 ngày" button changes from date', async ({ page }) => {
    await gotoAsAdmin(page);
    const fromInput = page.getByLabel('Từ ngày');
    await expect(fromInput).toBeVisible({ timeout: 8000 });

    // Get current from value before click
    const beforeValue = await fromInput.inputValue();

    const sevenDaysBtn = page.getByRole('button', { name: '7 ngày gần nhất' });
    await sevenDaysBtn.click();

    // After clicking 7 ngày, the from date should change (now = today-7)
    const afterValue = await fromInput.inputValue();
    // Value should be present (non-empty)
    expect(afterValue.length).toBeGreaterThan(0);
    // The from value should typically differ from the 30-day default
    // (unless we're testing on the same day, just check it's a valid date)
    expect(afterValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // And they should actually differ (30-day preset vs 7-day)
    expect(afterValue).not.toBe(beforeValue);
  });

  test('10. RECEPTIONIST sees PermissionDenied screen', async ({ page }) => {
    await gotoAsReceptionist(page);
    await expect(page.getByText('Bạn không có quyền truy cập').first()).toBeVisible({
      timeout: 8000,
    });
  });

  test('11. chart SVG element is present on overview tab', async ({ page }) => {
    await gotoAsAdmin(page);
    // Wait for data to load — charts render SVG elements
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 8000 });
  });

  test('12. "Phân bổ trạng thái booking" legend appears on Booking & Công suất tab', async ({
    page,
  }) => {
    await gotoAsAdmin(page);
    const tabBtn = page.getByRole('tab', { name: 'Booking & Công suất' });
    await expect(tabBtn).toBeVisible({ timeout: 8000 });
    await tabBtn.click();
    // Status breakdown renders as donut with legend items — look for a known status name
    await expect(page.getByText('Đang ở').first()).toBeVisible({ timeout: 6000 });
  });
});
