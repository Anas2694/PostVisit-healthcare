/**
 * Admin Routes
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Report = require('../models/Report');
const { AuditLog } = require('../models/index');

router.use(protect, authorize('admin'));

router.get('/', async (req, res, next) => {
  try {
    const [totalUsers, totalReports, recentUsers, auditLogs] = await Promise.all([
      User.countDocuments(),
      Report.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(10).select('-password'),
      AuditLog.find().sort({ createdAt: -1 }).limit(20).populate('user', 'firstName lastName email'),
    ]);
    res.render('admin/index', { title: 'Admin Dashboard', totalUsers, totalReports, recentUsers, auditLogs, aiMode: process.env.GEMINI_API_KEY ? 'Gemini' : 'Mock AI' });
  } catch (e) { next(e); }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-password');
    res.render('admin/users', { title: 'Manage Users', users });
  } catch (e) { next(e); }
});

router.put('/users/:id/toggle', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, isActive: user.isActive });
  } catch (e) { next(e); }
});

module.exports = router;
