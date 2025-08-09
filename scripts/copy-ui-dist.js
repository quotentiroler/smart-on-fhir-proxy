#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const projectRoot = path.resolve(__dirname, '..');
const uiDistPath = path.join(projectRoot, 'ui', 'dist');
const backendPublicPath = path.join(projectRoot, 'backend', 'public');
const webappPath = path.join(backendPublicPath, 'webapp');

console.log('🔄 Copying UI dist to backend public directory...');

// Function to copy directory recursively
function copyDirectorySync(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read the source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectorySync(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // Check if UI dist exists
  if (!fs.existsSync(uiDistPath)) {
    console.error('❌ UI dist directory not found. Please run "bun run build:ui" first.');
    process.exit(1);
  }

  // Ensure backend public directory exists
  if (!fs.existsSync(backendPublicPath)) {
    fs.mkdirSync(backendPublicPath, { recursive: true });
    console.log('📁 Created backend public directory');
  }

  // Remove existing webapp directory if it exists
  if (fs.existsSync(webappPath)) {
    fs.rmSync(webappPath, { recursive: true, force: true });
    console.log('🗑️  Removed existing webapp directory');
  }

  // Copy UI dist to webapp
  copyDirectorySync(uiDistPath, webappPath);
  
  console.log('✅ Successfully copied UI dist to backend/public/webapp/');
  console.log(`   Source: ${uiDistPath}`);
  console.log(`   Destination: ${webappPath}`);
  
  // List copied files for verification
  const copiedFiles = fs.readdirSync(webappPath);
  console.log(`📦 Copied files: ${copiedFiles.join(', ')}`);

} catch (error) {
  console.error('❌ Error copying UI dist:', error.message);
  process.exit(1);
}
