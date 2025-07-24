import { Page, Locator, expect } from '@playwright/test';

/**
 * Authentication utilities for tests
 */
export class AuthHelpers {
  constructor(private page: Page) {}

  async login(email: string = 'admin@example.com', password: string = 'admin') {
    // Navigate to login page
    await this.page.goto('/');
    
    // Fill login form if it appears (assuming we might be redirected to login)
    const emailInput = this.page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = this.page.locator('input[type="password"], input[name="password"]');
    const loginButton = this.page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');

    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill(email);
      await passwordInput.fill(password);
      await loginButton.click();
      
      // Wait for navigation after login
      await this.page.waitForURL('**', { timeout: 10000 });
    }
    
    // Verify we're authenticated by checking for profile or dashboard elements
    await expect(this.page.locator('[data-testid="user-profile"], .user-profile, [class*="profile"]')).toBeVisible({ timeout: 10000 });
  }

  async logout() {
    // Look for logout button/menu
    const logoutButton = this.page.locator('button:has-text("Logout"), button:has-text("Sign out"), [data-testid="logout"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
  }
}

/**
 * Navigation utilities for the admin UI
 */
export class NavigationHelpers {
  constructor(private page: Page) {}

  async navigateToTab(tabName: string) {
    const tabButton = this.page.locator(`button:has-text("${tabName}"), [data-testid="${tabName.toLowerCase()}-tab"], a:has-text("${tabName}")`);
    await tabButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToDashboard() {
    await this.navigateToTab('Dashboard');
  }

  async navigateToSmartApps() {
    await this.navigateToTab('SMART Apps');
  }

  async navigateToUsers() {
    await this.navigateToTab('Healthcare Users');
  }

  async navigateToFhirServers() {
    await this.navigateToTab('FHIR Servers');
  }

  async navigateToIdentityProviders() {
    await this.navigateToTab('Identity Providers');
  }

  async navigateToScopes() {
    await this.navigateToTab('Scope Management');
  }

  async navigateToLaunchContexts() {
    await this.navigateToTab('Launch Contexts');
  }

  async navigateToOAuthMonitoring() {
    await this.navigateToTab('OAuth Monitoring');
  }
}

/**
 * Modal and dialog utilities
 */
export class ModalHelpers {
  constructor(private page: Page) {}

  async openModal(triggerSelector: string) {
    await this.page.locator(triggerSelector).click();
    await this.page.locator('[role="dialog"], .modal, [data-testid="modal"]').waitFor();
  }

  async closeModal() {
    // Try various ways to close modal
    const closeButton = this.page.locator('[data-testid="modal-close"], .modal-close, button:has-text("Cancel"), button:has-text("Close")');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Try escape key
      await this.page.keyboard.press('Escape');
    }
  }

  async fillModalForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const input = this.page.locator(`input[name="${field}"], input[placeholder*="${field}" i], textarea[name="${field}"]`);
      await input.fill(value);
    }
  }

  async submitModal() {
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Submit")');
    await submitButton.click();
  }
}

/**
 * Table utilities for data grids
 */
export class TableHelpers {
  constructor(private page: Page) {}

  async getRowCount(): Promise<number> {
    const rows = this.page.locator('tbody tr, [data-testid="table-row"]');
    return await rows.count();
  }

  async getRowByText(text: string): Promise<Locator> {
    return this.page.locator(`tr:has-text("${text}"), [data-testid="table-row"]:has-text("${text}")`);
  }

  async clickRowAction(rowText: string, actionText: string) {
    const row = await this.getRowByText(rowText);
    const actionButton = row.locator(`button:has-text("${actionText}"), [data-testid="${actionText.toLowerCase()}"]`);
    await actionButton.click();
  }

  async searchTable(searchTerm: string) {
    const searchInput = this.page.locator('input[placeholder*="search" i], input[type="search"], [data-testid="search-input"]');
    await searchInput.fill(searchTerm);
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Form utilities
 */
export class FormHelpers {
  constructor(private page: Page) {}

  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const input = this.page.locator(`input[name="${field}"], textarea[name="${field}"], select[name="${field}"]`);
      if (await input.getAttribute('type') === 'checkbox') {
        if (value === 'true') {
          await input.check();
        } else {
          await input.uncheck();
        }
      } else {
        await input.fill(value);
      }
    }
  }

  async selectOption(fieldName: string, optionText: string) {
    const select = this.page.locator(`select[name="${fieldName}"], [data-testid="${fieldName}-select"]`);
    await select.selectOption({ label: optionText });
  }

  async submitForm() {
    const submitButton = this.page.locator('button[type="submit"], input[type="submit"]');
    await submitButton.click();
  }
}

/**
 * Wait utilities
 */
export class WaitHelpers {
  constructor(private page: Page) {}

  async waitForApiResponse(urlPattern: string, timeout: number = 10000) {
    return this.page.waitForResponse(response => 
      response.url().includes(urlPattern) && response.status() === 200,
      { timeout }
    );
  }

  async waitForToast(message?: string) {
    const toastSelector = message 
      ? `[data-testid="toast"]:has-text("${message}"), .toast:has-text("${message}")`
      : '[data-testid="toast"], .toast, [role="alert"]';
    
    await this.page.locator(toastSelector).waitFor();
  }

  async waitForLoadingToFinish() {
    // Wait for common loading indicators to disappear
    await this.page.locator('[data-testid="loading"], .loading, .spinner').waitFor({ state: 'hidden', timeout: 30000 });
  }
}

/**
 * Combined helpers class for easy access
 */
export class TestHelpers {
  public auth: AuthHelpers;
  public navigation: NavigationHelpers;
  public modal: ModalHelpers;
  public table: TableHelpers;
  public form: FormHelpers;
  public wait: WaitHelpers;

  constructor(page: Page) {
    this.auth = new AuthHelpers(page);
    this.navigation = new NavigationHelpers(page);
    this.modal = new ModalHelpers(page);
    this.table = new TableHelpers(page);
    this.form = new FormHelpers(page);
    this.wait = new WaitHelpers(page);
  }
}
