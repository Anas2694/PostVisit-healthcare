/**
 * Analysis Model
 * AI-generated insights from medical reports
 */

const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  report: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // AI Generated Content
  summary: {
    type: String,
    required: true,
  }, // Plain English summary
  diagnosis: {
    type: String,
  }, // Key findings
  severity: {
    type: String,
    enum: ['normal', 'mild', 'moderate', 'severe', 'critical'],
    default: 'normal',
  },

  // Structured Insights
  keyFindings: [{
    finding: String,
    value: String,
    interpretation: String,
    severity: { type: String, enum: ['normal', 'low', 'high', 'critical'] },
  }],

  // Recommendations
  precautions: [String],      // What to avoid/watch out for
  recommendations: [String],  // Lifestyle changes
  medications: [{
    name: String,
    purpose: String,
    note: String,
  }],
  followUpTests: [String],
  dietaryAdvice: [String],

  // Risk Predictions
  riskPredictions: [{
    condition: String,           // e.g., 'Type 2 Diabetes'
    riskLevel: { type: String, enum: ['low', 'moderate', 'high', 'very_high'] },
    probability: Number,         // 0-100
    explanation: String,
    preventionTips: [String],
  }],

  // Metadata
  aiModel: { type: String, default: 'postvisit-ai-v1' },
  aiProvider: { type: String, default: 'mock' }, // 'openai', 'mock'
  processingTime: Number, // ms
  confidence: { type: Number, min: 0, max: 100 },

  // Language
  language: { type: String, default: 'en' },

}, { timestamps: true });

AnalysisSchema.index({ report: 1 });
AnalysisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Analysis', AnalysisSchema);
