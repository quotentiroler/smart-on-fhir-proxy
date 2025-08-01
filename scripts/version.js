#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Package.json files to sync
const packagePaths = [
  'package.json',
  'backend/package.json', 
  'ui/package.json',
  'test/package.json'
];

function updateVersion(newVersion) {
  console.log(`Updating all packages to version: ${newVersion}`);
  
  packagePaths.forEach(packagePath => {
    if (fs.existsSync(packagePath)) {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      packageContent.version = newVersion;
      fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2) + '\n');
      console.log(`✓ Updated ${packagePath}`);
    } else {
      console.warn(`⚠ Warning: ${packagePath} not found`);
    }
  });
}

function getCurrentVersion() {
  const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return rootPackage.version;
}

function incrementVersion(version, type = 'patch') {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

// CLI usage
const args = process.argv.slice(2);
const command = args[0];

if (command === 'sync') {
  // Sync all packages to root version
  const rootVersion = getCurrentVersion();
  updateVersion(rootVersion);
} else if (command === 'bump') {
  // Bump version (patch by default)
  const type = args[1] || 'patch';
  const currentVersion = getCurrentVersion();
  const newVersion = incrementVersion(currentVersion, type);
  updateVersion(newVersion);
} else if (command === 'set') {
  // Set specific version
  const newVersion = args[1];
  if (!newVersion) {
    console.error('Please provide a version number');
    process.exit(1);
  }
  updateVersion(newVersion);
} else {
  console.log('Usage:');
  console.log('  node scripts/version.js sync                 - Sync all packages to root version');
  console.log('  node scripts/version.js bump [major|minor|patch] - Bump version (default: patch)');
  console.log('  node scripts/version.js set <version>       - Set specific version');
}
