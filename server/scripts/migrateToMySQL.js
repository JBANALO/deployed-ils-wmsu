// server/scripts/migrateToMySQL.js
require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '../../data');

async function migrateUsers() {
  const file = path.join(dataDir, 'users.json');
  if (!fs.existsSync(file)) return;
  const users = JSON.parse(fs.readFileSync(file, 'utf-8'));
  for (const user of users) {
    try {
      // Check if user exists
      const existing = await query('SELECT id FROM users WHERE email = ?', [user.email]);
      if (existing.length > 0) continue;
      const hashedPassword = user.password && user.password.length < 60 ? await bcrypt.hash(user.password, 12) : user.password;
      await query(
        `INSERT INTO users (id, email, password, firstName, lastName, role, position, isSubjectTeacher, subjects, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.email,
          hashedPassword,
          user.firstName || '',
          user.lastName || '',
          user.role || 'student',
          user.position || null,
          user.isSubjectTeacher || false,
          Array.isArray(user.subjects) ? user.subjects.join('; ') : (user.subjects || null),
          user.status || 'pending',
          user.createdAt || new Date().toISOString()
        ]
      );
    } catch (err) {
      console.error('User migration error:', user.email, err.message);
    }
  }
  console.log('Users migrated:', users.length);
}

async function migrateStudents() {
  const file = path.join(dataDir, 'students.json');
  if (!fs.existsSync(file)) return;
  const students = JSON.parse(fs.readFileSync(file, 'utf-8'));
  for (const student of students) {
    try {
      const existing = await query('SELECT id FROM students WHERE lrn = ?', [student.lrn]);
      if (existing.length > 0) continue;
      await query(
        `INSERT INTO students (id, lrn, firstName, lastName, fullName, email, gradeLevel, section, sex, parentEmail, parentContact, qrCode, status, grades, average, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          student.id,
          student.lrn,
          student.firstName || '',
          student.lastName || '',
          student.fullName || '',
          student.email || '',
          student.gradeLevel || '',
          student.section || '',
          student.sex || '',
          student.parentEmail || '',
          student.parentContact || '',
          student.qrCode || '',
          student.status || 'Active',
          student.grades ? JSON.stringify(student.grades) : '{}',
          student.average || 0,
          student.createdAt || new Date().toISOString()
        ]
      );
    } catch (err) {
      console.error('Student migration error:', student.lrn, err.message);
    }
  }
  console.log('Students migrated:', students.length);
}

async function migrateGrades() {
  const file = path.join(dataDir, 'grades.json');
  if (!fs.existsSync(file)) return;
  const grades = JSON.parse(fs.readFileSync(file, 'utf-8'));
  for (const grade of grades) {
    try {
      await query(
        `INSERT INTO grades (id, studentId, subject, quarter, grade, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          grade.id,
          grade.studentId,
          grade.subject,
          grade.quarter,
          grade.grade,
          grade.createdAt || new Date().toISOString()
        ]
      );
    } catch (err) {
      console.error('Grade migration error:', grade.id, err.message);
    }
  }
  console.log('Grades migrated:', grades.length);
}

async function migrateDeleteRequests() {
  const file = path.join(dataDir, 'delete_requests.json');
  if (!fs.existsSync(file)) return;
  const requests = JSON.parse(fs.readFileSync(file, 'utf-8'));
  for (const req of requests) {
    try {
      await query(
        `INSERT INTO delete_requests (id, studentId, reason, status, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
        [
          req.id,
          req.studentId,
          req.reason,
          req.status || 'pending',
          req.createdAt || new Date().toISOString()
        ]
      );
    } catch (err) {
      console.error('Delete request migration error:', req.id, err.message);
    }
  }
  console.log('Delete requests migrated:', requests.length);
}

async function main() {
  await migrateUsers();
  await migrateStudents();
  await migrateGrades();
  await migrateDeleteRequests();
  console.log('Migration complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
