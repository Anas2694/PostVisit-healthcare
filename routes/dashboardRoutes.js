// ========================
// Dashboard Routes
// ========================
const express = require('express');
const dashboardRouter = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

dashboardRouter.get('/', protect, dashboardController.getDashboard);
dashboardRouter.get('/analytics', protect, dashboardController.getAnalytics);

module.exports = dashboardRouter;
