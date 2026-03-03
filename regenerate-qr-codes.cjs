// Run this ONCE after deploying to fix all existing students' QR codes
// node regenerate-qr-codes.cjs

const https = require('https');

const options = {
  hostname: 'deployed-ils-wmsu-production.up.railway.app',
  path: '/api/students/regenerate-qr',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
};

console.log('Regenerating all student QR codes to JSON format...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('✅ Result:', result.message);
    } catch {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
