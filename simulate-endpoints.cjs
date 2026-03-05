const pool = require('./backend/server/config/db');
require('dotenv').config();

(async () => {
  try {
    console.log('\n=== SIMULATING /api/teachers ENDPOINT ===\n');
    
    const [teachers] = await pool.query(
      `SELECT id, first_name as firstName, last_name as lastName, email, role FROM users 
       WHERE role IN ('teacher', 'adviser', 'subject_teacher') 
       ORDER BY first_name, last_name`
    );

    if (teachers && teachers.length > 0) {
      console.log(`✅ Found ${teachers.length} teachers`);
      const response = {
        status: 'success',
        data: {
          teachers
        },
        teachers
      };
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log('❌ No teachers found!');
    }
    
    console.log('\n=== SIMULATING /api/users ENDPOINT ===\n');
    
    const [dbUsers] = await pool.query(
      `SELECT id, first_name as firstName, last_name as lastName, email, role, status as approval_status 
       FROM users 
       ORDER BY first_name, last_name`
    );
    
    const usersWithoutPasswords = dbUsers.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    const usersResponse = {
      status: 'success',
      data: {
        users: usersWithoutPasswords
      }
    };
    
    console.log(`✅ Found ${usersWithoutPasswords.length} total users`);
    console.log('Sample (first 3):');
    console.log(JSON.stringify(usersResponse.data.users.slice(0, 3), null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit();
})();
