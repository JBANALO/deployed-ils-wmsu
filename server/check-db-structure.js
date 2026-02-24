const { query } = require('./config/database');

async function checkDBStructure() {
  try {
    console.log('Checking database structure...');
    
    // Get table structure
    const structure = await query('DESCRIBE users');
    console.log('Users table structure:');
    structure.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} (Null: ${column.Null})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking database:', error.message);
    process.exit(1);
  }
}

checkDBStructure();
