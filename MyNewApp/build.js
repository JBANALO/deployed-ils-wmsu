#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = __dirname;
const token = 'F1DS1ruZeSpuosnJtVtl5kCcq4QfHZ6Q0dv4Tq1W';

console.log('\n=====================================');
console.log('  WMSU ElemScan - APK Builder');
console.log('=====================================\n');

try {
  // Set environment variables
  process.env.EXPO_TOKEN = token;
  process.env.EAS_BUILD_NO_EXPO_GO_WARNING = 'true';

  console.log('📦 Step 1: Ensuring dependencies...');
  execSync('npm install', { 
    cwd: appDir, 
    stdio: 'inherit',
    env: process.env 
  });

  console.log('\n🔨 Step 2: Building APK...');
  console.log('⏳ This may take 10-20 minutes...\n');

  // Use eas build without interactive mode
  // Note: The project creation is handled server-side with the token
  execSync('eas build --platform android --no-wait', {
    cwd: appDir,
    stdio: 'inherit',
    env: process.env
  });

  console.log('\n✅ Build has been queued!');
  console.log('📍 Check your project at: https://expo.dev/projects/@jossiebanalo');
  console.log('⏳ You will receive an email when your APK is ready.\n');

} catch (error) {
  console.error('\n❌ Build error:', error.message);
  console.log('\nTrying alternative build method...');
  
  try {
    // Fallback to build with auto-confirm
    process.env.CI = 'true';
    execSync('eas build --platform android', {
      cwd: appDir,
      stdio: 'inherit',
      env: process.env,
      input: 'y\n'
    });
  } catch (fallbackError) {
    console.error('❌ Both build methods failed');
    process.exit(1);
  }
}
