/**
 * Helper function to remove quotes from CSV values
 * @param {string} value - CSV value possibly wrapped in quotes
 * @returns {string} Cleaned value
 */
const cleanCSVValue = (value) => {
  if (!value) return '';
  // Remove leading and trailing quotes if present
  let cleaned = value.trim();
  
  // Handle multiple quotes at the beginning and end
  while (cleaned.startsWith('"') || cleaned.startsWith("'")) {
    cleaned = cleaned.slice(1);
  }
  while (cleaned.endsWith('"') || cleaned.endsWith("'")) {
    cleaned = cleaned.slice(0, -1);
  }
  
  return cleaned.trim();
};

/**
 * Parse CSV line with proper quote handling
 * @param {string} line - CSV line to parse
 * @param {string} delimiter - Delimiter (comma or tab)
 * @returns {Array} Array of parsed values
 */
const parseCSVLine = (line, delimiter) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quotes
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator
      result.push(cleanCSVValue(current));
      current = '';
      i++;
    } else {
      // Regular character
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(cleanCSVValue(current));
  
  return result;
};

/**
 * Parse CSV file and return array of objects
 * @param {File} file - CSV file to parse
 * @returns {Promise<Array>} Array of parsed data
 */
export const parseCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          reject(new Error('CSV file is empty or has no data rows'));
          return;
        }

        const headerMapping = {
          'First Name': 'firstName',
          'Middle Name': 'middleName',
          'Last Name': 'lastName',
          'Username': 'username',
          'Email': 'email',
          'Password': 'password',
          'Role': 'role',
          'Subjects': 'subjects',
          'Grade Level': 'gradeLevel',
          'Section': 'section',
          'Created At': 'createdAt',
          'Updated At': 'updatedAt'
        };

        const data = [];

        // 🔥 AUTO-DETECT DELIMITER
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        console.log('Detected delimiter:', delimiter);
        console.log('First line (headers):', lines[0]);

        // Parse headers (simple - no quotes in header row)
        const headers = lines[0]
          .split(delimiter)
          .map(h => cleanCSVValue(h));
        
        console.log('Parsed headers:', headers);

        // Parse rows with proper quote handling
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i], delimiter);
          
          console.log(`Row ${i} raw line:`, lines[i]);
          console.log(`Row ${i} parsed values:`, values);

          const row = {};

          headers.forEach((header, index) => {
            const fieldName = headerMapping[header] || header;
            row[fieldName] = values[index] || '';
          });

          if (!row.password) {
            row.password = 'WMSUILS123';
          }

          if (row.firstName && row.lastName) {
            data.push(row);
          }
        }

        if (data.length === 0) {
          reject(new Error('No valid data rows found.'));
          return;
        }

        resolve(data);

      } catch (error) {
        reject(new Error(`Error parsing CSV: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};

/**
 * Auto-generate email from firstName and lastName
 * @param {string} firstName - Student's first name
 * @param {string} lastName - Student's last name
 * @returns {string} Generated email
 */
export const generateEmail = (firstName, lastName) => {
  const first = firstName?.trim().toLowerCase() || '';
  const last = lastName?.trim().toLowerCase() || '';
  const email = `${first}.${last}@wmsu.edu.ph`;
  return email;
};

/**
 * Auto-generate username from firstName and lastName
 * @param {string} firstName - Student's first name
 * @param {string} lastName - Student's last name
 * @returns {string} Generated username
 */
export const generateUsername = (firstName, lastName) => {
  const first = firstName?.trim().toLowerCase() || '';
  const last = lastName?.trim().toLowerCase() || '';
  const username = `${first}.${last}`;
  return username;
};

/**
 * Process students data - auto-generate emails and usernames if not provided
 * @param {Array} students - Array of student objects
 * @returns {Array} Processed students with emails and usernames
 */
export const processStudentData = (students) => {
  return students.map(student => ({
    ...student,
    // Auto-generate email if not provided or empty
    email: student.email?.trim() 
      ? student.email 
      : generateEmail(student.firstName, student.lastName),
    // Auto-generate username if not provided or empty
    username: student.username?.trim()
      ? student.username
      : generateUsername(student.firstName, student.lastName)
  }));
};

/**
 * Validate student data from CSV
 * @param {Array} students - Array of student objects
 * @returns {Object} Validation result with errors array
 */
export const validateStudentData = (students) => {
  const errors = [];

  students.forEach((student, index) => {
    const rowNum = index + 2; // +2 because of header row and 0-indexing

    if (!student.firstName?.trim()) {
      errors.push(`Row ${rowNum}: firstName is required`);
    }
    if (!student.lastName?.trim()) {
      errors.push(`Row ${rowNum}: lastName is required`);
    }
    // Email is now optional - will be auto-generated
    if (student.email?.trim() && !student.email?.includes('@wmsu.edu.ph')) {
      errors.push(`Row ${rowNum}: email must be a valid WMSU email (@wmsu.edu.ph) if provided`);
    }
    // Username is now optional - will be auto-generated
    if (!student.gradeLevel?.trim()) {
      errors.push(`Row ${rowNum}: gradeLevel is required`);
    }
    if (!student.section?.trim()) {
      errors.push(`Row ${rowNum}: section is required`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Process teachers data - auto-generate emails and usernames if not provided
 * @param {Array} teachers - Array of teacher objects
 * @returns {Array} Processed teachers with emails and usernames
 */
export const processTeacherData = (teachers) => {
  return teachers.map(teacher => {
    // Parse subjects if provided as semicolon or comma-separated string
    let subjectsHandled = [];
    if (teacher.subjects?.trim()) {
      subjectsHandled = teacher.subjects
        .split(/[;,]/)
        .map(s => s.trim()) // Keep original capitalization
        .filter(s => s);
    }

    // Determine role based on role field or default to 'adviser'
    let role = teacher.role?.trim() || 'adviser';
    if (role === 'subject_teacher') {
      role = 'subject_teacher';
    } else if (role === 'adviser') {
      role = 'adviser';
    }

    return {
      firstName: teacher.firstName?.trim() || '',
      middleName: teacher.middleName?.trim() || '',
      lastName: teacher.lastName?.trim() || '',
      email: teacher.email?.trim() 
        ? teacher.email 
        : generateEmail(teacher.firstName, teacher.lastName),
      username: teacher.username?.trim()
        ? teacher.username
        : generateUsername(teacher.firstName, teacher.lastName),
      password: teacher.password?.trim() || 'WMSUILS123',
      role: role,
      gradeLevel: teacher.gradeLevel?.trim() || '',
      section: teacher.section?.trim() || '',
      subjects: subjectsHandled, // Fixed: use 'subjects' instead of 'subjectsHandled'
      bio: teacher.bio?.trim() || ''
    };
  });
};

/**
 * Validate teacher data from CSV
 * @param {Array} teachers - Array of teacher objects
 * @returns {Object} Validation result with errors array
 */
export const validateTeacherData = (teachers) => {
  const errors = [];
  console.log('Validating teachers:', teachers); // Debug log

  teachers.forEach((teacher, index) => {
    const rowErrors = [];

    // Required fields validation
    if (!teacher.firstName?.trim()) {
      rowErrors.push(`Row ${index + 1}: First name is required`);
    }
    
    if (!teacher.lastName?.trim()) {
      rowErrors.push(`Row ${index + 1}: Last name is required`);
    }
    
    if (!teacher.email?.trim()) {
      rowErrors.push(`Row ${index + 1}: Email is required`);
    }

    // Password validation - required for import
    if (!teacher.password?.trim()) {
      rowErrors.push(`Row ${index + 1}: Password is required for import (use WMSUILS123)`);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (teacher.email && !emailRegex.test(teacher.email)) {
      rowErrors.push(`Row ${index + 1}: Invalid email format`);
    }

    // Role validation (case-insensitive)
    const validRoles = ['adviser', 'subject_teacher'];
    if (teacher.role && !validRoles.includes(teacher.role.trim().toLowerCase())) {
      rowErrors.push(`Row ${index + 1}: Role must be 'adviser' or 'subject_teacher'`);
    }

    // Grade level validation (strict - only accept valid grades)
    if (teacher.gradeLevel?.trim()) {
      let normalizedGrade = teacher.gradeLevel.trim().toLowerCase();
      console.log(`Row ${index + 1} - Original grade: "${teacher.gradeLevel}", Normalized: "${normalizedGrade}"`); // Debug log

      // If it's just a number (e.g., "1"), convert to "grade 1"
      if (/^\d+$/.test(normalizedGrade)) {
        normalizedGrade = `grade ${normalizedGrade}`;
      }

      // Normalize formats like "GRADE 1", "Grade 1", etc.
      normalizedGrade = normalizedGrade.replace(/\s+/g, ' ');

      const validGrades = [
        'kindergarten',
        'grade 1',
        'grade 2',
        'grade 3',
        'grade 4',
        'grade 5',
        'grade 6'
      ];

      console.log(`Row ${index + 1} - Final normalized grade: "${normalizedGrade}", Valid grades:`, validGrades); // Debug log

      // Only accept valid grades - reject subjects
      if (!validGrades.includes(normalizedGrade)) {
        rowErrors.push(`Row ${index + 1}: Invalid grade level "${teacher.gradeLevel}" (must be "Kindergarten" or "Grade 1-6". Subjects like "filipino, math, gmrc, science" should be in the Subjects column)`);
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};
