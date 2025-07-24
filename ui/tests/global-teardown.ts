async function globalTeardown() {
  console.log('🧹 Tearing down Playwright tests...');
  
  // Clean up any global test data or resources
  // For example, you might want to:
  // - Stop additional services
  // - Clean up test databases
  // - Remove temporary files
  
  console.log('✅ Global teardown complete');
}

export default globalTeardown;
