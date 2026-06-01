// /**
//  * PDF Report Generation Service (FIXED VERSION)
//  */

// const PDFDocument = require('pdfkit');

// // Brand colors
// const COLORS = {
//   primary: '#1a6b8a',
//   secondary: '#2ecc71',
//   danger: '#e74c3c',
//   warning: '#f39c12',
//   dark: '#2c3e50',
//   gray: '#7f8c8d',
//   lightGray: '#ecf0f1',
//   white: '#ffffff',
// };

// exports.generateReportPDF = async (report, user) => {
//   return new Promise((resolve, reject) => {
//     const doc = new PDFDocument({ margin: 50, size: 'A4' });
//     const buffers = [];

//     doc.on('data', chunk => buffers.push(chunk));
//     doc.on('end', () => resolve(Buffer.concat(buffers)));
//     doc.on('error', reject);

//     // ========================
//     // Header
//     // ========================
//     drawHeader(doc, user, report);

//     // ========================
//     // Patient Info
//     // ========================
//     doc.moveDown();
//     drawSection(doc, 'Patient Information');

//     drawInfoGrid(doc, [
//       ['Name', user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'],
//       ['Email', user.email],
//       ['Date of Birth', user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'N/A'],
//       ['Blood Group', user.bloodGroup || 'N/A'],
//       ['Report Date', new Date(report.reportDate || report.createdAt).toLocaleDateString()],
//       ['Report Type', report.reportType?.replace(/_/g, ' ').toUpperCase() || 'N/A'],
//       ['Hospital', report.hospitalName || 'N/A'],
//       ['Doctor', report.doctorName || 'N/A'],
//     ]);

//     // ========================
//     // AI Summary
//     // ========================
//     if (report.analysis) {
//       doc.moveDown();
//       drawSection(doc, 'AI Health Analysis');

//       const severityColors = {
//         normal: COLORS.secondary,
//         mild: COLORS.warning,
//         moderate: COLORS.warning,
//         severe: COLORS.danger,
//         critical: COLORS.danger
//       };

//       const sColor = severityColors[report.analysis.severity] || COLORS.gray;
//       drawBadge(doc, `Severity: ${(report.analysis.severity || 'N/A').toUpperCase()}`, sColor);

//       doc.moveDown(0.5);

//       doc.fontSize(11).fillColor(COLORS.dark)
//         .text('Summary:')
//         .moveDown(0.2)
//         .fontSize(10)
//         .fillColor('#444')
//         .text(report.analysis.summary || 'No summary available', {
//           align: 'justify',
//           lineGap: 3
//         });
//     }

//     // ========================
//     // Key Findings (FIXED)
//     // ========================
//     if (report.analysis?.keyFindings?.length) {
//       doc.moveDown();
//       drawSection(doc, 'Key Findings');

//       report.analysis.keyFindings.forEach(f => {
//         doc.moveDown(0.5);

//         doc.fontSize(11).fillColor(COLORS.primary)
//           .text(`• ${f.finding}`);

//         doc.fontSize(10).fillColor(COLORS.dark)
//           .text(`Value: ${f.value}`);

//         doc.fillColor(COLORS.gray)
//           .text(`Interpretation: ${f.interpretation}`);
//       });
//     }

//     // ========================
//     // Extracted Values (FIXED)
//     // ========================
//     if (report.extractedValues) {
//       doc.moveDown();
//       drawSection(doc, 'Extracted Medical Values');
//       drawExtractedValues(doc, report.extractedValues);
//     }

//     // ========================
//     // Risk Predictions (FIXED)
//     // ========================
//     if (report.analysis?.riskPredictions?.length) {
//       doc.moveDown();
//       drawSection(doc, 'Health Risk Assessment');

//       report.analysis.riskPredictions.forEach(rp => {
//         const rColor =
//           rp.riskLevel === 'low' ? COLORS.secondary :
//           rp.riskLevel === 'moderate' ? COLORS.warning :
//           COLORS.danger;

//         doc.moveDown(0.5);

//         doc.fontSize(11).fillColor(COLORS.dark)
//           .text(rp.condition);

//         doc.fillColor(rColor)
//           .text(`Risk Level: ${rp.riskLevel?.toUpperCase()} (${rp.probability}%)`);

//         doc.fillColor('#555')
//           .text(rp.explanation);

//         if (rp.preventionTips?.length) {
//           doc.moveDown(0.3);
//           doc.text('Prevention Tips:');

//           rp.preventionTips.slice(0, 3).forEach(tip => {
//             doc.text(`- ${tip}`);
//           });
//         }
//       });
//     }

//     // ========================
//     // Recommendations
//     // ========================
//     if (report.analysis?.recommendations?.length) {
//       doc.moveDown();
//       drawSection(doc, 'Recommendations');

//       report.analysis.recommendations.forEach(r => {
//         doc.text(`• ${r}`);
//       });
//     }

//     // ========================
//     // Precautions
//     // ========================
//     if (report.analysis?.precautions?.length) {
//       doc.moveDown();
//       drawSection(doc, 'Precautions');

//       report.analysis.precautions.forEach(p => {
//         doc.fillColor(COLORS.danger).text(`WARNING: ${p}`);
//       });

//       doc.fillColor(COLORS.dark);
//     }

//     // ========================
//     // Dietary Advice
//     // ========================
//     if (report.analysis?.dietaryAdvice?.length) {
//       doc.moveDown();
//       drawSection(doc, 'Dietary Advice');

//       report.analysis.dietaryAdvice.forEach(d => {
//         doc.fillColor('#2d6a4f').text(`DIET: ${d}`);
//       });

//       doc.fillColor(COLORS.dark);
//     }

//     // ========================
//     // Follow-up Tests
//     // ========================
//     if (report.analysis?.followUpTests?.length) {
//       doc.moveDown();
//       drawSection(doc, 'Recommended Follow-up Tests');

//       report.analysis.followUpTests.forEach(t => {
//         doc.text(`• ${t}`);
//       });
//     }

//     // ========================
//     // Footer
//     // ========================
//     drawFooter(doc);

//     doc.end();
//   });
// };

// // ========================
// // Helpers
// // ========================

// function drawHeader(doc, user, report) {
//   doc.rect(0, 0, doc.page.width, 100).fill(COLORS.primary);

//   doc.fontSize(24).fillColor(COLORS.white).font('Helvetica-Bold')
//     .text('PostVisit', 50, 25);

//   doc.fontSize(12).fillColor('#a8d8ea')
//     .text('AI-Powered Health Intelligence', 50, 55);

//   doc.fontSize(10).fillColor(COLORS.white)
//     .text('Health Report', 400, 25, { align: 'right', width: 145 });

//   doc.fontSize(8).fillColor('#a8d8ea')
//     .text(`Generated: ${new Date().toLocaleDateString()}`, 400, 42, { align: 'right', width: 145 })
//     .text(`Report ID: ${report._id?.toString().slice(-8).toUpperCase()}`, 400, 56, { align: 'right', width: 145 });

//   doc.fillColor(COLORS.dark);
//   doc.y = 115;
// }

// function drawSection(doc, title) {
//   doc.fontSize(13).fillColor(COLORS.primary).font('Helvetica-Bold').text(title);
//   doc.moveTo(doc.x, doc.y + 2)
//     .lineTo(doc.page.width - 50, doc.y + 2)
//     .strokeColor(COLORS.primary)
//     .lineWidth(1.5)
//     .stroke();

//   doc.moveDown(0.5);
//   doc.font('Helvetica').fillColor(COLORS.dark);
// }

// function drawInfoGrid(doc, rows) {
//   const colWidth = 230;
//   let x = doc.x;
//   let y = doc.y;

//   rows.forEach(([label, value], idx) => {
//     const col = idx % 2;
//     const row = Math.floor(idx / 2);

//     const cx = x + col * colWidth;
//     const cy = y + row * 20;

//     doc.fontSize(9).fillColor(COLORS.gray).font('Helvetica-Bold')
//       .text(label + ':', cx, cy, { continued: true });

//     doc.fillColor(COLORS.dark).font('Helvetica')
//       .text(value || 'N/A');
//   });

//   doc.y = y + Math.ceil(rows.length / 2) * 20 + 10;
// }

// function drawBadge(doc, text, color) {
//   const w = text.length * 6.5 + 16;
//   const y = doc.y;

//   doc.roundedRect(doc.x, y, w, 20, 4).fill(color);

//   doc.fillColor(COLORS.white)
//     .fontSize(9)
//     .text(text, doc.x + 8, y + 5);

//   doc.y = y + 28;
// }

// function drawExtractedValues(doc, values) {
//   const pairs = [];

//   if (values.bloodSugar?.fasting?.value)
//     pairs.push(['Fasting Sugar', `${values.bloodSugar.fasting.value} mg/dL`, values.bloodSugar.fasting.status]);

//   if (values.cholesterol?.total?.value)
//     pairs.push(['Total Cholesterol', `${values.cholesterol.total.value} mg/dL`, values.cholesterol.total.status]);

//   pairs.forEach(([name, val, status]) => {
//     const statusColor =
//       status === 'normal' ? COLORS.secondary :
//       status === 'high' ? COLORS.danger :
//       COLORS.warning;

//     const statusText =
//       status === 'normal' ? 'NORMAL' :
//       status === 'high' ? 'HIGH' : 'LOW';

//     doc.moveDown(0.4);

//     doc.text(`${name}: ${val}`);

//     doc.fillColor(statusColor)
//       .text(`Status: ${statusText}`);

//     doc.fillColor(COLORS.dark);
//   });
// }

// function drawFooter(doc) {
//   const y = doc.page.height - 60;

//   doc.rect(0, y, doc.page.width, 60).fill(COLORS.lightGray);

//   doc.fillColor(COLORS.gray).fontSize(8)
//     .text('DISCLAIMER: This report is generated by AI and is for informational purposes only.', 50, y + 15, { align: 'center', width: doc.page.width - 100 })
//     .text('Consult a qualified healthcare professional for medical advice.', 50, y + 30, { align: 'center', width: doc.page.width - 100 });
// }
const PDFDocument = require('pdfkit');

exports.generateReportPDF = async (report, user) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ===== HEADER =====
    doc.rect(0, 0, doc.page.width, 80).fill('#1a6b8a');

    doc.fillColor('white')
      .fontSize(20)
      .text('PostVisit Health Report', 50, 30);

    doc.moveDown(3);

    // ===== USER INFO =====
    sectionTitle(doc, 'Patient Information');

    doc.fontSize(11).fillColor('black');
    doc.text(`Name: ${user.name || user.firstName || 'N/A'}`);
    doc.text(`Email: ${user.email}`);
    doc.text(`Report Type: ${report.reportType}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);

    doc.moveDown();

    // ===== SUMMARY =====
    if (report.analysis?.summary) {
      sectionTitle(doc, 'AI Summary');

      doc.text(clean(report.analysis.summary), {
        lineGap: 3
      });

      doc.moveDown();
    }

    // ===== KEY FINDINGS =====
    if (report.analysis?.keyFindings?.length) {
      sectionTitle(doc, 'Key Findings');

      report.analysis.keyFindings.forEach(f => {
        doc.text(`• ${clean(f.finding)}`);
        doc.text(`  Value: ${clean(f.value)}`);
        doc.text(`  Note: ${clean(f.interpretation)}`);
        doc.moveDown(0.5);
      });
    }

    // ===== TABLE (EXTRACTED VALUES) =====
    if (report.extractedValues) {
      sectionTitle(doc, 'Medical Values');

      const rows = [];

      if (report.extractedValues.bloodSugar?.fasting)
        rows.push(['Fasting Sugar', report.extractedValues.bloodSugar.fasting.value, report.extractedValues.bloodSugar.fasting.status]);

      if (report.extractedValues.cholesterol?.total)
        rows.push(['Cholesterol', report.extractedValues.cholesterol.total.value, report.extractedValues.cholesterol.total.status]);

      drawTable(doc, ['Metric', 'Value', 'Status'], rows);
      doc.moveDown();
    }

    // ===== RISK =====
    if (report.analysis?.riskPredictions?.length) {
      sectionTitle(doc, 'Risk Assessment');

      report.analysis.riskPredictions.forEach(r => {
        doc.text(`${clean(r.condition)}`);
        doc.text(`Risk: ${r.riskLevel} (${r.probability}%)`);
        doc.text(clean(r.explanation));
        doc.moveDown(0.5);
      });
    }

    // ===== RECOMMENDATIONS =====
    if (report.analysis?.recommendations?.length) {
      sectionTitle(doc, 'Recommendations');

      report.analysis.recommendations.forEach(r => {
        doc.text(`• ${clean(r)}`);
      });

      doc.moveDown();
    }

    // ===== FOOTER =====
    doc.moveDown(2);
    doc.fontSize(9).fillColor('gray')
      .text('DISCLAIMER: AI-generated report. Consult a doctor.', { align: 'center' });

    doc.end();
  });
};

exports.generateHealthSummaryPDF = async (summary) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.rect(0, 0, doc.page.width, 84).fill('#1a6b8a');
    doc.fillColor('white').fontSize(20).text('PostVisit Full Health Summary', 50, 30);
    doc.fontSize(9).text(`Generated: ${new Date(summary.generatedAt || Date.now()).toLocaleString()}`, 50, 56);
    doc.moveDown(3);

    const profile = summary.profile || {};
    sectionTitle(doc, 'Profile');
    drawTable(doc, ['Field', 'Value'], [
      ['Name', profile.fullName || 'N/A'],
      ['Age/Gender', `${profile.age || 'N/A'} / ${profile.gender || 'N/A'}`],
      ['Blood Group', profile.bloodGroup || 'N/A'],
      ['Phone', profile.phone || 'N/A'],
      ['Allergies', (profile.allergies || []).join(', ') || 'None recorded'],
      ['Chronic Conditions', (profile.chronicConditions || []).join(', ') || 'None recorded'],
      ['Emergency Contact', profile.emergencyContact?.name ? `${profile.emergencyContact.name} (${profile.emergencyContact.phone || 'N/A'})` : 'N/A'],
    ]);

    writeSectionList(doc, 'Latest Reports', (summary.latestReports || []).map(report => (
      `${report.title} - ${report.status} - ${report.summary || 'No summary available'}`
    )));

    writeSectionList(doc, 'Visual Alerts', (summary.risks?.alerts || []).map(alert => (
      `${alert.label}: ${alert.value} ${alert.unit} (${alert.status}; normal ${alert.normalRange})`
    )));

    sectionTitle(doc, 'Trend Comparison');
    drawTable(doc, ['Metric', 'Latest', 'Normal'], (summary.trends || []).slice(0, 12).map(trend => [
      trend.label,
      `${trend.latest?.value ?? 'N/A'} ${trend.unit || ''}`,
      trend.normalRange || 'N/A',
    ]));

    sectionTitle(doc, 'Risk Score History');
    drawTable(doc, ['Date', 'Score', 'Level'], (summary.risks?.history || []).slice(-10).map(point => [
      point.date ? new Date(point.date).toLocaleDateString() : 'N/A',
      point.score,
      point.level,
    ]));

    writeSectionList(doc, 'Health Goals', (summary.goals || []).map(goal => (
      `${goal.title}: current ${goal.currentValue ?? 'N/A'} ${goal.unit}, target ${goal.operator === 'gte' ? '>=' : '<='} ${goal.targetValue} ${goal.unit} (${goal.achieved ? 'achieved' : 'in progress'})`
    )));

    writeSectionList(doc, 'Recommendations', summary.recommendations || []);

    doc.moveDown(2);
    doc.fontSize(9).fillColor('gray')
      .text('DISCLAIMER: This summary is generated for informational purposes only. Consult a qualified healthcare professional for medical advice.', { align: 'center' });

    doc.end();
  });
};



// ===== HELPER FUNCTIONS =====

function sectionTitle(doc, title) {
  doc.fontSize(14)
    .fillColor('#1a6b8a')
    .text(title);

  doc.moveTo(doc.x, doc.y + 2)
    .lineTo(doc.page.width - 50, doc.y + 2)
    .stroke();

  doc.moveDown(0.5);
}

function drawTable(doc, headers, rows) {
  const startX = 50;
  let y = doc.y;

  if (!rows.length) {
    doc.font('Helvetica').fillColor('black').text('No data available.');
    doc.moveDown();
    return;
  }

  doc.font('Helvetica-Bold');
  headers.forEach((h, i) => {
    doc.text(h, startX + i * 150, y);
  });

  doc.moveDown(0.5);
  doc.font('Helvetica');

  rows.forEach(row => {
    y = doc.y;
    row.forEach((cell, i) => {
      doc.text(String(cell), startX + i * 150, y);
    });
    doc.moveDown();
  });
}

function clean(text) {
  if (!text) return '';
  return text.replace(/[^\x20-\x7E]/g, '').trim();
}

function writeSectionList(doc, title, rows) {
  sectionTitle(doc, title);
  if (!rows || rows.length === 0) {
    doc.font('Helvetica').fillColor('black').text('No data available.');
    doc.moveDown();
    return;
  }

  rows.slice(0, 12).forEach(row => {
    if (doc.y > doc.page.height - 90) doc.addPage();
    doc.font('Helvetica').fontSize(10).fillColor('black').text(`- ${clean(row)}`, {
      lineGap: 2,
    });
  });
  doc.moveDown();
}
