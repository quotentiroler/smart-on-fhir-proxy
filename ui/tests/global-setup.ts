import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up Playwright tests...');
  console.log(config.projects);
  // Set up any global test data or configurations
  // For example, you might want to:
  // - Start additional services
  // - Set up test databases
  // - Configure authentication tokens

  console.log('✅ Global setup complete');
}

export default globalSetup;
