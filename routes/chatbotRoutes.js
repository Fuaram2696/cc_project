const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Using authenticateToken so user context is available for due date queries
router.post('/', authenticateToken, chatbotController.handleChatQuery);

module.exports = router;
