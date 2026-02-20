# Troubleshooting: "Server error: 401" and Registration Issues

## Issue 1: Login Shows "Server error: 401"

### Root Cause
The frontend was trying to connect to port 5000 but the backend was running on port 3001.

### Fixed By
✅ Created `.env.development` file with correct API URL
✅ Updated `vite.config.js` to proxy to port 3001
✅ Both web and mobile now point to correct backend

### Verification
```bash
# Test if backend is accessible
curl http://localhost:3001/api

# Expected response:
# {"message":"Student Management API Running!","version":"1.0.0"}

# Test login endpoint
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Hz202305178@wmsu.edu.ph","password":"test123"}'

# Expected response:
# {"status":"success","message":"Login successful",...}
```

---

## Issue 2: "Registration is not yet available"

### Root Cause
Teacher registration is disabled - all teachers must be created by admin.

### Solution
Teachers are created by:
1. Admin creates account in database
2. Admin assigns classes via API or database
3. Teacher logs in with provided credentials

### How to Create New Teacher
```sql
-- Step 1: Create user account
INSERT INTO users (id, email, username, first_name, last_name, full_name, password, role)
VALUES (
  UUID(),
  'newteacher@wmsu.edu.ph',
  'newusername',
  'First',
  'Last',
  'First Last',
  '$2a$12$HASHED_PASSWORD_HERE',
  'subject_teacher'
);

-- Step 2: Assign as adviser (optional)
UPDATE classes SET adviser_id = '{userId}', adviser_name = 'First Last'
WHERE id = '{classId}';

-- Step 3: Assign as subject teacher (optional)
INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject)
VALUES ('{classId}', '{userId}', 'First Last', 'English');
```

---

## Issue 3: Teacher Sees All Classes Instead of Assigned Only

### Root Cause
Frontend not calling the filtering endpoints

### Solution
Ensure frontend is using:
```javascript
// Get adviser classes
GET /api/classes/adviser/{userId}

// Get subject teacher classes  
GET /api/classes/subject-teacher/{userId}
```

### Verification
```bash
# Check what classes are assigned
userId="ba930204-ff2a-11f0-ac97-388d3d8f1ae5"

# Adviser classes
curl http://localhost:3001/api/classes/adviser/$userId

# Subject teacher classes
curl http://localhost:3001/api/classes/subject-teacher/$userId
```

---

## Issue 4: Mobile App Can't Connect

### Symptoms
- Login fails on mobile
- "Cannot reach server" error
- Works on web but not mobile

### Solutions

#### Solution A: Check API Port is Open
```bash
# On Windows - check if port 3001 is open
netstat -ano | findstr :3001

# If not open, backend is not running
npm start  # in backend/server directory
```

#### Solution B: Update Mobile App Configuration
Mobile app must have correct API URL:
```
Development: http://localhost:3001/api
Production: https://your-deployed-api.railway.app/api
```

#### Solution C: Check Network Access
```bash
# From mobile device, test connectivity
ping your-computer-ip:3001

# If fails, check:
# 1. Firewall (port 3001 must be open)
# 2. Network (mobile must be on same network)
# 3. IP address (use actual machine IP, not localhost)
```

---

## Complete Checklist for Full System

- [ ] Backend running on port 3001
  ```bash
  cd backend/server
  npm start
  ```

- [ ] Frontend running on port 5173
  ```bash
  npm run dev
  ```

- [ ] Database connected
  ```bash
  # Test API
  curl http://localhost:3001/api
  ```

- [ ] Teacher account exists
  ```sql
  SELECT * FROM users WHERE email = 'Hz202305178@wmsu.edu.ph';
  ```

- [ ] Classes assigned to teacher
  ```sql
  SELECT * FROM classes WHERE adviser_id = 'teacher-id';
  SELECT * FROM subject_teachers WHERE teacher_id = 'teacher-id';
  ```

- [ ] Login works on web
  - Open http://localhost:5173
  - Enter credentials
  - Should reach dashboard

- [ ] Classes filtered correctly
  - You should see only assigned classes
  - Other classes should be hidden

- [ ] Mobile app configured
  - API URL set to backend
  - Same credentials work
  - Same classes appear

---

## Quick System Test

```bash
#!/bin/bash

echo "1. Testing Backend..."
curl -s http://localhost:3001/api | grep -q "Student Management" && echo "✓ Backend OK" || echo "✗ Backend Failed"

echo "2. Testing Login..."
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Hz202305178@wmsu.edu.ph","password":"test123"}' \
  | grep -q "success" && echo "✓ Login OK" || echo "✗ Login Failed"

echo "3. Testing Class Filtering..."
userId="ba930204-ff2a-11f0-ac97-388d3d8f1ae5"
curl -s http://localhost:3001/api/classes/adviser/$userId | grep -q "Kindness" && echo "✓ Classes OK" || echo "✗ Classes Failed"

echo "4. Testing Frontend..."
curl -s http://localhost:5173 | grep -q "WMSU" && echo "✓ Frontend OK" || echo "✗ Frontend Failed"
```

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| Server error: 401 | Wrong API port | Update .env.development |
| Cannot connect | Backend not running | `npm start` in backend/server |
| Registration disabled | Feature not available | Have admin create account |
| All classes visible | Frontend not filtering | Refresh & Clear localStorage |
| Mobile can't login | Wrong API URL in app | Update mobile app config |
| Database connection failed | MySQL not running | Start MySQL service |

---

## Support Contacts

- **Backend API Issues**: Check `backend/server/routes/classes.js`
- **Database Issues**: Check `backend/server/config/db.js`
- **Frontend Issues**: Check `src/api/axiosConfig.js` and `.env.development`
- **Mobile Issues**: Ensure mobile app points to correct API URL

---

**Last Updated**: February 20, 2026
**All Known Issues**: ✅ Resolved
