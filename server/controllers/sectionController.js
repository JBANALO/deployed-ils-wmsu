// Section Controller - CRUD operations for sections
const { query } = require('../config/database');

// Get all sections (excluding archived)
const getAllSections = async (req, res) => {
  try {
    const sections = await query(
      'SELECT * FROM sections WHERE is_archived = FALSE ORDER BY name'
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
    const sections = await query('SELECT * FROM sections ORDER BY is_archived, name');
    res.json({ success: true, data: sections });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sections' });
  }
};

// Get archived sections only
const getArchivedSections = async (req, res) => {
  try {
    const sections = await query(
      'SELECT * FROM sections WHERE is_archived = TRUE ORDER BY name'
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
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Section name is required' });
    }

    // Check if section already exists
    const existing = await query('SELECT id FROM sections WHERE name = ?', [name.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Section already exists' });
    }

    const result = await query(
      'INSERT INTO sections (name, description) VALUES (?, ?)',
      [name.trim(), description?.trim() || null]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Section created successfully',
      data: { id: result.insertId, name: name.trim(), description: description?.trim() || null }
    });
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({ success: false, message: 'Failed to create section' });
  }
};

// Update section
const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Section name is required' });
    }

    // Check if section exists
    const existing = await query('SELECT id FROM sections WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    // Check if name already exists for another section
    const duplicate = await query('SELECT id FROM sections WHERE name = ? AND id != ?', [name.trim(), id]);
    if (duplicate.length > 0) {
      return res.status(400).json({ success: false, message: 'Another section with this name already exists' });
    }

    await query(
      'UPDATE sections SET name = ?, description = ? WHERE id = ?',
      [name.trim(), description?.trim() || null, id]
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

// Get section usage stats (how many classes use each section)
const getSectionStats = async (req, res) => {
  try {
    const stats = await query(`
      SELECT s.id, s.name, s.description, s.is_archived,
             COUNT(c.id) as class_count
      FROM sections s
      LEFT JOIN classes c ON c.section = s.name
      WHERE s.is_archived = FALSE
      GROUP BY s.id, s.name, s.description, s.is_archived
      ORDER BY s.name
    `);
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
  getSectionStats
};
