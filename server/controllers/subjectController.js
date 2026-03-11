// Subject Controller - CRUD operations for subjects with grade level support
const { query } = require('../config/database');

// Get all subjects (excluding archived), grouped by grade level
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await query(
      'SELECT * FROM subjects WHERE is_archived = FALSE ORDER BY grade_levels, name'
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
    const { grade } = req.params;
    const subjects = await query(
      'SELECT * FROM subjects WHERE is_archived = FALSE AND FIND_IN_SET(?, grade_levels) ORDER BY name',
      [grade]
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
    const subjects = await query('SELECT * FROM subjects ORDER BY is_archived, name');
    res.json({ success: true, data: subjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
  }
};

// Get archived subjects only
const getArchivedSubjects = async (req, res) => {
  try {
    const subjects = await query(
      'SELECT * FROM subjects WHERE is_archived = TRUE ORDER BY name'
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
    const { id } = req.params;
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
    const { name, description, grade_levels } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Subject name is required' });
    }

    if (!grade_levels) {
      return res.status(400).json({ success: false, message: 'Grade levels are required' });
    }

    // Check if subject already exists for same grade levels
    const existing = await query('SELECT id FROM subjects WHERE name = ? AND grade_levels = ?', [name.trim(), grade_levels]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Subject already exists for these grade levels' });
    }

    const result = await query(
      'INSERT INTO subjects (name, description, grade_levels) VALUES (?, ?, ?)',
      [name.trim(), description?.trim() || null, grade_levels]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Subject created successfully',
      data: { id: result.insertId, name: name.trim(), description: description?.trim() || null, grade_levels }
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ success: false, message: 'Failed to create subject' });
  }
};

// Update subject
const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, grade_levels } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Subject name is required' });
    }

    // Check if subject exists
    const existing = await query('SELECT id FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Check if name already exists for another subject with same grade levels
    const duplicate = await query('SELECT id FROM subjects WHERE name = ? AND grade_levels = ? AND id != ?', [name.trim(), grade_levels, id]);
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
  deleteSubject
};
