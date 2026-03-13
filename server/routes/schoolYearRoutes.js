const express = require('express');
const router = express.Router();
const schoolYearController = require('../controllers/schoolYearController');

// Get all school years (non-archived)
router.get('/', schoolYearController.getAllSchoolYears);

// Get active school year
router.get('/active', schoolYearController.getActiveSchoolYear);

// Get archived school years
router.get('/archived', schoolYearController.getArchivedSchoolYears);

// Get students by grade (for chart)
router.get('/students-by-grade', schoolYearController.getStudentsByGrade);

// Get promotion preview
router.get('/promotion-preview', schoolYearController.getPromotionPreview);

// Get promotion candidates with eligibility
router.get('/promotion-candidates', schoolYearController.getPromotionCandidates);

// Get promotion history logs
router.get('/promotion-history', schoolYearController.getPromotionHistory);

// Create a new school year
router.post('/', schoolYearController.createSchoolYear);

// Update a school year
router.put('/:id', schoolYearController.updateSchoolYear);

// Set active school year
router.put('/:id/activate', schoolYearController.setActiveSchoolYear);

// Archive a school year
router.put('/:id/archive', schoolYearController.archiveSchoolYear);

// Restore an archived school year
router.put('/:id/restore', schoolYearController.restoreSchoolYear);

// Promote students
router.post('/promote-students', schoolYearController.promoteStudents);

// Delete a school year
router.delete('/:id', schoolYearController.deleteSchoolYear);

module.exports = router;
