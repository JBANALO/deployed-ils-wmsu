const fs = require('fs');
const path = require('path');

const classesFilePath = path.join(__dirname, '../../data/classes.json');
const studentsFilePath = path.join(__dirname, '../../data/students.json');

// Read classes data
const readClasses = () => {
  try {
    const data = fs.readFileSync(classesFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading classes.json:', error);
    return [];
  }
};

// Read students data and generate classes from it
const generateClassesFromStudents = () => {
  try {
    const data = fs.readFileSync(studentsFilePath, 'utf8');
    const students = JSON.parse(data);
    
    // Get adviser assignments and subject teachers from classes.json first
    const classesData = readClasses();
    console.log('Classes from classes.json:', classesData.length, 'classes');
    
    const classesMap = {};
    classesData.forEach(classItem => {
      const key = `${classItem.grade}-${classItem.section}`;
      classesMap[key] = classItem;
      console.log(`Added to classesMap - key: "${key}", id: "${classItem.id}", subject_teachers: ${(classItem.subject_teachers || []).length}`);
    });

    // Get unique grade+section combinations from students
    const classMap = {};
    students.forEach(student => {
      const key = `${student.gradeLevel}-${student.section}`;
      if (!classMap[key]) {
        // Generate consistent ID: lowercase and replace spaces with hyphens
        const id = key.toLowerCase().replace(/\s+/g, '-');
        
        // Check if this class already exists in classes.json
        const existingClass = classesMap[key];
        
        if (existingClass) {
          // Use existing class data with adviser info and subject teachers
          classMap[key] = {
            ...existingClass,
            id: id // Ensure ID is consistent
          };
          console.log(`Using existing class from classes.json - key: "${key}", id: "${id}", subject_teachers: ${(classMap[key].subject_teachers || []).length}`);
        } else {
          // Create new class
          classMap[key] = {
            id: id,
            grade: student.gradeLevel,
            section: student.section,
            adviser_id: null,
            adviser_name: null,
            subject_teachers: [],
            createdAt: new Date().toISOString()
          };
          console.log(`Created new class from students - key: "${key}", id: "${id}"`);
        }
      }
    });

    // Also include classes from classes.json that don't have students
    classesData.forEach(classItem => {
      const key = `${classItem.grade}-${classItem.section}`;
      if (!classMap[key]) {
        classMap[key] = classItem;
        console.log(`Added class from classes.json that has no students - key: "${key}", id: "${classItem.id}"`);
      }
    });

    const result = Object.values(classMap);
    console.log(`generateClassesFromStudents returning ${result.length} classes`);
    result.forEach(c => {
      console.log(`  - ${c.id}: ${c.grade} - ${c.section}, subject_teachers: ${(c.subject_teachers || []).length}`);
    });
    
    return result;
  } catch (error) {
    console.error('Error reading students.json:', error);
    return readClasses();
  }
};

// Write classes data
const writeClasses = (data) => {
  try {
    fs.writeFileSync(classesFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing classes.json:', error);
    return false;
  }
};

// Get all classes (from students data)
const getAllClasses = (req, res) => {
  try {
    let classes = generateClassesFromStudents();
    
    // Enhance classes with adviser information from users if available
    try {
      const { readUsers } = require('../utils/fileStorage');
      const users = readUsers();
      
      // For each class, try to find adviser from users data if not already assigned
      classes = classes.map(classItem => {
        // Keep existing adviser assignment from classes.json
        if (classItem.adviser_id && classItem.adviser_name) {
          return classItem;
        }
        
        // Try to find adviser in users data by class assignment
        const adviser = users.find(user => {
          const userRole = (user.role || '').toLowerCase();
          const userClass = user.assignedClass || user.assigned_class;
          
          if (userRole !== 'adviser' || !userClass) {
            return false;
          }
          
          // Compare class info
          const userClassKey = `${userClass.grade}-${userClass.section}`.toLowerCase().replace(/\s+/g, '-');
          const itemClassKey = `${classItem.grade}-${classItem.section}`.toLowerCase().replace(/\s+/g, '-');
          
          return userClassKey === itemClassKey;
        });
        
        if (adviser) {
          return {
            ...classItem,
            adviser_id: adviser.id,
            adviser_name: `${adviser.firstName || ''} ${adviser.lastName || ''}`.trim()
          };
        }
        
        return classItem;
      });
    } catch (err) {
      console.log('Could not sync adviser data from users:', err.message);
    }
    
    console.log('Classes returned:', classes.length, classes);
    res.json({ success: true, data: classes });
  } catch (error) {
    console.error('Error in getAllClasses:', error);
    res.status(500).json({ success: false, message: 'Error fetching classes' });
  }
};

// Get classes for a specific adviser
const getAdviserClasses = (req, res) => {
  try {
    const { adviserId } = req.params;
    console.log(`getAdviserClasses called with adviserId: ${adviserId}`);
    
    let classes = generateClassesFromStudents();
    
    // Sync adviser data from users.json
    try {
      const { readUsers } = require('../utils/fileStorage');
      const users = readUsers();
      const adviser = users.find(u => u.id === adviserId);
      
      if (adviser) {
        classes = classes.map(classItem => {
          // Check if already assigned
          if (classItem.adviser_id === adviserId) {
            return classItem;
          }
          
          // Check if this adviser is assigned to this class in users data
          const userClass = adviser.assignedClass || adviser.assigned_class;
          if (userClass) {
            const userClassKey = `${userClass.grade}-${userClass.section}`.toLowerCase().replace(/\s+/g, '-');
            const itemClassKey = `${classItem.grade}-${classItem.section}`.toLowerCase().replace(/\s+/g, '-');
            
            if (userClassKey === itemClassKey) {
              return {
                ...classItem,
                adviser_id: adviserId,
                adviser_name: `${adviser.firstName || ''} ${adviser.lastName || ''}`.trim()
              };
            }
          }
          
          return classItem;
        });
      }
    } catch (err) {
      console.log('Could not sync adviser data:', err.message);
    }
    
    const adviserClasses = classes.filter(c => c.adviser_id === adviserId);
    
    console.log(`Found ${adviserClasses.length} classes for adviser ${adviserId}`);
    res.json({ success: true, data: adviserClasses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching adviser classes' });
  }
};
  }
};

// Get classes for a specific subject teacher
const getSubjectTeacherClasses = (req, res) => {
  try {
    const { teacherId } = req.params;
    console.log('getSubjectTeacherClasses called with teacherId:', teacherId);
    
    const classes = generateClassesFromStudents();
    console.log('All classes from generateClassesFromStudents:', JSON.stringify(classes, null, 2));
    
    // Filter classes where this teacher is assigned as subject teacher
    const subjectTeacherClasses = classes.filter(c => {
      if (!c.subject_teachers) {
        console.log(`Class ${c.id} has no subject_teachers array`);
        return false;
      }
      const found = c.subject_teachers.some(st => st.teacher_id === teacherId);
      if (found) {
        console.log(`Class ${c.id} has teacher ${teacherId} teaching ${c.subject_teachers.filter(st => st.teacher_id === teacherId).map(st => st.subject).join(', ')}`);
      }
      return found;
    });
    
    console.log(`Found ${subjectTeacherClasses.length} classes for subject teacher ${teacherId}:`, subjectTeacherClasses.map(c => c.id));
    res.json({ success: true, data: subjectTeacherClasses });
  } catch (error) {
    console.error('Error in getSubjectTeacherClasses:', error);
    res.status(500).json({ success: false, message: 'Error fetching subject teacher classes' });
  }
};

// Assign adviser to a class
const assignAdviserToClass = (req, res) => {
  try {
    const { classId } = req.params;
    const { adviser_id, adviser_name } = req.body;

    console.log('assignAdviserToClass - classId:', classId, 'adviser_id:', adviser_id, 'adviser_name:', adviser_name);

    let classes = readClasses();
    console.log('Current classes.json before update:', classes);
    
    // Find class by ID
    let classIndex = classes.findIndex(c => c.id === classId);
    console.log('Found class at index:', classIndex);

    if (classIndex === -1) {
      // Class doesn't exist yet, create it from students data
      const allClasses = generateClassesFromStudents();
      console.log('All classes from students:', allClasses);
      const foundClass = allClasses.find(c => c.id === classId);
      if (!foundClass) {
        return res.status(404).json({ success: false, message: 'Class not found' });
      }
      // Add to classes array
      classes.push(foundClass);
      classIndex = classes.length - 1;
    }

    // Update the class
    classes[classIndex].adviser_id = adviser_id;
    classes[classIndex].adviser_name = adviser_name;
    classes[classIndex].createdAt = classes[classIndex].createdAt || new Date().toISOString();

    if (writeClasses(classes)) {
      console.log('Successfully wrote to classes.json');
      console.log('Updated class:', classes[classIndex]);
      res.json({ success: true, message: 'Adviser assigned successfully', data: classes[classIndex] });
    } else {
      res.status(500).json({ success: false, message: 'Error saving assignment' });
    }
  } catch (error) {
    console.error('Error in assignAdviserToClass:', error);
    res.status(500).json({ success: false, message: 'Error assigning adviser: ' + error.message });
  }
};

// Unassign adviser from a class
const unassignAdviser = (req, res) => {
  try {
    const { classId } = req.params;

    const classes = readClasses();
    const classIndex = classes.findIndex(c => c.id === classId);

    if (classIndex === -1) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    classes[classIndex].adviser_id = null;
    classes[classIndex].adviser_name = null;

    if (writeClasses(classes)) {
      res.json({ success: true, message: 'Adviser unassigned successfully', data: classes[classIndex] });
    } else {
      res.status(500).json({ success: false, message: 'Error saving changes' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error unassigning adviser' });
  }
};

// Assign subject teacher to a class
const assignSubjectTeacher = (req, res) => {
  try {
    const { classId } = req.params;
    const { teacher_id, teacher_name, subject, day, start_time, end_time } = req.body;

    console.log('assignSubjectTeacher - classId:', classId, 'teacher_id:', teacher_id, 'teacher_name:', teacher_name, 'subject:', subject, 'day:', day, 'start_time:', start_time, 'end_time:', end_time);

    const classes = readClasses();
    let classItem = classes.find(c => c.id === classId);

    if (!classItem) {
      const allClasses = generateClassesFromStudents();
      classItem = allClasses.find(c => c.id === classId);
      if (!classItem) {
        return res.status(404).json({ success: false, message: 'Class not found' });
      }
      classItem.subject_teachers = [];
      classes.push(classItem);
    }

    const index = classes.findIndex(c => c.id === classId);
    
    // Initialize subject_teachers array if it doesn't exist
    if (!classes[index].subject_teachers) {
      classes[index].subject_teachers = [];
    }

    // Check if teacher is already assigned to teach that same subject
    const subjectExists = classes[index].subject_teachers.find(
      t => t.teacher_id === teacher_id && t.subject === subject
    );
    if (subjectExists) {
      return res.status(400).json({ success: false, message: `${teacher_name} is already assigned to teach ${subject} in this class` });
    }

    // Add subject teacher (allow same teacher with different subjects)
    classes[index].subject_teachers.push({
      teacher_id,
      teacher_name,
      subject,
      day: day || 'Monday - Friday',
      start_time: start_time || '08:00',
      end_time: end_time || '09:00',
      assignedAt: new Date().toISOString()
    });

    if (writeClasses(classes)) {
      res.json({ success: true, message: 'Subject teacher assigned successfully', data: classes[index] });
    } else {
      res.status(500).json({ success: false, message: 'Error saving assignment' });
    }
  } catch (error) {
    console.error('Error in assignSubjectTeacher:', error);
    res.status(500).json({ success: false, message: 'Error assigning subject teacher: ' + error.message });
  }
};

// Unassign subject teacher from a class
const unassignSubjectTeacher = (req, res) => {
  try {
    const { classId, teacherId } = req.params;

    const classes = readClasses();
    const classIndex = classes.findIndex(c => c.id === classId);

    if (classIndex === -1) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (!classes[classIndex].subject_teachers) {
      classes[classIndex].subject_teachers = [];
    }

    classes[classIndex].subject_teachers = classes[classIndex].subject_teachers.filter(t => t.teacher_id !== teacherId);

    if (writeClasses(classes)) {
      res.json({ success: true, message: 'Subject teacher unassigned successfully', data: classes[classIndex] });
    } else {
      res.status(500).json({ success: false, message: 'Error saving changes' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error unassigning subject teacher' });
  }
};

module.exports = {
  getAllClasses,
  getAdviserClasses,
  getSubjectTeacherClasses,
  assignAdviserToClass,
  unassignAdviser,
  assignSubjectTeacher,
  unassignSubjectTeacher
};
