/**
 * Report Routes
 */
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const { uploadReportValidator } = require('../middleware/validation');

router.get('/', protect, reportController.getReports);
router.get('/upload', protect, reportController.getUploadPage);
router.post('/upload', protect, upload.single('reportFile'), uploadReportValidator, reportController.uploadReport);
router.get('/export/csv', protect, reportController.exportCSV);
router.get('/export/health-summary', protect, reportController.downloadHealthSummary);
router.get('/:id', protect, reportController.getReport);
router.get('/:id/download', protect, reportController.downloadReport);
router.delete('/:id', protect, reportController.deleteReport);

module.exports = router;
