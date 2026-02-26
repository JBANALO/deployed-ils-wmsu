const { query } = require('../config/database');

async function addParentColumns() {
  try {
    console.log('Adding parent columns to users table...');
    
    // Check if columns already exist
    const checkColumns = await query('DESCRIBE users');
    const existingColumns = checkColumns.map(col => col.Field);
    
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
        await query(`ALTER TABLE users ${column.sql}`);
        console.log(`✅ ${column.name} added successfully`);
      } else {
        console.log(`✅ ${column.name} already exists`);
      }
    }
    
    console.log('✅ All parent columns added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }
}

addParentColumns();
