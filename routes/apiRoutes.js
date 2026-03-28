/**
 * API v1 Routes
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { HealthMetrics, Notification } = require('../models/index');
const Report = require('../models/Report');

router.get('/metrics', protect, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const metrics = await HealthMetrics.find({ user: req.user.id, date: { $gte: since } }).sort({ date: 1 });
    res.json({ success: true, data: metrics });
  } catch (e) { next(e); }
});

router.get('/notifications/count', protect, async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ user: req.user.id, isRead: false });
    res.json({ success: true, count });
  } catch (e) { next(e); }
});

router.get('/reports/summary', protect, async (req, res, next) => {
  try {
    const [total, analyzed, failed] = await Promise.all([
      Report.countDocuments({ user: req.user.id }),
      Report.countDocuments({ user: req.user.id, status: 'analyzed' }),
      Report.countDocuments({ user: req.user.id, status: 'failed' }),
    ]);
    res.json({ success: true, data: { total, analyzed, failed, pending: total - analyzed - failed } });
  } catch (e) { next(e); }
});

module.exports = router;
