import { test, expect } from '@playwright/test';

test.describe('Danh mục page (offline-friendly)', () => {
  test('unauthenticated visit to /danh-muc redirects to /dang-nhap', async ({ page }) => {
    // Clear any stored auth state
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.removeItem('hotel.auth');
      window.localStorage.removeItem('hotel.themeTone');
    });

    // Navigate directly to /danh-muc without auth
    await page.goto('/danh-muc');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('login page is reachable and has expected form elements', async ({ page }) => {
    await page.goto('/dang-nhap');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Mật khẩu').first()).toBeVisible();
  });
});
