const { spawn } = require('child_process');
const path = require('path');

const appDir = 'c:\\Users\\Josie O. Banalo\\Desktop\\myfiles\\SE\\software-engineering-system\\MyNewApp';

process.chdir(appDir);
process.env.EXPO_TOKEN = '8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8';

console.log('Starting APK build in:', process.cwd());
console.log('Token set:', !!process.env.EXPO_TOKEN);

const build = spawn('eas', ['build', '--platform', 'android', '--profile', 'preview'], {
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

// Send "y" to stdin for the keystore prompt
setTimeout(() => {
  console.log('\n[Script] Sending "y" to keystore prompt...');
  build.stdin.write('y\n');
}, 2000);

build.on('exit', (code) => {
  console.log('\n[Script] Build finished with exit code:', code);
});

build.on('error', (err) => {
  console.error('[Script] Error:', err);
});
