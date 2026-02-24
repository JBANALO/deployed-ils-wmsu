const https = require('https');

// Try creating a build via EAS REST API
const buildData = JSON.stringify({
  platform: 'android',
  profile: 'preview'
});

const options = {
  hostname: 'api.eas.build',
  path: '/v1/builds',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer 8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(buildData)
  }
};

console.log('Attempting REST API build creation...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(buildData);
req.end();
