// Subject Routes
const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');

// GET all subjects (active only)
router.get('/', subjectController.getAllSubjects);

// Get subjects from previous school year (for optional fetch)
router.get('/previous-year', subjectController.getPreviousYearSubjects);

// Fetch/copy subjects from previous school year into active school year
router.post('/fetch-from-previous', subjectController.fetchSubjectsFromPreviousYear);

// GET subjects by grade level
router.get('/grade/:grade', subjectController.getSubjectsByGrade);

// GET all subjects including archived
router.get('/all', subjectController.getAllSubjectsWithArchived);

// GET archived subjects only
router.get('/archived', subjectController.getArchivedSubjects);

// GET single subject by ID
router.get('/:id', subjectController.getSubjectById);

// POST create new subject
router.post('/', subjectController.createSubject);

// PUT update subject
router.put('/:id', subjectController.updateSubject);

// PUT archive subject
router.put('/:id/archive', subjectController.archiveSubject);

// PUT restore archived subject
router.put('/:id/restore', subjectController.restoreSubject);

// DELETE permanently delete subject
router.delete('/:id', subjectController.deleteSubject);

module.exports = router;
