const fs = require('fs');

// Read students
const students = JSON.parse(fs.readFileSync('./data/students.json', 'utf8'));

// Add profile pictures
students.forEach((student) => {
  const name = `${student.firstName}+${student.lastName}`.replace(/\s+/g, '+');
  student.profilePic = `https://ui-avatars.com/api/?name=${name}&background=random&color=fff`;
});

// Write back
fs.writeFileSync('./data/students.json', JSON.stringify(students, null, 2));
console.log(`✓ Added profile pictures to ${students.length} students`);
