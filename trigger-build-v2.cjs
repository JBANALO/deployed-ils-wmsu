const https = require('https');

// Correct GraphQL mutation for Expo
const query = `
  mutation CreateBuild {
    buildCreateAndStart(input: {
      appId: "470bb810-0cbd-4c89-83b9-b04d18671f31"
      buildProfile: "preview"
      platform: ANDROID
    }) {
      build {
        id
        status
      }
    }
  }
`;

const requestBody = JSON.stringify({ query });

const options = {
  hostname: 'api.expo.dev',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer 8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody)
  }
};

console.log('Attempting to create APK build via Expo API...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    
    try {
      const parsed = JSON.parse(data);
      console.log('Response:', JSON.stringify(parsed, null, 2));
      
      if (parsed.data?.buildCreateAndStart?.build) {
        console.log('\n✓ Build submitted!');
        console.log('Build ID:', parsed.data.buildCreateAndStart.build.id);
        process.exit(0);
      } else if (parsed.errors) {
        console.log('\n✗ API Error');
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(requestBody);
req.end();
