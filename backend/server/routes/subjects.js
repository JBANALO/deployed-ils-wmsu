const express = require('express');
const router = express.Router();

// Minimal fallback subjects dataset
const FALLBACK_SUBJECTS = [
  { id: 'math', name: 'Mathematics', grade: 'Grade 1' },
  { id: 'eng', name: 'English', grade: 'Grade 1' },
  { id: 'sci', name: 'Science', grade: 'Grade 1' }
];

// GET /subjects - return all subjects (active)
router.get('/', (req, res) => {
  res.json({ data: FALLBACK_SUBJECTS });
});

// GET /subjects/grade/:grade - subjects for a grade
router.get('/grade/:grade', (req, res) => {
  const { grade } = req.params;
  const list = FALLBACK_SUBJECTS.filter(s => String(s.grade).toLowerCase().includes(String(grade).toLowerCase()));
  res.json({ data: list });
});

// Previous-year / archived / single subject endpoints (no-op)
router.get('/previous-year', (req, res) => res.json({ data: [] }));
router.get('/archived', (req, res) => res.json({ data: [] }));
router.get('/:id', (req, res) => {
  const s = FALLBACK_SUBJECTS.find(x => x.id === req.params.id) || null;
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json({ data: s });
});

module.exports = router;
