const PDFDocument = require('pdfkit');

const COLORS = {
  primary: '#1a6b8a',
  primaryDark: '#0d4f6a',
  secondary: '#2ecc71',
  warning: '#f39c12',
  danger: '#e74c3c',
  info: '#3498db',
  ink: '#1a2332',
  muted: '#5a6a7d',
  lightText: '#8a9bb0',
  border: '#dce4ef',
  panel: '#f4f8fc',
  white: '#ffffff',
};

exports.generateReportPDF = async (report, user) => {
  return createPdf((doc) => {
    drawHero(doc, {
      title: 'PostVisit Health Report',
      subtitle: clean(report.title || 'Medical Report'),
      meta: `Generated ${formatDate(new Date())}`,
    });

    drawSection(doc, 'Patient and Report Details');
    drawInfoGrid(doc, [
      ['Patient', user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'],
      ['Email', user.email || 'N/A'],
      ['Blood Group', user.bloodGroup || 'N/A'],
      ['Report Type', titleCase(report.reportType || 'report')],
      ['Report Date', formatDate(report.reportDate || report.createdAt)],
      ['Doctor', report.doctorName || 'N/A'],
      ['Hospital', report.hospitalName || 'N/A'],
      ['Status', titleCase(report.status || 'uploaded')],
    ]);

    if (report.analysis?.summary) {
      drawSection(doc, 'AI Health Summary');
      drawCallout(doc, clean(report.analysis.summary), statusColor(report.analysis.severity));
    }

    if (report.analysis?.diagnosis) {
      drawSection(doc, 'Key Findings Summary');
      drawCallout(doc, clean(report.analysis.diagnosis), COLORS.primary);
    }

    const values = flattenExtractedValues(report.extractedValues);
    if (values.length) {
      drawSection(doc, 'Extracted Medical Values');
      drawMedicalValueTable(doc, values);
    }

    if (report.analysis?.keyFindings?.length) {
      drawSection(doc, 'Detailed Findings');
      report.analysis.keyFindings.slice(0, 12).forEach((finding) => {
        drawFinding(doc, {
          title: finding.finding,
          value: finding.value,
          note: finding.interpretation,
          status: finding.severity,
        });
      });
    }

    if (report.analysis?.riskPredictions?.length) {
      drawSection(doc, 'Risk Assessment');
      report.analysis.riskPredictions.slice(0, 8).forEach((risk) => {
        drawFinding(doc, {
          title: risk.condition,
          value: `${titleCase(risk.riskLevel || 'risk')} risk${risk.probability ? ` (${risk.probability}%)` : ''}`,
          note: risk.explanation,
          status: risk.riskLevel,
        });
      });
    }

    drawTwoColumnLists(doc, 'Care Guidance', [
      ['Recommendations', report.analysis?.recommendations || []],
      ['Precautions', report.analysis?.precautions || []],
      ['Dietary Advice', report.analysis?.dietaryAdvice || []],
      ['Follow-up Tests', report.analysis?.followUpTests || []],
    ]);

    drawDisclaimer(doc);
  });
};

exports.generateHealthSummaryPDF = async (summary) => {
  return createPdf((doc) => {
    drawHero(doc, {
      title: 'PostVisit Full Health Summary',
      subtitle: summary.profile?.fullName || 'Patient Health Overview',
      meta: `Generated ${formatDate(summary.generatedAt || new Date())}`,
    });

    const profile = summary.profile || {};
    drawSection(doc, 'Emergency Health Card');
    drawInfoGrid(doc, [
      ['Name', profile.fullName || 'N/A'],
      ['Age / Gender', `${profile.age || 'N/A'} / ${profile.gender || 'N/A'}`],
      ['Blood Group', profile.bloodGroup || 'N/A'],
      ['Phone', profile.phone || 'N/A'],
      ['Allergies', (profile.allergies || []).join(', ') || 'None recorded'],
      ['Chronic Conditions', (profile.chronicConditions || []).join(', ') || 'None recorded'],
      ['Emergency Contact', profile.emergencyContact?.name || 'N/A'],
      ['Emergency Phone', profile.emergencyContact?.phone || 'N/A'],
    ]);

    drawSection(doc, 'Health Snapshot');
    drawSnapshotCards(doc, [
      ['Latest Risk Score', `${summary.risks?.latestScore || 0}/100`, riskScoreColor(summary.risks?.latestScore || 0)],
      ['Active Alerts', String(summary.risks?.alerts?.length || 0), COLORS.danger],
      ['Tracked Goals', String(summary.goals?.length || 0), COLORS.primary],
      ['Recent Reports', String(summary.latestReports?.length || 0), COLORS.info],
    ]);

    if (summary.latestReports?.length) {
      drawSection(doc, 'Latest Reports');
      summary.latestReports.slice(0, 6).forEach((report) => {
        drawFinding(doc, {
          title: report.title,
          value: `${titleCase(report.reportType || 'report')} - ${titleCase(report.status || '')}`,
          note: report.summary || 'No summary available',
          status: report.severity,
        });
      });
    }

    if (summary.risks?.alerts?.length) {
      drawSection(doc, 'Current Visual Alerts');
      drawMedicalValueTable(doc, summary.risks.alerts.slice(0, 10).map((alert) => ({
        label: alert.label,
        value: alert.value,
        unit: alert.unit,
        status: alert.status,
        range: alert.normalRange,
      })));
    }

    if (summary.trends?.length) {
      drawSection(doc, 'Trend Comparison');
      drawMedicalValueTable(doc, summary.trends.slice(0, 12).map((trend) => ({
        label: trend.label,
        value: trend.latest?.value ?? 'N/A',
        unit: trend.unit,
        status: trend.status,
        range: trend.normalRange,
      })));
    }

    if (summary.risks?.history?.length) {
      drawSection(doc, 'Risk Score History');
      drawTable(doc, ['Date', 'Score', 'Level'], summary.risks.history.slice(-10).map((point) => [
        formatDate(point.date),
        point.score,
        titleCase(point.level),
      ]), [160, 120, 160]);
    }

    if (summary.goals?.length) {
      drawSection(doc, 'Health Goals');
      summary.goals.slice(0, 10).forEach((goal) => {
        drawFinding(doc, {
          title: goal.title,
          value: `${goal.metricLabel}: ${goal.currentValue ?? 'N/A'} ${goal.unit || ''}`,
          note: `Target ${goal.operator === 'gte' ? '>=' : '<='} ${goal.targetValue} ${goal.unit || ''}`,
          status: goal.achieved ? 'normal' : 'mild',
        });
      });
    }

    drawTwoColumnLists(doc, 'Recommendations', [
      ['Recommended Actions', summary.recommendations || []],
      ['Upcoming Reminders', (summary.reminders || []).map((item) => item.title || item.message)],
    ]);

    drawDisclaimer(doc);
  });
};

function createPdf(draw) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 42, size: 'A4', bufferPages: true });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    draw(doc);
    addPageNumbers(doc);
    doc.end();
  });
}

function drawHero(doc, { title, subtitle, meta }) {
  doc.rect(0, 0, doc.page.width, 112).fill(COLORS.primaryDark);
  doc.rect(0, 0, doc.page.width, 112).fillOpacity(0.9).fill(COLORS.primary).fillOpacity(1);

  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(23).text(title, 42, 28, { width: 340 });
  doc.font('Helvetica').fontSize(10).fillColor('#d8edf5').text('AI-powered health intelligence', 42, 58);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.white).text(subtitle || '', 42, 80, { width: 360 });
  doc.font('Helvetica').fontSize(9).fillColor('#d8edf5').text(meta || '', 410, 34, { width: 140, align: 'right' });

  doc.y = 138;
  doc.fillColor(COLORS.ink);
}

function drawSection(doc, title) {
  ensureSpace(doc, 70);
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.ink).text(title);
  doc.moveTo(42, doc.y + 5).lineTo(doc.page.width - 42, doc.y + 5).strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.moveDown(0.9);
}

function drawInfoGrid(doc, rows) {
  const startX = 42;
  const colW = 255;
  const rowH = 42;
  let startY = doc.y;

  rows.forEach(([label, value], index) => {
    ensureSpace(doc, rowH + 20);
    const col = index % 2;
    if (index > 0 && col === 0) startY = doc.y;
    const x = startX + col * colW;
    const y = startY;

    doc.roundedRect(x, y, colW - 12, 34, 6).fillAndStroke(COLORS.panel, COLORS.border);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted).text(String(label).toUpperCase(), x + 10, y + 7, { width: colW - 32 });
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.ink).text(clean(value), x + 10, y + 18, { width: colW - 32, ellipsis: true });

    if (col === 1 || index === rows.length - 1) doc.y = y + rowH;
  });

  doc.moveDown(0.2);
}

function drawSnapshotCards(doc, cards) {
  const w = 120;
  const gap = 10;
  const y = doc.y;

  cards.forEach(([label, value, color], index) => {
    const x = 42 + index * (w + gap);
    doc.roundedRect(x, y, w, 66, 8).fillAndStroke(COLORS.panel, COLORS.border);
    doc.rect(x, y, 5, 66).fill(color);
    doc.font('Helvetica-Bold').fontSize(18).fillColor(color).text(value, x + 15, y + 14, { width: w - 24 });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(label, x + 15, y + 40, { width: w - 24 });
  });

  doc.y = y + 84;
}

function drawCallout(doc, text, color = COLORS.primary) {
  ensureSpace(doc, 90);
  const y = doc.y;
  const h = Math.max(58, doc.heightOfString(clean(text), { width: 455, lineGap: 4 }) + 26);
  doc.roundedRect(42, y, doc.page.width - 84, h, 8).fillAndStroke(COLORS.panel, COLORS.border);
  doc.rect(42, y, 5, h).fill(color);
  doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.ink).text(clean(text), 58, y + 14, { width: 455, lineGap: 4 });
  doc.y = y + h + 10;
}

function drawMedicalValueTable(doc, values) {
  drawTable(doc, ['Metric', 'Value', 'Normal Range', 'Status'], values.map((item) => [
    item.label,
    `${item.value ?? 'N/A'} ${item.unit || ''}`.trim(),
    item.range || item.normalRange || 'N/A',
    titleCase(item.status || 'unknown'),
  ]), [175, 95, 150, 85], true);
}

function drawTable(doc, headers, rows, widths, colorStatus = false) {
  if (!rows || rows.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('No data available.');
    doc.moveDown();
    return;
  }

  const x = 42;
  const rowH = 28;
  drawTableHeader(doc, headers, widths, x);

  rows.forEach((row) => {
    ensureSpace(doc, rowH + 20);
    const y = doc.y;
    doc.rect(x, y, widths.reduce((sum, w) => sum + w, 0), rowH).fillAndStroke(COLORS.white, COLORS.border);

    row.forEach((cell, index) => {
      const cellX = x + widths.slice(0, index).reduce((sum, w) => sum + w, 0);
      if (colorStatus && index === row.length - 1) {
        drawStatusPill(doc, String(cell), cellX + 8, y + 7);
      } else {
        doc.font('Helvetica').fontSize(9).fillColor(index === 0 ? COLORS.ink : COLORS.muted)
          .text(clean(cell), cellX + 8, y + 8, { width: widths[index] - 16, ellipsis: true });
      }
    });

    doc.y = y + rowH;
  });
  doc.moveDown(0.8);
}

function drawTableHeader(doc, headers, widths, x) {
  ensureSpace(doc, 70);
  const y = doc.y;
  doc.rect(x, y, widths.reduce((sum, w) => sum + w, 0), 28).fill(COLORS.primary);
  headers.forEach((header, index) => {
    const cellX = x + widths.slice(0, index).reduce((sum, w) => sum + w, 0);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.white).text(String(header).toUpperCase(), cellX + 8, y + 9, { width: widths[index] - 16 });
  });
  doc.y = y + 28;
}

function drawFinding(doc, { title, value, note, status }) {
  ensureSpace(doc, 70);
  const y = doc.y;
  const textHeight = doc.heightOfString(clean(note || ''), { width: 390, lineGap: 3 });
  const h = Math.max(56, textHeight + 34);
  const color = statusColor(status);

  doc.roundedRect(42, y, doc.page.width - 84, h, 7).fillAndStroke(COLORS.white, COLORS.border);
  doc.circle(56, y + 18, 4).fill(color);
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.ink).text(clean(title), 68, y + 10, { width: 305 });
  if (value) doc.font('Helvetica-Bold').fontSize(9).fillColor(color).text(clean(value), 386, y + 11, { width: 130, align: 'right' });
  if (note) doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(clean(note), 68, y + 28, { width: 448, lineGap: 3 });
  doc.y = y + h + 8;
}

function drawTwoColumnLists(doc, title, groups) {
  const populated = groups.filter(([, items]) => items && items.length);
  if (!populated.length) return;

  drawSection(doc, title);
  populated.forEach(([heading, items]) => {
    ensureSpace(doc, 58);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary).text(heading);
    doc.moveDown(0.2);
    items.slice(0, 8).forEach((item) => {
      ensureSpace(doc, 22);
      doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.ink).text(`- ${clean(item)}`, { width: 500, lineGap: 2 });
    });
    doc.moveDown(0.5);
  });
}

function drawStatusPill(doc, status, x, y) {
  const normalized = status.toLowerCase();
  const color = statusColor(normalized);
  doc.roundedRect(x, y, 64, 15, 7).fill(color);
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.white).text(status.toUpperCase(), x, y + 4, { width: 64, align: 'center' });
}

function drawDisclaimer(doc) {
  ensureSpace(doc, 70);
  doc.moveDown(0.8);
  doc.roundedRect(42, doc.y, doc.page.width - 84, 46, 7).fillAndStroke('#fff8e6', '#f39c12');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#8a5800').text('Medical disclaimer', 56, doc.y + 10);
  doc.font('Helvetica').fontSize(8.5).fillColor('#8a5800')
    .text('This PDF is generated by PostVisit for informational purposes only. Always consult a qualified healthcare professional for diagnosis, treatment, and medication decisions.', 56, doc.y + 22, { width: 470 });
}

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.lightText)
      .text(`Page ${i + 1} of ${range.count}`, 42, doc.page.height - 32, { width: doc.page.width - 84, align: 'right' });
  }
}

function ensureSpace(doc, height) {
  if (doc.y + height > doc.page.height - 58) {
    doc.addPage();
    doc.y = 48;
  }
}

function flattenExtractedValues(values = {}) {
  const rows = [];
  const add = (label, obj, unit, range) => {
    if (obj && obj.value !== undefined && obj.value !== null) {
      rows.push({ label, value: obj.value, unit: obj.unit || unit || '', status: obj.status || 'normal', range });
    }
  };

  add('Fasting Blood Sugar', values.bloodSugar?.fasting, 'mg/dL', '70-99 mg/dL');
  add('Postprandial Blood Sugar', values.bloodSugar?.postprandial, 'mg/dL', '70-140 mg/dL');
  add('HbA1c', values.bloodSugar?.hba1c, '%', '4-5.6 %');
  add('Total Cholesterol', values.cholesterol?.total, 'mg/dL', '0-199 mg/dL');
  add('HDL Cholesterol', values.cholesterol?.hdl, 'mg/dL', '>= 40 mg/dL');
  add('LDL Cholesterol', values.cholesterol?.ldl, 'mg/dL', '0-99 mg/dL');
  add('Triglycerides', values.cholesterol?.triglycerides, 'mg/dL', '0-149 mg/dL');
  add('Blood Pressure Systolic', values.bloodPressure?.systolic, 'mmHg', '90-120 mmHg');
  add('Blood Pressure Diastolic', values.bloodPressure?.diastolic, 'mmHg', '60-80 mmHg');
  add('Hemoglobin', values.hemoglobin, 'g/dL', '12-17.5 g/dL');
  add('Creatinine', values.creatinine, 'mg/dL', '0.6-1.2 mg/dL');
  add('Uric Acid', values.uricAcid, 'mg/dL', '3.5-7.2 mg/dL');
  add('WBC', values.wbc, '/uL', '4000-10000 /uL');
  add('RBC', values.rbc, 'million/uL', '4.2-5.9 million/uL');
  add('Platelets', values.platelets, '/uL', '150000-410000 /uL');
  add('BMI', values.bmi, 'kg/m2', '18.5-24.9 kg/m2');
  add('ALT', values.alt, 'U/L', '0-50 U/L');
  add('AST', values.ast, 'U/L', '0-50 U/L');
  add('Alkaline Phosphatase', values.alkalinePhosphatase, 'U/L', '43-115 U/L');
  add('TSH', values.tsh, 'uIU/mL', '0.48-4.17 uIU/mL');

  return rows;
}

function statusColor(status) {
  const normalized = String(status || '').toLowerCase();
  if (['critical', 'severe', 'high', 'very_high'].includes(normalized)) return COLORS.danger;
  if (['moderate', 'mild', 'low', 'warning'].includes(normalized)) return COLORS.warning;
  if (['normal', 'success', 'achieved'].includes(normalized)) return COLORS.secondary;
  return COLORS.primary;
}

function riskScoreColor(score) {
  if (score >= 70) return COLORS.danger;
  if (score >= 35) return COLORS.warning;
  if (score > 0) return COLORS.info;
  return COLORS.secondary;
}

function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
}

function titleCase(value) {
  return clean(value)
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function clean(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '').trim();
}
