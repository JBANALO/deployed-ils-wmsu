# WMSU ElemScan - Teacher Account Setup & Multi-Platform Guide

## Account Information

**Teacher Account: Josie Banalo**
- Email: `Hz202305178@wmsu.edu.ph`
- Username: `hz202305178`
- Password: `test123`
- Role: Subject Teacher & Adviser
- Status: Approved

## Multi-Platform Access

The same teacher account works on **both web and mobile** platforms:

### Web Access
- **URL**: http://localhost:5173 (development) or production URL
- **Login**: Use email or username with password
- **Features**: Full dashboard, class management, grading, attendance

### Mobile Access
- **Download**: WMSU ElemScan app from app store
- **Login**: Use the same credentials
- **Features**: Same as web (full parity)

---

## Assigned Classes

Josie Banalo is assigned to:

### As Adviser (Class Section Adviser)
1. **Grade 1 - Kindness**
   - Section: Kindness
   - Students: Full access to all students in this class

2. **Grade 2 - Kindness**
   - Section: Kindness
   - Students: Full access to all students in this class

### As Subject Teacher
1. **Grade 1 - Humility** (English, Filipino, Mathematics)
2. **Grade 1 - Kindness** (English, Filipino, Mathematics)
3. **Grade 2 - Kindness** (English, Filipino, Mathematics)

---

## What Teacher Can See

✅ **Visible**:
- Only assigned classes in the class list
- Only students from assigned classes
- Can view attendance for assigned classes
- Can manage grades for assigned subjects
- Can access adviser functions for advisor classes

❌ **Not Visible**:
- Unassigned classes (e.g., Grade 3 - Diligence, Grade 3 - Wisdom)
- Students from other classes
- Other teachers' grades and attendance records

---

## System Architecture

### Backend (Node.js + Express)
- **Port**: 3001
- **Database**: MySQL (wmsu_ed)
- **API Prefix**: `/api`

### Frontend (React + Vite)
- **Port**: 5173 (development)
- **API Base URL**: http://localhost:3001/api

### API Endpoints for Teachers

```
GET /api/classes/adviser/{userId}
- Returns classes where user is adviser

GET /api/classes/subject-teacher/{userId}
- Returns classes where user teaches subjects

POST /api/auth/login
- Authenticate with email/username and password
- Returns: User data + assigned classes info
```

---

## Testing the System

### 1. Web Login Test
```bash
# Teachers should see only their assigned classes
# Login: Hz202305178@wmsu.edu.ph / test123
# Expected: Dashboard shows only Grade 1 & 2 classes
```

### 2. API Direct Test
```bash
# Test teacher can only access their classes
curl -X GET "http://localhost:3001/api/classes/subject-teacher/ba930204-ff2a-11f0-ac97-388d3d8f1ae5"

# Response should include only assigned classes
```

### 3. Mobile Test
- Use the same email and password on mobile app
- Should sync seamlessly with web account
- Same class restrictions apply

---

## Account Management

### Creating New Teacher Accounts
Teachers are created with these attributes:
1. **Email**: Must be in format `username@wmsu.edu.ph`
2. **Role**: `subject_teacher` or `adviser`
3. **Status**: `approved` (after admin approval)
4. **Assigned Classes**: Set via `subject_teachers` table

### Assigning Classes to Teachers
```sql
-- Add as adviser
UPDATE classes SET adviser_id = '{userId}', adviser_name = '{name}' 
WHERE id = '{classId}';

-- Add as subject teacher
INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject)
VALUES ('{classId}', '{userId}', '{name}', '{subject}');
```

---

## Troubleshooting

### Issue: "Server error: 401" on login
**Solution**: 
- Check backend is running on port 3001
- Verify database connection
- Check user credentials in database

### Issue: Seeing all classes instead of assigned ones
**Solution**:
- Refresh browser (Ctrl+Shift+R)
- Clear localStorage and login again
- Verify teacher is assigned to classes in database

### Issue: Mobile app can't connect
**Solution**:
- Ensure same API URL is configured in mobile app
- Check if backend port is accessible from mobile
- Verify teacher account is approved

---

## Files Modified

1. **Backend Routes**: `backend/server/routes/classes.js`
   - Added `/adviser/:userId` endpoint
   - Added `/subject-teacher/:userId` endpoint

2. **Database Schema**: `backend/server/config/db.js`
   - Added `classes` table
   - Added `subject_teachers` table

3. **Frontend Configuration**:
   - `.env.development`: Set API URL to localhost:3001
   - `vite.config.js`: Updated API proxy settings
   - `src/pages/teacher/GradeLevel.jsx`: Filters classes by assignment

4. **Setup Scripts**:
   - `backend/server/setup-teacher.js`: Creates teacher account
   - `backend/server/populate-classes.js`: Populates sample data

---

## Production Deployment

When deploying to production (Railway/Vercel):

1. **Load environment variables** from `.env.production`
2. **Database**: Use Railway MySQL connection
3. **API URL**: Update to deployed backend URL
4. **Mobile app**: Update API endpoint to production URL

Example `.env.production`:
```
VITE_API_URL=https://your-deployed-backend.railway.app/api
```

---

Last Updated: February 20, 2026
