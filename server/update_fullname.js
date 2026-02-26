const { query } = require('./config/database');

async function updateFullName() {
  try {
    await query(
      'UPDATE users SET full_name = CONCAT(first_name, " ", last_name) WHERE email = ?',
      ['ash_lee@wmsu.edu.ph']
    );
    console.log('✅ Full name updated successfully!');
    
    // Verify the update
    const user = await query('SELECT first_name, last_name, full_name FROM users WHERE email = ?', ['ash_lee@wmsu.edu.ph']);
    console.log('Updated user:', user[0]);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateFullName();
