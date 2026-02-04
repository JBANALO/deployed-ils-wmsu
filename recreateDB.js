import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function recreateDB() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
  });

  try {
    console.log('Dropping old database...');
    await connection.execute('DROP DATABASE IF EXISTS wmsu_portal');
    console.log('Creating new database...');
    await connection.execute('CREATE DATABASE wmsu_portal');
    
    console.log('Importing complete SQL file...');
    const sqlFile = path.join(__dirname, 'database/wmsu_portal_complete.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split and execute statements
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      try {
        await connection.execute(statement);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.log('Error executing:', err.message);
        }
      }
    }
    
    console.log('✅ Database recreated and populated successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}

recreateDB();
