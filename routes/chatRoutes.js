// ========================
// Chat Routes
// ========================
const express = require('express');
const chatRouter = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { chatMessageValidator } = require('../middleware/validation');

chatRouter.get('/', protect, chatController.getChatPage);
chatRouter.post('/message', protect, chatMessageValidator, chatController.sendMessage);
chatRouter.get('/history', protect, chatController.getChatHistory);
chatRouter.delete('/session/:id', protect, chatController.deleteSession);

module.exports = chatRouter;
