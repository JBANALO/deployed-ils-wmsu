const express = require('express');
const router = express.Router();

// Minimal fallback sections dataset
const FALLBACK_SECTIONS = [
  { id: 'g1-a', grade_level: 'Grade 1', name: 'Kindness' },
  { id: 'g1-b', grade_level: 'Grade 1', name: 'Respect' },
  { id: 'g2-a', grade_level: 'Grade 2', name: 'Kindness' }
];

// GET /sections
router.get('/', (req, res) => {
  // Optional schoolYearId param ignored in fallback
  res.json({ data: FALLBACK_SECTIONS });
});

router.get('/archived', (req, res) => res.json({ data: [] }));
router.get('/stats', (req, res) => res.json({ data: [] }));
router.get('/previous-year', (req, res) => res.json({ data: [] }));

router.post('/fetch-from-previous', (req, res) => res.json({ data: [] }));
router.post('/sync-from-students', (req, res) => res.json({ data: FALLBACK_SECTIONS }));

router.post('/', (req, res) => {
  const newSection = { id: `s-${Date.now()}`, ...req.body };
  res.json({ data: newSection });
});

router.put('/:id', (req, res) => res.json({ data: { id: req.params.id, ...req.body } }));
router.put('/:id/archive', (req, res) => res.json({ data: { id: req.params.id, archived: true } }));
router.put('/:id/restore', (req, res) => res.json({ data: { id: req.params.id, restored: true } }));
router.delete('/:id', (req, res) => res.json({ data: { id: req.params.id, deleted: true } }));

module.exports = router;
