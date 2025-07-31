// Simple delay script for waiting before API generation
import { execSync } from 'child_process';

async function checkServerReady(url, maxAttempts = 10, delay = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`Server is ready after ${i + 1} attempts`);
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    if (i < maxAttempts - 1) {
      console.log(`Server not ready, waiting ${delay}ms... (attempt ${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log('Server still not ready after maximum attempts');
  return false;
}

console.log('Checking if server is ready before generating api clients for UI...');

// Check if the swagger endpoint is available
const serverReady = await checkServerReady('http://localhost:8445/swagger/json');

if (serverReady) {
  try {
    console.log('Server is ready, running bun generate:ui...');
    execSync('bun generate:ui', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error running bun generate:ui:', error.message);
    process.exit(1);
  }
} else {
  console.error('Server was not ready in time, skipping UI generation');
  process.exit(1);
}
