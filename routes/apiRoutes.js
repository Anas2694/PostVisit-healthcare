/**
 * API v1 Routes
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { HealthMetrics, Notification, HealthGoal } = require('../models/index');
const Report = require('../models/Report');
const pdfService = require('../services/pdf/pdfService');
const {
  METRIC_CONFIG,
  GOAL_METRICS,
  buildAbnormalExplanationCards,
  buildLifestylePlan,
  buildTrendComparison,
  buildVisualAlerts,
  buildRiskScoreHistory,
  buildGoalProgress,
  buildEmergencyCard,
  buildTimeline,
  buildHealthSummaryData,
} = require('../utils/healthInsights');

router.get('/metrics', protect, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const metrics = await HealthMetrics.find({ user: req.user.id, date: { $gte: since } }).sort({ date: 1 });
    res.json({ success: true, data: metrics });
  } catch (e) { next(e); }
});

router.get('/timeline', protect, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 365;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [reports, notifications, metrics] = await Promise.all([
      Report.find({ user: req.user.id, createdAt: { $gte: since }, isArchived: false })
        .populate('analysis', 'summary severity')
        .sort({ createdAt: -1 })
        .limit(100),
      Notification.find({
        user: req.user.id,
        $or: [{ createdAt: { $gte: since } }, { scheduledFor: { $gte: since } }],
      }).sort({ createdAt: -1 }).limit(100),
      HealthMetrics.find({ user: req.user.id, date: { $gte: since } }).sort({ date: 1 }).limit(250),
    ]);

    res.json({ success: true, data: buildTimeline({ reports, notifications, metrics }) });
  } catch (e) { next(e); }
});

router.get('/emergency-card', protect, async (req, res, next) => {
  try {
    res.json({ success: true, data: buildEmergencyCard(req.user) });
  } catch (e) { next(e); }
});

router.get('/trends', protect, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 180;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const metrics = await HealthMetrics.find({ user: req.user.id, date: { $gte: since } }).sort({ date: 1 });

    res.json({
      success: true,
      data: {
        comparisons: buildTrendComparison(metrics),
        visualAlerts: buildVisualAlerts(metrics),
      },
    });
  } catch (e) { next(e); }
});

router.get('/alerts', protect, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 180;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [metrics, reports] = await Promise.all([
      HealthMetrics.find({ user: req.user.id, date: { $gte: since } }).sort({ date: 1 }),
      Report.find({ user: req.user.id, createdAt: { $gte: since }, isArchived: false })
        .select('title riskFlags createdAt reportDate')
        .sort({ createdAt: -1 }),
    ]);

    const metricAlerts = buildVisualAlerts(metrics);
    const riskAlerts = reports.flatMap(report => (report.riskFlags || []).map(flag => ({
      type: 'risk_flag',
      reportId: report._id,
      reportTitle: report.title,
      severity: flag.severity,
      riskType: flag.type,
      message: flag.description,
      date: report.reportDate || report.createdAt,
    })));

    res.json({ success: true, data: [...metricAlerts, ...riskAlerts] });
  } catch (e) { next(e); }
});

router.get('/risk-history', protect, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 365;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [metrics, reports] = await Promise.all([
      HealthMetrics.find({ user: req.user.id, date: { $gte: since } }).sort({ date: 1 }),
      Report.find({ user: req.user.id, createdAt: { $gte: since }, isArchived: false }).select('riskFlags createdAt reportDate'),
    ]);

    res.json({ success: true, data: buildRiskScoreHistory(metrics, reports) });
  } catch (e) { next(e); }
});

router.get('/goals', protect, async (req, res, next) => {
  try {
    const [goals, metrics] = await Promise.all([
      HealthGoal.find({ user: req.user.id }).sort({ isActive: -1, createdAt: -1 }),
      HealthMetrics.find({ user: req.user.id }).sort({ date: 1 }).limit(500),
    ]);

    res.json({ success: true, data: buildGoalProgress(goals, metrics), rawGoals: goals });
  } catch (e) { next(e); }
});

router.post('/goals', protect, async (req, res, next) => {
  try {
    const { title, metric, targetOperator = 'lte', targetValue, dueDate, notes } = req.body;
    const numericTarget = Number(targetValue);

    if (!title || !metric || !GOAL_METRICS.includes(metric) || !Number.isFinite(numericTarget)) {
      return res.status(400).json({
        success: false,
        message: 'Provide title, supported metric, and numeric targetValue',
        supportedMetrics: GOAL_METRICS,
      });
    }

    if (!['lte', 'gte'].includes(targetOperator)) {
      return res.status(400).json({ success: false, message: 'targetOperator must be lte or gte' });
    }

    const goal = await HealthGoal.create({
      user: req.user.id,
      title,
      metric,
      targetOperator,
      targetValue: numericTarget,
      unit: METRIC_CONFIG[metric]?.unit,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
    });

    res.status(201).json({ success: true, data: goal });
  } catch (e) { next(e); }
});

router.patch('/goals/:id', protect, async (req, res, next) => {
  try {
    const allowed = ['title', 'targetOperator', 'targetValue', 'dueDate', 'notes', 'isActive', 'achievedAt'];
    const update = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    });
    if (update.targetValue !== undefined) update.targetValue = Number(update.targetValue);
    if (update.dueDate) update.dueDate = new Date(update.dueDate);
    if (update.achievedAt) update.achievedAt = new Date(update.achievedAt);

    const goal = await HealthGoal.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      update,
      { new: true, runValidators: true }
    );

    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, data: goal });
  } catch (e) { next(e); }
});

router.delete('/goals/:id', protect, async (req, res, next) => {
  try {
    const goal = await HealthGoal.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (e) { next(e); }
});

router.get('/notifications/count', protect, async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ user: req.user.id, isRead: false });
    res.json({ success: true, count });
  } catch (e) { next(e); }
});

router.get('/health-summary', protect, async (req, res, next) => {
  try {
    const summary = await loadHealthSummary(req.user.id, req.user);
    res.json({ success: true, data: summary });
  } catch (e) { next(e); }
});

router.get('/health-summary/pdf', protect, async (req, res, next) => {
  try {
    const summary = await loadHealthSummary(req.user.id, req.user);
    const pdfBuffer = await pdfService.generateHealthSummaryPDF(summary);
    const filename = `PostVisit_Full_Health_Summary_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
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

router.get('/reports/:id/abnormal-explanations', protect, async (req, res, next) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user.id, isArchived: false })
      .populate('analysis', 'keyFindings recommendations dietaryAdvice followUpTests precautions');
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    res.json({ success: true, data: buildAbnormalExplanationCards(report) });
  } catch (e) { next(e); }
});

router.get('/reports/:id/lifestyle-plan', protect, async (req, res, next) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user.id, isArchived: false })
      .populate('analysis', 'keyFindings recommendations dietaryAdvice followUpTests precautions');
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    res.json({ success: true, data: buildLifestylePlan(report, req.user) });
  } catch (e) { next(e); }
});

async function loadHealthSummary(userId, user) {
  const [reports, metrics, goals, notifications] = await Promise.all([
    Report.find({ user: userId, isArchived: false })
      .populate('analysis', 'summary severity recommendations keyFindings riskPredictions')
      .sort({ reportDate: -1, createdAt: -1 })
      .limit(25),
    HealthMetrics.find({ user: userId }).sort({ date: 1 }).limit(500),
    HealthGoal.find({ user: userId }).sort({ isActive: -1, createdAt: -1 }),
    Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(50),
  ]);

  return buildHealthSummaryData({ user, reports, metrics, goals, notifications });
}

module.exports = router;
