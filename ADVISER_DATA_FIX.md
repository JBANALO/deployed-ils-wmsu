# Adviser Data Fetching Fix

## Problem
The **Assign Adviser page** was showing "No adviser assigned" for all sections, even though advisers were correctly assigned as shown in the **Teachers page**. This indicated that adviser data wasn't being properly fetched on the Assign Adviser page.

## Root Cause
The issue was in the `getAllClasses` endpoint in `classControllerMySQL.js`. It was only checking for adviser information in the `classes` table's `adviser_id` field. However, adviser assignments were also stored in:
1. The `users` table with `gradeLevel` and `section` fields
2. The `teachers` table with `grade_level` and `section` fields

The `getAllClasses` function had no fallback logic to look up adviser information in these alternative locations.

## Solution
Updated two functions in `/server/controllers/classControllerMySQL.js`:

### 1. `getAllClasses()` - Enhanced adviser lookup
Added fallback logic to search for adviser information in this order:
1. Check if `adviser_id` exists in the classes table (existing logic)
2. If not found, search the `users` table for an adviser with matching `gradeLevel` and `section`
3. If still not found, search the `teachers` table for an adviser with matching `grade_level` and `section`

This ensures that adviser assignments from any data source are properly reflected in the response.

### 2. `getAdviserClasses()` - Enhanced adviser class lookup
Updated to find an adviser's classes by:
1. Looking for classes where `adviser_id` matches in the classes table
2. Also looking for the adviser's assigned `gradeLevel`/`section` in the users or teachers tables
3. Querying the classes table for any matching grade/section combinations
4. Deduplicating results to avoid returning the same class twice

## Changed Files
- `/server/controllers/classControllerMySQL.js`
  - Lines 36-79: Updated `getAllClasses` adviser lookup logic
  - Lines 201-256: Updated `getAdviserClasses` adviser lookup logic

## Expected Behavior After Fix
1. When the Assign Adviser page loads:
   - It calls `/api/classes` endpoint
   - The endpoint now looks for adviser data in all three locations (classes table, users table, teachers table)
   - All classes will correctly display their assigned advisers

2. The fix maintains backward compatibility:
   - If adviser_id is set in classes table, it uses that (existing logic)
   - If not, it searches in users/teachers tables (new fallback logic)

## Notes
- The fix handles adviser assignments from both JSON file storage and MySQL database
- Multiple adviser lookup sources are supported to ensure data consistency
- Error handling prevents one lookup failure from blocking the entire query
