// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const classRoutes = require('./routes/classRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const app = express();

// CORS - allow Netlify frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed)) || origin.includes('netlify.app')) {
      return callback(null, true);
    }
    callback(null, true); // Allow all for now
  },
  credentials: true
}));
app.use(express.json());

// API routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);

// Serve static frontend files from dist folder
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// API health check
app.get('/api', (req, res) => {
  res.json({ message: 'WMSU Portal API is running', status: 'OK' });
});

// Serve frontend for all other routes (for client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('Error starting server:', err);
    return;
  }
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Access from network at http://192.168.0.153:${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err);
});