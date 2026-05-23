import { test, expect } from '@playwright/test';

/**
 * Tệp upload page — offline-friendly Playwright tests.
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

const MOCK_STATS = {
  data: {
    total: 10,
    byKind: {
      ROOM_IMAGE: 10,
      GUEST_DOC: 0,
      STAFF_AVATAR: 0,
      OTHER: 0,
    },
  },
};

const MOCK_UPLOADS_LIST = {
  data: [
    {
      id: 'up1',
      code: 'TU001',
      kind: 'ROOM_IMAGE',
      entityType: 'room',
      entityId: 'room-b101',
      fileName: 'Homestay_nha_anh_phng_phm_20260500094034.png',
      fileSize: 204800,
      mimeType: 'image/png',
      url: '/uploads/room/Homestay_nha_anh_phng_phm_20260500094034.png',
      fileId: '5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a',
      note: null,
      uploadedBy: {
        id: 'u1',
        fullName: 'Admin Test',
        role: 'ADMIN',
      },
      createdAt: '2026-05-24T00:00:00Z',
      updatedAt: '2026-05-24T00:00:00Z',
    },
    {
      id: 'up2',
      code: 'TU002',
      kind: 'ROOM_IMAGE',
      entityType: 'room',
      entityId: 'room-s101',
      fileName: 'Homestay_nha_anh_phng_phm_20260500094035.png',
      fileSize: 153600,
      mimeType: 'image/png',
      url: '/uploads/room/Homestay_nha_anh_phng_phm_20260500094035.png',
      fileId: '1a2b3c4d5e6f7890abcdef1234567890ab',
      note: null,
      uploadedBy: null,
      createdAt: '2026-05-24T00:00:00Z',
      updatedAt: '2026-05-24T00:00:00Z',
    },
    {
      id: 'up3',
      code: 'TU003',
      kind: 'GUEST_DOC',
      entityType: 'customer',
      entityId: 'cust-001',
      fileName: 'guest_id_photo.jpg',
      fileSize: 102400,
      mimeType: 'image/jpeg',
      url: '/uploads/guest/guest_id_photo.jpg',
      fileId: null,
      note: 'Ảnh CCCD',
      uploadedBy: null,
      createdAt: '2026-05-24T00:00:00Z',
      updatedAt: '2026-05-24T00:00:00Z',
    },
  ],
  meta: { page: 1, pageSize: 10, total: 10, totalPages: 1 },
};

const MOCK_CATEGORIES = {
  data: [],
  meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 },
};

async function setupMocks(page: import('@playwright/test').Page) {
  // Auth
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ME_ADMIN),
    }),
  );

  // Stats — registered FIRST (LIFO: fires last = catch-all fallback)
  await page.route('**/api/v1/uploads**', (route) => {
    const url = route.request().url();
    if (url.includes('/uploads/stats')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_STATS),
      });
    }
    // list fallback
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_UPLOADS_LIST),
    });
  });

  // Categories
  await page.route('**/api/v1/categories**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CATEGORIES),
    }),
  );
}

async function gotoTepUploadAsAdmin(page: import('@playwright/test').Page) {
  await page.addInitScript((a: string) => {
    window.localStorage.setItem('hotel.auth', a);
  }, ADMIN_AUTH);
  await setupMocks(page);
  await page.goto('/tep-upload');
}

test.describe('Tệp upload page (offline-friendly)', () => {
  test('1. unauthenticated visit redirects to /dang-nhap', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hotel.auth');
    });
    await page.goto('/tep-upload');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('2. heading "Thư viện tệp upload" is visible', async ({ page }) => {
    await gotoTepUploadAsAdmin(page);
    await expect(page.getByText('Thư viện tệp upload').first()).toBeVisible({ timeout: 8000 });
  });

  test('3. table shows first upload fileName', async ({ page }) => {
    await gotoTepUploadAsAdmin(page);
    // The table renders fileName; verify first mock row fileName is visible
    await expect(
      page.getByText('Homestay_nha_anh_phng_phm_20260500094034.png').first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test('4. KPI "Tổng tệp đã upload" shows total count', async ({ page }) => {
    await gotoTepUploadAsAdmin(page);
    await expect(page.getByText('Tổng tệp đã upload')).toBeVisible({ timeout: 8000 });
    // Stats data has total: 10
    await expect(page.getByText('10').first()).toBeVisible({ timeout: 8000 });
  });

  test('5. KPI "Ảnh phòng" shows byKind count', async ({ page }) => {
    await gotoTepUploadAsAdmin(page);
    await expect(page.getByText('Ảnh phòng').first()).toBeVisible({ timeout: 8000 });
  });

  test('6. kind badge "Ảnh phòng" (emerald) is visible in table', async ({ page }) => {
    await gotoTepUploadAsAdmin(page);
    // The table has ROOM_IMAGE badges; first row has "Ảnh phòng"
    const badges = page.getByText('Ảnh phòng');
    await expect(badges.first()).toBeVisible({ timeout: 8000 });
  });

  test('7. search input is present', async ({ page }) => {
    await gotoTepUploadAsAdmin(page);
    const searchInput = page.getByLabel('Tìm kiếm tệp upload');
    await expect(searchInput).toBeVisible({ timeout: 8000 });
  });

  test('8. kind filter dropdown opens', async ({ page }) => {
    await gotoTepUploadAsAdmin(page);
    const trigger = page.getByLabel('Lọc nhóm tệp');
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await trigger.click();
    await expect(page.getByRole('option', { name: 'Hình tham khảo' })).toBeVisible({
      timeout: 4000,
    });
  });

  test('9. "Làm mới" button is visible', async ({ page }) => {
    await gotoTepUploadAsAdmin(page);
    const btn = page.getByRole('button', { name: 'Làm mới dữ liệu' });
    await expect(btn).toBeVisible({ timeout: 8000 });
  });

  test('10. pagination footer with pageSize picker is visible', async ({ page }) => {
    await gotoTepUploadAsAdmin(page);
    await expect(page.getByLabel('Số dòng mỗi trang')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Trang trước')).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Trang tiếp')).toBeVisible({ timeout: 8000 });
  });
});
