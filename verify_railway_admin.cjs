// Verify Railway Database Admin Account
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function verifyAdmin() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  console.log('=== VERIFYING ADMIN ACCOUNT ===\n');

  // Check if admin exists
  const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', ['adminjossie@wmsu.edu.ph']);
  
  if (users.length === 0) {
    console.log('❌ Admin account NOT FOUND!');
    await connection.end();
    return;
  }

  const admin = users[0];
  console.log('✅ Admin account found:');
  console.log('  ID:', admin.id);
  console.log('  Email:', admin.email);
  console.log('  Username:', admin.username);
  console.log('  Role:', admin.role);
  console.log('  Password hash:', admin.password.substring(0, 20) + '...');
  console.log();

  // Test password
  console.log('Testing password "Admin123"...');
  const match = await bcrypt.compare('Admin123', admin.password);
  
  if (match) {
    console.log('✅ Password matches!');
  } else {
    console.log('❌ Password does NOT match!');
    console.log('Creating new password hash...');
    const newHash = await bcrypt.hash('Admin123', 12);
    console.log('New hash:', newHash);
    
    // Update password
    await connection.execute('UPDATE users SET password = ? WHERE email = ?', [newHash, 'adminjossie@wmsu.edu.ph']);
    console.log('✅ Password updated!');
  }

  await connection.end();
  console.log('\n✅ Verification complete!');
}

verifyAdmin().catch(console.error);
