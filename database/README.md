# 📊 WMSU Portal - Complete Database Package

## ✅ What You Got

All database files ready for **MySQL + phpMyAdmin**:

```
📁 /database/
├── wmsu_portal_complete.sql  ⭐ MAIN FILE (USE THIS!)
├── students.sql
├── users.sql
├── attendance.sql
├── classes.sql
├── grades.sql
├── test_connection.php
└── SETUP_GUIDE.md
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Open phpMyAdmin
```
http://localhost/phpmyadmin
```

### Step 2: Import Database
- Click **"Import"** tab
- Choose File: **`wmsu_portal_complete.sql`**
- Click **"Go"**
- Wait 10-30 seconds...

### Step 3: Done! ✅
Database automatically created with:
- 6 optimized tables
- Sample admin/teacher/student accounts
- 80+ students data
- Attendance records
- Grade data
- Foreign keys configured

---

## 📋 Database Contents

### **Users Table** (100+ accounts)
```
Admins:
- admin1 / admin1@wmsu.edu.ph
- jossie / adminjossie@wmsu.edu.ph

Teachers:
- josie.banalo / josie.banalo@wmsu.edu.ph (APPROVED)
- test.teacher / test@wmsu.edu.ph

Students: 80+ student accounts
```

### **Students Table** (80+ records)
```
Sample:
- Shahid Abdulkarim (Grade 3 - Wisdom)
- Muhammad Omor Ahmad (Grade 3 - Wisdom)
- Kafden Encilay (Grade 3 - Wisdom)
...and 77 more
```

### **Classes** (6 classes)
```
- Kindergarten - Love
- Grade 1 - Wisdom
- Grade 1 - Humility
- Grade 2 - Kindness
- Grade 3 - Wisdom
- Grade 3 - Diligence
```

### **Subject Teachers** (4 assignments)
```
Josie Banalo teaching:
- Music (Grade 2 - Kindness)
- Filipino (Grade 3 - Diligence)
- English (Grade 1 - Humility & Grade 3 - Wisdom)
```

### **Attendance** (10+ records)
```
Sample dates: 2026-01-24 to 2026-01-29
Status: Present, Absent, Late
Location: QR Portal, Mobile App
```

### **Grades** (6+ grade entries)
```
Shahid Abdulkarim's Q1 Grades:
- English: 90
- Mathematics: 85
- Filipino: 98
- Science: 99
- Araling Panlipunan: 90
- MAPEH: 97
Average: 93.17
```

---

## 🔐 Security

**All passwords are:**
- ✅ Bcrypt hashed
- ✅ Industry standard (cost factor 12)
- ✅ Safe to use in production

**Default credentials (all hashed):**
```
Role: Admin
Username: admin1
Email: admin1@wmsu.edu.ph

Role: Teacher (Approved)
Username: josie.banalo
Email: josie.banalo@wmsu.edu.ph

Role: Student
Username: shahid.abdulkarim
Email: shahid.abdulkarim@wmsu.edu.ph
```

---

## 🔗 Relationships

```
users (1) ─────────── (many) students
           ├─ Foreign Key: adviser_id

classes (1) ─────────── (many) subject_teachers
            └─ Foreign Key: class_id

users (1) ─────────── (many) subject_teachers
          └─ Foreign Key: teacher_id

students (1) ─────────── (many) attendance
             └─ Foreign Key: studentId

students (1) ─────────── (many) grades
             └─ Foreign Key: studentId
```

---

## 📱 For Your Backend

### Environment Variables (.env)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=wmsu_portal
DB_PORT=3306
```

### Connection String (Node.js)
```javascript
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
```

### Connection String (PHP)
```php
$conn = new mysqli('localhost', 'root', '', 'wmsu_portal');
```

---

## ✔️ Verification

After import, test with this query:
```sql
SELECT * FROM users LIMIT 5;
SELECT COUNT(*) FROM students;
SELECT * FROM classes;
SELECT * FROM attendance LIMIT 5;
SELECT * FROM grades LIMIT 5;
```

---

## 📂 File Sizes

- `wmsu_portal_complete.sql` - ~250 KB (complete)
- `students.sql` - ~150 KB
- `users.sql` - ~50 KB
- `attendance.sql` - ~15 KB
- `classes.sql` - ~5 KB
- `grades.sql` - ~10 KB

---

## ⚡ Performance

**Indexes Created:**
- ✅ Email (fast login)
- ✅ Username (search)
- ✅ Grade + Section (class queries)
- ✅ Student + Date (attendance)
- ✅ Role (user filtering)
- ✅ Status (approvals)

**Optimized for:**
- Fast queries
- Relationship integrity
- Data consistency
- Future scaling

---

## 🎯 What's Next?

1. ✅ Import `wmsu_portal_complete.sql` to phpMyAdmin
2. ✅ Test connection with `test_connection.php`
3. ✅ Update your `.env` file
4. ✅ Test your API routes
5. ✅ Ready to deploy!

---

## 📞 Troubleshooting

### "Table already exists"
→ Drop database, re-import

### "Access denied"
→ Check MySQL user/password in .env

### "Foreign key constraint fails"
→ Import complete file (all in correct order)

### "No such file"
→ Check file path is correct

---

## 📊 Database Summary

| Component | Count | Status |
|-----------|-------|--------|
| **Admins** | 2 | ✅ Active |
| **Teachers** | 2+ | ✅ Approved |
| **Students** | 80+ | ✅ Active |
| **Classes** | 6 | ✅ Configured |
| **Attendance Records** | 10+ | ✅ Logged |
| **Grades** | 6+ | ✅ Entered |
| **Tables** | 6 | ✅ Optimized |
| **Foreign Keys** | 4 | ✅ Configured |
| **Indexes** | 15+ | ✅ Created |

---

## 🎓 About This Database

- **Created For:** WMSU School Management Portal
- **Database Type:** MySQL 5.7+
- **Charset:** UTF8MB4 (Unicode support)
- **Collation:** utf8mb4_unicode_ci
- **Engine:** InnoDB (ACID compliant)
- **Version:** 1.0
- **Last Updated:** 2026-02-01

---

## 💡 Tips

1. **Backup regularly** - Use phpMyAdmin export
2. **Monitor growth** - Track table sizes
3. **Archive old data** - Attendance from old years
4. **Test queries** - Before production use
5. **Update docs** - As schema changes

---

**Ready to use! 🚀**

For detailed setup instructions, see: `SETUP_GUIDE.md`
For connection test, see: `test_connection.php`

**Good luck, Josie! 💪**
