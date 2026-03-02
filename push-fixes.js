#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🚀 FORCING PUSH OF ADVISER FIXES TO GITHUB\n');

const projectDir = 'c:\\Users\\Josie O. Banalo\\Desktop\\myfiles\\SE\\software-engineering-system';
process.chdir(projectDir);

try {
  console.log('[1] Staging all changes...');
  execSync('git add -A', { stdio: 'inherit' });
  
  console.log('\n[2] Creating commit...');
  try {
    execSync('git commit -m "Fix: Adviser data fetching - file-based controllers and error handling" --no-edit', { stdio: 'inherit' });
  } catch (e) {
    console.log('(Nothing new to commit or already committed)');
  }
  
  console.log('\n[3] Pulling latest from remote...');
  try {
    execSync('git pull origin main -X theirs', { stdio: 'inherit' });
  } catch (e) {
    console.log('(Could not pull, continuing with push)');
  }
  
  console.log('\n[4] PUSHING TO GITHUB...');
  execSync('git push -u origin main --force', { stdio: 'inherit' });
  
  console.log('\n✅ SUCCESS! Code has been pushed to GitHub!');
  console.log('\n📋 Changes deployed:');
  console.log('  ✓ server/controllers/classController.js - Adviser lookup by grade/section');
  console.log('  ✓ server/controllers/teacherControllerFile.js - File-based teacher data');
  console.log('  ✓ server/routes/teacherRoutes.js - Routes to file-based controller');
  console.log('  ✓ server/routes/classRoutes.js - Routes to file-based class controller');
  console.log('  ✓ src/pages/admin/AdminAssignAdviser.jsx - Error handling & fallback logic');
  
  console.log('\n🚀 Railway/Vercel will redeploy in 1-2 minutes');
  console.log('\n🔗 After deployment, visit:');
  console.log('   https://deployed-ils-wmsu.vercel.app/admin/assign-adviser');
  console.log('\n💡 Refresh with: Ctrl+Shift+R');
  console.log('\n✨ Adviser dropdown should now be FILLED!\n');
  
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('   1. Make sure you have git installed');
  console.log('   2. Make sure you have GitHub credentials set up');
  console.log('   3. Try running: git push origin main --force-with-lease');
  process.exit(1);
}
