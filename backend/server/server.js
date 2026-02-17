// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const deleteRequestRoutes = require('./routes/deleteRequests');
const gradeRoutes = require('./routes/grades');
const classRoutes = require('./routes/classes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/delete-requests', deleteRequestRoutes);
app.use('/api/students', gradeRoutes); // grades under students
app.use('/api/student', require('./routes/studentPortal'));

app.get('/', (req, res) => {
  res.json({ message: 'Student Management API Running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});