const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = 'c:\\Users\\Josie O. Banalo\\Desktop\\myfiles\\SE\\software-engineering-system\\MyNewApp';
const logFile = path.join(appDir, '..', 'eas-final-build.log');

process.chdir(appDir);
process.env.EXPO_TOKEN = '8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8';

const logStream = fs.createWriteStream(logFile, { flags: 'a' });

console.log('Starting APK build in:', process.cwd());
console.log('Token set:', !!process.env.EXPO_TOKEN);
console.log('Logging to:', logFile);
logStream.write(`\n[${new Date().toISOString()}] Starting build...\n`);

const build = spawn('eas', ['build', '--platform', 'android', '--profile', 'preview'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

build.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  logStream.write(text);
  
  // If we see the keystore prompt, send "y"
  if (text.includes('Generate a new Android Keystore')) {
    console.log('[Script] Detected keystore prompt, sending "y"...');
    logStream.write('[Script] Sending "y" response\n');
    build.stdin.write('y\n');
  }
});

build.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(text);
  logStream.write(text);
});

build.on('exit', (code) => {
  const msg = `\n[${new Date().toISOString()}] Build finished with exit code: ${code}\n`;
  console.log(msg);
  logStream.write(msg);
  logStream.end();
});

build.on('error', (err) => {
  const msg = `[Script] Error: ${err.message}\n`;
  console.error(msg);
  logStream.write(msg);
  logStream.end();
});
