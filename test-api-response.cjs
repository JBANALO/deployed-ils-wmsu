#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function getAPIResponse() {
  const dbUrl = 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';
  const urlObj = new URL(dbUrl);

  const config = {
    host: urlObj.hostname,
    port: parseInt(urlObj.port),
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1)
  };

  try {
    console.log('\n📱 Testing API Response\n');
    const connection = await mysql.createConnection(config);

    // Get one student exactly as the API would
    const [rows] = await connection.query('SELECT * FROM students LIMIT 1');
    
    if (rows.length === 0) {
      console.log('❌ No students in database!');
      await connection.end();
      return;
    }

    const student = rows[0];
    
    console.log('Raw database record:');
    console.log(`ID: ${student.id}`);
    console.log(`LRN: ${student.lrn}`);
    console.log(`Name: ${student.first_name} ${student.last_name}`);
    console.log(`QR Code field: ${student.qr_code}`);
    console.log(`QR Code type: ${typeof student.qr_code}`);
    console.log(`QR Code length: ${student.qr_code?.length || 0}`);
    
    console.log('\n---After formatStudent() conversion:');
    const formatted = {
      id: student.id,
      lrn: student.lrn,
      firstName: student.first_name,
      lastName: student.last_name,
      qrCode: student.qr_code
    };
    console.log(JSON.stringify(formatted, null, 2));
    
    console.log('\n📊 QR Code Analysis:');
    if (!student.qr_code) {
      console.log('❌ QR Code is NULL/empty');
    } else if (student.qr_code.startsWith('data:image')) {
      console.log('✅ QR Code is base64 image data');
      console.log(`   Length: ${student.qr_code.length} chars`);
    } else if (student.qr_code.startsWith('/qrcodes')) {
      console.log('⚠️  QR Code is a FILE PATH (not ideal for mobile)');
      console.log(`   Path: ${student.qr_code}`);
      console.log('   Note: Mobile app needs base64 data or full URL');
    } else {
      console.log('❓ QR Code format unknown');
      console.log(`   Value: ${student.qr_code.substring(0, 100)}...`);
    }

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getAPIResponse();
