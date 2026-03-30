// Section Controller - CRUD operations for sections
const { query } = require('../config/database');

let sectionColumnsEnsured = false;

const ensureSectionColumns = async () => {
  if (sectionColumnsEnsured) return;
  const columns = await query('SHOW COLUMNS FROM sections');
  const hasSy = columns.some((c) => c.Field === 'school_year_id');
  const hasGradeLevel = columns.some((c) => c.Field === 'grade_level');

  if (!hasSy) {
    await query('ALTER TABLE sections ADD COLUMN school_year_id INT NULL');
    await query('CREATE INDEX idx_sections_school_year ON sections (school_year_id)');
  }

  if (!hasGradeLevel) {
    await query('ALTER TABLE sections ADD COLUMN grade_level VARCHAR(50) NULL AFTER description');
  }

  // Ensure uniqueness is per school year + name, not globally by name
  const indexes = await query('SHOW INDEX FROM sections');
  const hasGlobalUniqueName = indexes.some((idx) => idx.Key_name === 'name' && idx.Non_unique === 0);
  const hasSyNameUnique = indexes.some((idx) => idx.Key_name === 'idx_sections_sy_name' && idx.Non_unique === 0);

  if (hasGlobalUniqueName) {
    await query('ALTER TABLE sections DROP INDEX name');
  }

  if (!hasSyNameUnique) {
    await query('CREATE UNIQUE INDEX idx_sections_sy_name ON sections (school_year_id, name)');
  }

  sectionColumnsEnsured = true;
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

// Get all sections (excluding archived)
const getAllSections = async (req, res) => {
  try {
    await ensureSectionColumns();
    const activeSy = await getActiveSchoolYear();
    const sections = await query(
      'SELECT * FROM sections WHERE is_archived = FALSE AND school_year_id = ? ORDER BY name',
      [activeSy.id]
    );
    res.json({ success: true, data: sections });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sections' });
  }
};

// Get all sections including archived
const getAllSectionsWithArchived = async (req, res) => {
  try {
    await ensureSectionColumns();
    const activeSy = await getActiveSchoolYear();
    const sections = await query('SELECT * FROM sections WHERE school_year_id = ? ORDER BY is_archived, name', [activeSy.id]);
    res.json({ success: true, data: sections });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sections' });
  }
};

// Get archived sections only
const getArchivedSections = async (req, res) => {
  try {
    await ensureSectionColumns();
    const activeSy = await getActiveSchoolYear();
    const sections = await query(
      'SELECT * FROM sections WHERE is_archived = TRUE AND school_year_id = ? ORDER BY name',
      [activeSy.id]
    );
    res.json({ success: true, data: sections });
  } catch (error) {
    console.error('Error fetching archived sections:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch archived sections' });
  }
};

// Get single section by ID
const getSectionById = async (req, res) => {
  try {
    await ensureSectionColumns();
    await ensureSectionColumns();
    const { id } = req.params;
    const sections = await query('SELECT * FROM sections WHERE id = ?', [id]);
    
    if (sections.length === 0) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }
    
    res.json({ success: true, data: sections[0] });
  } catch (error) {
    console.error('Error fetching section:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch section' });
  }
};

// Create new section
const createSection = async (req, res) => {
  try {
    await ensureSectionColumns();
    const activeSy = await getActiveSchoolYear();
    const { name, description, gradeLevel } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Section name is required' });
    }
    if (!gradeLevel || !gradeLevel.trim()) {
      return res.status(400).json({ success: false, message: 'Grade level is required' });
    }

    // Check if section already exists
    const existing = await query('SELECT id FROM sections WHERE name = ? AND school_year_id = ?', [name.trim(), activeSy.id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Section already exists' });
    }

    const result = await query(
      'INSERT INTO sections (name, description, grade_level, school_year_id) VALUES (?, ?, ?, ?)',
      [name.trim(), description?.trim() || null, gradeLevel?.trim() || null, activeSy.id]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Section created successfully',
      data: { id: result.insertId, name: name.trim(), description: description?.trim() || null, grade_level: gradeLevel?.trim() || null, school_year_id: activeSy.id }
    });
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({ success: false, message: 'Failed to create section' });
  }
};

// Update section
const updateSection = async (req, res) => {
  try {
    await ensureSectionColumns();
    const { id } = req.params;
    const { name, description, gradeLevel } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Section name is required' });
    }
    if (!gradeLevel || !gradeLevel.trim()) {
      return res.status(400).json({ success: false, message: 'Grade level is required' });
    }

    // Check if section exists
    const existing = await query('SELECT id, school_year_id FROM sections WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    // Only allow edits in the active school year
    const activeSy = await getActiveSchoolYear();
    if (existing[0].school_year_id !== activeSy.id) {
      return res.status(403).json({ success: false, message: 'Editing past school years is not allowed (view only).' });
    }

    // Check if name already exists for another section
    const duplicate = await query('SELECT id FROM sections WHERE name = ? AND id != ? AND school_year_id = ?', [name.trim(), id, existing[0].school_year_id]);
    if (duplicate.length > 0) {
      return res.status(400).json({ success: false, message: 'Another section with this name already exists' });
    }

    await query(
      'UPDATE sections SET name = ?, description = ?, grade_level = ? WHERE id = ?',
      [name.trim(), description?.trim() || null, gradeLevel?.trim() || null, id]
    );

    res.json({ success: true, message: 'Section updated successfully' });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ success: false, message: 'Failed to update section' });
  }
};

// Archive section (soft delete)
const archiveSection = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, name FROM sections WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    const activeSy = await getActiveSchoolYear();
    const sectionSy = await query('SELECT school_year_id FROM sections WHERE id = ?', [id]);
    if (sectionSy[0]?.school_year_id !== activeSy.id) {
      return res.status(403).json({ success: false, message: 'Cannot archive sections from previous school years (view only).' });
    }

    await query('UPDATE sections SET is_archived = TRUE WHERE id = ?', [id]);

    res.json({ success: true, message: `Section "${existing[0].name}" archived successfully` });
  } catch (error) {
    console.error('Error archiving section:', error);
    res.status(500).json({ success: false, message: 'Failed to archive section' });
  }
};

// Restore archived section
const restoreSection = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, name FROM sections WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    const activeSy = await getActiveSchoolYear();
    const sectionSy = await query('SELECT school_year_id FROM sections WHERE id = ?', [id]);
    if (sectionSy[0]?.school_year_id !== activeSy.id) {
      return res.status(403).json({ success: false, message: 'Cannot restore sections from previous school years (view only).' });
    }

    await query('UPDATE sections SET is_archived = FALSE WHERE id = ?', [id]);

    res.json({ success: true, message: `Section "${existing[0].name}" restored successfully` });
  } catch (error) {
    console.error('Error restoring section:', error);
    res.status(500).json({ success: false, message: 'Failed to restore section' });
  }
};

// Permanently delete section
const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;

    const activeSy = await getActiveSchoolYear();
    const sectionSy = await query('SELECT school_year_id FROM sections WHERE id = ?', [id]);
    if (sectionSy[0]?.school_year_id !== activeSy.id) {
      return res.status(403).json({ success: false, message: 'Cannot delete sections from previous school years (view only).' });
    }

    // Check if section is in use in any class
    const inUse = await query('SELECT COUNT(*) as count FROM classes WHERE section = (SELECT name FROM sections WHERE id = ?)', [id]);
    if (inUse[0]?.count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete section that is assigned to classes. Archive it instead.' 
      });
    }

    await query('DELETE FROM sections WHERE id = ?', [id]);

    res.json({ success: true, message: 'Section deleted permanently' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ success: false, message: 'Failed to delete section' });
  }
};

// List sections from previous school year (for optional fetch)
const getPreviousYearSections = async (req, res) => {
  try {
    await ensureSectionColumns();
    const activeSy = await getActiveSchoolYear();
    const prevSy = await getPreviousSchoolYear(activeSy.start_date);
    if (!prevSy) return res.json({ success: true, data: [] });

    const sections = await query(
      'SELECT * FROM sections WHERE is_archived = FALSE AND school_year_id = ? ORDER BY name',
      [prevSy.id]
    );

    res.json({ success: true, data: sections, meta: { sourceSchoolYearId: prevSy.id } });
  } catch (error) {
    console.error('Error fetching previous year sections:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch previous year sections' });
  }
};

// Copy selected sections from previous school year into active school year
const fetchSectionsFromPreviousYear = async (req, res) => {
  try {
    await ensureSectionColumns();
    const activeSy = await getActiveSchoolYear();
    const prevSy = await getPreviousSchoolYear(activeSy.start_date);
    if (!prevSy) {
      return res.status(400).json({ success: false, message: 'No previous school year found to fetch from' });
    }

    const { ids } = req.body || {};
    const idList = Array.isArray(ids) && ids.length > 0 ? ids : null;

    const prevSections = await query(
      `SELECT * FROM sections WHERE is_archived = FALSE AND school_year_id = ? ${idList ? 'AND id IN (?)' : ''}`,
      idList ? [prevSy.id, idList] : [prevSy.id]
    );

    if (!prevSections.length) {
      return res.json({ success: true, message: 'Nothing to fetch', data: { inserted: 0, skipped: 0 } });
    }

    let inserted = 0;
    let skipped = 0;

    for (const sec of prevSections) {
      const dup = await query(
        'SELECT id FROM sections WHERE name = ? AND school_year_id = ?',
        [sec.name, activeSy.id]
      );
      if (dup.length) {
        skipped += 1;
        continue;
      }

      await query(
        'INSERT INTO sections (name, description, grade_level, school_year_id, is_archived) VALUES (?, ?, ?, ?, FALSE)',
        [sec.name, sec.description, sec.grade_level || null, activeSy.id]
      );
      inserted += 1;
    }

    res.json({ success: true, message: 'Fetch complete', data: { inserted, skipped, sourceSchoolYearId: prevSy.id, targetSchoolYearId: activeSy.id } });
  } catch (error) {
    console.error('Error fetching sections from previous year:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sections from previous year' });
  }
};

// Get section usage stats (how many classes use each section)
const getSectionStats = async (req, res) => {
  try {
    await ensureSectionColumns();
    const activeSy = await getActiveSchoolYear();
    const stats = await query(`
      SELECT s.id, s.name, s.description, s.is_archived,
             COUNT(c.id) as class_count
      FROM sections s
      LEFT JOIN classes c ON c.section = s.name COLLATE utf8mb4_general_ci
      WHERE s.is_archived = FALSE AND s.school_year_id = ?
      GROUP BY s.id, s.name, s.description, s.is_archived
      ORDER BY s.name
    `, [activeSy.id]);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching section stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch section stats' });
  }
};

module.exports = {
  getAllSections,
  getAllSectionsWithArchived,
  getArchivedSections,
  getSectionById,
  createSection,
  updateSection,
  archiveSection,
  restoreSection,
  deleteSection,
  getSectionStats,
  getPreviousYearSections,
  fetchSectionsFromPreviousYear
};
