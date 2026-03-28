/**
 * Report Model
 * Medical report uploads with metadata and processing status
 */

const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  // Ownership
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Report Info
  title: {
    type: String,
    required: [true, 'Report title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: { type: String, trim: true, maxlength: [1000, 'Description too long'] },
  reportType: {
    type: String,
    enum: ['blood_test', 'urine_test', 'xray', 'mri', 'ct_scan', 'ecg', 'ultrasound', 'pathology', 'prescription', 'discharge_summary', 'other'],
    default: 'other',
  },
  reportDate: { type: Date, default: Date.now },

  // Doctor/Hospital Info
  doctorName: { type: String, trim: true },
  hospitalName: { type: String, trim: true },
  specialty: { type: String, trim: true },

  // File Storage
  file: {
    url: { type: String, required: true },         // Cloudinary URL
    publicId: { type: String, required: true },    // Cloudinary public_id
    resourceType: { type: String, default: 'raw' },// 'image' or 'raw'
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number }, // bytes
  },

  // Processing Status
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'analyzed', 'failed'],
    default: 'uploaded',
  },
  processingError: { type: String },

  // OCR Extracted Text
  extractedText: { type: String },
  ocrConfidence: { type: Number, min: 0, max: 100 },

  // Extracted Medical Values
  extractedValues: {
    // Blood tests
    bloodSugar: {
      fasting: { value: Number, unit: String, status: String },
      postprandial: { value: Number, unit: String, status: String },
      hba1c: { value: Number, unit: String, status: String },
    },
    cholesterol: {
      total: { value: Number, unit: String, status: String },
      hdl: { value: Number, unit: String, status: String },
      ldl: { value: Number, unit: String, status: String },
      triglycerides: { value: Number, unit: String, status: String },
    },
    bloodPressure: {
      systolic: { value: Number, unit: { type: String, default: 'mmHg' }, status: String },
      diastolic: { value: Number, unit: { type: String, default: 'mmHg' }, status: String },
    },
    hemoglobin: { value: Number, unit: String, status: String },
    wbc: { value: Number, unit: String, status: String },
    rbc: { value: Number, unit: String, status: String },
    platelets: { value: Number, unit: String, status: String },
    creatinine: { value: Number, unit: String, status: String },
    uricAcid: { value: Number, unit: String, status: String },
    bmi: { value: Number, status: String },
    // Generic key-value pairs for other values
    others: [{ name: String, value: String, unit: String, status: String }],
  },

  // AI Analysis
  analysis: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
  },

  // Risk flags
  riskFlags: [{
    type: { type: String }, // e.g., 'diabetes', 'hypertension'
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    description: String,
  }],

  // Tags for search
  tags: [String],

  // Audit
  viewCount: { type: Number, default: 0 },
  isArchived: { type: Boolean, default: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

}, { timestamps: true });

// ========================
// Indexes
// ========================
ReportSchema.index({ user: 1, createdAt: -1 });
ReportSchema.index({ user: 1, reportType: 1 });
ReportSchema.index({ user: 1, status: 1 });
ReportSchema.index({ tags: 1 });

// ========================
// Virtual Fields
// ========================
ReportSchema.virtual('fileSizeMB').get(function () {
  return this.file.size ? (this.file.size / (1024 * 1024)).toFixed(2) : null;
});

ReportSchema.virtual('hasAbnormalValues').get(function () {
  if (!this.extractedValues) return false;
  const checkStatus = (obj) => {
    if (!obj) return false;
    if (obj.status && ['high', 'low', 'critical'].includes(obj.status)) return true;
    return Object.values(obj).some(v => typeof v === 'object' && checkStatus(v));
  };
  return checkStatus(this.extractedValues);
});

module.exports = mongoose.model('Report', ReportSchema);
