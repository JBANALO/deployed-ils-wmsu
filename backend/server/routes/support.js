const express = require('express');
const router = express.Router();
const {
  createSupportMessage,
  getSupportMessages,
  updateSupportMessage
} = require('../controllers/supportController');

router.post('/', createSupportMessage);
router.get('/', getSupportMessages);
router.patch('/:id', updateSupportMessage);

module.exports = router;
