// Section Controller - CRUD operations for sections
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

let sectionColumnsEnsured = false;
let classUniquenessEnsured = false;

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

const getSchoolYearById = async (schoolYearId) => {
  if (!schoolYearId) return null;
  const rows = await query(
    'SELECT id, label, start_date FROM school_years WHERE id = ? AND is_archived = 0 LIMIT 1',
    [schoolYearId]
  );
  return rows[0] || null;
};

const resolveSchoolYear = async (req) => {
  const requestedId = req?.query?.schoolYearId || req?.body?.schoolYearId;
  if (requestedId) {
    const sy = await getSchoolYearById(requestedId);
    if (sy) return sy;
  }
  return getActiveSchoolYear();
};

const assertActiveTargetSchoolYear = async (targetSy) => {
  const active = await getActiveSchoolYear();
  if (!targetSy || targetSy.id !== active.id) {
    const err = new Error('Edits are only allowed in the active school year');
    err.statusCode = 400;
    throw err;
  }
  return active;
};

const getSectionFallbackFromClasses = async (schoolYearId) => {
  const classColumns = await query('SHOW COLUMNS FROM classes');
  const hasClassSchoolYear = classColumns.some((c) => c.Field === 'school_year_id');

  const classRows = hasClassSchoolYear
    ? await query(
        `SELECT MIN(id) AS id, TRIM(section) AS section_name, MIN(grade) AS grade_level
         FROM classes
         WHERE school_year_id = ? AND section IS NOT NULL AND TRIM(section) <> ''
         GROUP BY TRIM(section)
         ORDER BY section_name`,
        [schoolYearId]
      )
    : await query(
        `SELECT MIN(id) AS id, TRIM(section) AS section_name, MIN(grade) AS grade_level
         FROM classes
         WHERE section IS NOT NULL AND TRIM(section) <> ''
         GROUP BY TRIM(section)
         ORDER BY section_name`
      );

  return classRows.map((row, index) => ({
    id: row.id || `class-fallback-${schoolYearId}-${index}`,
    name: row.section_name,
    description: null,
    grade_level: row.grade_level || null,
    is_archived: 0,
    school_year_id: schoolYearId,
    source: 'classes_fallback'
  }));
};

const getPreviousSchoolYear = async (activeStartDate) => {
  const rows = await query(
    'SELECT id, label FROM school_years WHERE is_archived = 0 AND start_date < ? ORDER BY start_date DESC LIMIT 1',
    [activeStartDate]
  );
  return rows[0] || null;
};

const getNearestSectionSourceSchoolYear = async (targetSy) => {
  if (!targetSy?.id) return null;

  const baseExistsClause = `(
      EXISTS (
        SELECT 1
        FROM sections s
        WHERE s.school_year_id = sy.id
          AND IFNULL(s.is_archived, 0) = 0
        LIMIT 1
      )
      OR EXISTS (
        SELECT 1
        FROM classes c
        WHERE c.school_year_id = sy.id
          AND c.section IS NOT NULL
          AND TRIM(c.section) <> ''
        LIMIT 1
      )
    )`;

  if (targetSy.start_date) {
    const previousRows = await query(
      `SELECT sy.id, sy.label, sy.start_date
       FROM school_years sy
       WHERE sy.is_archived = 0
         AND sy.id <> ?
         AND sy.start_date < ?
         AND ${baseExistsClause}
       ORDER BY sy.start_date DESC
       LIMIT 1`,
      [targetSy.id, targetSy.start_date]
    );

    if (previousRows.length > 0) return previousRows[0];

    const nearestRows = await query(
      `SELECT sy.id, sy.label, sy.start_date
       FROM school_years sy
       WHERE sy.is_archived = 0
         AND sy.id <> ?
         AND ${baseExistsClause}
       ORDER BY ABS(DATEDIFF(sy.start_date, ?)) ASC, sy.start_date DESC
       LIMIT 1`,
      [targetSy.id, targetSy.start_date]
    );

    return nearestRows[0] || null;
  }

  const fallbackRows = await query(
    `SELECT sy.id, sy.label, sy.start_date
     FROM school_years sy
     WHERE sy.is_archived = 0
       AND sy.id <> ?
       AND ${baseExistsClause}
     ORDER BY sy.id DESC
     LIMIT 1`,
    [targetSy.id]
  );

  return fallbackRows[0] || null;
};

const normalizeGradeForCompare = (value = '') =>
  String(value || '').trim().toLowerCase().replace(/^grade\s+/i, '');

const ensureClassesSchoolYearScopedUniqueness = async () => {
  if (classUniquenessEnsured) return;

  try {
    const indexes = await query('SHOW INDEX FROM classes');
    const uniqueByName = new Map();
    indexes
      .filter((idx) => Number(idx.Non_unique) === 0)
      .forEach((idx) => {
        const key = idx.Key_name;
        if (!uniqueByName.has(key)) uniqueByName.set(key, []);
        uniqueByName.get(key).push({ seq: Number(idx.Seq_in_index), col: idx.Column_name });
      });

    const getCols = (name) => (uniqueByName.get(name) || [])
      .sort((a, b) => a.seq - b.seq)
      .map((entry) => entry.col);

    let globalGradeSectionUnique = null;
    let hasSchoolYearScopedUnique = false;

    for (const key of uniqueByName.keys()) {
      const cols = getCols(key);
      if (cols.length === 2 && cols[0] === 'grade' && cols[1] === 'section') {
        globalGradeSectionUnique = key;
      }
      if (cols.length === 3 && cols[0] === 'grade' && cols[1] === 'section' && cols[2] === 'school_year_id') {
        hasSchoolYearScopedUnique = true;
      }
    }

    if (globalGradeSectionUnique && !hasSchoolYearScopedUnique) {
      try {
        await query(`ALTER TABLE classes DROP INDEX \`${globalGradeSectionUnique}\``);
      } catch (dropErr) {
        console.log('ensureClassesSchoolYearScopedUniqueness drop global unique skipped:', dropErr.message);
      }

      try {
        await query('CREATE UNIQUE INDEX idx_classes_grade_section_sy ON classes (grade, section, school_year_id)');
      } catch (createErr) {
        console.log('ensureClassesSchoolYearScopedUniqueness create scoped unique skipped:', createErr.message);
      }
    }
  } catch (error) {
    console.log('ensureClassesSchoolYearScopedUniqueness skipped:', error.message);
  }

  classUniquenessEnsured = true;
};

const ensureClassForSection = async ({ sectionName, gradeLevel, schoolYearId }) => {
  await ensureClassesSchoolYearScopedUniqueness();

  const section = String(sectionName || '').trim();
  const grade = String(gradeLevel || '').trim();
  const syId = Number(schoolYearId || 0);

  if (!section || !grade || !Number.isInteger(syId) || syId <= 0) return false;

  const existing = await query(
    `SELECT id
     FROM classes
     WHERE school_year_id = ?
       AND LOWER(TRIM(CONVERT(section USING utf8mb4))) COLLATE utf8mb4_general_ci = LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_general_ci
       AND (
         LOWER(REPLACE(TRIM(CONVERT(grade USING utf8mb4)), 'Grade ', '')) COLLATE utf8mb4_general_ci = LOWER(REPLACE(TRIM(CONVERT(? USING utf8mb4)), 'Grade ', '')) COLLATE utf8mb4_general_ci
         OR LOWER(TRIM(CONVERT(grade USING utf8mb4))) COLLATE utf8mb4_general_ci = LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_general_ci
       )
     LIMIT 1`,
    [syId, section, grade, grade]
  );

  if (existing.length > 0) return false;

  const classId = uuidv4();
  try {
    await query(
      `INSERT INTO classes (id, grade, section, adviser_id, adviser_name, school_year_id, createdAt, updatedAt)
       VALUES (?, ?, ?, NULL, NULL, ?, NOW(), NOW())`,
      [classId, grade, section, syId]
    );
    return true;
  } catch (firstErr) {
    if (firstErr?.code === 'ER_DUP_ENTRY') return false;

    await query(
      `INSERT INTO classes (id, grade, section, adviser_id, adviser_name, school_year_id)
       VALUES (?, ?, ?, NULL, NULL, ?)`,
      [classId, grade, section, syId]
    );
    return true;
  }
};

// Get all sections (excluding archived)
const getAllSections = async (req, res) => {
  try {
    await ensureSectionColumns();
    const targetSy = await resolveSchoolYear(req);
    let sections = await query(
      'SELECT * FROM sections WHERE is_archived = FALSE AND school_year_id = ? ORDER BY name',
      [targetSy.id]
    );

    // Some historical years only have section names in classes; expose them in view-only mode.
    if (sections.length === 0) {
      sections = await getSectionFallbackFromClasses(targetSy.id);
    }

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
    const targetSy = await resolveSchoolYear(req);
    const sections = await query('SELECT * FROM sections WHERE school_year_id = ? ORDER BY is_archived, name', [targetSy.id]);
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
    const targetSy = await resolveSchoolYear(req);
    const sections = await query(
      'SELECT * FROM sections WHERE is_archived = TRUE AND school_year_id = ? ORDER BY name',
      [targetSy.id]
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
    const existing = await query(
      `SELECT id
       FROM sections
       WHERE school_year_id = ?
         AND LOWER(TRIM(CONVERT(name USING utf8mb4))) COLLATE utf8mb4_general_ci = LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_general_ci
       LIMIT 1`,
      [activeSy.id, name.trim()]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Section already exists' });
    }

    const result = await query(
      'INSERT INTO sections (name, description, grade_level, school_year_id) VALUES (?, ?, ?, ?)',
      [name.trim(), description?.trim() || null, gradeLevel?.trim() || null, activeSy.id]
    );

    try {
      await ensureClassForSection({
        sectionName: name.trim(),
        gradeLevel: gradeLevel?.trim() || null,
        schoolYearId: activeSy.id
      });
    } catch (classErr) {
      console.warn('Section created but class sync failed:', classErr.message);
    }

    res.status(201).json({ 
      success: true, 
      message: 'Section created successfully',
      data: { id: result.insertId, name: name.trim(), description: description?.trim() || null, grade_level: gradeLevel?.trim() || null, school_year_id: activeSy.id }
    });
  } catch (error) {
    console.error('Error creating section:', error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Section already exists' });
    }
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

    try {
      await ensureClassForSection({
        sectionName: name.trim(),
        gradeLevel: gradeLevel?.trim() || null,
        schoolYearId: existing[0].school_year_id
      });
    } catch (classErr) {
      console.warn('Section updated but class sync failed:', classErr.message);
    }

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

    const existing = await query(
      'SELECT id, name, grade_level, school_year_id FROM sections WHERE id = ? LIMIT 1',
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    const targetSection = existing[0];
    const activeSy = await getActiveSchoolYear();
    if (Number(targetSection.school_year_id) !== Number(activeSy.id)) {
      return res.status(403).json({ success: false, message: 'Cannot delete sections from previous school years (view only).' });
    }

    const sectionName = String(targetSection.name || '').trim();
    const gradeLevel = String(targetSection.grade_level || '').trim();

    // Protect real enrolled classes from accidental deletion.
    const enrolledRows = await query(
      `SELECT COUNT(*) AS count
       FROM students
       WHERE school_year_id = ?
         AND LOWER(TRIM(CONVERT(section USING utf8mb4))) COLLATE utf8mb4_general_ci = LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_general_ci
         AND (
           LOWER(REPLACE(TRIM(CONVERT(grade_level USING utf8mb4)), 'Grade ', '')) COLLATE utf8mb4_general_ci = LOWER(REPLACE(TRIM(CONVERT(? USING utf8mb4)), 'Grade ', '')) COLLATE utf8mb4_general_ci
           OR LOWER(TRIM(CONVERT(grade_level USING utf8mb4))) COLLATE utf8mb4_general_ci = LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_general_ci
         )`,
      [activeSy.id, sectionName, gradeLevel, gradeLevel]
    );

    if ((enrolledRows[0]?.count || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete section with enrolled students. Move/archive students first.'
      });
    }

    const classRows = await query(
      `SELECT id, grade, section
       FROM classes
       WHERE school_year_id = ?`,
      [activeSy.id]
    );

    const normalizeGrade = (value = '') => normalizeGradeForCompare(value);
    const normalizeSection = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const matchedClasses = classRows.filter((row) => (
      normalizeSection(row.section) === normalizeSection(sectionName)
      && normalizeGrade(row.grade) === normalizeGrade(gradeLevel)
    ));

    const classKeys = [];
    matchedClasses.forEach((row) => {
      const idKey = String(row.id || '').trim();
      if (idKey) classKeys.push(idKey);

      const gradeSlug = String(row.grade || '').trim().toLowerCase().replace(/\s+/g, '-');
      const sectionSlug = String(row.section || '').trim().toLowerCase().replace(/\s+/g, '-');
      if (gradeSlug && sectionSlug) classKeys.push(`${gradeSlug}-${sectionSlug}`);
    });

    // Remove linked subject-teacher assignments for this section's class IDs/slugs in the active SY.
    for (const key of [...new Set(classKeys)]) {
      await query(
        `DELETE FROM subject_teachers
         WHERE school_year_id = ?
           AND LOWER(TRIM(CONVERT(class_id USING utf8mb4))) COLLATE utf8mb4_general_ci = LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_general_ci`,
        [activeSy.id, key]
      );
    }

    // Remove linked adviser assignments for this exact grade + section in active SY.
    await query(
      `DELETE FROM class_assignments
       WHERE school_year_id = ?
         AND LOWER(TRIM(CONVERT(section USING utf8mb4))) COLLATE utf8mb4_general_ci = LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_general_ci
         AND (
           LOWER(REPLACE(TRIM(CONVERT(grade_level USING utf8mb4)), 'Grade ', '')) COLLATE utf8mb4_general_ci = LOWER(REPLACE(TRIM(CONVERT(? USING utf8mb4)), 'Grade ', '')) COLLATE utf8mb4_general_ci
           OR LOWER(TRIM(CONVERT(grade_level USING utf8mb4))) COLLATE utf8mb4_general_ci = LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_general_ci
         )`,
      [activeSy.id, sectionName, gradeLevel, gradeLevel]
    );

    // Remove linked classes for this exact grade + section in active SY.
    await query(
      `DELETE FROM classes
       WHERE school_year_id = ?
         AND LOWER(TRIM(CONVERT(section USING utf8mb4))) COLLATE utf8mb4_general_ci = LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_general_ci
         AND (
           LOWER(REPLACE(TRIM(CONVERT(grade USING utf8mb4)), 'Grade ', '')) COLLATE utf8mb4_general_ci = LOWER(REPLACE(TRIM(CONVERT(? USING utf8mb4)), 'Grade ', '')) COLLATE utf8mb4_general_ci
           OR LOWER(TRIM(CONVERT(grade USING utf8mb4))) COLLATE utf8mb4_general_ci = LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_general_ci
         )`,
      [activeSy.id, sectionName, gradeLevel, gradeLevel]
    );

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
    const targetSy = await resolveSchoolYear(req);
    const prevSy = await getNearestSectionSourceSchoolYear(targetSy);
    if (!prevSy) return res.json({ success: true, data: [] });

    let sections = await query(
      'SELECT * FROM sections WHERE is_archived = FALSE AND school_year_id = ? ORDER BY name',
      [prevSy.id]
    );

    let usedClassesFallback = false;
    if (sections.length === 0) {
      sections = await getSectionFallbackFromClasses(prevSy.id);
      usedClassesFallback = sections.length > 0;
    }

    res.json({
      success: true,
      data: sections,
      meta: {
        sourceSchoolYearId: prevSy.id,
        targetSchoolYearId: targetSy.id,
        usedClassesFallback
      }
    });
  } catch (error) {
    console.error('Error fetching previous year sections:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch previous year sections' });
  }
};

// Copy selected sections from previous school year into active school year
const fetchSectionsFromPreviousYear = async (req, res) => {
  try {
    await ensureSectionColumns();
    const targetSy = await resolveSchoolYear(req);
    await assertActiveTargetSchoolYear(targetSy);
    const prevSy = await getNearestSectionSourceSchoolYear(targetSy);
    if (!prevSy) {
      return res.status(400).json({ success: false, message: 'No source school year found to fetch from' });
    }

    const { ids } = req.body || {};
    const selectedIds = Array.isArray(ids)
      ? ids.map((id) => String(id).trim()).filter(Boolean)
      : [];
    const selectedIdSet = new Set(selectedIds);

    let prevSections = [];
    prevSections = await query(
      'SELECT * FROM sections WHERE is_archived = FALSE AND school_year_id = ?',
      [prevSy.id]
    );

    let usedClassesFallback = false;
    if (!prevSections.length) {
      prevSections = await getSectionFallbackFromClasses(prevSy.id);
      usedClassesFallback = prevSections.length > 0;
    }

    if (selectedIdSet.size > 0) {
      prevSections = prevSections.filter((sec) => selectedIdSet.has(String(sec.id || '').trim()));
    }

    if (!prevSections.length) {
      return res.json({
        success: true,
        message: 'Nothing to fetch',
        data: { inserted: 0, skipped: 0, usedClassesFallback }
      });
    }

    let inserted = 0;
    let skipped = 0;

    for (const sec of prevSections) {
      const dup = await query(
        'SELECT id FROM sections WHERE name = ? AND school_year_id = ?',
        [sec.name, targetSy.id]
      );
      if (dup.length) {
        skipped += 1;
        continue;
      }

      await query(
        'INSERT INTO sections (name, description, grade_level, school_year_id, is_archived) VALUES (?, ?, ?, ?, FALSE)',
        [sec.name, sec.description, sec.grade_level || null, targetSy.id]
      );

      try {
        await ensureClassForSection({
          sectionName: sec.name,
          gradeLevel: sec.grade_level || null,
          schoolYearId: targetSy.id
        });
      } catch (classErr) {
        console.warn('Section fetch copied section but class sync failed:', classErr.message);
      }
      inserted += 1;
    }

    res.json({
      success: true,
      message: 'Fetch complete',
      data: {
        inserted,
        skipped,
        sourceSchoolYearId: prevSy.id,
        targetSchoolYearId: targetSy.id,
        usedClassesFallback
      }
    });
  } catch (error) {
    console.error('Error fetching sections from previous year:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to fetch sections from previous year' });
  }
};

// Sync sections from distinct student gradeLevel/section pairs into the active school year
const syncSectionsFromStudents = async (req, res) => {
  try {
    await ensureSectionColumns();
    const activeSy = await getActiveSchoolYear();

    const studentColumns = await query('SHOW COLUMNS FROM students');
    const hasSchoolYearColumn = studentColumns.some((c) => c.Field === 'school_year_id');
    const gradeColumn = studentColumns.some((c) => c.Field === 'grade_level')
      ? 'grade_level'
      : (studentColumns.some((c) => c.Field === 'gradeLevel') ? 'gradeLevel' : null);
    const sectionColumn = studentColumns.some((c) => c.Field === 'section') ? 'section' : null;

    if (!gradeColumn || !sectionColumn) {
      return res.status(400).json({ success: false, message: 'Students table is missing grade/section columns' });
    }

    const studentsSql = hasSchoolYearColumn
      ? `SELECT DISTINCT TRIM(${gradeColumn}) AS gradeLevel, TRIM(${sectionColumn}) AS section
         FROM students
         WHERE school_year_id = ?
           AND ${gradeColumn} IS NOT NULL
           AND ${sectionColumn} IS NOT NULL
           AND TRIM(${gradeColumn}) <> ''
           AND TRIM(${sectionColumn}) <> ''
           AND LOWER(TRIM(${gradeColumn})) <> 'graduate'`
      : `SELECT DISTINCT TRIM(${gradeColumn}) AS gradeLevel, TRIM(${sectionColumn}) AS section
         FROM students
         WHERE ${gradeColumn} IS NOT NULL
           AND ${sectionColumn} IS NOT NULL
           AND TRIM(${gradeColumn}) <> ''
           AND TRIM(${sectionColumn}) <> ''
           AND LOWER(TRIM(${gradeColumn})) <> 'graduate'`;

    const students = hasSchoolYearColumn
      ? await query(studentsSql, [activeSy.id])
      : await query(studentsSql);

    let inserted = 0;
    let skipped = 0;

    for (const row of students) {
      const gradeLevel = row.gradeLevel;
      const sectionName = row.section;
      const dup = await query(
        'SELECT id FROM sections WHERE school_year_id = ? AND name = ? LIMIT 1',
        [activeSy.id, sectionName]
      );
      if (dup.length) {
        skipped += 1;
        continue;
      }

      await query(
        'INSERT INTO sections (name, description, grade_level, school_year_id, is_archived) VALUES (?, NULL, ?, ?, FALSE)',
        [sectionName, gradeLevel, activeSy.id]
      );

      try {
        await ensureClassForSection({
          sectionName,
          gradeLevel,
          schoolYearId: activeSy.id
        });
      } catch (classErr) {
        console.warn('Section sync inserted section but class sync failed:', classErr.message);
      }
      inserted += 1;
    }

    res.json({ success: true, message: 'Sync complete', data: { inserted, skipped } });
  } catch (error) {
    console.error('Error syncing sections from students:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to sync sections from students' });
  }
};

// Get section usage stats (how many classes use each section)
const getSectionStats = async (req, res) => {
  try {
    await ensureSectionColumns();
    const targetSy = await resolveSchoolYear(req);
    const classColumns = await query('SHOW COLUMNS FROM classes');
    const hasClassSchoolYear = classColumns.some((c) => c.Field === 'school_year_id');

    const stats = hasClassSchoolYear
      ? await query(
          `SELECT s.id, s.name, s.description, s.is_archived,
                  COUNT(c.id) AS class_count
           FROM sections s
           LEFT JOIN classes c
             ON c.section = s.name COLLATE utf8mb4_general_ci
            AND c.school_year_id = s.school_year_id
           WHERE s.is_archived = FALSE AND s.school_year_id = ?
           GROUP BY s.id, s.name, s.description, s.is_archived
           ORDER BY s.name`,
          [targetSy.id]
        )
      : await query(
          `SELECT s.id, s.name, s.description, s.is_archived,
                  COUNT(c.id) AS class_count
           FROM sections s
           LEFT JOIN classes c ON c.section = s.name COLLATE utf8mb4_general_ci
           WHERE s.is_archived = FALSE AND s.school_year_id = ?
           GROUP BY s.id, s.name, s.description, s.is_archived
           ORDER BY s.name`,
          [targetSy.id]
        );
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
  fetchSectionsFromPreviousYear,
  syncSectionsFromStudents
};
