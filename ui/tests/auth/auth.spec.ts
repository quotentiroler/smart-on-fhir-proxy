import { test, expect } from '@playwright/test';
import { TestHelpers } from '../test-helpers';

test.describe('Authentication Flow', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should display login form when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Should see login form elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login")')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Fill login form
    await page.locator('input[type="email"], input[name="email"]').fill('admin@example.com');
    await page.locator('input[type="password"], input[name="password"]').fill('admin');
    await page.locator('button[type="submit"], button:has-text("Login")').click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Should see user profile or welcome message
    await expect(page.locator('[data-testid="user-profile"], .user-profile, h1:has-text("Dashboard")')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Fill login form with invalid credentials
    await page.locator('input[type="email"], input[name="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"], input[name="password"]').fill('invalid');
    await page.locator('button[type="submit"], button:has-text("Login")').click();
    
    // Should show error message
    await expect(page.locator('[role="alert"], .error, [data-testid="error"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await helpers.auth.login();
    
    // Should be on dashboard
    await expect(page.locator('h1:has-text("Dashboard"), h1:has-text("Clinical Administration")')).toBeVisible();
    
    // Logout
    await helpers.auth.logout();
    
    // Should redirect to login
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test('should persist authentication across page refreshes', async ({ page }) => {
    // Login
    await helpers.auth.login();
    
    // Refresh page
    await page.reload();
    
    // Should still be authenticated
    await expect(page.locator('h1:has-text("Dashboard"), h1:has-text("Clinical Administration")')).toBeVisible();
  });

  test('should handle session expiration gracefully', async ({ page }) => {
    // Login
    await helpers.auth.login();
    
    // Clear localStorage to simulate session expiration
    await page.evaluate(() => localStorage.clear());
    
    // Navigate to a protected page
    await page.goto('/');
    
    // Should redirect to login
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });
});
