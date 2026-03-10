#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.CI === 'true') {
  console.log('CI environment detected, skipping server dependency install.');
  process.exit(0);
}

const serverDir = path.resolve(__dirname, '..', 'server');
let command;
let args;

if (process.env.npm_execpath) {
  command = process.execPath;
  args = [process.env.npm_execpath, 'ci', '--omit=dev'];
} else {
  command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  args = ['ci', '--omit=dev'];
}

console.log('Running `npm ci --omit=dev` inside', serverDir);

const child = spawn(command, args, {
  cwd: serverDir,
  stdio: 'inherit'
});

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`Server dependency install failed with exit code ${code}.`);
    process.exit(code);
  } else {
    console.log('Server dependencies installed successfully.');
  }
});

child.on('error', (error) => {
  console.error('Failed to run npm for server directory:', error);
  process.exit(1);
});
