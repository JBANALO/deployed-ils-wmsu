const { query } = require('./config/database');

async function addUserColumns() {
  try {
    console.log('Adding missing user columns...');
    
    // Add phone column if it doesn't exist
    try {
      await query('ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT ""');
      console.log('✅ Phone column added');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('❌ Error adding phone column:', error.message);
      } else {
        console.log('✅ Phone column already exists');
      }
    }
    
    // Add profile_pic column if it doesn't exist
    try {
      await query('ALTER TABLE users ADD COLUMN profile_pic TEXT DEFAULT ""');
      console.log('✅ Profile pic column added');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('❌ Error adding profile_pic column:', error.message);
      } else {
        console.log('✅ Profile pic column already exists');
      }
    }
    
    console.log('✅ User table columns updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating user table:', error.message);
    process.exit(1);
  }
}

addUserColumns();
