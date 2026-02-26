const bcrypt = require('bcryptjs');
const { query } = require('./server/config/database');

async function fixAdminPassword() {
  try {
    const newPassword = 'Admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    console.log('Updating admin password...');
    
    const result = await query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, 'adminjossie@wmsu.edu.ph']
    );
    
    if (result.affectedRows > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('Email: adminjossie@wmsu.edu.ph');
      console.log('Password: Admin123');
    } else {
      console.log('❌ Admin user not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixAdminPassword();
