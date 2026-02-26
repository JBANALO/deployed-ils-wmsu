const { query } = require('../config/database');

async function addParentColumns() {
  try {
    console.log('Adding parent columns to users table...');
    
    // Check current columns
    const result = await query('DESCRIBE users');
    const existingColumns = result.map(col => col.Field);
    console.log('Existing columns:', existingColumns);
    
    // Columns to add with their SQL definitions
    const columnsToAdd = [
      { name: 'middleName', sql: 'ADD COLUMN middleName VARCHAR(255) AFTER firstName' },
      { name: 'age', sql: 'ADD COLUMN age INT AFTER sex' },
      { name: 'sex', sql: 'ADD COLUMN sex VARCHAR(10) AFTER age' },
      { name: 'lrn', sql: 'ADD COLUMN lrn VARCHAR(20) AFTER sex' },
      { name: 'parentFirstName', sql: 'ADD COLUMN parentFirstName VARCHAR(255) AFTER section' },
      { name: 'parentLastName', sql: 'ADD COLUMN parentLastName VARCHAR(255) AFTER parentFirstName' },
      { name: 'parentEmail', sql: 'ADD COLUMN parentEmail VARCHAR(255) AFTER parentLastName' },
      { name: 'parentContact', sql: 'ADD COLUMN parentContact VARCHAR(20) AFTER parentEmail' },
      { name: 'profilePic', sql: 'ADD COLUMN profilePic TEXT AFTER parentContact' }
    ];
    
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adding column: ${column.name}`);
        try {
          await query(`ALTER TABLE users ${column.sql}`);
          console.log(`✅ ${column.name} added successfully`);
        } catch (error) {
          console.log(`❌ Failed to add ${column.name}:`, error.message);
        }
      } else {
        console.log(`✅ ${column.name} already exists`);
      }
    }
    
    // Verify columns were added
    const finalResult = await query('DESCRIBE users');
    const finalColumns = finalResult.map(col => col.Field);
    console.log('Final columns:', finalColumns);
    
    console.log('✅ Parent columns migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addParentColumns();
