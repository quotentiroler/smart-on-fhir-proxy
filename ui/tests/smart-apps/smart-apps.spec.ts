import { test, expect } from '@playwright/test';
import { TestHelpers } from '../test-helpers';

test.describe('SMART Apps Manager', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.auth.login();
    await helpers.navigation.navigateToSmartApps();
  });

  test('should display SMART apps overview', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1:has-text("SMART"), h1:has-text("Applications")')).toBeVisible();
    
    // Should show applications table or cards
    await expect(page.locator('table, [data-testid="apps-table"], [data-testid="app-card"]')).toBeVisible();
  });

  test('should display existing SMART applications', async ({ page }) => {
    // Wait for apps to load
    await helpers.wait.waitForLoadingToFinish();
    
    // Should see at least one app (mocked data)
    const appRows = page.locator('tbody tr, [data-testid="app-row"]');
    await expect(appRows.first()).toBeVisible();
    
    // Check common app fields
    await expect(page.locator('text=Clinical Decision Support, text=Patient Portal')).toBeVisible();
    await expect(page.locator('text=active, text=inactive')).toBeVisible();
  });

  test('should open add new app modal', async ({ page }) => {
    // Click add button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), [data-testid="add-app"]');
    await addButton.click();
    
    // Modal should open
    await expect(page.locator('[role="dialog"], .modal, [data-testid="app-modal"]')).toBeVisible();
    
    // Should have form fields
    await expect(page.locator('input[name="name"], input[placeholder*="name" i]')).toBeVisible();
    await expect(page.locator('input[name="clientId"], input[placeholder*="client" i]')).toBeVisible();
    await expect(page.locator('input[name="redirectUri"], input[placeholder*="redirect" i]')).toBeVisible();
  });

  test('should create new SMART application', async ({ page }) => {
    // Open add modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), [data-testid="add-app"]');
    await addButton.click();
    
    // Fill form
    await helpers.modal.fillModalForm({
      name: 'Test App',
      clientId: 'test-app-123',
      redirectUri: 'https://test.example.com/callback',
      description: 'Test application for e2e testing'
    });
    
    // Select app type
    const appTypeSelect = page.locator('select[name="appType"], [data-testid="app-type-select"]');
    if (await appTypeSelect.isVisible()) {
      await appTypeSelect.selectOption('standalone-app');
    }
    
    // Submit form
    await helpers.modal.submitModal();
    
    // Should close modal and show success
    await helpers.wait.waitForToast('created');
    
    // New app should appear in list
    await expect(page.locator('text=Test App')).toBeVisible();
  });

  test('should edit existing application', async ({ page }) => {
    // Wait for apps to load
    await helpers.wait.waitForLoadingToFinish();
    
    // Click edit on first app
    const firstAppRow = page.locator('tbody tr, [data-testid="app-row"]').first();
    const editButton = firstAppRow.locator('button:has-text("Edit"), [data-testid="edit"]');
    await editButton.click();
    
    // Edit modal should open
    await expect(page.locator('[role="dialog"], .modal, [data-testid="app-modal"]')).toBeVisible();
    
    // Form should be pre-filled
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]');
    await expect(nameInput).toHaveValue(/.+/); // Should have some value
    
    // Change name
    await nameInput.fill('Updated App Name');
    
    // Submit changes
    await helpers.modal.submitModal();
    
    // Should show success
    await helpers.wait.waitForToast('updated');
  });

  test('should delete application', async ({ page }) => {
    // Wait for apps to load
    await helpers.wait.waitForLoadingToFinish();
    
    // Click delete on first app
    const firstAppRow = page.locator('tbody tr, [data-testid="app-row"]').first();
    const deleteButton = firstAppRow.locator('button:has-text("Delete"), [data-testid="delete"]');
    await deleteButton.click();
    
    // Confirmation dialog should appear
    await expect(page.locator('[role="dialog"]:has-text("Delete"), .confirmation')).toBeVisible();
    
    // Confirm deletion
    const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
    await confirmButton.click();
    
    // Should show success
    await helpers.wait.waitForToast('deleted');
  });

  test('should filter applications by status', async ({ page }) => {
    // Wait for apps to load
    await helpers.wait.waitForLoadingToFinish();
    
    // Look for filter dropdown
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');
    
    if (await statusFilter.isVisible()) {
      // Filter by active
      await statusFilter.selectOption('active');
      await helpers.wait.waitForLoadingToFinish();
      
      // Should only show active apps
      const statusBadges = page.locator('text=active');
      await expect(statusBadges.first()).toBeVisible();
      
      // Should not show inactive apps
      await expect(page.locator('text=inactive')).toBeHidden();
    }
  });

  test('should search applications', async ({ page }) => {
    // Wait for apps to load
    await helpers.wait.waitForLoadingToFinish();
    
    // Use search
    await helpers.table.searchTable('Clinical');
    
    // Should filter results
    await expect(page.locator('text=Clinical Decision Support')).toBeVisible();
  });

  test('should display app details', async ({ page }) => {
    // Wait for apps to load
    await helpers.wait.waitForLoadingToFinish();
    
    // Click on app name or view button
    const firstApp = page.locator('tbody tr, [data-testid="app-row"]').first();
    const viewButton = firstApp.locator('button:has-text("View"), [data-testid="view"], a');
    await viewButton.click();
    
    // Should show app details (modal or page)
    await expect(page.locator('[data-testid="app-details"], .app-details')).toBeVisible();
  });

  test('should manage app scopes', async ({ page }) => {
    // Open first app for editing
    await helpers.wait.waitForLoadingToFinish();
    const firstAppRow = page.locator('tbody tr, [data-testid="app-row"]').first();
    const editButton = firstAppRow.locator('button:has-text("Edit"), [data-testid="edit"]');
    await editButton.click();
    
    // Look for scopes section
    const scopesSection = page.locator('[data-testid="scopes"], text=Scopes');
    
    if (await scopesSection.isVisible()) {
      // Should show scope checkboxes or multiselect
      await expect(page.locator('input[type="checkbox"], select[multiple]')).toBeVisible();
    }
  });

  test('should handle different app types', async ({ page }) => {
    // Open add modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), [data-testid="add-app"]');
    await addButton.click();
    
    // Should have app type selection
    const appTypeSelect = page.locator('select[name="appType"], [data-testid="app-type-select"]');
    
    if (await appTypeSelect.isVisible()) {
      // Should have different app types
      const options = appTypeSelect.locator('option');
      await expect(options).toHaveCount({ gt: 1 });
      
      // Test selecting different types
      await appTypeSelect.selectOption('backend-service');
      await appTypeSelect.selectOption('ehr-launch-app');
      await appTypeSelect.selectOption('standalone-app');
    }
  });

  test('should validate form inputs', async ({ page }) => {
    // Open add modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), [data-testid="add-app"]');
    await addButton.click();
    
    // Try to submit without required fields
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await submitButton.click();
    
    // Should show validation errors
    await expect(page.locator('[role="alert"], .error, .invalid')).toBeVisible();
    
    // Fill required field and error should disappear
    await page.locator('input[name="name"], input[placeholder*="name" i]').fill('Test App');
    
    // Validation error for name should be gone
    const nameError = page.locator('[data-testid="name-error"], .field-error:near(input[name="name"])');
    if (await nameError.isVisible()) {
      await expect(nameError).toBeHidden();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Page should still be usable
    await expect(page.locator('h1:has-text("SMART"), h1:has-text("Applications")')).toBeVisible();
    
    // Table should be responsive or show mobile view
    const table = page.locator('table, [data-testid="apps-table"]');
    if (await table.isVisible()) {
      // Table should fit in viewport or be scrollable
      const tableWidth = await table.evaluate(el => el.scrollWidth);
      expect(tableWidth).toBeLessThanOrEqual(375);
    }
  });
});
