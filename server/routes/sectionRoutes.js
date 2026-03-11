// Section Routes
const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/sectionController');

// GET all sections (active only)
router.get('/', sectionController.getAllSections);

// GET all sections including archived
router.get('/all', sectionController.getAllSectionsWithArchived);

// GET archived sections only
router.get('/archived', sectionController.getArchivedSections);

// GET section stats (with usage count)
router.get('/stats', sectionController.getSectionStats);

// GET single section by ID
router.get('/:id', sectionController.getSectionById);

// POST create new section
router.post('/', sectionController.createSection);

// PUT update section
router.put('/:id', sectionController.updateSection);

// PUT archive section
router.put('/:id/archive', sectionController.archiveSection);

// PUT restore archived section
router.put('/:id/restore', sectionController.restoreSection);

// DELETE permanently delete section
router.delete('/:id', sectionController.deleteSection);

module.exports = router;
