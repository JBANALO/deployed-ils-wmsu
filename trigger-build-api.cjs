const https = require('https');

const query = `
  mutation {
    buildCreateAndStart(buildInput: {
      projectId: "470bb810-0cbd-4c89-83b9-b04d18671f31"
      platform: ANDROID
      appBuildProfile: "preview"
    }) {
      build {
        id
        status
        platform
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
    'Content-Length': Buffer.byteLength(requestBody),
    'User-Agent': 'wmsu-build-bot/1.0'
  }
};

console.log('Triggering APK build via Expo GraphQL API...');
console.log('Project: wmsu-elemscan');
console.log('Platform: Android');
console.log('Profile: preview (APK)\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response:', data);
    
    try {
      const parsed = JSON.parse(data);
      if (parsed.data && parsed.data.buildCreateAndStart) {
        const build = parsed.data.buildCreateAndStart.build;
        console.log('\n✓ Build created successfully!');
        console.log('Build ID:', build.id);
        console.log('Status:', build.status);
        console.log('Platform:', build.platform);
        console.log('\nMonitor progress at:');
        console.log('https://expo.dev/accounts/heidi23/projects/wmsu-elemscan');
        console.log('\nBuild will complete in 20-30 minutes...');
      } else if (parsed.errors) {
        console.log('\n✗ Error occurred:');
        parsed.errors.forEach(err => console.log('-', err.message));
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(requestBody);
req.end();
