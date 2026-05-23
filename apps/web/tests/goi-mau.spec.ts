import { test, expect } from '@playwright/test';

/**
 * Gói mẫu (packages) page — offline-friendly Playwright tests.
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

const MOCK_PACKAGES = [
  {
    id: 'p1',
    code: 'G001',
    name: 'Combo lãng mạn 2 đêm',
    applyType: 'Standard',
    numNights: 2,
    numGuests: 2,
    totalPrice: '1450000',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    detail: 'Standard 201, Ăn sáng',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'p2',
    code: 'G002',
    name: 'Combo honeymoon',
    applyType: 'VillaVIP',
    numNights: 3,
    numGuests: 2,
    totalPrice: '3450000',
    validFrom: '2026-05-01',
    validTo: '2026-12-31',
    detail: 'Villa VIP 101, Ăn tối ở nhà hàng mình',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'p3',
    code: 'G003',
    name: 'Combo cuối tuần Bungalow',
    applyType: 'Bungalow',
    numNights: 1,
    numGuests: 3,
    totalPrice: '2500000',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    detail: null,
    active: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const MOCK_PACKAGES_RESPONSE = {
  data: MOCK_PACKAGES,
  meta: { page: 1, pageSize: 10, total: 3, totalPages: 1 },
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

  await page.route('**/api/v1/packages**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PACKAGES_RESPONSE),
    }),
  );
}

async function gotoGoiMauAs(page: import('@playwright/test').Page, role: MockRole, auth: string) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, auth);
  await setupMocks(page, role);
  await page.goto('/goi-mau');
}

test.describe('Gói mẫu page (offline-friendly)', () => {
  test('unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });
    await page.goto('/goi-mau');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('page loads and shows page heading Gói mẫu', async ({ page }) => {
    await gotoGoiMauAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByText('Gói mẫu').first()).toBeVisible({ timeout: 8000 });
  });

  test('table headers are visible', async ({ page }) => {
    await gotoGoiMauAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByRole('table')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Tên gói')).toBeVisible();
    await expect(page.getByText('Loại áp dụng')).toBeVisible();
    await expect(page.getByText('Số đêm')).toBeVisible();
    await expect(page.getByText('Số khách')).toBeVisible();
    await expect(page.getByText('Giá gói')).toBeVisible();
    await expect(page.getByText('Hiệu lực')).toBeVisible();
    await expect(page.getByText('Chi tiết')).toBeVisible();
  });

  test('package data is displayed in table', async ({ page }) => {
    await gotoGoiMauAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByText('G001')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Combo lãng mạn 2 đêm')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Standard', exact: true })).toBeVisible();
    await expect(page.getByText('1.450.000 đ')).toBeVisible();
  });

  test('date is formatted as DD/MM/YYYY', async ({ page }) => {
    await gotoGoiMauAs(page, 'ADMIN', ADMIN_AUTH);
    // validFrom = '2026-01-01' → '01/01/2026'
    await expect(page.getByText(/01\/01\/2026/).first()).toBeVisible({ timeout: 8000 });
  });

  test('search input is visible and accepts input', async ({ page }) => {
    await gotoGoiMauAs(page, 'ADMIN', ADMIN_AUTH);
    const searchInput = page.getByLabel('Tìm kiếm gói mẫu');
    await expect(searchInput).toBeVisible({ timeout: 8000 });
    await searchInput.fill('combo');
    await expect(searchInput).toHaveValue('combo');
  });

  test('apply type filter select is visible', async ({ page }) => {
    await gotoGoiMauAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Lọc loại áp dụng')).toBeVisible({ timeout: 8000 });
  });

  test('ADMIN sees Thêm gói mẫu button', async ({ page }) => {
    await gotoGoiMauAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Thêm gói mẫu mới')).toBeVisible({ timeout: 8000 });
  });

  test('open create dialog on add button click', async ({ page }) => {
    await gotoGoiMauAs(page, 'ADMIN', ADMIN_AUTH);
    await page.getByLabel('Thêm gói mẫu mới').click();
    await expect(page.getByRole('dialog').getByText('Thêm gói mẫu mới')).toBeVisible({
      timeout: 5000,
    });
  });

  test('create dialog shows validation errors on empty submit', async ({ page }) => {
    await gotoGoiMauAs(page, 'ADMIN', ADMIN_AUTH);
    await page.getByLabel('Thêm gói mẫu mới').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    // Submit empty form
    await page.getByRole('button', { name: 'Thêm gói mẫu' }).last().click();
    await expect(page.getByText('Vui lòng nhập mã gói')).toBeVisible({ timeout: 3000 });
  });

  test('validTo < validFrom shows date validation message', async ({ page }) => {
    await gotoGoiMauAs(page, 'ADMIN', ADMIN_AUTH);
    await page.getByLabel('Thêm gói mẫu mới').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Fill required fields
    await page.getByLabel('Mã gói').fill('G999');
    await page.getByLabel('Tên gói').fill('Test Gói');
    await page.getByLabel('Số đêm').fill('1');
    await page.getByLabel('Số khách').fill('1');
    await page.getByLabel('Giá gói (đ)').fill('100000');
    await page.getByLabel('Ngày bắt đầu').fill('2026-12-31');
    await page.getByLabel('Ngày kết thúc').fill('2026-01-01');

    // Submit — should show validation error
    await page.getByRole('button', { name: 'Thêm gói mẫu' }).last().click();
    await expect(page.getByText('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu')).toBeVisible({
      timeout: 3000,
    });
  });

  test('pagination footer is always visible', async ({ page }) => {
    await gotoGoiMauAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Số dòng mỗi trang')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Trang trước')).toBeVisible();
    await expect(page.getByLabel('Trang tiếp')).toBeVisible();
  });

  test('HOUSEKEEPING does not see Thêm gói mẫu button and no edit/delete', async ({ page }) => {
    await gotoGoiMauAs(page, 'HOUSEKEEPING', HOUSEKEEPING_AUTH);
    await expect(page.getByText('G001')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Thêm gói mẫu mới')).not.toBeVisible();
    await expect(page.getByLabel('Sửa gói G001')).not.toBeVisible();
    await expect(page.getByLabel('Xoá gói G001')).not.toBeVisible();
  });

  test('ADMIN sees Edit and Delete buttons', async ({ page }) => {
    await gotoGoiMauAs(page, 'ADMIN', ADMIN_AUTH);
    await expect(page.getByLabel('Sửa gói G001')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Xoá gói G001')).toBeVisible();
  });
});
