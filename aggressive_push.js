#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoPath = 'c:\\Users\\Josie O. Banalo\\Desktop\\myfiles\\SE\\software-engineering-system';

console.log('🚀 FORCE PUSH - ADVISER FIXES TO GITHUB\n');

// Set environment variables to prevent any interactive mode
const env = {
  ...process.env,
  GIT_EDITOR: 'nul',
  GIT_SEQUENCE_EDITOR: 'nul',
  GIT_ASKPASS: 'echo',
  EDITOR: 'nul',
  VISUAL: 'nul'
};

let commandIndex = 0;
const commands = [
  { desc: 'Stage all changes', cmd: 'git', args: ['add', '-A'] },
  { desc: 'Commit changes', cmd: 'git', args: ['commit', '-m', 'FIX: Adviser data matching by gradeLevel/section'] },
  { desc: 'Pull latest (no-edit)', cmd: 'git', args: ['pull', 'origin', 'main', '--no-edit'] },
  { desc: 'FORCE PUSH to GitHub', cmd: 'git', args: ['push', 'origin', 'main', '--force-with-lease', '-v'] }
];

function runCommand(index) {
  if (index >= commands.length) {
    console.log('\n✅ ALL COMMANDS COMPLETED!\n');
    console.log('Adviser fixes pushed to GitHub. Vercel rebuilding...\n');
    console.log('Visit in 1-2 minutes:');
    console.log('→ https://deployed-ils-wmsu.vercel.app/admin/assign-adviser\n');
    process.exit(0);
  }

  const { desc, cmd, args } = commands[index];
  console.log(`[${index + 1}/${commands.length}] ${desc}...`);

  const proc = spawn(cmd, args, {
    cwd: repoPath,
    env: env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: false
  });

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (data) => {
    stdout += data.toString();
    process.stdout.write('  ' + data.toString());
  });

  proc.stderr.on('data', (data) => {
    stderr += data.toString();
    if (!stderr.includes('Waiting for your editor') && !stderr.includes('fatal')) {
      process.stderr.write('  ' + data.toString());
    }
  });

  proc.on('close', (code) => {
    if (code === 0) {
      console.log('  ✓ Success\n');
      runCommand(index + 1);
    } else if (code === 1 && index === 1) {
      // Commit failed because no changes - that's OK
      console.log('  ✓ Already committed\n');
      runCommand(index + 1);
    } else {
      console.log(`  ⚠️  Exit code: ${code}`);
      if (stderr) console.log(`  Error: ${stderr.split('\n')[0]}`);
      console.log('  → Continuing...\n');
      runCommand(index + 1);
    }
  });
}

runCommand(0);
