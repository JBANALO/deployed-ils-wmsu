# Promotion Rules Specification

## Overview
Complete specification for student promotion logic across all grade levels in WMSU ILS system.

---

## Grade 1-6: Subject-Based Grading Promotion

### Calculation Method
- **Per Subject**: Average of 4 quarters (Q1 + Q2 + Q3 + Q4) ÷ 4
- **Final Grade Per Subject**: (Q1 + Q2 + Q3 + Q4) / 4

### Promotion Criteria
✅ **PROMOTED** (🟢)
- ✓ All required subjects have complete grades (Q1, Q2, Q3, Q4 filled with grades > 0)
- ✓ Every subject average ≥ 75%
- **Action**: Advance to next grade level
- **Section Assignment**: Auto-assign to first available section with < 45 students

✗ **RETAINED** (🔴)
- ✓ All required subjects have complete grades
- ✗ At least ONE subject has average < 75%
- **Action**: Stay in same grade level
- **Exception Note**: Can override if justification provided

⊘ **SKIPPED** (🟡)
- ✗ At least ONE subject has incomplete grades (missing Q1, Q2, Q3, or Q4)
- **Action**: Not processed; requires grades to be completed; revisit at end of monitoring period

### Subject Configuration
- Required subjects per grade determined by `subjects` table with `grade_levels` field
- `FIND_IN_SET(gradeKey, grade_levels)` used for mapping
- Missing/zero grades treated as incomplete (must all 4 quarters be > 0)

---

## Kindergarten: Attendance-Based Promotion

### Attendance Status Mapping
| Status | Code | Count | Notes |
|--------|------|-------|-------|
| 🟢 Present | P | ✓ | Regular attendance |
| 🟡 Late | L | ✓ | Counted toward attendance rate |
| 🔵 Excused | E | ✓ | Valid excuse letter provided |
| 🔴 Absent | A | ✗ | Not counted toward rate |

### Calculation Method
```
Attendance Rate (%) = (Present + Late + Excused) / Total Days × 100
```

### Promotion Criteria
✅ **PROMOTED** (🟢) - System Suggests
- Attendance Rate ≥ 75%
- **Action**: System suggests promotion; admin can confirm or override

🟡 **RETENTION** - System Suggests
- Attendance Rate < 75%
- **Action**: System suggests retention; admin can confirm or override

### Admin Override Options
- **Promoted**: Override system suggestion; advance to Grade 1 regardless of attendance
- **Retained**: Override system suggestion; keep in Kindergarten for another year
- **Follow Suggestion**: Accept system recommendation

### No Grades for Kindergarten
- Kindergarten students do NOT have subject-based grades
- Only attendance tracking applies
- No "Incomplete Grades" status (not applicable)
- Manual admin decision required if borderline attendance (~70-75%)

---

## Section Assignment & Capacity Rules

### Section Capacity
- **Maximum Students Per Section**: 45
- **Overflow Handling**: 
  - If all sections of target grade have ≥ 45 students → Alert admin with overflow list
  - Admin manually assigns or creates new section

### Automatic Section Assignment
When promoting student (non-Kinder):
1. Get target grade level (`nextGrade`)
2. Find all sections for that grade
3. Select **first section with < 45 current students**
4. Assign student to that section
5. If no available section → Add to overflow list

### Section Persistence
- Sections carry over from previous school year
- Can add new sections or remove archived sections
- Section-Teacher assignment reviewed each school year

---

## Grade 6 Special Case: Graduation

### Graduation Trigger
- Grade 6 student meets promotion criteria (all subjects ≥ 75%)
- **Action**: Mark as "Graduated" instead of promoting to next grade
- **Grade Level Update**: Set to "Graduate"
- **Status Update**: Set to "graduated"

### Promotion History Record
```
{
  status: 'graduated',
  from_grade: 'Grade 6',
  from_section: '...',
  to_grade: 'Graduate',
  reason: 'Completed all subjects and passed all quarters'
}
```

---

## Auto-Promotion Flow (Batch Processing)

### Input
- Optional: Specific student IDs to promote
- Optional: School year ID (defaults to active)
- Optional: Destination class assignments (for manual override)

### Process
1. **Fetch Students**: Load all students from previous school year (or filter by IDs if specified)
2. **Loop Each Student**:
   - Get current grade level
   - Determine next grade via `GRADE_PROGRESSION`
   - Evaluate eligibility based on grade rules:
     - **Kindergarten** → Check attendance ≥ 75%
     - **Grade 1-6** → Check all subjects ≥ 75% with complete grades
   - Handle special case: Grade 6 → Graduate

3. **Categorize Student**:
   - **Promoted** → Update grade_level, section; log to promotion_history
   - **Retained** → Keep same grade/section; log reason
   - **Skipped** → No action (incomplete grades)
   - **Overflowed** → No section available; alert admin

4. **Update Student Records**:
   ```sql
   UPDATE students 
   SET grade_level = ?, section = ?
   WHERE id = ?
   ```

5. **Log to Promotion History**:
   ```sql
   INSERT INTO promotion_history
   (school_year_id, student_id, lrn, student_name, from_grade, from_section,
    to_grade, to_section, average, status, reason, details_json)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ```

### Output
```json
{
  "promoted": [
    { "id": "...", "name": "...", "fromGrade": "...", "toGrade": "...", "average": 78.50 }
  ],
  "graduated": [
    { "id": "...", "name": "...", "fromGrade": "Grade 6", "average": 85.25 }
  ],
  "retained": [
    { "id": "...", "name": "...", "grade": "...", "average": 72.30, "reason": "..." }
  ],
  "overflowed": [
    { "id": "...", "name": "...", "targetGrade": "Grade 2" }
  ],
  "totalPromoted": 45,
  "totalGraduated": 12,
  "totalRetained": 8,
  "totalOverflowed": 0
}
```

---

## Database Schema

### `promotion_history` Table
```sql
CREATE TABLE promotion_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_year_id INT NULL,
  school_year_label VARCHAR(50) NULL,
  student_id VARCHAR(100) NOT NULL,
  lrn VARCHAR(50) NULL,
  student_name VARCHAR(255) NOT NULL,
  from_grade VARCHAR(50) NOT NULL,
  from_section VARCHAR(100) NULL,
  to_grade VARCHAR(50) NULL,
  to_section VARCHAR(100) NULL,
  average DECIMAL(5,2) NULL,        -- For grades-based; NULL for Kinder
  status VARCHAR(30) NOT NULL,      -- 'promoted', 'retained', 'graduated'
  reason VARCHAR(255) NULL,
  details_json JSON NULL,           -- Extra data: attendance %, failing subjects, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_student_id (student_id),
  INDEX idx_created_at (created_at)
)
```

### `students` Table Columns Used
- `id`: Student UUID/ID
- `lrn`: Learning Reference Number
- `first_name`, `last_name`
- `grade_level`: Current grade ('Kindergarten', 'Grade 1', ..., 'Grade 6', 'Graduate')
- `section`: Current section (e.g., 'Wisdom', 'Courage')
- `status`: Student status ('active', 'graduated', 'inactive', etc.)

### `grades` Table Columns Used
- `student_id`: Foreign key to students
- `subject`: Subject name
- `quarter`: 'Q1', 'Q2', 'Q3', or 'Q4'
- `grade`: Numeric grade (0-100)

### `attendance` Table Columns Used
- `student_id`: Foreign key to students
- `date`: Attendance date (YYYY-MM-DD)
- `status`: 'present', 'late', 'absent', 'excused'

---

## API Endpoints

### `POST /api/school-years/promote-students`
Batch promote students based on eligibility.

**Request Body**:
```json
{
  "studentIds": ["id1", "id2"],      // Optional; if empty, promote all
  "schoolYearId": 5,                  // Required
  "assignments": [                    // Optional; destination class overrides
    { "studentId": "id1", "classId": "classId1" }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Promoted 45 students. 12 graduated. 8 retained.",
  "data": {
    "promoted": [...],
    "graduated": [...],
    "retained": [...],
    "overflowed": [...],
    "totalPromoted": 45,
    "totalGraduated": 12,
    "totalRetained": 8
  }
}
```

### `GET /api/school-years/promotion-preview`
Preview promotion results WITHOUT executing changes.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "fromGrade": "Grade 1",
      "toGrade": "Grade 2",
      "total": 180,
      "willPromote": 165,
      "willRetain": 15,
      "completeCount": 180,
      "incompleteCount": 0,
      "failingCount": 15
    }
  ]
}
```

### `GET /api/school-years/promotion-candidates`
Get list of candidates with eligibility status.

**Query Params**:
- `studentIds` (comma-separated): Filter specific students
- `schoolYearId`: Target school year

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "student1",
      "lrn": "202305178",
      "name": "John Doe",
      "fromGrade": "Grade 1",
      "toGrade": "Grade 2",
      "canPromote": true,
      "average": 78.50,
      "hasCompleteGrades": true,
      "hasFailingGrade": false,
      "reason": "Eligible for promotion"
    }
  ]
}
```

### `GET /api/school-years/promotion-history`
Retrieve historical promotion logs.

**Query Params**:
- `schoolYearId`: Filter by year (optional)
- `status`: Filter by 'promoted', 'retained', 'graduated' (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "school_year_label": "2025-2026",
      "student_id": "...",
      "lrn": "...",
      "student_name": "...",
      "from_grade": "Grade 1",
      "from_section": "Wisdom",
      "to_grade": "Grade 2",
      "to_section": "Courage",
      "average": 78.50,
      "status": "promoted",
      "reason": "...",
      "created_at": "2026-04-01T10:30:00Z"
    }
  ]
}
```

---

## System Constants

```javascript
const GRADE_PROGRESSION = {
  'Kindergarten': 'Grade 1',
  'Grade 1':      'Grade 2',
  'Grade 2':      'Grade 3',
  'Grade 3':      'Grade 4',
  'Grade 4':      'Grade 5',
  'Grade 5':      'Grade 6',
  'Grade 6':      'Graduate'
};

const PASSING_GRADE = 75;
const REQUIRED_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const MAX_SECTION_CAPACITY = 45;
const KINDERGARTEN_ATTENDANCE_THRESHOLD = 75;
const KINDERGARTEN_COUNTED_STATUSES = ['present', 'late', 'excused'];
```

---

## Future Enhancements

### Optional: Kindergarten Attendance Data Migration
If Kindergarten promotion needs historical attendance data:
1. Ensure `attendance` table captures all Kindergarten records since school year start
2. Calculate year-to-date attendance percentage per Kindergarten student
3. Apply promotion threshold during batch promotion

### Optional: Override Reasons Audit
Track why admin overrode promotion decisions:
```json
{
  "override": {
    "admin_id": "...",
    "original_status": "promoted",
    "new_status": "retained",
    "reason": "Parent request - continue development",
    "timestamp": "2026-04-01T10:30:00Z"
  }
}
```

### Optional: Section Balancing
Auto-balance sections after promotion to ensure even distribution:
```javascript
function balanceSectionAssignments(promotedStudents, targetGrade) {
  // Sort students randomly/by name
  // Assign to sections in round-robin fashion
  // Ensure no section exceeds 45 after balancing
}
```

---

## Testing Checklist

- [ ] Grade 1-6: Student with all subjects ≥ 75% → Promoted
- [ ] Grade 1-6: Student with one subject < 75% → Retained
- [ ] Grade 1-6: Student with incomplete grades → Skipped
- [ ] Grade 6: Eligible student → Marked as "Graduated"
- [ ] Kindergarten: 75%+ attendance → System suggests Promoted
- [ ] Kindergarten: <75% attendance → System suggests Retained
- [ ] Kindergarten: Admin override Promote → Student advanced
- [ ] Kindergarten: Admin override Retain → Student stays
- [ ] Section Assignment: Auto-assign to first available < 45
- [ ] Section Overflow: Alert when no capacity available
- [ ] Batch Promotion: Multiple students promoted in one run
- [ ] Batch Promotion: Output shows promoted/retained/graduated/overflowed counts
- [ ] Promotion History: Records logged correctly for all statuses
- [ ] School Year Filter: Promotion preview/history scoped to selected year
