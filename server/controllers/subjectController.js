// Subject Controller - CRUD operations for subjects with grade level support
const { query } = require('../config/database');

let subjectSyEnsured = false;

const ensureSubjectSchoolYearColumn = async () => {
  if (subjectSyEnsured) return;
  const columns = await query('SHOW COLUMNS FROM subjects');
  const hasSy = columns.some((c) => c.Field === 'school_year_id');
  if (!hasSy) {
    await query('ALTER TABLE subjects ADD COLUMN school_year_id INT NULL');
    await query('CREATE INDEX idx_subjects_school_year ON subjects (school_year_id)');
  }
  subjectSyEnsured = true;
};

const getActiveSchoolYear = async () => {
  const rows = await query('SELECT id, label, start_date FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1');
  if (!rows.length) throw new Error('No active school year found');
  return rows[0];
};

const getPreviousSchoolYear = async (activeStartDate) => {
  const rows = await query(
    'SELECT id, label FROM school_years WHERE is_archived = 0 AND start_date < ? ORDER BY start_date DESC LIMIT 1',
    [activeStartDate]
  );
  return rows[0] || null;
};

const formatDuplicateCheck = async ({ name, grade_levels, school_year_id, excludeId = null }) => {
  const params = [name.trim(), grade_levels, school_year_id];
  let sql = 'SELECT id FROM subjects WHERE name = ? AND grade_levels = ? AND school_year_id = ?';
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  return query(sql, params);
};

// Get all subjects (excluding archived), grouped by grade level
const getAllSubjects = async (req, res) => {
  try {
    await ensureSubjectSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const subjects = await query(
      'SELECT * FROM subjects WHERE is_archived = FALSE AND school_year_id = ? ORDER BY grade_levels, name',
      [activeSy.id]
    );
    res.json({ success: true, data: subjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
  }
};

// Get subjects by grade level
const getSubjectsByGrade = async (req, res) => {
  try {
    await ensureSubjectSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const { grade } = req.params;
    const subjects = await query(
      'SELECT * FROM subjects WHERE is_archived = FALSE AND school_year_id = ? AND FIND_IN_SET(?, grade_levels) ORDER BY name',
      [activeSy.id, grade]
    );
    res.json({ success: true, data: subjects });
  } catch (error) {
    console.error('Error fetching subjects by grade:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
  }
};

// Get all subjects including archived
const getAllSubjectsWithArchived = async (req, res) => {
  try {
    await ensureSubjectSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const subjects = await query('SELECT * FROM subjects WHERE school_year_id = ? ORDER BY is_archived, name', [activeSy.id]);
    res.json({ success: true, data: subjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
  }
};

// Get archived subjects only
const getArchivedSubjects = async (req, res) => {
  try {
    await ensureSubjectSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const subjects = await query(
      'SELECT * FROM subjects WHERE is_archived = TRUE AND school_year_id = ? ORDER BY name',
      [activeSy.id]
    );
    res.json({ success: true, data: subjects });
  } catch (error) {
    console.error('Error fetching archived subjects:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch archived subjects' });
  }
};

// Get single subject by ID
const getSubjectById = async (req, res) => {
  try {
    await ensureSubjectSchoolYearColumn();
    await ensureSubjectSchoolYearColumn();
    const { id } = req.params;
    await ensureSubjectSchoolYearColumn();
    const subjects = await query('SELECT * FROM subjects WHERE id = ?', [id]);
    
    if (subjects.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    
    res.json({ success: true, data: subjects[0] });
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subject' });
  }
};

// Create new subject
const createSubject = async (req, res) => {
  try {
    await ensureSubjectSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const { name, description, grade_levels } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Subject name is required' });
    }

    if (!grade_levels) {
      return res.status(400).json({ success: false, message: 'Grade levels are required' });
    }

    // Check if subject already exists for same grade levels
    const existing = await formatDuplicateCheck({ name, grade_levels, school_year_id: activeSy.id });
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Subject already exists for these grade levels' });
    }

    const result = await query(
      'INSERT INTO subjects (name, description, grade_levels, school_year_id) VALUES (?, ?, ?, ?)',
      [name.trim(), description?.trim() || null, grade_levels, activeSy.id]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Subject created successfully',
      data: { id: result.insertId, name: name.trim(), description: description?.trim() || null, grade_levels, school_year_id: activeSy.id }
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ success: false, message: 'Failed to create subject' });
  }
};

// Update subject
const updateSubject = async (req, res) => {
  try {
    await ensureSubjectSchoolYearColumn();
    const { id } = req.params;
    const { name, description, grade_levels } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Subject name is required' });
    }

    // Check if subject exists
    const existing = await query('SELECT id, school_year_id FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Check if name already exists for another subject with same grade levels
    const duplicate = await formatDuplicateCheck({ name, grade_levels, school_year_id: existing[0].school_year_id, excludeId: id });
    if (duplicate.length > 0) {
      return res.status(400).json({ success: false, message: 'Another subject with this name already exists for these grade levels' });
    }

    await query(
      'UPDATE subjects SET name = ?, description = ?, grade_levels = ? WHERE id = ?',
      [name.trim(), description?.trim() || null, grade_levels || null, id]
    );

    res.json({ success: true, message: 'Subject updated successfully' });
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ success: false, message: 'Failed to update subject' });
  }
};

// Archive subject (soft delete)
const archiveSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, name FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    await query('UPDATE subjects SET is_archived = TRUE WHERE id = ?', [id]);

    res.json({ success: true, message: `Subject "${existing[0].name}" archived successfully` });
  } catch (error) {
    console.error('Error archiving subject:', error);
    res.status(500).json({ success: false, message: 'Failed to archive subject' });
  }
};

// Restore archived subject
const restoreSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, name FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    await query('UPDATE subjects SET is_archived = FALSE WHERE id = ?', [id]);

    res.json({ success: true, message: `Subject "${existing[0].name}" restored successfully` });
  } catch (error) {
    console.error('Error restoring subject:', error);
    res.status(500).json({ success: false, message: 'Failed to restore subject' });
  }
};

// Permanently delete subject
const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subject is in use
    const inUse = await query('SELECT COUNT(*) as count FROM subject_teachers WHERE subject = (SELECT name FROM subjects WHERE id = ?)', [id]);
    if (inUse[0]?.count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete subject that is assigned to teachers. Archive it instead.' 
      });
    }

    await query('DELETE FROM subjects WHERE id = ?', [id]);

    res.json({ success: true, message: 'Subject deleted permanently' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ success: false, message: 'Failed to delete subject' });
  }
};

// List subjects from previous school year (for optional fetch)
const getPreviousYearSubjects = async (req, res) => {
  try {
    await ensureSubjectSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const prevSy = await getPreviousSchoolYear(activeSy.start_date);
    if (!prevSy) return res.json({ success: true, data: [] });

    const subjects = await query(
      'SELECT * FROM subjects WHERE is_archived = FALSE AND school_year_id = ? ORDER BY grade_levels, name',
      [prevSy.id]
    );

    res.json({ success: true, data: subjects, meta: { sourceSchoolYearId: prevSy.id } });
  } catch (error) {
    console.error('Error fetching previous year subjects:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch previous year subjects' });
  }
};

// Copy selected subjects from previous school year into active school year
const fetchSubjectsFromPreviousYear = async (req, res) => {
  try {
    await ensureSubjectSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const prevSy = await getPreviousSchoolYear(activeSy.start_date);
    if (!prevSy) {
      return res.status(400).json({ success: false, message: 'No previous school year found to fetch from' });
    }

    const { ids } = req.body || {};
    const idList = Array.isArray(ids) && ids.length > 0 ? ids : null;

    const prevSubjects = await query(
      `SELECT * FROM subjects WHERE is_archived = FALSE AND school_year_id = ? ${idList ? 'AND id IN (?)' : ''}`,
      idList ? [prevSy.id, idList] : [prevSy.id]
    );

    if (!prevSubjects.length) {
      return res.json({ success: true, message: 'Nothing to fetch', data: { inserted: 0, skipped: 0 } });
    }

    let inserted = 0;
    let skipped = 0;

    for (const subj of prevSubjects) {
      const dup = await formatDuplicateCheck({
        name: subj.name,
        grade_levels: subj.grade_levels,
        school_year_id: activeSy.id
      });
      if (dup.length) {
        skipped += 1;
        continue;
      }

      await query(
        'INSERT INTO subjects (name, description, grade_levels, school_year_id, is_archived) VALUES (?, ?, ?, ?, FALSE)',
        [subj.name, subj.description, subj.grade_levels, activeSy.id]
      );
      inserted += 1;
    }

    res.json({ success: true, message: 'Fetch complete', data: { inserted, skipped, sourceSchoolYearId: prevSy.id, targetSchoolYearId: activeSy.id } });
  } catch (error) {
    console.error('Error fetching subjects from previous year:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subjects from previous year' });
  }
};

module.exports = {
  getAllSubjects,
  getSubjectsByGrade,
  getAllSubjectsWithArchived,
  getArchivedSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  archiveSubject,
  restoreSubject,
  deleteSubject,
  getPreviousYearSubjects,
  fetchSubjectsFromPreviousYear
};
