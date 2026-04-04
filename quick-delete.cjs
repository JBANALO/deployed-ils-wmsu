#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function quickDelete() {
  const config = {
    host: 'metro.proxy.rlwy.net',
    port: 25385,
    user: 'root',
    password: 'REPLACE_ME_DB_PASSWORD',
    database: 'railway'
  };

  try {
    console.log('\n🗑️  Quick Delete - Student Records\n');
    const conn = await mysql.createConnection(config);

    // Get counts
    const [sb] = await conn.query('SELECT COUNT(*) as c FROM students');
    const [sb2] = await conn.query('SELECT COUNT(*) as c FROM users WHERE role = "student"');
    
    console.log(`Before:\n  Students: ${sb[0].c}\n  Users: ${sb2[0].c}\n`);

    // Delete student users only (not students table)
    const [res] = await conn.query('DELETE FROM users WHERE role = "student" AND (first_name LIKE "Matthew%" OR first_name LIKE "Cid%" OR first_name LIKE "Mishary%" OR first_name LIKE "Arjunnur%" OR first_name LIKE "Ghazanfar%" OR first_name LIKE "Landimer%" OR first_name LIKE "Ahyan%" OR first_name LIKE "Jazeem%" OR first_name LIKE "Muhammad%" OR first_name LIKE "Jazzmon%" OR first_name LIKE "John%" OR first_name LIKE "Abdelkalek%" OR first_name LIKE "Brayden%" OR first_name LIKE "Magnus%" OR first_name LIKE "Adriel%" OR first_name LIKE "Myiesha%" OR first_name LIKE "Nur%" OR first_name LIKE "Shayma%" OR first_name LIKE "Norraizah%" OR first_name LIKE "Cesiah%" OR first_name LIKE "Xyrrah%" OR first_name LIKE "Zherhana%" OR first_name LIKE "Sophie%" OR first_name LIKE "Jhihann%" OR first_name LIKE "Safia%" OR first_name LIKE "Reemah%" OR first_name LIKE "Charlize%" OR first_name LIKE "Meghan%" OR first_name LIKE "Yusuf%" OR first_name LIKE "Daenerys%" OR first_name LIKE "Queen%" OR first_name LIKE "Maxine%" OR first_name LIKE "Shahirah%" OR first_name LIKE "Kiella%" OR first_name LIKE "Kienna%" OR first_name LIKE "Kierra%" OR first_name LIKE "Zhayra%" OR first_name LIKE "Aya%" OR first_name LIKE "Aviya%" OR first_name LIKE "Mary%" OR first_name LIKE "Shahid%" OR first_name LIKE "Kaeden%" OR first_name LIKE "Fareed%" OR first_name LIKE "Ziyad%" OR first_name LIKE "James%" OR first_name LIKE "Chris%" OR first_name LIKE "Ruben%" OR first_name LIKE "Mohammad%" OR first_name LIKE "Rieza%" OR first_name LIKE "Ralf%" OR first_name LIKE "Syariqul%" OR first_name LIKE "Ezra%" OR first_name LIKE "Ali%" OR first_name LIKE "Asiyah%" OR first_name LIKE "Aleeyah%" OR first_name LIKE "Sharifa%" OR first_name LIKE "Arthea%" OR first_name LIKE "Mishael%" OR first_name LIKE "Rania%" OR first_name LIKE "Lien%" OR first_name LIKE "Aika%" OR first_name LIKE "Franxine%" OR first_name LIKE "Natalia%" OR first_name LIKE "Safiyya%" OR first_name LIKE "Amana%" OR first_name LIKE "Shafiah%" OR first_name LIKE "Ahriena%" OR first_name LIKE "Jannah%" OR first_name LIKE "Mariae%" OR first_name LIKE "Julianne%" OR first_name LIKE "Keira%" OR first_name LIKE "Fatima%" OR first_name LIKE "Nalyn%" OR first_name LIKE "Nurada%" OR first_name LIKE "Nurjanah%" OR first_name LIKE "Ayessha%" OR first_name LIKE "Ziara%" OR first_name LIKE "Joiezene%" OR first_name LIKE "Estan%" OR first_name LIKE "Zheeshan%" OR first_name LIKE "Rasul%" OR first_name LIKE "Khalid%" OR first_name LIKE "Rieu%" OR first_name LIKE "Lunnor%" OR first_name LIKE "Meerkhan%" OR first_name LIKE "Hasmier%" OR first_name LIKE "Amir%" OR first_name LIKE "Pio%" OR first_name LIKE "Julio%" OR first_name LIKE "Abdurazaq%" OR first_name LIKE "Zayd%" OR first_name LIKE "Elijah%" OR first_name LIKE "Yu%" OR first_name LIKE "Ashton%" OR first_name LIKE "Kazunari%" OR first_name LIKE "Nikuz%" OR first_name LIKE "Mujahidah%" OR first_name LIKE "Darlyn%" OR first_name LIKE "Althea%" OR first_name LIKE "Avery%" OR first_name LIKE "Yusreena%" OR first_name LIKE "Jaydin%" OR first_name LIKE "Karline%" OR first_name LIKE "Princess%" OR first_name LIKE "Chloe%" OR first_name LIKE "Reham%" OR first_name LIKE "Angelina%" OR first_name LIKE "Ellisha%" OR first_name LIKE "Atheyah%" OR first_name LIKE "Miel%" OR first_name LIKE "Ayesha%" OR first_name LIKE "Zabina%" OR first_name LIKE "Sofia%" OR first_name LIKE "Asfiya%" OR first_name LIKE "Erica%" OR first_name LIKE "Alexis%" OR first_name LIKE "Josh%" OR first_name LIKE "Mahfuwdh%" OR first_name LIKE "Dylan%" OR first_name LIKE "Lucasmiguel%" OR first_name LIKE "Aevery%" OR first_name LIKE "Olivier%" OR first_name LIKE "Jay%" OR first_name LIKE "Al%" OR first_name LIKE "Thomas%" OR first_name LIKE "Anton%" OR first_name LIKE "Noah%" OR first_name LIKE "Jhondie%" OR first_name LIKE "Afiyah%" OR first_name LIKE "Ayreesha%" OR first_name LIKE "Amara%" OR first_name LIKE "Afizah%" OR first_name LIKE "Aishah%" OR first_name LIKE "Zameera%" OR first_name LIKE "Ayah%" OR first_name LIKE "Abriella%" OR first_name LIKE "Tanisha%" OR first_name LIKE "Ravinne%" OR first_name LIKE "Raheema%" OR first_name LIKE "Aaqilah%" OR first_name LIKE "Arwa%" OR first_name LIKE "Sharleez%" OR first_name LIKE "Zakeeya%" OR first_name LIKE "Aisshawarya%" OR first_name LIKE "Raeesah%" OR first_name LIKE "Jhulia%" OR first_name LIKE "Ashriel%" OR first_name LIKE "Yamina%" OR first_name LIKE "Alexandra%")');

    const [sa] = await conn.query('SELECT COUNT(*) as c FROM students');
    const [sa2] = await conn.query('SELECT COUNT(*) as c FROM users WHERE role = "student"');

    console.log(`After:\n  Students: ${sa[0].c}\n  Users: ${sa2[0].c}\n`);
    console.log(`✅ Deleted ${res.affectedRows} user records\n`);
    console.log('✅ Ready for fresh import!\n');

    await conn.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

quickDelete();
