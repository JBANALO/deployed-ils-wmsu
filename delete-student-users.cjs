#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function deleteUserRecords() {
  const dbUrl = 'REPLACE_ME_DATABASE_URL';
  const urlObj = new URL(dbUrl);

  const config = {
    host: urlObj.hostname,
    port: parseInt(urlObj.port),
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1)
  };

  console.log('\n🗑️  Delete Student Users from Users Table\n');
  console.log('🔌 Connecting to Railway MySQL...');

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected!\n');

    // List of names to delete (generate their auto-generated emails)
    const studentsToDelete = [
      ['Matthew Xander', 'Alacre'],
      ['Cid Raeed', 'Aranan'],
      ['Mishary', 'Bakial'],
      ['Arjunnur', 'De Ocampo'],
      ['Ghazanfar', 'Gonzalez'],
      ['Landimer', 'Halipa'],
      ['Ahyan Shazeef', 'Ibrahim'],
      ['Jazeem', 'Irilis'],
      ['Muhammad Wadood', 'Jamiri'],
      ['Jazzmon Yousef', 'Loquias'],
      ['John Mc-Reen', 'Sailabbi'],
      ['Abdelkalek', 'Sarajan'],
      ['Brayden Anaiah', 'Sinsuan'],
      ['Magnus Jury', 'Tandoy'],
      ['Adriel', 'Yap Aizon'],
      ['Myiesha Liyana', 'Abdulhamid'],
      ['Nur Afsheen', 'Abdurajak'],
      ['Shayma Shillan', 'Alejano'],
      ['Norraizah', 'Ali'],
      ['Cesiah', 'Bautista'],
      ['Xyrrah Mae', 'Beraña'],
      ['Zherhana Jamila', 'Edding'],
      ['Sophie Aleeyah Ryne', 'Fabian'],
      ['Jhihann', 'Hairon'],
      ['Safia-Zahra', 'Isahac'],
      ['Reemah', 'Julwadi'],
      ['Charlize Belle', 'Lastimoso'],
      ['Meghan Faye', 'Macadami'],
      ['Yusuf Zaara', 'Mohammed'],
      ['Daenerys Ysabelle', 'Orque'],
      ['Queen Cess-Skyler', 'Pansib'],
      ['Maxine Therese', 'Ramos'],
      ['Shahirah Aishan', 'Rasid'],
      ['Kiella Rafela', 'Reyes'],
      ['Kienna Rafaela', 'Reyes'],
      ['Kierra Rafa', 'Reyes'],
      ['Zhayra', 'Sarail'],
      ['Aya Dionne', 'Sharif'],
      ['Aviya Emelie', 'Tan'],
      ['Mary Franz Jannea', 'Tabal'],
      ['Shahid', 'Abdulkarim'],
      ['Muhammad Omor', 'Ahmad'],
      ['Kaeden', 'Encilay'],
      ['Fareed Ashraf', 'Fernandez'],
      ['Ziyad', 'Gadialu'],
      ['James Gabriel', 'Habil'],
      ['Chris Matthew', 'Hernando'],
      ['Ruben', 'Ho'],
      ['Mohammad Indahan Jr.', 'Jasani'],
      ['Rieza', 'Kinang'],
      ['Ralf Angelo', 'Llacuna'],
      ['Syariqul', 'Malalaj'],
      ['Ezra Zobris', 'Pobre'],
      ['Ali-Muzaffar', 'Sacay'],
      ['Asiyah', 'Alamia'],
      ['Aleeyah', 'Buboy'],
      ['Sharifa Majeeya', 'Buttongah'],
      ['Arthea Gaea', 'Candido'],
      ['Mishael', 'Crisostomo'],
      ['Rania Mariae', 'Edding'],
      ['Lien Blair', 'Estandarte'],
      ['Aika Grace', 'Flores'],
      ['Franxine Ann', 'Francisco'],
      ['Natalia Vernice', 'Grajo'],
      ['Shariffa Sara', 'Haduirul'],
      ['Safiyya', 'Hajan'],
      ['Amana', 'Hamahali'],
      ['Shafiah', 'Jumdain'],
      ['Ahriena', 'Khalifa'],
      ['Jannah', 'Larena'],
      ['Mariae Carrie', 'Luna'],
      ['Julianne', 'Molina'],
      ['Keira Emille', 'Natividad'],
      ['Fatima Raweeya', 'Quijano'],
      ['Nalyn', 'Sapie'],
      ['Nurada', 'Sailabi'],
      ['Nurjanah', 'Tangkian'],
      ['Ayessha', 'Tanwasul'],
      ['Ziara', 'Tingkasan'],
      ['Joiezene Jaime', 'Villarama'],
      ['Estan-Matt Aron', 'Abad'],
      ['Zheeshan Alraeis', 'Abdulhamid'],
      ['Rasul', 'Abubakar'],
      ['Khalid Saif', 'Alamia'],
      ['Rieu Andrei', 'Burlas'],
      ['Lunnor Jr.', 'Halipa'],
      ['Meerkhan Deen', 'Karanain'],
      ['Hasmier Khan', 'Kurais'],
      ['Amir Ayaan', 'Latorre'],
      ['Pio Marcus Angelo', 'Padawan'],
      ['Julio Raphael', 'Sanson'],
      ['Abdurazaq', 'Sawadi'],
      ['Zayd Hisham', 'Tandah'],
      ['Elijah Peniel', 'Tarroza'],
      ['Yu Qie', 'Vivar'],
      ['Ashton Riley', 'Bughao'],
      ['Kazunari', 'Karasudani'],
      ['Nikuz Yenoh', 'Marcelino'],
      ['Mujahidah', 'Abdulkarim'],
      ['Darlyn Rein', 'Borja'],
      ['Althea Chryzelle', 'Dela Cruz'],
      ['Avery Elise', 'Dinulos'],
      ['Yusreena', 'Edding'],
      ['Jaydin Belleana', 'Enguerra'],
      ['Karline Saoirse', 'Hernandez'],
      ['Princess Jacelza', 'Kiram'],
      ['Kienna', 'Lagonera'],
      ['Chloe Gyle', 'Lastimoso'],
      ['Reham', 'Madja'],
      ['Angelina Graciela', 'Maglangit'],
      ['Ellisha Blaire', 'Morallo'],
      ['Atheyah', 'Mustafa'],
      ['Miel Acetherielle', 'Ocampo'],
      ['Ayesha Noor', 'Ope'],
      ['Zabina Nicole', 'Regalado'],
      ['Sofia Belle', 'Rodriguez'],
      ['Asfiya', 'Sacay'],
      ['Erica Jayzel', 'Suegay'],
      ['Alexis Katarina Maureen', 'Saavedra'],
      ['Josh Mildred Mortera', 'Baguio'],
      ['Mahfuwdh Sabandal', 'Bausabri'],
      ['Dylan Raphael Agoo', 'Custodio'],
      ['Lucasmiguel Francisco', 'De Guzman'],
      ['Aevery Ryle Andres', 'Fabian'],
      ['Olivier Jhon Singha', 'Javier'],
      ['Jay Luis Malaki', 'Lagua'],
      ['Al-Kham Atilano', 'Lantaka'],
      ['Thomas Ezio Udaundo', 'Oliveros'],
      ['Anton Kristoffer Marco Fernandez', 'Saavedra'],
      ['Noah Mishael Siano', 'Valer'],
      ['Elijah Mikail', 'Wingo'],
      ['Jhondie', 'Sebastian'],
      ['Afiyah Abduraup', 'Abdulkarim'],
      ['Ayreesha Unsang', 'Adjilani'],
      ['Amara Nia Hadjula', 'Aidil'],
      ['Afizah Villareal', 'Ahmad'],
      ['Aishah Taasin', 'Alamia'],
      ['Zameera Yusra Bernardo', 'Anadil'],
      ['Ayah Caela Dela Cruz', 'Bas'],
      ['Princess Nurhata Abrison', 'Bravo'],
      ['Abriella Louise', 'Gonzalez'],
      ['Tanisha Azizah Sanaani', 'Hasan'],
      ['Ravinne Louisse Casido', 'Ho'],
      ['Raheema Jaji', 'Jamiri'],
      ['Aaqilah Salapuddin', 'Jumahari'],
      ['Arwa Yesha Gulam', 'Kadil'],
      ['Sharleez Hernandez', 'Lahug'],
      ['Zakeeya Jaidi', 'Omar'],
      ['Aisshawarya Sarahan', 'Sahibul'],
      ['Raeesah Abubakar', 'Salahuddin'],
      ['Jhulia Rhaymie Anastacio', 'Sanson'],
      ['Ashriel Emelie Factor', 'Tan'],
      ['Yamina Sheza Galvez', 'Usman'],
      ['Fatima Al Zara Leon', 'Ticao'],
      ['Alexandra Ivana Ho', 'Villadarez']
    ];

    // Get user count before
    const [countBefore] = await connection.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'student'"
    );
    console.log(`📊 Student users before deletion: ${countBefore[0].count}\n`);

    console.log('🔄 Deleting student users...\n');

    // Delete from users table by name
    let deletedCount = 0;
    for (const [firstName, lastName] of studentsToDelete) {
      const result = await connection.query(
        "DELETE FROM users WHERE first_name = ? AND last_name = ? AND role = 'student'",
        [firstName, lastName]
      );
      if (result[0].affectedRows > 0) {
        deletedCount += result[0].affectedRows;
      }
    }

    // Get count after
    const [countAfter] = await connection.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'student'"
    );

    console.log(`✅ Deletion Complete!\n`);
    console.log(`📊 Deleted student users: ${deletedCount}`);
    console.log(`📊 Student users after deletion: ${countAfter[0].count}\n`);

    await connection.end();
    console.log('🎉 Database cleaned! Ready for fresh import!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteUserRecords();
