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
  // Remove any pre-release suffixes to get base version
  const baseVersion = version.replace(/-.*$/, '');
  const [major, minor, patch] = baseVersion.split('.').map(Number);
  
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

function getBaseVersion(version) {
  // Remove any pre-release suffixes (alpha, beta, etc.)
  return version.replace(/-.*$/, '');
}

function checkConsistency() {
  const rootVersion = getCurrentVersion();
  let isConsistent = true;
  
  console.log(`Checking version consistency (root: ${rootVersion})`);
  
  packagePaths.slice(1).forEach(packagePath => {
    if (fs.existsSync(packagePath)) {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (packageContent.version !== rootVersion) {
        console.log(`❌ ${packagePath}: ${packageContent.version} (expected: ${rootVersion})`);
        isConsistent = false;
      } else {
        console.log(`✓ ${packagePath}: ${packageContent.version}`);
      }
    }
  });
  
  return isConsistent;
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
} else if (command === 'check') {
  // Check version consistency
  const isConsistent = checkConsistency();
  if (!isConsistent) {
    console.log('\n❌ Version inconsistency detected. Run "node scripts/version.js sync" to fix.');
    process.exit(1);
  } else {
    console.log('\n✅ All versions are consistent!');
  }
} else if (command === 'base') {
  // Get base version (without pre-release suffixes)
  const currentVersion = getCurrentVersion();
  const baseVersion = getBaseVersion(currentVersion);
  console.log(baseVersion);
} else {
  console.log('Usage:');
  console.log('  node scripts/version.js sync                 - Sync all packages to root version');
  console.log('  node scripts/version.js bump [major|minor|patch] - Bump version (default: patch)');
  console.log('  node scripts/version.js set <version>       - Set specific version');
  console.log('  node scripts/version.js check               - Check version consistency');
  console.log('  node scripts/version.js base                - Get base version (no pre-release suffixes)');
}
