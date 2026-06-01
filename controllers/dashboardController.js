/**
 * Dashboard Controller - FIXED
 * Fixed: deprecated ObjectId(), empty charts, missing empty-state handling
 */

const mongoose = require('mongoose');
const Report = require('../models/Report');
const { HealthMetrics, Notification, HealthGoal } = require('../models/index');
const moment = require('moment');
const {
  buildTrendComparison,
  buildVisualAlerts,
  buildRiskScoreHistory,
  buildGoalProgress,
  buildEmergencyCard,
  buildTimeline,
  METRIC_CONFIG,
} = require('../utils/healthInsights');

// ========================
// GET /dashboard
// ========================
exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id; // use _id directly (ObjectId)
    const sixMonthsAgo = moment().subtract(6, 'months').toDate();

    const [
      recentReports,
      totalReports,
      pendingReports,
      recentMetrics,
      notifications,
      reportsByType,
      goals,
    ] = await Promise.all([
      Report.find({ user: userId, isArchived: false })
        .populate('analysis', 'summary severity')
        .sort({ createdAt: -1 })
        .limit(5),
      Report.countDocuments({ user: userId }),
      Report.countDocuments({ user: userId, status: { $in: ['uploaded', 'processing'] } }),
      HealthMetrics.find({ user: userId, date: { $gte: sixMonthsAgo } })
        .sort({ date: 1 })
        .limit(100),
      Notification.find({ user: userId, isRead: false })
        .sort({ createdAt: -1 })
        .limit(5),
      // FIX: use new mongoose.Types.ObjectId() not deprecated constructor call
      Report.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), isArchived: false } },
        { $group: { _id: '$reportType', count: { $sum: 1 } } },
      ]),
      HealthGoal.find({ user: userId }).sort({ isActive: -1, createdAt: -1 }).limit(10),
    ]);

    const chartData = buildChartData(recentMetrics);
    const latestMetrics = recentMetrics.length > 0 ? recentMetrics[recentMetrics.length - 1] : null;
    const trendComparisons = buildTrendComparison(recentMetrics);
    const visualAlerts = buildVisualAlerts(recentMetrics);
    const riskHistory = buildRiskScoreHistory(recentMetrics, recentReports);
    const goalProgress = buildGoalProgress(goals, recentMetrics);
    const emergencyCard = buildEmergencyCard(req.user);
    const timelineEvents = buildTimeline({ reports: recentReports, notifications, metrics: recentMetrics }).slice(0, 8);

    // Risk alerts
    const riskAlerts = [];
    recentReports.forEach(r => {
      if (r.riskFlags && r.riskFlags.length) {
        r.riskFlags
          .filter(f => ['high', 'critical'].includes(f.severity))
          .forEach(f => riskAlerts.push({ ...f._doc, reportTitle: r.title, reportId: r._id }));
      }
    });

    res.render('dashboard/index', {
      title: 'Health Dashboard',
      user: req.user,
      recentReports,
      totalReports,
      pendingReports,
      notifications,
      chartData: JSON.stringify(chartData),
      reportsByType: JSON.stringify(reportsByType),
      latestMetrics,
      riskAlerts,
      unreadCount: notifications.length,
      hasMetrics: recentMetrics.length > 0,
      trendComparisons,
      visualAlerts,
      riskHistory,
      goalProgress,
      emergencyCard,
      timelineEvents,
      metricOptions: Object.entries(METRIC_CONFIG).map(([key, config]) => ({
        key,
        label: config.label,
        unit: config.unit,
      })),
    });
  } catch (error) {
    next(error);
  }
};

function buildChartData(metrics) {
  if (!metrics || metrics.length === 0) {
    // Return demo/empty scaffold so charts don't crash
    return {
      labels: [],
      bloodSugar: { fasting: [], postprandial: [] },
      cholesterol: { total: [], hdl: [], ldl: [] },
      hemoglobin: [],
      bloodPressure: { systolic: [], diastolic: [] },
      hba1c: [],
    };
  }
  const labels = metrics.map(m => moment(m.date).format('MMM DD'));
  return {
    labels,
    bloodSugar: {
      fasting: metrics.map(m => m.bloodSugarFasting || null),
      postprandial: metrics.map(m => m.bloodSugarPostprandial || null),
    },
    cholesterol: {
      total: metrics.map(m => m.cholesterolTotal || null),
      hdl: metrics.map(m => m.cholesterolHDL || null),
      ldl: metrics.map(m => m.cholesterolLDL || null),
    },
    hemoglobin: metrics.map(m => m.hemoglobin || null),
    bloodPressure: {
      systolic: metrics.map(m => m.bloodPressureSystolic || null),
      diastolic: metrics.map(m => m.bloodPressureDiastolic || null),
    },
    hba1c: metrics.map(m => m.hba1c || null),
  };
}

exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 180;
    const since = moment().subtract(days, 'days').toDate();
    const metrics = await HealthMetrics.find({ user: userId, date: { $gte: since } }).sort({ date: 1 });
    res.json({ success: true, data: buildChartData(metrics) });
  } catch (error) {
    next(error);
  }
};


