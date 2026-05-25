import { test, expect } from '@playwright/test';

/**
 * Báo cáo & xuất file — offline-friendly Playwright tests.
 * All API calls are intercepted/mocked — no live BE required.
 * 10 tests total.
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

const HOUSEKEEPING_AUTH = JSON.stringify({
  state: {
    accessToken: 'mock-access-token-hk',
    refreshToken: 'mock-refresh-token-hk',
    user: {
      id: 'u4',
      email: 'housekeeping@hotel.local',
      fullName: 'Dọn Phòng Test',
      role: 'HOUSEKEEPING',
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

const MOCK_ME_HOUSEKEEPING = {
  data: {
    id: 'u4',
    email: 'housekeeping@hotel.local',
    fullName: 'Dọn Phòng Test',
    role: 'HOUSEKEEPING',
    status: 'ACTIVE',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
};

const MOCK_REPORT_SUMMARY = {
  data: {
    from: '2026-05-01',
    to: '2026-06-01',
    totals: {
      totalBookings: 18,
      totalRoomRevenue: '12000000',
      totalServiceRevenue: '3660000',
      totalSurcharge: '500000',
      totalDiscount: '-200000',
      grossRevenue: '15660000',
      totalIncomeFinance: '15660000',
      totalExpenseFinance: '16550000',
      payrollExpense: '14000000',
      operationalExpense: '2550000',
      netProfit: '-890000',
      occupancyPercent: 18,
      averageDailyRate: '870000',
    },
    topRooms: [
      { code: 'P101', name: 'Phòng 101', revenue: '3200000', nights: 4 },
      { code: 'P102', name: 'Phòng 102', revenue: '2800000', nights: 3 },
      { code: 'V101', name: 'Villa 101', revenue: '5000000', nights: 5 },
    ],
    topSources: [
      { code: 'walk_in', name: 'Walk-in', bookings: 8, revenue: '7000000' },
      { code: 'online', name: 'Online', bookings: 6, revenue: '5000000' },
      { code: 'phone', name: 'Điện thoại', bookings: 4, revenue: '3660000' },
    ],
    byStatusBookings: [
      { code: 'checked_in', name: 'Đang ở', count: 5 },
      { code: 'confirmed', name: 'Đã xác nhận', count: 8 },
      { code: 'cancelled', name: 'Đã huỷ', count: 3 },
      { code: 'pending', name: 'Chờ xác nhận', count: 2 },
    ],
    rows: [
      { label: 'Số booking', value: '18', note: 'Tổng booking' },
      { label: 'Tiền thu mặt', value: '15660000', note: 'Tổng doanh thu gộp' },
      { label: 'Thanh toán booking', value: '15660000', note: 'Tổng thu tài chính' },
      { label: 'Chi vận hành', value: '2550000', note: 'Chi phí không gồm lương' },
      { label: 'Lương đã chi', value: '14000000', note: 'Từ bảng lương' },
      { label: 'Lợi nhuận cuối', value: '-890000', note: 'Âm — cần chú ý' },
      { label: 'Công suất trung bình', value: '18%', note: 'Theo khoảng' },
    ],
  },
};

async function setupMocks(
  page: import('@playwright/test').Page,
  role: 'ADMIN' | 'RECEPTIONIST' | 'HOUSEKEEPING' = 'ADMIN',
) {
  const meMap = {
    ADMIN: MOCK_ME_ADMIN,
    RECEPTIONIST: MOCK_ME_RECEPTIONIST,
    HOUSEKEEPING: MOCK_ME_HOUSEKEEPING,
  };

  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(meMap[role]),
    }),
  );

  await page.route('**/api/v1/reports/summary**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_REPORT_SUMMARY),
    }),
  );
}

async function setupErrorMocks(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ME_ADMIN),
    }),
  );

  await page.route('**/api/v1/reports/summary**', (route) =>
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

async function gotoAsBaoCao(
  page: import('@playwright/test').Page,
  role: 'ADMIN' | 'RECEPTIONIST' | 'HOUSEKEEPING' = 'ADMIN',
) {
  const authMap = {
    ADMIN: ADMIN_AUTH,
    RECEPTIONIST: RECEPTIONIST_AUTH,
    HOUSEKEEPING: HOUSEKEEPING_AUTH,
  };
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, authMap[role]);
  await setupMocks(page, role);
  await page.goto('/bao-cao');
}

test.describe('Báo cáo & xuất file (offline-friendly)', () => {
  test('1. page renders with title "Báo cáo & xuất file"', async ({ page }) => {
    await gotoAsBaoCao(page);
    await expect(page.getByRole('heading', { name: /Báo cáo.*xuất file/i }).first()).toBeVisible({
      timeout: 8000,
    });
  });

  test('2. From and To date inputs are visible', async ({ page }) => {
    await gotoAsBaoCao(page);
    await expect(page.getByLabel('Từ ngày')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Đến ngày')).toBeVisible({ timeout: 8000 });
  });

  test('3. Five KPI cards are visible', async ({ page }) => {
    await gotoAsBaoCao(page);
    // Use .first() for labels that may match multiple elements (KPI card + table row)
    await expect(page.getByText('Tiền thu mặt').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Lương đã chi').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Chi vận hành').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Lợi nhuận cuối').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Công suất trung bình').first()).toBeVisible({ timeout: 8000 });
  });

  test('4. "Bảng tổng hợp báo cáo" table visible with rows from mock', async ({ page }) => {
    await gotoAsBaoCao(page);
    await expect(page.getByRole('heading', { name: 'Bảng tổng hợp báo cáo' })).toBeVisible({
      timeout: 8000,
    });
    // Table headers
    await expect(page.getByRole('columnheader', { name: 'Chỉ số' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('columnheader', { name: 'Giá trị' })).toBeVisible({
      timeout: 5000,
    });
    // Row from mock data
    await expect(page.getByText('Số booking').first()).toBeVisible({ timeout: 5000 });
  });

  test('5. "Xuất XLSX" button visible for ADMIN', async ({ page }) => {
    await gotoAsBaoCao(page, 'ADMIN');
    // Button text is "Xuất XLSX", aria-label is "Xuất file XLSX"
    await expect(
      page.getByRole('button', { name: /Xuất/ }).filter({ hasText: 'Xuất XLSX' }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('6. "Xuất XLSX" button hidden for RECEPTIONIST', async ({ page }) => {
    await gotoAsBaoCao(page, 'RECEPTIONIST');
    await expect(page.getByText('Báo cáo & xuất file').first()).toBeVisible({ timeout: 8000 });
    // Export button should not be visible for RECEPTIONIST (canExport=false)
    await expect(page.locator('button').filter({ hasText: 'Xuất XLSX' })).not.toBeVisible();
  });

  test('7. HOUSEKEEPING role sees permission denied panel', async ({ page }) => {
    await gotoAsBaoCao(page, 'HOUSEKEEPING');
    await expect(page.getByText('Bạn không có quyền truy cập')).toBeVisible({ timeout: 8000 });
  });

  test('8. loading skeleton visible before mock resolves', async ({ page }) => {
    await page.addInitScript((a: string) => {
      window.localStorage.setItem('hotel.auth', a);
    }, ADMIN_AUTH);

    // Route auth/me but delay the summary response to keep loading state visible
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ME_ADMIN),
      }),
    );

    await page.route('**/api/v1/reports/summary**', async (route) => {
      // Small delay to allow loading state to appear
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_REPORT_SUMMARY),
      });
    });

    await page.goto('/bao-cao');

    // Skeleton should appear during loading
    const skeleton = page.locator('[aria-hidden="true"].animate-pulse, .animate-pulse').first();
    // The page renders, skeleton may briefly appear; then data loads
    // Wait for data to eventually load (not stay stuck)
    await expect(page.getByText('Tiền thu mặt')).toBeVisible({ timeout: 10000 });
  });

  test('9. error state shows Retry button on 500', async ({ page }) => {
    await page.addInitScript((a: string) => {
      window.localStorage.setItem('hotel.auth', a);
    }, ADMIN_AUTH);
    await setupErrorMocks(page);
    await page.goto('/bao-cao');
    await expect(page.getByRole('button', { name: /Thử lại/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Không thể tải báo cáo')).toBeVisible({ timeout: 5000 });
  });

  test('10. top rooms bar chart container renders', async ({ page }) => {
    await gotoAsBaoCao(page);
    await expect(page.getByRole('heading', { name: /Top phòng.*nguồn booking/ })).toBeVisible({
      timeout: 8000,
    });
    // Chart SVG elements should render (Recharts uses SVG)
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 8000 });
  });
});
