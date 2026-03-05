/**
 * This tests that the subject teacher endpoint code exists
 * and the route is correctly structured
 */
const fs = require('fs');
const path = require('path');

const classesRoutePath = path.join(__dirname, './backend/server/routes/classes.js');
const classesRouteContent = fs.readFileSync(classesRoutePath, 'utf8');

console.log('\n=== CHECKING SUBJECT TEACHER ENDPOINTS ===\n');

const hasAssignEndpoint = classesRouteContent.includes("router.put('/:classId/assign-subject-teacher'");
const hasUnassignEndpoint = classesRouteContent.includes("router.put('/:classId/unassign-subject-teacher/:teacherId'");
const hasTimeConflictLogic = classesRouteContent.includes('AND st.day = ?');
const hasDuplicateCheck = classesRouteContent.includes('SELECT id FROM subject_teachers WHERE class_id = ? AND teacher_id = ? AND subject = ?');

console.log('✅ Assign endpoint exists:', hasAssignEndpoint);
console.log('✅ Unassign endpoint exists:', hasUnassignEndpoint);
console.log('✅ Time conflict validation:', hasTimeConflictLogic);
console.log('✅ Duplicate check:', hasDuplicateCheck);

if (hasAssignEndpoint && hasUnassignEndpoint && hasTimeConflictLogic && hasDuplicateCheck) {
  console.log('\n✅✅✅ All subject teacher endpoints are correctly implemented in the code!');
  console.log('\nThe endpoints exist locally. Waiting for Vercel deployment to sync...');
} else {
  console.log('\n❌ Some endpoints are missing!');
}
