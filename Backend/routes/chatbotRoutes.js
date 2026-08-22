const express = require('express');

const { sendMessage } = require('../controllers/chatbotController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const chatbotRateLimit = require('../middleware/chatbotRateLimit');

const router = express.Router();

router.post('/message', requireAuth, requireRole('patient'), chatbotRateLimit, sendMessage);

module.exports = router;
