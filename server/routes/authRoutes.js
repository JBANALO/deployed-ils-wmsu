// server/routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authControllerMySQL');

const router = express.Router();

router.post('/login', authController.login);

module.exports = router;