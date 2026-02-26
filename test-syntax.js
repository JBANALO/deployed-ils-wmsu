import fs from 'fs';
const content = fs.readFileSync('src/pages/admin/AdminStudents.jsx', 'utf8');
console.log('File length:', content.length);
console.log('Starts with:', content.substring(0, 50));
console.log('Ends with:', content.substring(content.length - 50));
console.log('Brace check - open:', (content.match(/{/g) || []).length, 'close:', (content.match(/}/g) || []).length);
console.log('Paren check - open:', (content.match(/\(/g) || []).length, 'close:', (content.match(/\)/g) || []).length);
console.log('Div check - open:', (content.match(/<div/g) || []).length, 'close:', (content.match(/<\/div>/g) || []).length);
