/**
 * Database Seeder
 * Populates the database with demo data for development
 * Run: npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Report = require('../models/Report');
const Analysis = require('../models/Analysis');
const { Notification, HealthMetrics, Medication, HealthGoal } = require('../models/index');

const connectDB = require('../config/database');

const seedData = async () => {
  await connectDB();
  console.log('🌱 Starting database seed...\n');

  try {
    // ========================
    // Clear existing data
    // ========================
    await Promise.all([
      User.deleteMany({}),
      Report.deleteMany({}),
      Analysis.deleteMany({}),
      Notification.deleteMany({}),
      HealthMetrics.deleteMany({}),
      Medication.deleteMany({}),
      HealthGoal.deleteMany({}),
    ]);
    console.log('✅ Cleared existing data');

    // ========================
    // Create Admin User
    // ========================
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'PostVisit',
      email: 'admin@postvisit.health',
      password: 'Admin@123456',
      role: 'admin',
      isActive: true,
      totalReports: 0,
    });
    console.log('✅ Admin created: admin@postvisit.health / Admin@123456');

    // ========================
    // Create Demo Patient
    // ========================
    const patient = await User.create({
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'demo@postvisit.health',
      password: 'Demo@123456',
      role: 'user',
      gender: 'female',
      dateOfBirth: new Date('1990-06-15'),
      phone: '+91 9876543210',
      bloodGroup: 'B+',
      chronicConditions: ['Type 2 Diabetes', 'Mild Hypertension'],
      allergies: ['Penicillin'],
      isActive: true,
      totalReports: 3,
    });
    console.log('✅ Demo patient created: demo@postvisit.health / Demo@123456');

    // ========================
    // Create Health Metrics (6 months history)
    // ========================
    const metricsData = [];
    for (let i = 150; i >= 0; i -= 15) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      metricsData.push({
        user: patient._id,
        date,
        source: 'report',
        bloodSugarFasting: 95 + Math.random() * 50 - 10,
        bloodSugarPostprandial: 140 + Math.random() * 60 - 20,
        hba1c: 5.8 + Math.random() * 1.5,
        hemoglobin: 11.5 + Math.random() * 2,
        cholesterolTotal: 180 + Math.random() * 60 - 20,
        cholesterolHDL: 45 + Math.random() * 15,
        cholesterolLDL: 110 + Math.random() * 40,
        triglycerides: 140 + Math.random() * 80,
        bloodPressureSystolic: 128 + Math.random() * 20 - 10,
        bloodPressureDiastolic: 82 + Math.random() * 15 - 7,
      });
    }
    await HealthMetrics.insertMany(metricsData);
    console.log(`✅ Created ${metricsData.length} health metric records`);

    // ========================
    // Create Demo Reports with Analysis
    // ========================
    const reports = [
      {
        title: 'Complete Blood Count - June 2025',
        reportType: 'blood_test',
        doctorName: 'Dr. Rahul Mehta',
        hospitalName: 'Apollo Hospital',
        extractedValues: {
          bloodSugar: {
            fasting: { value: 128, unit: 'mg/dL', status: 'high' },
            hba1c: { value: 7.2, unit: '%', status: 'high' },
          },
          hemoglobin: { value: 10.8, unit: 'g/dL', status: 'low' },
          cholesterol: {
            total: { value: 210, unit: 'mg/dL', status: 'high' },
            hdl: { value: 42, unit: 'mg/dL', status: 'low' },
            ldl: { value: 135, unit: 'mg/dL', status: 'high' },
          },
        },
        riskFlags: [
          { type: 'diabetes', severity: 'high', description: 'Blood sugar in diabetic range' },
          { type: 'anemia', severity: 'medium', description: 'Hemoglobin below normal range' },
        ],
      },
      {
        title: 'Lipid Profile & Metabolic Panel',
        reportType: 'blood_test',
        doctorName: 'Dr. Sunita Rao',
        hospitalName: 'Fortis Hospital',
        extractedValues: {
          cholesterol: {
            total: { value: 195, unit: 'mg/dL', status: 'normal' },
            hdl: { value: 52, unit: 'mg/dL', status: 'normal' },
            ldl: { value: 118, unit: 'mg/dL', status: 'high' },
            triglycerides: { value: 165, unit: 'mg/dL', status: 'high' },
          },
          bloodPressure: {
            systolic: { value: 138, unit: 'mmHg', status: 'high' },
            diastolic: { value: 88, unit: 'mmHg', status: 'high' },
          },
        },
        riskFlags: [
          { type: 'heart_disease', severity: 'medium', description: 'Multiple cardiovascular risk factors' },
        ],
      },
      {
        title: 'Annual Health Checkup Report',
        reportType: 'blood_test',
        doctorName: 'Dr. Anil Kumar',
        hospitalName: 'Max Healthcare',
        extractedValues: {
          bloodSugar: {
            fasting: { value: 105, unit: 'mg/dL', status: 'high' },
            postprandial: { value: 148, unit: 'mg/dL', status: 'high' },
          },
          hemoglobin: { value: 12.2, unit: 'g/dL', status: 'normal' },
          creatinine: { value: 0.9, unit: 'mg/dL', status: 'normal' },
        },
        riskFlags: [],
      },
    ];

    for (const rd of reports) {
      const report = await Report.create({
        user: patient._id,
        title: rd.title,
        reportType: rd.reportType,
        reportDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        doctorName: rd.doctorName,
        hospitalName: rd.hospitalName,
        file: {
          url: 'https://res.cloudinary.com/demo/raw/upload/sample.pdf',
          publicId: `postvisit/reports/${patient._id}/report_${Date.now()}`,
          resourceType: 'raw',
          originalName: 'medical_report.pdf',
          mimeType: 'application/pdf',
          size: 245760,
        },
        extractedText: 'Sample extracted text from OCR processing...',
        ocrConfidence: 88,
        extractedValues: rd.extractedValues,
        riskFlags: rd.riskFlags,
        status: 'analyzed',
      });

      const analysis = await Analysis.create({
        report: report._id,
        user: patient._id,
        summary: `Your ${rd.reportType.replace('_', ' ')} has been analyzed. There are ${rd.riskFlags.length > 0 ? 'some values requiring attention' : 'no major concerns'}. Please review the key findings and consult your doctor for personalized advice.`,
        diagnosis: rd.riskFlags.map(r => r.type.replace(/_/g, ' ')).join(', ') || 'No significant abnormalities',
        severity: rd.riskFlags.some(r => r.severity === 'high') ? 'moderate' : 'mild',
        keyFindings: Object.entries(rd.extractedValues || {}).slice(0, 3).map(([key, val]) => ({
          finding: key.replace(/([A-Z])/g, ' $1').trim(),
          value: JSON.stringify(val),
          interpretation: 'See detailed analysis',
          severity: 'normal',
        })),
        recommendations: [
          'Monitor blood sugar levels daily',
          'Follow a low-glycemic diet',
          'Exercise for 30 minutes daily',
          'Stay hydrated — drink 8 glasses of water daily',
          'Schedule a follow-up with your doctor in 3 months',
        ],
        precautions: [
          'Avoid sugary drinks and processed foods',
          'Limit sodium intake to under 1500mg/day',
          'Do not skip medications',
        ],
        dietaryAdvice: [
          'Increase fiber intake — whole grains, vegetables, legumes',
          'Eat more iron-rich foods — spinach, lentils, red meat',
          'Pair iron foods with Vitamin C for better absorption',
        ],
        followUpTests: ['HbA1c in 3 months', 'Lipid profile in 6 months', 'Kidney function test'],
        riskPredictions: rd.riskFlags.map(r => ({
          condition: r.type === 'diabetes' ? 'Type 2 Diabetes' : r.type === 'anemia' ? 'Iron Deficiency Anemia' : 'Cardiovascular Disease',
          riskLevel: r.severity === 'high' ? 'high' : 'moderate',
          probability: r.severity === 'high' ? 72 : 45,
          explanation: r.description,
          preventionTips: ['Regular monitoring', 'Lifestyle changes', 'Medical consultation'],
        })),
        aiProvider: 'mock',
        confidence: 78,
      });

      await Report.findByIdAndUpdate(report._id, { analysis: analysis._id });
    }
    console.log('✅ Created 3 demo reports with AI analysis');

    // ========================
    // Create Medications
    // ========================
    await Medication.insertMany([
      {
        user: patient._id,
        name: 'Metformin 500mg',
        dosage: '500mg',
        frequency: 'twice_daily',
        purpose: 'Blood sugar control',
        prescribedBy: 'Dr. Rahul Mehta',
        isActive: true,
        startDate: new Date('2025-01-01'),
      },
      {
        user: patient._id,
        name: 'Amlodipine 5mg',
        dosage: '5mg',
        frequency: 'once_daily',
        purpose: 'Blood pressure control',
        prescribedBy: 'Dr. Sunita Rao',
        isActive: true,
        startDate: new Date('2025-02-15'),
      },
      {
        user: patient._id,
        name: 'Iron + Folic Acid',
        dosage: '150mg',
        frequency: 'once_daily',
        purpose: 'Anemia treatment',
        prescribedBy: 'Dr. Anil Kumar',
        isActive: true,
        startDate: new Date('2025-03-01'),
      },
    ]);
    console.log('✅ Created 3 medications');

    // ========================
    // Create Notifications
    // ========================
    await Notification.insertMany([
      {
        user: patient._id,
        type: 'report_analyzed',
        title: '📊 Report Analysis Complete',
        message: 'Your Complete Blood Count report has been analyzed. 2 values require attention.',
        isRead: false,
        priority: 'high',
        actionUrl: '/reports',
      },
      {
        user: patient._id,
        type: 'medication_reminder',
        title: '💊 Take Metformin 500mg',
        message: 'Time to take your morning Metformin dose with breakfast.',
        isRead: true,
        priority: 'high',
        scheduledFor: new Date(),
        isDelivered: true,
      },
      {
        user: patient._id,
        type: 'health_alert',
        title: '⚠️ HbA1c Elevated',
        message: 'Your HbA1c level of 7.2% is above normal range. Please consult your doctor.',
        isRead: false,
        priority: 'high',
        actionUrl: '/reports',
      },
      {
        user: patient._id,
        type: 'follow_up',
        title: '🏥 Doctor Follow-up Due',
        message: 'Your scheduled follow-up with Dr. Rahul Mehta is due this week.',
        isRead: false,
        priority: 'medium',
        scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    ]);
    console.log('✅ Created 4 notifications');

    // ========================
    // Summary
    // ========================
    console.log('\n🎉 Database seeded successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Login Credentials:');
    console.log('  📧 Admin:  admin@postvisit.health / Admin@123456');
    console.log('  👤 Demo:   demo@postvisit.health  / Demo@123456');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

seedData();
