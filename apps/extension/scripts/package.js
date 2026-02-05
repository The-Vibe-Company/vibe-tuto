#!/usr/bin/env node

/**
 * Package script for CapTuto Chrome Extension
 *
 * This script:
 * 1. Updates the default API URL to production (captuto.com)
 * 2. Builds the extension
 * 3. Creates a zip file for distribution
 *
 * Usage:
 *   pnpm package                    # Package with default production URL
 *   API_URL=https://custom.com pnpm package  # Package with custom URL
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PRODUCTION_URL = process.env.API_URL || 'https://captuto.com';
const EXTENSION_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(EXTENSION_DIR, 'dist');
const SRC_DIR = path.join(EXTENSION_DIR, 'src');

// Files to modify
const POPUP_FILE = path.join(SRC_DIR, 'popup', 'popup.ts');
const CONTENT_FILE = path.join(SRC_DIR, 'content', 'content.ts');

// Backup original files
const backups = new Map();

function backupFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  backups.set(filePath, content);
  return content;
}

function restoreFiles() {
  for (const [filePath, content] of backups) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  console.log('✓ Restored original source files');
}

function updatePopupUrl(content) {
  // Update DEFAULT_API_URL - handle both single and double quotes
  const regex = /const DEFAULT_API_URL\s*=\s*['"][^'"]*['"]/;
  const replacement = `const DEFAULT_API_URL = '${PRODUCTION_URL}'`;

  const updated = content.replace(regex, replacement);

  if (updated === content) {
    console.warn('⚠ Warning: Could not find DEFAULT_API_URL in popup.ts');
  }

  return updated;
}

function updateContentOrigins(content) {
  // Update ALLOWED_ORIGINS array to include the production URL
  const productionOrigin = PRODUCTION_URL.replace(/\/$/, ''); // Remove trailing slash

  // Check if production URL is already in the array
  if (content.includes(productionOrigin)) {
    console.log(`   ✓ ${productionOrigin} already in ALLOWED_ORIGINS`);
    return content;
  }

  // Add production URL to ALLOWED_ORIGINS
  const regex = /const ALLOWED_ORIGINS\s*=\s*\[([\s\S]*?)\];/;
  const updated = content.replace(regex, (match, arrayContent) => {
    // Add the production URL to the array
    const newArrayContent = arrayContent.trimEnd() + `\n  '${productionOrigin}',`;
    return `const ALLOWED_ORIGINS = [${newArrayContent}\n];`;
  });

  if (updated === content) {
    console.warn('⚠ Warning: Could not find ALLOWED_ORIGINS in content.ts');
  }

  return updated;
}

function createZip() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(EXTENSION_DIR, 'package.json'), 'utf8'));
  const version = packageJson.version || '0.1.0';
  const zipName = `captuto-extension-v${version}.zip`;
  const zipPath = path.join(EXTENSION_DIR, zipName);

  // Remove existing zip if present
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Create zip using system zip command
  try {
    execSync(`cd "${DIST_DIR}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
    console.log(`✓ Created ${zipName}`);
    return zipPath;
  } catch (error) {
    console.error('✗ Failed to create zip file');
    throw error;
  }
}

async function main() {
  console.log('');
  console.log('📦 Packaging CapTuto Chrome Extension');
  console.log(`   Production URL: ${PRODUCTION_URL}`);
  console.log('');

  try {
    // Step 1: Backup and modify source files
    console.log('1. Updating source files for production...');

    const popupContent = backupFile(POPUP_FILE);
    const contentContent = backupFile(CONTENT_FILE);

    const updatedPopup = updatePopupUrl(popupContent);
    const updatedContent = updateContentOrigins(contentContent);

    fs.writeFileSync(POPUP_FILE, updatedPopup, 'utf8');
    console.log('   ✓ Updated popup.ts DEFAULT_API_URL');

    fs.writeFileSync(CONTENT_FILE, updatedContent, 'utf8');
    console.log('   ✓ Updated content.ts ALLOWED_ORIGINS');

    // Verify the changes were applied
    const verifyPopup = fs.readFileSync(POPUP_FILE, 'utf8');
    if (!verifyPopup.includes(PRODUCTION_URL)) {
      throw new Error('Failed to update popup.ts - production URL not found after modification');
    }

    // Step 2: Build the extension (run directly, not via pnpm to avoid caching issues)
    console.log('');
    console.log('2. Building extension...');
    execSync('node scripts/build.js', { cwd: EXTENSION_DIR, stdio: 'inherit' });

    // Step 3: Restore original files
    console.log('');
    console.log('3. Restoring original source files...');
    restoreFiles();

    // Step 4: Create zip
    console.log('');
    console.log('4. Creating zip package...');
    const zipPath = createZip();

    // Done!
    console.log('');
    console.log('✅ Packaging complete!');
    console.log(`   Output: ${zipPath}`);
    console.log('');
    console.log('To install:');
    console.log('   1. Go to chrome://extensions/');
    console.log('   2. Enable "Developer mode"');
    console.log('   3. Click "Load unpacked" and select the dist/ folder');
    console.log('   OR drag the zip file to upload to Chrome Web Store');
    console.log('');

  } catch (error) {
    // Restore files on error
    console.error('');
    console.error('✗ Packaging failed:', error.message);
    restoreFiles();
    process.exit(1);
  }
}

main();
