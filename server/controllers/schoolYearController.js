const { query, pool } = require('../config/database');

// Get all school years (non-archived)
exports.getAllSchoolYears = async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM school_years WHERE is_archived = 0 ORDER BY start_date DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching school years:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch school years' });
  }
};

// Get active school year
exports.getActiveSchoolYear = async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1'
    );
    if (rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching active school year:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active school year' });
  }
};

// Get archived school years
exports.getArchivedSchoolYears = async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM school_years WHERE is_archived = 1 ORDER BY start_date DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching archived school years:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch archived school years' });
  }
};

// Create a new school year
exports.createSchoolYear = async (req, res) => {
  try {
    const { label, start_date, end_date, is_active } = req.body;

    // Validate required fields
    if (!label || !start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Label, start date, and end date are required' 
      });
    }

    // If setting as active, deactivate others first
    if (is_active) {
      await query('UPDATE school_years SET is_active = 0');
    }

    const result = await query(
      'INSERT INTO school_years (label, start_date, end_date, is_active) VALUES (?, ?, ?, ?)',
      [label, start_date, end_date, is_active ? 1 : 0]
    );

    res.status(201).json({ 
      success: true, 
      message: 'School year created successfully',
      data: { id: result.insertId, label, start_date, end_date, is_active: is_active ? 1 : 0 }
    });
  } catch (error) {
    console.error('Error creating school year:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'School year label already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create school year' });
  }
};

// Update a school year
exports.updateSchoolYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, start_date, end_date, is_active } = req.body;

    // If setting as active, deactivate others first
    if (is_active) {
      await query('UPDATE school_years SET is_active = 0 WHERE id != ?', [id]);
    }

    const result = await query(
      'UPDATE school_years SET label = ?, start_date = ?, end_date = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [label, start_date, end_date, is_active ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'School year not found' });
    }

    res.json({ success: true, message: 'School year updated successfully' });
  } catch (error) {
    console.error('Error updating school year:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'School year label already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to update school year' });
  }
};

// Set active school year
exports.setActiveSchoolYear = async (req, res) => {
  try {
    const { id } = req.params;

    // Deactivate all school years first
    await query('UPDATE school_years SET is_active = 0');

    // Activate the selected one
    const result = await query(
      'UPDATE school_years SET is_active = 1, updated_at = NOW() WHERE id = ? AND is_archived = 0',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'School year not found or is archived' });
    }

    res.json({ success: true, message: 'School year activated successfully' });
  } catch (error) {
    console.error('Error setting active school year:', error);
    res.status(500).json({ success: false, message: 'Failed to set active school year' });
  }
};

// Archive a school year
exports.archiveSchoolYear = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's the active school year
    const activeCheck = await query(
      'SELECT is_active FROM school_years WHERE id = ?',
      [id]
    );

    if (activeCheck.length > 0 && activeCheck[0].is_active) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot archive the active school year. Please set another school year as active first.' 
      });
    }

    const result = await query(
      'UPDATE school_years SET is_archived = 1, is_active = 0, updated_at = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'School year not found' });
    }

    res.json({ success: true, message: 'School year archived successfully' });
  } catch (error) {
    console.error('Error archiving school year:', error);
    res.status(500).json({ success: false, message: 'Failed to archive school year' });
  }
};

// Restore an archived school year
exports.restoreSchoolYear = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE school_years SET is_archived = 0, updated_at = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'School year not found' });
    }

    res.json({ success: true, message: 'School year restored successfully' });
  } catch (error) {
    console.error('Error restoring school year:', error);
    res.status(500).json({ success: false, message: 'Failed to restore school year' });
  }
};

// Get student count by grade level (for chart)
exports.getStudentsByGrade = async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        CASE
          WHEN grade_level LIKE '%1%' AND grade_level NOT LIKE '%11%' THEN 'Grade 1'
          WHEN grade_level LIKE '%2%' AND grade_level NOT LIKE '%12%' THEN 'Grade 2'
          WHEN grade_level LIKE '%3%' THEN 'Grade 3'
          WHEN grade_level LIKE '%4%' THEN 'Grade 4'
          WHEN grade_level LIKE '%5%' THEN 'Grade 5'
          WHEN grade_level LIKE '%6%' THEN 'Grade 6'
          ELSE 'Other'
        END AS grade,
        COUNT(*) as count
      FROM students
      GROUP BY grade
      ORDER BY grade
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching students by grade:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students by grade' });
  }
};

// Promote students to next grade
exports.promoteStudents = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const promotions = [];
    const graduates = [];

    // Get all students grouped by grade level
    const [students] = await connection.query(`
      SELECT id, first_name, last_name, grade_level, section 
      FROM students 
      ORDER BY grade_level, section
    `);

    for (const student of students) {
      const currentGrade = student.grade_level || '';
      let newGrade = '';
      let isGraduate = false;

      // Determine next grade
      if (currentGrade.includes('1') && !currentGrade.includes('11')) {
        newGrade = currentGrade.replace(/1/, '2');
      } else if (currentGrade.includes('2') && !currentGrade.includes('12')) {
        newGrade = currentGrade.replace(/2/, '3');
      } else if (currentGrade.includes('3')) {
        newGrade = currentGrade.replace(/3/, '4');
      } else if (currentGrade.includes('4')) {
        newGrade = currentGrade.replace(/4/, '5');
      } else if (currentGrade.includes('5')) {
        newGrade = currentGrade.replace(/5/, '6');
      } else if (currentGrade.includes('6')) {
        isGraduate = true;
      }

      if (isGraduate) {
        graduates.push({
          id: student.id,
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          fromGrade: currentGrade
        });
      } else if (newGrade) {
        promotions.push({
          id: student.id,
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          fromGrade: currentGrade,
          toGrade: newGrade
        });

        // Update student grade
        await connection.query(
          'UPDATE students SET grade_level = ? WHERE id = ?',
          [newGrade, student.id]
        );
      }
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: `Promoted ${promotions.length} students. ${graduates.length} students graduated.`,
      data: {
        promotions,
        graduates,
        totalPromoted: promotions.length,
        totalGraduated: graduates.length
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error promoting students:', error);
    res.status(500).json({ success: false, message: 'Failed to promote students' });
  } finally {
    if (connection) connection.release();
  }
};

// Get promotion preview (without actually promoting)
exports.getPromotionPreview = async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        grade_level,
        COUNT(*) as count
      FROM students
      GROUP BY grade_level
      ORDER BY grade_level
    `);

    // Process into promotion preview format
    const preview = rows.map(row => {
      const grade = row.grade_level || '';
      let toGrade = '';
      let isGraduating = false;

      if (grade.includes('1') && !grade.includes('11')) {
        toGrade = 'Grade 2';
      } else if (grade.includes('2') && !grade.includes('12')) {
        toGrade = 'Grade 3';
      } else if (grade.includes('3')) {
        toGrade = 'Grade 4';
      } else if (grade.includes('4')) {
        toGrade = 'Grade 5';
      } else if (grade.includes('5')) {
        toGrade = 'Grade 6';
      } else if (grade.includes('6')) {
        isGraduating = true;
        toGrade = 'Graduate 🎉';
      }

      return {
        fromGrade: grade,
        toGrade,
        count: row.count,
        isGraduating
      };
    });

    res.json({ success: true, data: preview });
  } catch (error) {
    console.error('Error fetching promotion preview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promotion preview' });
  }
};

// Delete a school year (only if not active and no associated records)
exports.deleteSchoolYear = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's the active school year
    const activeCheck = await query(
      'SELECT is_active FROM school_years WHERE id = ?',
      [id]
    );

    if (activeCheck.length > 0 && activeCheck[0].is_active) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete the active school year.' 
      });
    }

    const result = await query('DELETE FROM school_years WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'School year not found' });
    }

    res.json({ success: true, message: 'School year deleted successfully' });
  } catch (error) {
    console.error('Error deleting school year:', error);
    res.status(500).json({ success: false, message: 'Failed to delete school year' });
  }
};
