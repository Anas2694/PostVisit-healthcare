/**
 * Notification Model
 */

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['medication_reminder', 'report_analyzed', 'follow_up', 'health_alert', 'system', 'appointment'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readAt: Date,

  // Related entities
  relatedReport: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  relatedAnalysis: { type: mongoose.Schema.Types.ObjectId, ref: 'Analysis' },

  // Scheduling (for reminders)
  scheduledFor: Date,
  isDelivered: { type: Boolean, default: false },
  deliveredAt: Date,
  deliveryMethod: { type: String, enum: ['in_app', 'email', 'both'], default: 'both' },

  // Recurrence
  isRecurring: { type: Boolean, default: false },
  recurrencePattern: String, // cron expression
  recurrenceEnd: Date,

  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  actionUrl: String,
}, { timestamps: true });

NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ scheduledFor: 1, isDelivered: 1 });

const Notification = mongoose.model('Notification', NotificationSchema);

// ========================
// Health Metrics Model
// ========================

const HealthMetricsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  report: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
  },
  date: { type: Date, required: true },

  // Vitals
  bloodPressureSystolic: Number,
  bloodPressureDiastolic: Number,
  heartRate: Number,
  temperature: Number,
  oxygenSaturation: Number,
  weight: Number,
  height: Number,
  bmi: Number,

  // Blood Tests
  bloodSugarFasting: Number,
  bloodSugarPostprandial: Number,
  hba1c: Number,
  hemoglobin: Number,
  cholesterolTotal: Number,
  cholesterolHDL: Number,
  cholesterolLDL: Number,
  triglycerides: Number,
  creatinine: Number,
  uricAcid: Number,
  alt: Number,
  ast: Number,
  alkalinePhosphatase: Number,
  tsh: Number,
  wbc: Number,
  rbc: Number,
  platelets: Number,

  // Source
  source: { type: String, enum: ['report', 'manual', 'device'], default: 'report' },
  notes: String,
}, { timestamps: true });

HealthMetricsSchema.index({ user: 1, date: -1 });

const HealthMetrics = mongoose.model('HealthMetrics', HealthMetricsSchema);

// ========================
// Chat Message Model
// ========================

const ChatMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: { type: String, required: true },
  relatedReport: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  tokens: Number, // Token usage
  sessionId: String,
}, { timestamps: true });

ChatMessageSchema.index({ user: 1, createdAt: -1 });
ChatMessageSchema.index({ user: 1, sessionId: 1 });

const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);

// ========================
// Audit Log Model
// ========================

const AuditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  resource: String,
  resourceId: mongoose.Schema.Types.ObjectId,
  details: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  status: { type: String, enum: ['success', 'failed', 'error'], default: 'success' },
}, { timestamps: true });

AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// ========================
// Medication Model
// ========================

const MedicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true },
  dosage: String,
  frequency: { type: String, enum: ['once_daily', 'twice_daily', 'thrice_daily', 'weekly', 'as_needed'] },
  times: [String], // ['08:00', '20:00']
  startDate: Date,
  endDate: Date,
  purpose: String,
  prescribedBy: String,
  notes: String,
  isActive: { type: Boolean, default: true },
  refillDate: Date,
  relatedReport: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
}, { timestamps: true });

MedicationSchema.index({ user: 1, isActive: 1 });

const Medication = mongoose.model('Medication', MedicationSchema);

// ========================
// Health Goal Model
// ========================

const HealthGoalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  metric: {
    type: String,
    required: true,
    enum: [
      'bloodSugarFasting',
      'bloodSugarPostprandial',
      'hba1c',
      'hemoglobin',
      'cholesterolTotal',
      'cholesterolHDL',
      'cholesterolLDL',
      'triglycerides',
      'bloodPressureSystolic',
      'bloodPressureDiastolic',
      'creatinine',
      'uricAcid',
      'wbc',
      'rbc',
      'platelets',
      'bmi',
      'heartRate',
      'oxygenSaturation',
      'temperature',
      'alt',
      'ast',
      'alkalinePhosphatase',
      'tsh',
    ],
  },
  targetOperator: { type: String, enum: ['lte', 'gte'], default: 'lte' },
  targetValue: { type: Number, required: true },
  unit: String,
  dueDate: Date,
  notes: { type: String, trim: true, maxlength: 500 },
  isActive: { type: Boolean, default: true },
  achievedAt: Date,
}, { timestamps: true });

HealthGoalSchema.index({ user: 1, isActive: 1 });
HealthGoalSchema.index({ user: 1, metric: 1 });

const HealthGoal = mongoose.model('HealthGoal', HealthGoalSchema);

module.exports = { Notification, HealthMetrics, ChatMessage, AuditLog, Medication, HealthGoal };
