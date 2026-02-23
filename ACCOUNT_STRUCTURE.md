# Teacher Account & Class Assignment - Quick Reference

## Teacher Account
```
┌─────────────────────────────────────────────────────────┐
│  Teacher: Josie Banalo                                  │
│  Email: Hz202305178@wmsu.edu.ph                         │
│  Username: hz202305178                                  │
│  Password: test123                                      │
│  Role: Subject Teacher & Adviser                        │
│  Status: ✅ Approved                                    │
└─────────────────────────────────────────────────────────┘
```

## Multi-Platform Access
```
┌──────────────────────┐         ┌──────────────────────┐
│   WEB BROWSER        │         │  MOBILE APP          │
│  localhost:5173      │         │  WMSU ElemScan       │
│                      │         │                      │
│  Login:              │ ────┬─▶ │  Login:              │
│  - Email             │    │    │  - Email             │
│  - Password          │    │    │  - Password          │
└──────────────────────┘    │    └──────────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  Backend API     │
                   │  Port 3001       │
                   │                  │
                   │  - Auth Service  │
                   │  - Class Filter  │
                   │  - Student Data  │
                   └──────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  MySQL Database  │
                   │  - users         │
                   │  - classes       │
                   │  - students      │
                   │  - grades        │
                   └──────────────────┘
```

## Assigned Classes

### As Adviser
```
┌──────────────────┐  ┌──────────────────┐
│ Grade 1 - Wise   │  │ Grade 2 - Kind   │
│                  │  │                  │
│ Students: ~20    │  │ Students: ~20    │
│ Full Access      │  │ Full Access      │
│                  │  │                  │
│ Adviser Role ✓   │  │ Adviser Role ✓   │
└──────────────────┘  └──────────────────┘
```

### As Subject Teacher
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Grade 1 - Humi   │  │ Grade 1 - Kind   │  │ Grade 2 - Kind   │
│  - English ✓     │  │  - English ✓     │  │  - English ✓     │
│  - Filipino ✓    │  │  - Filipino ✓    │  │  - Filipino ✓    │
│  - Math ✓        │  │  - Math ✓        │  │  - Math ✓        │
│                  │  │                  │  │                  │
│ Teach & Grade    │  │ Teach & Grade    │  │ Teach & Grade    │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Not Accessible
```
┌──────────────────┐  ┌──────────────────┐
│ Grade 3 - Dilig  │  │ Grade 3 - Wisdom │
│                  │  │                  │
│ ❌ Not Assigned  │  │ ❌ Not Assigned  │
│                  │  │                  │
│ Students Hidden  │  │ Students Hidden  │
└──────────────────┘  └──────────────────┘
```

## API Flow Diagram

```
[Web Browser / Mobile App]
           │
           │ POST /api/auth/login
           │ {email, password}
           ▼
    [Backend Server]
           │
           ├─▶ Validate credentials
           │
           ├─▶ Check approval status
           │
           └─▶ Return: {user, token}
                       │
                       ▼
              [Frontend Stores in LocalStorage]
                       │
                       ▼
              GET /api/classes/adviser/{userId}
                       │
                       ▼
              GET /api/classes/subject-teacher/{userId}
                       │
                       ▼
         [Teacher Dashboard Shows Only Assigned Classes]
```

## Cross-Platform Account Sync

```
LOGIN (Web)                    LOGIN (Mobile)
   │                              │
   │ POST /auth/login             │
   │ + credentials                │
   ▼                              │
[Compare with DB]                 │
   │                              │
   ├─ Valid ✓                     │
   │                              │
   └─▶ localStorage['user'] ◀─┬──┘
       Same Account Data       │
       Stored on Device        │
              │                │
              └─▶ GET /classes/adviser/{userId}
                  GET /classes/subject-teacher/{userId}
                       │
                       ▼
                [Same Classes Appear]
                [Same Restrictions]
```

## Database Schema

```sql
users
├── id (PK)
├── email
├── username
├── password
├── role (subject_teacher, adviser, admin)
└── approval_status (approved)

classes
├── id (PK)
├── grade
├── section
├── adviser_id (FK → users.id) [optional]
└── adviser_name

subject_teachers
├── id (PK)
├── class_id (FK → classes.id)
├── teacher_id (FK → users.id)
├── teacher_name
└── subject
```

## Verification Checklist

✅ Teacher account created and approved
✅ Adviser assignments set in classes table
✅ Subject teacher assignments set in subject_teachers table
✅ API endpoints filtering by teacher ID
✅ Frontend displaying only assigned classes
✅ Web login working
✅ Mobile login working
✅ Both platforms showing same data
✅ Unassigned classes hidden
✅ Students from other classes not visible

---

**Total Classes Visible to Teacher**: 3
- 2 as adviser (Grade 1, Grade 2 - Kindness section)
- 3 as subject teacher (Grade 1 Humility/Kindness, Grade 2 Kindness)
- (Grade 1 Kindness appears in both roles, but displayed once)

**Total Classes Hidden**: 2
- Grade 3 - Diligence
- Grade 3 - Wisdom
