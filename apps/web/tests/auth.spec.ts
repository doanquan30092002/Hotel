import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('unauthenticated visit to / redirects to /dang-nhap', async ({ page }) => {
    // Clear any stored auth state
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.removeItem('hotel.auth');
      window.localStorage.removeItem('hotel.themeTone');
    });

    // Visit root again without auth
    await page.goto('/');
    await page.waitForURL('**/dang-nhap', { timeout: 5000 });
    expect(page.url()).toContain('/dang-nhap');
  });

  test('login page shows email and password fields', async ({ page }) => {
    await page.goto('/dang-nhap');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Mật khẩu').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  });

  test('login form shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/dang-nhap');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    // Should show validation error for email
    await expect(page.getByRole('alert').first()).toBeVisible();
  });
});
