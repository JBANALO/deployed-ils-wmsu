#!/usr/bin/env node

/**
 * Helper script to build APK with EAS, properly handling credentials prompt
 */

const { spawn } = require('child_process');
const path = require('path');

const appDir = path.join(__dirname, 'MyNewApp');
const token = '8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8';

const env = {
  ...process.env,
  EXPO_TOKEN: token,
  EAS_BUILD_NO_EXPO_GO_WARNING: '1',
};

console.log('🚀 Starting EAS build...');
console.log(`📂 Working directory: ${appDir}`);

const isWindows = process.platform === 'win32';
const command = isWindows ? 'eas.cmd' : 'eas';

const child = spawn(command, ['build', '--platform', 'android', '--wait'], {
  cwd: appDir,
  env,
  stdio: 'inherit', // Pass through all stdio for interactive prompts
});

child.on('exit', (code) => {
  console.log('\n📦 Build process completed');
  if (code === 0) {
    console.log('✅ Build succeeded!');
  } else {
    console.log(`❌ Build failed with exit code: ${code}`);
  }
  process.exit(code);
});

child.on('error', (err) => {
  console.error('❌ Error starting build process:', err);
  process.exit(1);
});
