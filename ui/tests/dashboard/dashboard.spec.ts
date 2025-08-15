import { test, expect } from '@playwright/test';
import { TestHelpers } from '../test-helpers';

describe('Dashboard', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.auth.login();
    await helpers.navigation.navigateToDashboard();
  });

  test('should display dashboard overview', async ({ page }) => {
    // Check main dashboard elements
    await expect(page.locator('h1:has-text("Clinical Administration"), h1:has-text("Dashboard")')).toBeVisible();
    
    // Check key metrics cards
    await expect(page.locator('text=SMART Applications')).toBeVisible();
    await expect(page.locator('text=Healthcare Users')).toBeVisible();
    await expect(page.locator('text=FHIR Servers')).toBeVisible();
    await expect(page.locator('text=Identity Providers')).toBeVisible();
  });

  test('should display system health information', async ({ page }) => {
    // Check system health section
    await expect(page.locator('text=System Health')).toBeVisible();
    await expect(page.locator('text=API Response Time')).toBeVisible();
    await expect(page.locator('text=Database Status')).toBeVisible();
    await expect(page.locator('text=System Uptime')).toBeVisible();
  });

  test('should display recent activity', async ({ page }) => {
    // Check recent activity section
    await expect(page.locator('text=Recent Activity')).toBeVisible();
    
    // Should have activity items
    const activityItems = page.locator('[data-testid="activity-item"], .activity-item');
    await expect(activityItems.first()).toBeVisible();
  });

  test('should show platform version and environment info', async ({ page }) => {
    // Check platform information
    await expect(page.locator('text=Platform Version')).toBeVisible();
    await expect(page.locator('text=Environment')).toBeVisible();
    await expect(page.locator('text=Development')).toBeVisible();
  });

  test('should refresh data when refresh button is clicked', async ({ page }) => {
    // Find and click refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), [data-testid="refresh-button"]');
    await refreshButton.click();
    
    // Should show loading state briefly
    await helpers.wait.waitForLoadingToFinish();
    
    // Dashboard should still be visible
    await expect(page.locator('h1:has-text("Clinical Administration"), h1:has-text("Dashboard")')).toBeVisible();
  });

  test('should navigate to other sections from dashboard cards', async ({ page }) => {
    // Click on SMART Applications card
    const smartAppsCard = page.locator('text=SMART Applications').locator('xpath=..');
    await smartAppsCard.click();
    
    // Should navigate or show relevant content
    // This depends on the actual implementation
  });

  test('should display correct metrics formatting', async ({ page }) => {
    // Check that metrics are displayed as numbers
    const metricsSelectors = [
      'text=12', // Active applications
      'text=247', // Registered users  
      'text=8', // Connected servers
      'text=5' // Active providers
    ];
    
    for (const selector of metricsSelectors) {
      await expect(page.locator(selector)).toBeVisible();
    }
  });

  test('should handle AI chat overlay', async ({ page }) => {
    // Look for chat toggle button
    const chatButton = page.locator('[data-testid="chat-toggle"], button:has-text("Assistant")');
    
    if (await chatButton.isVisible()) {
      await chatButton.click();
      
      // Chat overlay should appear
      await expect(page.locator('[data-testid="chat-overlay"], .chat-overlay')).toBeVisible();
      
      // Should have SMART Assistant header
      await expect(page.locator('text=SMART Assistant')).toBeVisible();
      
      // Should have input field
      await expect(page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"]')).toBeVisible();
      
      // Close chat
      const closeButton = page.locator('[data-testid="chat-close"], button:has-text("×")');
      await closeButton.click();
      
      // Chat should be hidden
      await expect(page.locator('[data-testid="chat-overlay"], .chat-overlay')).toBeHidden();
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Dashboard should still be visible and usable
    await expect(page.locator('h1:has-text("Clinical Administration"), h1:has-text("Dashboard")')).toBeVisible();
    
    // Metrics cards should stack vertically or be scrollable
    const metricsCards = page.locator('[data-testid="metric-card"], .metric-card');
    await expect(metricsCards.first()).toBeVisible();
  });
});
