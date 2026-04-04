#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkTableSchema() {
  const config = {
    host: 'metro.proxy.rlwy.net',
    port: 25385,
    user: 'root',
    password: 'REPLACE_ME_DB_PASSWORD',
    database: 'railway'
  };

  try {
    console.log('\n📋 Students Table Schema\n');
    const conn = await mysql.createConnection(config);

    const [columns] = await conn.query(`DESCRIBE students`);
    
    console.log('Table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? '[NOT NULL]' : ''}`);
    });

    await conn.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkTableSchema();
