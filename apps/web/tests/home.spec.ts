import { test, expect } from '@playwright/test';

test('home page redirects to /dang-nhap when unauthenticated', async ({ page }) => {
  // Clear localStorage before visiting
  await page.goto('/dang-nhap');
  await page.evaluate(() => {
    window.localStorage.removeItem('hotel.auth');
  });

  await page.goto('/');
  await page.waitForURL('**/dang-nhap', { timeout: 5000 });
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
});
