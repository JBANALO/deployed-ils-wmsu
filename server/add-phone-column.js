const { query } = require('./config/database');

async function addPhoneColumn() {
  try {
    console.log('Adding phone column to users table...');
    
    // Check if phone column already exists
    const desc = await query('DESCRIBE users');
    console.log('Current columns:', desc.map(col => col.Field));
    const hasPhoneColumn = desc.some(column => column.Field === 'phone');
    
    if (!hasPhoneColumn) {
      await query('ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT "" AFTER email');
      console.log('✅ Phone column added successfully');
    } else {
      console.log('✅ Phone column already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding phone column:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

addPhoneColumn();
