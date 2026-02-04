# WMSU Portal - MySQL Setup Guide para phpMyAdmin

## 📋 Quickstart Instructions

### Step 1: Access phpMyAdmin
```
URL: http://localhost/phpmyadmin
or
URL: http://your-server-ip/phpmyadmin
```

### Step 2: Import Database

#### Option A: Import Complete Database (RECOMMENDED)
1. Login sa phpMyAdmin
2. Click **"Import"** tab sa top menu
3. Click **"Choose File"** 
4. Select: `wmsu_portal_complete.sql`
5. Click **"Go"** button
6. Mag-wait mag-load...
✅ Database ready to use!

#### Option B: Import Individual Tables
1. Login sa phpMyAdmin
2. Click **"Import"** tab
3. Upload each file one by one:
   - `students.sql`
   - `users.sql`
   - `attendance.sql`
   - `classes.sql`
   - `grades.sql`

---

## 📂 Database Files Location

All SQL files are in:
```
c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system\database\
```

Files included:
- ✅ `wmsu_portal_complete.sql` - COMPLETE DATABASE (IMPORT THIS!)
- `students.sql` - Students table only
- `users.sql` - Users table only
- `attendance.sql` - Attendance records
- `classes.sql` - Classes & subject teachers
- `grades.sql` - Grades table

---

## 🔧 Database Configuration for Backend

### For Node.js/Express Backend

Create a `.env` file with:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=wmsu_portal
DB_PORT=3306
```

Or update your `config/database.js`:
```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wmsu_portal',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
```

### For PHP Backend

Create `config.php`:
```php
<?php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASSWORD', '');
define('DB_NAME', 'wmsu_portal');
define('DB_PORT', 3306);

$conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
```

---

## 📊 Database Schema Overview

### Tables Created:
1. **users** - Admin, Teachers, Students accounts
2. **students** - Student information with grades
3. **classes** - Grade levels and sections
4. **subject_teachers** - Teacher-to-class assignments
5. **attendance** - Daily attendance records
6. **grades** - Individual subject grades

### Default Admin Credentials:
```
Username: admin1
Email: admin1@wmsu.edu.ph
Password: (hashed - use JWT for auth)

or

Username: jossie
Email: adminjossie@wmsu.edu.ph
Password: (hashed - use JWT for auth)
```

### Sample Teacher:
```
Username: josie.banalo
Email: josie.banalo@wmsu.edu.ph
Role: Teacher
Status: Approved
```

### Sample Student:
```
Username: shahid.abdulkarim
Email: shahid.abdulkarim@wmsu.edu.ph
Role: Student
Grade Level: Grade 3
Section: Wisdom
```

---

## ✅ Verification Checklist

After importing, verify:

1. **In phpMyAdmin**, check:
   - [ ] Database `wmsu_portal` exists
   - [ ] 6 tables visible: users, students, classes, subject_teachers, attendance, grades
   - [ ] Sample data loaded in each table

2. **Run queries to verify**:
```sql
-- Check user count
SELECT COUNT(*) FROM users;

-- Check students
SELECT COUNT(*) FROM students;

-- Check classes
SELECT * FROM classes;

-- Check attendance records
SELECT COUNT(*) FROM attendance;

-- Check grades
SELECT * FROM grades LIMIT 5;
```

---

## 🔐 Security Notes

⚠️ **IMPORTANT:**
- Passwords are already hashed with bcrypt
- Change the default passwords after setup
- Update `.env` credentials for production
- Never commit `.env` to version control
- Use HTTPS in production

---

## 🐛 Troubleshooting

### Import Error: "Table already exists"
- Delete existing `wmsu_portal` database
- Go to phpMyAdmin → Databases
- Find `wmsu_portal` → Drop it
- Re-import

### Connection Error
- Ensure MySQL service is running
- Check DB_HOST, DB_USER, DB_PASSWORD
- Verify MySQL port (default 3306)

### Foreign Key Error
- Import in order: users → students → classes → subject_teachers → attendance → grades
- Or use complete file (already ordered correctly)

---

## 📞 Need Help?

Check your project files:
- Backend config: `/server/config/database.js`
- Frontend API: `/src/api/axiosConfig.js`
- Database setup: `/database/wmsu_portal_complete.sql`

---

Last Updated: 2026-02-01
WMSU Portal v1.0
