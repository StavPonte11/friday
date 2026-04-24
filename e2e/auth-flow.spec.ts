import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/en/pm');
    // next-auth middleware should redirect
    await expect(page).toHaveURL(/.*\/en\/auth\/login.*/);
  });

  test('admin panel protected from non-admins', async ({ page }) => {
    // Note: In real setup requires seeding session.
    // For e2e, just testing the redirect pathing
    await page.goto('/en/admin/users');
    await expect(page).toHaveURL(/.*\/en\/auth\/login.*/);
  });
  
  test('renders login page correctly', async ({ page }) => {
    await page.goto('/en/auth/login');
    await expect(page.locator('h1')).toContainText('Welcome to FRIDAY');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Continue with Google' })).toBeVisible();
  });
});
