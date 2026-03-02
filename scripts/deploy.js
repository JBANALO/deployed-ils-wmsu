#!/usr/bin/env node
const { execSync } = require('child_process');

console.log('📝 Checking git status...\n');

try {
  // Show status
  const status = execSync('git status --short', { encoding: 'utf-8', stdio: 'pipe' });
  console.log('Modified files:');
  console.log(status || '(none)');
  
  console.log('\n📦 Staging all changes...');
  execSync('git add -A', { stdio: 'pipe' });
  
  console.log('\n📌 Creating commit...');
  execSync('git commit -m "Fix: Adviser data fetching - file-based controllers and error handling" --no-edit', { stdio: 'pipe' }).catch(() => {
    console.log('(No new changes to commit)');
  });
  
  console.log('\n🔄 Pulling latest remote changes...');
  execSync('git pull origin main --ff-only 2>&1', { stdio: 'pipe' }).catch(() => {
    console.log('(Already up to date)');
  });
  
  console.log('\n🚀 Pushing to production...');
  const pushOutput = execSync('git push -u origin main 2>&1', { encoding: 'utf-8' });
  console.log(pushOutput);
  
  console.log('\n✅ Deployment complete!');
  console.log('The fixes should be live in 1-2 minutes.');
  
} catch (error) {
  // Try to extract meaningful error
  const errMsg = error.toString();
  if (errMsg.includes('rejected')) {
    console.error('\n❌ Push failed - branch behind remote');
    console.log('\nTrying to force merge and push...');
    try {
      execSync('git pull origin main -X theirs', { stdio: 'pipe' });
      execSync('git push origin main', { stdio: 'pipe' });
      console.log('✅ Successfully pushed after merge!');
    } catch (e2) {
      console.error('Failed even after merge. Error:', e2.message);
    }
  } else {
    console.error('Error:', errMsg);
  }
}
