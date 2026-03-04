#!/usr/bin/env node
require('dotenv').config();
const pool = require('./backend/server/config/db');

async function checkSchema() {
  try {
    const [columns] = await pool.query('DESCRIBE users');
    console.log('\n✓ Users table columns:\n');
    columns.forEach(col => console.log(`  ${col.Field} (${col.Type})`));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkSchema();
