const express = require('express');
const router = express.Router();

// Minimal fallback data for school years when DB features are unavailable
const now = new Date();
const currentYearStart = now.getFullYear();
const fallbackActive = {
  id: 1,
  label: `${currentYearStart}-${String(currentYearStart + 1).slice(-4)}`,
  start_date: `${currentYearStart}-06-01`,
  end_date: `${currentYearStart + 1}-05-31`,
  principal_name: 'Principal (fallback)',
  assistant_principal_name: 'Assistant Principal (fallback)',
  is_active: 1
};

// Return list of school years
router.get('/', (req, res) => {
  res.json({ data: [fallbackActive] });
});

// Active school year
router.get('/active', (req, res) => {
  res.json({ data: fallbackActive });
});

// Students by grade (chart) - return empty list
router.get('/students-by-grade', (req, res) => {
  res.json({ data: [] });
});

router.get('/promotion-preview', (req, res) => {
  res.json({ data: [] });
});

router.get('/archived', (req, res) => {
  res.json({ data: [] });
});

router.get('/promotion-history', (req, res) => {
  res.json({ data: [] });
});

router.get('/promotion-candidates', (req, res) => {
  res.json({ data: [] });
});

// Create a new school year (no-op fallback)
router.post('/', (req, res) => {
  res.json({ data: { id: Date.now(), ...req.body } });
});

router.put('/:id', (req, res) => {
  res.json({ data: { id: req.params.id, ...req.body } });
});

router.put('/:id/activate', (req, res) => {
  res.json({ data: { id: req.params.id, activated: true } });
});

router.put('/:id/archive', (req, res) => {
  res.json({ data: { id: req.params.id, archived: true } });
});

router.put('/:id/restore', (req, res) => {
  res.json({ data: { id: req.params.id, restored: true } });
});

router.post('/promote-students', (req, res) => {
  res.json({ data: { totalPromoted: 0, totalGraduated: 0, totalRetained: 0 } });
});

router.delete('/:id', (req, res) => {
  res.json({ data: { id: req.params.id, deleted: true } });
});

module.exports = router;
