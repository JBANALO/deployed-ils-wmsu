#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function deleteAllStudentRecords() {
  const config = {
    host: 'metro.proxy.rlwy.net',
    port: 25385,
    user: 'root',
    password: 'REPLACE_ME_DB_PASSWORD',
    database: 'railway'
  };

  try {
    console.log('\n🗑️  Delete All Student Records\n');
    const conn = await mysql.createConnection(config);

    // Get counts before
    const [countBefore] = await conn.query('SELECT COUNT(*) as count FROM students');
    const [usersBefore] = await conn.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    
    console.log(`Before Deletion:\n  Students: ${countBefore[0].count}\n  Student Users: ${usersBefore[0].count}\n`);

    // Delete all students from target grades and sections
    const [result1] = await conn.query(`
      DELETE FROM students 
      WHERE (grade_level = 'Grade 3' AND section IN ('Diligence', 'Wisdom'))
         OR (grade_level = 'Grade 1' AND section = 'Humility')
         OR (grade_level = 'Kindergarten' AND section = 'Love')
    `);

    console.log(`✅ Deleted ${result1.affectedRows} students from target grades\n`);

    // Delete student users from target names (using pattern matching)
    const patterns = [
      'Matthew%', 'Cid%', 'Mishary%', 'Arjunnur%', 'Ghazanfar%', 'Landimer%', 'Ahyan%', 'Jazeem%',
      'Muhammad%', 'Jazzmon%', 'John%', 'Abdelkalek%', 'Brayden%', 'Magnus%', 'Adriel%', 'Myiesha%',
      'Nur%', 'Shayma%', 'Norraizah%', 'Cesiah%', 'Xyrrah%', 'Zherhana%', 'Sophie%', 'Jhihann%',
      'Safia%', 'Reemah%', 'Charlize%', 'Meghan%', 'Yusuf%', 'Daenerys%', 'Queen%', 'Maxine%',
      'Shahirah%', 'Kiella%', 'Kienna%', 'Kierra%', 'Zhayra%', 'Aya%', 'Aviya%', 'Mary%',
      'Shahid%', 'Kaeden%', 'Fareed%', 'Ziyad%', 'James%', 'Chris%', 'Ruben%', 'Mohammad%',
      'Rieza%', 'Ralf%', 'Syariqul%', 'Ezra%', 'Ali%', 'Asiyah%', 'Aleeyah%', 'Sharifa%',
      'Arthea%', 'Mishael%', 'Rania%', 'Lien%', 'Aika%', 'Franxine%', 'Natalia%', 'Safiyya%',
      'Amana%', 'Shafiah%', 'Ahriena%', 'Jannah%', 'Mariae%', 'Julianne%', 'Keira%', 'Fatima%',
      'Nalyn%', 'Nurada%', 'Nurjanah%', 'Ayessha%', 'Ziara%', 'Joiezene%', 'Estan%', 'Zheeshan%',
      'Rasul%', 'Khalid%', 'Rieu%', 'Lunnor%', 'Meerkhan%', 'Hasmier%', 'Amir%', 'Pio%', 'Julio%',
      'Abdurazaq%', 'Zayd%', 'Elijah%', 'Yu%', 'Ashton%', 'Kazunari%', 'Nikuz%', 'Mujahidah%',
      'Darlyn%', 'Althea%', 'Avery%', 'Yusreena%', 'Jaydin%', 'Karline%', 'Princess%', 'Chloe%',
      'Reham%', 'Angelina%', 'Ellisha%', 'Atheyah%', 'Miel%', 'Ayesha%', 'Zabina%', 'Sofia%',
      'Asfiya%', 'Erica%', 'Alexis%', 'Josh%', 'Mahfuwdh%', 'Dylan%', 'Lucasmiguel%', 'Aevery%',
      'Olivier%', 'Jay%', 'Al%', 'Thomas%', 'Anton%', 'Noah%', 'Jhondie%', 'Afiyah%', 'Ayreesha%',
      'Amara%', 'Afizah%', 'Aishah%', 'Zameera%', 'Ayah%', 'Abriella%', 'Tanisha%', 'Ravinne%',
      'Raheema%', 'Aaqilah%', 'Arwa%', 'Sharleez%', 'Zakeeya%', 'Aisshawarya%', 'Raeesah%',
      'Jhulia%', 'Ashriel%', 'Yamina%', 'Alexandra%'
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const [res] = await conn.query(
        'DELETE FROM users WHERE role = "student" AND first_name LIKE ?',
        [pattern]
      );
      totalDeleted += res.affectedRows;
    }

    console.log(`✅ Deleted ${totalDeleted} student users from database\n`);

    // Get counts after
    const [countAfter] = await conn.query('SELECT COUNT(*) as count FROM students');
    const [usersAfter] = await conn.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    
    console.log(`After Deletion:\n  Students: ${countAfter[0].count}\n  Student Users: ${usersAfter[0].count}\n`);

    // Show remaining students (non-target grades)
    const [remaining] = await conn.query(`
      SELECT first_name, last_name, grade_level, section
      FROM students
      ORDER BY grade_level, section
      LIMIT 20
    `);

    if (remaining.length > 0) {
      console.log('📝 Remaining students:');
      remaining.forEach(s => {
        console.log(`   ${s.first_name} ${s.last_name} (${s.grade_level} - ${s.section})`);
      });
    } else {
      console.log('📝 No students remaining in database');
    }

    console.log('\n✅ Database cleared! Ready for fresh import!\n');
    await conn.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

deleteAllStudentRecords();
