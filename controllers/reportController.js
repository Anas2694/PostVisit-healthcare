/**
 * Report Controller - FIXED
 * Fixed: upload with local fallback, async processing, delete, download, CSV export
 */

const Report = require('../models/Report');
const Analysis = require('../models/Analysis');
const { HealthMetrics, Notification, HealthGoal } = require('../models/index');
const User = require('../models/User');
const aiService = require('../services/ai/aiService');
const ocrService = require('../services/ocr/ocrService');
const pdfService = require('../services/pdf/pdfService');
const { getSignedUrl, deleteFile } = require('../config/cloudinary');
const { stringify } = require('csv-stringify/sync');
const { buildHealthSummaryData, buildAbnormalExplanationCards, buildLifestylePlan } = require('../utils/healthInsights');

// GET /reports
exports.getReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id, isArchived: false };
    if (req.query.type) filter.reportType = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { doctorName: { $regex: req.query.search, $options: 'i' } },
        { hospitalName: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('analysis', 'summary severity')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter),
    ]);

    res.render('reports/index', {
      title: 'My Reports',
      reports,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      query: req.query,
    });
  } catch (error) {
    next(error);
  }
};

// GET /reports/upload
exports.getUploadPage = (req, res) => {
  res.render('reports/upload', { title: 'Upload Report' });
};

// POST /reports/upload
exports.uploadReport = async (req, res, next) => {
  try {
    if (!req.file) {
      req.flash('error_msg', 'Please select a file to upload');
      return res.redirect('/reports/upload');
    }

    const { title, description, reportType, reportDate, doctorName, hospitalName } = req.body;

    const report = await Report.create({
      user: req.user._id,
      title: title || 'Untitled Report',
      description,
      reportType: reportType || 'other',
      reportDate: reportDate ? new Date(reportDate) : new Date(),
      doctorName,
      hospitalName,
      file: {
        url: req.file.path,
        publicId: req.file.filename,
        localPath: req.file.localPath,
        resourceType: req.file.mimetype?.startsWith('image/') ? 'image' : 'raw',
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      status: 'uploaded',
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { totalReports: 1 } });

    // Kick off async processing (non-blocking)
    processReportAsync(report._id, req.user).catch(err =>
      console.error('Background processing error:', err.message)
    );

    req.flash('success_msg', '✅ Report uploaded! AI analysis is in progress — check back in a moment.');
    res.redirect(`/reports/${report._id}`);
  } catch (error) {
    next(error);
  }
};

// Background: OCR → AI → HealthMetrics → Notify
async function processReportAsync(reportId, user) {
  try {
    const report = await Report.findById(reportId);
    if (!report) return;

    report.status = 'processing';
    await report.save();

    // OCR
    const ocrResult = await ocrService.extractText(report.file.localPath || report.file.url, report.file.mimeType);
    report.extractedText = ocrResult.text;
    report.ocrConfidence = ocrResult.confidence;

    // Parse values
    const medicalValues = ocrService.parseMedicalValues(ocrResult.text, ocrResult.extracted || {});
    report.extractedValues = medicalValues;

    // Risk prediction
    const riskFlags = aiService.predictRisks(medicalValues);
    report.riskFlags = riskFlags;

    // AI Analysis
    const t0 = Date.now();
    const analysisData = await aiService.analyzeReport({
      reportType: report.reportType,
      extractedText: ocrResult.text,
      medicalValues,
      riskFlags,
      user: {
        age: user.age,
        gender: user.gender,
        chronicConditions: user.chronicConditions || [],
      },
    });

    const analysis = await Analysis.create({
      report: report._id,
      user: user._id,
      ...analysisData,
      processingTime: Date.now() - t0,
    });

    report.analysis = analysis._id;
    report.status = 'analyzed';
    await report.save();

    // Persist health metrics
    await saveHealthMetrics(report, user._id);

    // In-app notification
    await Notification.create({
      user: user._id,
      type: 'report_analyzed',
      title: '📊 Analysis Ready',
      message: `Your report "${report.title}" has been analyzed. ${riskFlags.length > 0 ? `⚠️ ${riskFlags.length} risk flag(s) detected.` : '✅ No major risks detected.'}`,
      relatedReport: report._id,
      relatedAnalysis: analysis._id,
      priority: riskFlags.some(r => r.severity === 'critical') ? 'high' : 'medium',
      actionUrl: `/reports/${report._id}`,
    });

    const abnormalCards = buildAbnormalExplanationCards(report);
    if (abnormalCards.length) {
      await Notification.create({
        user: user._id,
        type: 'health_alert',
        title: 'Abnormal values detected',
        message: abnormalCards
          .slice(0, 4)
          .map(item => `${item.label}: ${item.value} ${item.unit} (${item.status})`)
          .join('; '),
        relatedReport: report._id,
        relatedAnalysis: analysis._id,
        priority: abnormalCards.some(item => item.status === 'critical') ? 'high' : 'medium',
        actionUrl: `/reports/${report._id}`,
      });
    }

    console.log(`✅ Report ${reportId} analyzed (${Date.now() - t0}ms)`);
  } catch (err) {
    console.error(`❌ Processing failed for report ${reportId}:`, err.message);
    await Report.findByIdAndUpdate(reportId, {
      status: 'failed',
      processingError: err.message,
    }).catch(() => {});
  }
}

async function saveHealthMetrics(report, userId) {
  try {
    const v = report.extractedValues;
    if (!v) return;
    const m = { user: userId, report: report._id, date: report.reportDate || report.createdAt, source: 'report' };
    if (v.bloodSugar?.fasting?.value) m.bloodSugarFasting = v.bloodSugar.fasting.value;
    if (v.bloodSugar?.postprandial?.value) m.bloodSugarPostprandial = v.bloodSugar.postprandial.value;
    if (v.bloodSugar?.hba1c?.value) m.hba1c = v.bloodSugar.hba1c.value;
    if (v.cholesterol?.total?.value) m.cholesterolTotal = v.cholesterol.total.value;
    if (v.cholesterol?.hdl?.value) m.cholesterolHDL = v.cholesterol.hdl.value;
    if (v.cholesterol?.ldl?.value) m.cholesterolLDL = v.cholesterol.ldl.value;
    if (v.cholesterol?.triglycerides?.value) m.triglycerides = v.cholesterol.triglycerides.value;
    if (v.hemoglobin?.value) m.hemoglobin = v.hemoglobin.value;
    if (v.bloodPressure?.systolic?.value) m.bloodPressureSystolic = v.bloodPressure.systolic.value;
    if (v.bloodPressure?.diastolic?.value) m.bloodPressureDiastolic = v.bloodPressure.diastolic.value;
    if (v.creatinine?.value) m.creatinine = v.creatinine.value;
    if (v.uricAcid?.value) m.uricAcid = v.uricAcid.value;
    if (v.alt?.value) m.alt = v.alt.value;
    if (v.ast?.value) m.ast = v.ast.value;
    if (v.alkalinePhosphatase?.value) m.alkalinePhosphatase = v.alkalinePhosphatase.value;
    if (v.tsh?.value) m.tsh = v.tsh.value;
    if (v.wbc?.value) m.wbc = v.wbc.value;
    if (v.rbc?.value) m.rbc = v.rbc.value;
    if (v.platelets?.value) m.platelets = v.platelets.value;
    if (v.bmi?.value) m.bmi = v.bmi.value;
    if (Object.keys(m).length > 4) {
      await HealthMetrics.findOneAndUpdate(
        { user: userId, report: report._id },
        m,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  } catch (e) { console.error('HealthMetrics save error:', e.message); }
}

// GET /reports/:id
exports.getReport = async (req, res, next) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id })
      .populate('analysis')
      .populate('user', 'firstName lastName email');

    if (!report) {
      req.flash('error_msg', 'Report not found');
      return res.redirect('/reports');
    }

    report.viewCount = (report.viewCount || 0) + 1;
    await report.save({ validateBeforeSave: false });

    let signedFileUrl = report.file.url;
    try {
      if (report.file.publicId && !report.file.publicId.startsWith('local_')) {
        signedFileUrl = getSignedUrl(report.file.publicId);
      }
    } catch (e) { /* use original url */ }

    res.render('reports/detail', {
      title: report.title,
      report,
      signedFileUrl,
      abnormalCards: buildAbnormalExplanationCards(report),
      lifestylePlan: buildLifestylePlan(report, req.user),
    });
  } catch (error) {
    next(error);
  }
};

// GET /reports/:id/download  — generate PDF
exports.downloadReport = async (req, res, next) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id })
      .populate('analysis')
      .populate('user', 'firstName lastName email dateOfBirth bloodGroup');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const pdfBuffer = await pdfService.generateReportPDF(report, report.user || req.user);
    const filename = `PostVisit_Report_${report.title.replace(/[^a-z0-9]/gi, '_').substring(0, 40)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF download error:', error);
    next(error);
  }
};

// GET /reports/export/health-summary
exports.downloadHealthSummary = async (req, res, next) => {
  try {
    const [user, reports, metrics, goals, notifications] = await Promise.all([
      User.findById(req.user._id || req.user.id),
      Report.find({ user: req.user._id || req.user.id, isArchived: false })
        .populate('analysis', 'summary severity recommendations keyFindings riskPredictions')
        .sort({ reportDate: -1, createdAt: -1 })
        .limit(25),
      HealthMetrics.find({ user: req.user._id || req.user.id }).sort({ date: 1 }).limit(500),
      HealthGoal.find({ user: req.user._id || req.user.id }).sort({ isActive: -1, createdAt: -1 }),
      Notification.find({ user: req.user._id || req.user.id }).sort({ createdAt: -1 }).limit(50),
    ]);

    const summary = buildHealthSummaryData({ user, reports, metrics, goals, notifications });
    const pdfBuffer = await pdfService.generateHealthSummaryPDF(summary);
    const filename = `PostVisit_Full_Health_Summary_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// DELETE /reports/:id
exports.deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    // Delete cloud/local file
    try {
      await deleteFile(report.file.publicId, report.file.resourceType);
    } catch (e) { /* ignore file delete errors */ }

    // Delete related analysis
    if (report.analysis) {
      await Analysis.findByIdAndDelete(report.analysis).catch(() => {});
    }

    await report.deleteOne();
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalReports: -1 } });

    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    next(error);
  }
};

// GET /reports/export/csv
exports.exportCSV = async (req, res, next) => {
  try {
    const metrics = await HealthMetrics.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(500);

    if (!metrics.length) {
      req.flash('error_msg', 'No health data to export yet. Upload and analyze some reports first.');
      return res.redirect('/reports');
    }

    const rows = metrics.map(m => ({
      'Date': m.date ? new Date(m.date).toISOString().split('T')[0] : '',
      'Fasting Blood Sugar (mg/dL)': m.bloodSugarFasting?.toFixed(1) || '',
      'Post-Prandial Sugar (mg/dL)': m.bloodSugarPostprandial?.toFixed(1) || '',
      'HbA1c (%)': m.hba1c?.toFixed(1) || '',
      'Hemoglobin (g/dL)': m.hemoglobin?.toFixed(1) || '',
      'Total Cholesterol (mg/dL)': m.cholesterolTotal?.toFixed(1) || '',
      'HDL (mg/dL)': m.cholesterolHDL?.toFixed(1) || '',
      'LDL (mg/dL)': m.cholesterolLDL?.toFixed(1) || '',
      'Triglycerides (mg/dL)': m.triglycerides?.toFixed(1) || '',
      'BP Systolic (mmHg)': m.bloodPressureSystolic?.toFixed(0) || '',
      'BP Diastolic (mmHg)': m.bloodPressureDiastolic?.toFixed(0) || '',
      'Creatinine (mg/dL)': m.creatinine?.toFixed(2) || '',
      'Source': m.source || 'report',
    }));

    const csv = stringify(rows, { header: true });
    const filename = `PostVisit_HealthData_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel compatibility
  } catch (error) {
    next(error);
  }
};

