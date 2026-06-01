const moment = require('moment');

const METRIC_CONFIG = {
  bloodSugarFasting: {
    label: 'Fasting Blood Sugar',
    unit: 'mg/dL',
    min: 70,
    max: 99,
    lowText: 'Fasting sugar is below the usual range and may indicate hypoglycemia.',
    highText: 'Fasting sugar is above the usual range and may suggest prediabetes or diabetes risk.',
    action: 'Discuss repeat glucose testing or HbA1c with your doctor.',
  },
  bloodSugarPostprandial: {
    label: 'Postprandial Blood Sugar',
    unit: 'mg/dL',
    min: 70,
    max: 140,
    lowText: 'Post-meal sugar is below the usual range.',
    highText: 'Post-meal sugar is above the usual range and may show poor glucose control.',
    action: 'Track meals and ask your doctor if further sugar monitoring is needed.',
  },
  hba1c: {
    label: 'HbA1c',
    unit: '%',
    min: 4.0,
    max: 5.6,
    lowText: 'HbA1c is below the usual reference range.',
    highText: 'HbA1c is high, which means average blood sugar has been elevated over recent months.',
    action: 'Review long-term sugar control with your clinician.',
  },
  hemoglobin: {
    label: 'Hemoglobin',
    unit: 'g/dL',
    min: 12.0,
    max: 17.5,
    lowText: 'Hemoglobin is low and may suggest anemia or iron/B12 deficiency.',
    highText: 'Hemoglobin is above the usual range and may need evaluation if persistent.',
    action: 'Ask about CBC review and iron, ferritin, B12, or folate testing.',
  },
  cholesterolTotal: {
    label: 'Total Cholesterol',
    unit: 'mg/dL',
    min: 0,
    max: 199,
    highText: 'Total cholesterol is high and may increase cardiovascular risk.',
    action: 'Consider lipid follow-up, diet review, and activity planning.',
  },
  cholesterolHDL: {
    label: 'HDL Cholesterol',
    unit: 'mg/dL',
    min: 40,
    max: 999,
    lowText: 'HDL is low. HDL is generally considered protective for heart health.',
    action: 'Regular aerobic exercise and smoking avoidance can help improve HDL.',
  },
  cholesterolLDL: {
    label: 'LDL Cholesterol',
    unit: 'mg/dL',
    min: 0,
    max: 99,
    highText: 'LDL is high. LDL is a key marker linked with heart and blood vessel risk.',
    action: 'Discuss an LDL target, dietary changes, and medication need with your doctor.',
  },
  triglycerides: {
    label: 'Triglycerides',
    unit: 'mg/dL',
    min: 0,
    max: 149,
    highText: 'Triglycerides are high and are often affected by sugar, refined carbs, alcohol, and weight.',
    action: 'Reduce refined carbohydrates and repeat a fasting lipid profile as advised.',
  },
  bloodPressureSystolic: {
    label: 'Systolic Blood Pressure',
    unit: 'mmHg',
    min: 90,
    max: 120,
    lowText: 'Systolic blood pressure is below the usual range.',
    highText: 'Systolic blood pressure is above the usual range.',
    action: 'Track home BP readings and review them with your doctor.',
  },
  bloodPressureDiastolic: {
    label: 'Diastolic Blood Pressure',
    unit: 'mmHg',
    min: 60,
    max: 80,
    lowText: 'Diastolic blood pressure is below the usual range.',
    highText: 'Diastolic blood pressure is above the usual range.',
    action: 'Track home BP readings and review them with your doctor.',
  },
  creatinine: {
    label: 'Creatinine',
    unit: 'mg/dL',
    min: 0.6,
    max: 1.2,
    lowText: 'Creatinine is below the usual range and may relate to low muscle mass.',
    highText: 'Creatinine is high and can indicate reduced kidney filtration or dehydration.',
    action: 'Review kidney function, eGFR, hydration, and medication use with your doctor.',
  },
  uricAcid: {
    label: 'Uric Acid',
    unit: 'mg/dL',
    min: 3.5,
    max: 7.2,
    highText: 'Uric acid is high and may increase gout or kidney stone risk.',
    action: 'Review hydration, purine intake, and symptoms such as joint pain.',
  },
  wbc: {
    label: 'WBC Count',
    unit: '/uL',
    min: 4000,
    max: 10000,
    lowText: 'WBC count is low and can affect infection response.',
    highText: 'WBC count is high and may indicate infection, inflammation, or stress response.',
    action: 'Discuss CBC interpretation with a clinician, especially if symptoms are present.',
  },
  rbc: {
    label: 'RBC Count',
    unit: 'million/uL',
    min: 4.2,
    max: 5.9,
    lowText: 'RBC count is low and may align with anemia.',
    highText: 'RBC count is above the usual range.',
    action: 'Review the complete blood count trend with your doctor.',
  },
  platelets: {
    label: 'Platelets',
    unit: '/uL',
    min: 150000,
    max: 410000,
    lowText: 'Platelets are low and can affect clotting.',
    highText: 'Platelets are high and may reflect inflammation or other conditions.',
    action: 'Repeat CBC or seek medical review based on symptoms and trend.',
  },
  bmi: {
    label: 'BMI',
    unit: 'kg/m2',
    min: 18.5,
    max: 24.9,
    lowText: 'BMI is below the usual healthy range.',
    highText: 'BMI is above the usual healthy range.',
    action: 'Set a sustainable nutrition and activity plan with professional guidance.',
  },
  heartRate: {
    label: 'Heart Rate',
    unit: 'bpm',
    min: 60,
    max: 100,
    lowText: 'Heart rate is below the typical resting range.',
    highText: 'Heart rate is above the typical resting range.',
    action: 'Review symptoms, fitness level, medications, and repeat readings.',
  },
  oxygenSaturation: {
    label: 'Oxygen Saturation',
    unit: '%',
    min: 95,
    max: 100,
    lowText: 'Oxygen saturation is below the expected range.',
    action: 'Seek urgent care if this is persistent or accompanied by breathlessness.',
  },
  temperature: {
    label: 'Temperature',
    unit: 'F',
    min: 97,
    max: 99,
    lowText: 'Temperature is below the usual range.',
    highText: 'Temperature is above the usual range and may indicate fever.',
    action: 'Monitor symptoms and seek medical advice if fever persists.',
  },
  alt: {
    label: 'ALT',
    unit: 'U/L',
    min: 0,
    max: 50,
    highText: 'ALT is high and may suggest liver cell irritation or injury.',
    action: 'Avoid alcohol and unnecessary medication until reviewed by a doctor.',
  },
  ast: {
    label: 'AST',
    unit: 'U/L',
    min: 0,
    max: 50,
    highText: 'AST is high and can rise with liver or muscle stress.',
    action: 'Review liver enzymes with your doctor, especially if ALT is also high.',
  },
  alkalinePhosphatase: {
    label: 'Alkaline Phosphatase',
    unit: 'U/L',
    min: 43,
    max: 115,
    highText: 'Alkaline phosphatase is high and can relate to liver, bile duct, or bone sources.',
    action: 'Ask whether GGT, bilirubin, or repeat testing is needed.',
  },
  tsh: {
    label: 'TSH',
    unit: 'uIU/mL',
    min: 0.48,
    max: 4.17,
    lowText: 'TSH is low and may indicate overactive thyroid pattern.',
    highText: 'TSH is high and may indicate underactive thyroid pattern.',
    action: 'Review thyroid results with T3/T4 and symptoms.',
  },
};

const REPORT_VALUE_MAP = [
  ['bloodSugarFasting', ['bloodSugar', 'fasting']],
  ['bloodSugarPostprandial', ['bloodSugar', 'postprandial']],
  ['hba1c', ['bloodSugar', 'hba1c']],
  ['cholesterolTotal', ['cholesterol', 'total']],
  ['cholesterolHDL', ['cholesterol', 'hdl']],
  ['cholesterolLDL', ['cholesterol', 'ldl']],
  ['triglycerides', ['cholesterol', 'triglycerides']],
  ['bloodPressureSystolic', ['bloodPressure', 'systolic']],
  ['bloodPressureDiastolic', ['bloodPressure', 'diastolic']],
  ['hemoglobin', ['hemoglobin']],
  ['wbc', ['wbc']],
  ['rbc', ['rbc']],
  ['platelets', ['platelets']],
  ['creatinine', ['creatinine']],
  ['uricAcid', ['uricAcid']],
  ['bmi', ['bmi']],
  ['alt', ['alt']],
  ['ast', ['ast']],
  ['alkalinePhosphatase', ['alkalinePhosphatase']],
  ['tsh', ['tsh']],
];

const GOAL_METRICS = Object.keys(METRIC_CONFIG);

function formatDate(date) {
  return date ? moment(date).format('YYYY-MM-DD') : null;
}

function getByPath(source, path) {
  return path.reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), source);
}

function normalRangeText(config) {
  if (config.min !== undefined && config.max !== undefined && config.max < 900) {
    return `${config.min}-${config.max} ${config.unit}`;
  }
  if (config.min !== undefined && config.max !== undefined && config.max >= 900) {
    return `>= ${config.min} ${config.unit}`;
  }
  if (config.min !== undefined) return `>= ${config.min} ${config.unit}`;
  if (config.max !== undefined) return `<= ${config.max} ${config.unit}`;
  return 'Reference range unavailable';
}

function statusForValue(key, value, explicitStatus) {
  const config = METRIC_CONFIG[key];
  const numeric = Number(value);
  if (!config || Number.isNaN(numeric)) {
    return explicitStatus || 'unknown';
  }
  if (explicitStatus && ['low', 'high', 'critical'].includes(String(explicitStatus).toLowerCase())) {
    return String(explicitStatus).toLowerCase();
  }
  if (config.min !== undefined && numeric < config.min) return 'low';
  if (config.max !== undefined && numeric > config.max) return 'high';
  return 'normal';
}

function extractReportValues(report) {
  const values = report?.extractedValues || {};
  return REPORT_VALUE_MAP.map(([key, path]) => {
    const raw = getByPath(values, path);
    if (!raw || raw.value === undefined || raw.value === null) return null;
    const config = METRIC_CONFIG[key] || {};
    const status = statusForValue(key, raw.value, raw.status);
    return {
      key,
      label: config.label || key,
      value: raw.value,
      unit: raw.unit || config.unit || '',
      status,
      normalRange: normalRangeText(config),
      reportId: report?._id,
      reportTitle: report?.title,
      date: report?.reportDate || report?.createdAt,
    };
  }).filter(Boolean);
}

function extractMetricValues(metric) {
  if (!metric) return [];
  return Object.entries(METRIC_CONFIG)
    .filter(([key]) => metric[key] !== undefined && metric[key] !== null)
    .map(([key, config]) => {
      const value = Number(metric[key]);
      return {
        key,
        label: config.label,
        value,
        unit: config.unit,
        status: statusForValue(key, value),
        normalRange: normalRangeText(config),
        date: metric.date,
        reportId: metric.report,
      };
    });
}

function buildAbnormalExplanationCards(report) {
  return extractReportValues(report)
    .filter(item => ['low', 'high', 'critical'].includes(item.status))
    .map(item => {
      const config = METRIC_CONFIG[item.key] || {};
      const explanation = item.status === 'low'
        ? (config.lowText || `${item.label} is below the usual reference range.`)
        : (config.highText || `${item.label} is above the usual reference range.`);

      return {
        ...item,
        explanation,
        action: config.action || 'Review this value with a qualified healthcare professional.',
      };
    });
}

function buildLifestylePlan(report, user = {}) {
  const abnormal = buildAbnormalExplanationCards(report);
  const has = key => abnormal.some(item => item.key === key);
  const hasAny = keys => keys.some(has);

  const diet = [
    'Prioritize vegetables, whole grains, lean protein, fruit, and adequate water.',
    'Reduce fried foods, packaged snacks, sugary drinks, and highly processed meals.',
  ];
  const exercise = [
    'Aim for 150 minutes per week of moderate walking, cycling, or swimming if medically cleared.',
    'Add two light strength-training sessions per week for muscle and metabolic health.',
  ];
  const sleep = [
    'Keep a consistent sleep schedule with 7-8 hours of sleep where possible.',
    'Avoid heavy meals and screens close to bedtime if sleep quality is poor.',
  ];
  const followUp = [
    'Share abnormal results and trends with a doctor before changing medication or treatment.',
  ];

  if (hasAny(['cholesterolLDL', 'cholesterolTotal', 'triglycerides', 'cholesterolHDL'])) {
    diet.push('For lipid control, increase soluble fiber such as oats, beans, lentils, and fruits.');
    diet.push('Limit saturated fat from butter, full-fat dairy, and fatty meat.');
    exercise.push('Use brisk walking or other aerobic exercise to support LDL and HDL improvement.');
    followUp.push('Repeat a fasting lipid profile in 8-12 weeks if advised.');
  }

  if (hasAny(['bloodSugarFasting', 'bloodSugarPostprandial', 'hba1c'])) {
    diet.push('Choose low-glycemic carbohydrates and pair carbs with protein or fiber.');
    diet.push('Avoid sweetened drinks and large refined-carb portions.');
    exercise.push('A 10-15 minute walk after meals can help post-meal glucose control.');
    followUp.push('Discuss HbA1c or glucose monitoring frequency with your clinician.');
  }

  if (has('hemoglobin')) {
    diet.push('Include iron-rich foods such as leafy greens, lentils, beans, eggs, fish, or lean meat.');
    diet.push('Pair iron-rich meals with vitamin C foods such as lemon, orange, or amla.');
    followUp.push('Ask whether ferritin, B12, folate, or repeat CBC is needed.');
  }

  if (hasAny(['bloodPressureSystolic', 'bloodPressureDiastolic'])) {
    diet.push('Reduce sodium by limiting salty snacks, pickles, and packaged foods.');
    exercise.push('Use regular low-impact aerobic activity and avoid sudden intense starts.');
    sleep.push('Track snoring, daytime sleepiness, and poor sleep because they can affect BP.');
    followUp.push('Maintain a home BP log and review readings with your doctor.');
  }

  if (hasAny(['alt', 'ast', 'alkalinePhosphatase'])) {
    diet.push('Avoid alcohol and unnecessary supplements until liver values are reviewed.');
    followUp.push('Ask whether repeat LFT, hepatitis markers, or ultrasound is needed.');
  }

  if (user?.chronicConditions?.length) {
    followUp.push(`Plan should account for known conditions: ${user.chronicConditions.join(', ')}.`);
  }

  return { diet, exercise, sleep, followUp, basedOn: abnormal };
}

function buildTrendComparison(metrics) {
  const sorted = [...(metrics || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  return Object.entries(METRIC_CONFIG).map(([key, config]) => {
    const readings = sorted
      .filter(metric => metric[key] !== undefined && metric[key] !== null)
      .map(metric => ({
        value: Number(metric[key]),
        date: metric.date,
        status: statusForValue(key, metric[key]),
      }));

    if (!readings.length) return null;
    const latest = readings[readings.length - 1];
    const previous = readings.length > 1 ? readings[readings.length - 2] : null;
    const delta = previous ? Number((latest.value - previous.value).toFixed(2)) : null;

    return {
      key,
      label: config.label,
      unit: config.unit,
      normalRange: normalRangeText(config),
      latest,
      previous,
      delta,
      status: latest.status,
      crossedNormalRange: previous ? previous.status === 'normal' && latest.status !== 'normal' : latest.status !== 'normal',
      readings,
    };
  }).filter(Boolean);
}

function buildVisualAlerts(metrics) {
  return buildTrendComparison(metrics)
    .filter(item => item.status !== 'normal')
    .map(item => ({
      key: item.key,
      label: item.label,
      value: item.latest.value,
      unit: item.unit,
      status: item.status,
      normalRange: item.normalRange,
      date: item.latest.date,
      message: `${item.label} is ${item.status}; latest value is ${item.latest.value} ${item.unit}.`,
      crossedNormalRange: item.crossedNormalRange,
    }));
}

function calculateRiskScore(metric, report) {
  const readings = extractMetricValues(metric);
  let score = 0;

  readings.forEach(item => {
    if (item.status === 'high' || item.status === 'low') score += 8;
    if (item.status === 'critical') score += 15;
  });

  if (report?.riskFlags?.length) {
    score += report.riskFlags.reduce((total, flag) => {
      const weight = flag.severity === 'critical' ? 18 : flag.severity === 'high' ? 12 : flag.severity === 'medium' ? 7 : 3;
      return total + weight;
    }, 0);
  }

  return Math.min(100, score);
}

function buildRiskScoreHistory(metrics, reports = []) {
  const reportsById = new Map((reports || []).map(report => [String(report._id), report]));
  return [...(metrics || [])]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(metric => {
      const report = metric.report ? reportsById.get(String(metric.report)) : null;
      return {
        date: metric.date,
        score: calculateRiskScore(metric, report),
        reportId: metric.report || null,
        level: riskLevel(calculateRiskScore(metric, report)),
      };
    });
}

function riskLevel(score) {
  if (score >= 70) return 'high';
  if (score >= 35) return 'moderate';
  if (score > 0) return 'low';
  return 'normal';
}

function buildGoalProgress(goals, metrics) {
  const sorted = [...(metrics || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (goals || []).map(goal => {
    const metric = sorted.slice().reverse().find(item => item[goal.metric] !== undefined && item[goal.metric] !== null);
    const currentValue = metric ? Number(metric[goal.metric]) : null;
    const targetValue = Number(goal.targetValue);
    const operator = goal.targetOperator || 'lte';
    const achieved = currentValue !== null && (
      operator === 'gte' ? currentValue >= targetValue : currentValue <= targetValue
    );

    return {
      id: goal._id,
      title: goal.title,
      metric: goal.metric,
      metricLabel: METRIC_CONFIG[goal.metric]?.label || goal.metric,
      operator,
      targetValue,
      currentValue,
      unit: goal.unit || METRIC_CONFIG[goal.metric]?.unit || '',
      achieved,
      dueDate: goal.dueDate || null,
      isActive: goal.isActive,
      lastUpdatedFrom: metric?.date || null,
    };
  });
}

function buildEmergencyCard(user) {
  const allergies = user?.allergies || [];
  const chronicConditions = user?.chronicConditions || [];
  const emergencyContact = user?.emergencyContact || {};
  const missing = [];

  if (!user?.bloodGroup) missing.push('bloodGroup');
  if (!emergencyContact.name || !emergencyContact.phone) missing.push('emergencyContact');

  return {
    fullName: user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    email: user?.email || '',
    phone: user?.phone || '',
    age: user?.age || null,
    gender: user?.gender || '',
    bloodGroup: user?.bloodGroup || '',
    allergies,
    chronicConditions,
    emergencyContact: {
      name: emergencyContact.name || '',
      phone: emergencyContact.phone || '',
      relation: emergencyContact.relation || '',
    },
    missing,
    generatedAt: new Date(),
  };
}

function buildTimeline({ reports = [], notifications = [], metrics = [] }) {
  const events = [];

  reports.forEach(report => {
    events.push({
      type: 'report_uploaded',
      date: report.createdAt,
      title: `Report uploaded: ${report.title}`,
      description: report.reportType?.replace(/_/g, ' ') || 'Medical report',
      reportId: report._id,
      severity: 'info',
    });

    if (report.status === 'analyzed') {
      events.push({
        type: 'report_analyzed',
        date: report.updatedAt || report.createdAt,
        title: `Report analyzed: ${report.title}`,
        description: report.analysis?.summary || 'AI analysis completed',
        reportId: report._id,
        severity: report.analysis?.severity || 'normal',
      });
    }

    (report.riskFlags || []).forEach(flag => {
      events.push({
        type: 'alert',
        date: report.updatedAt || report.createdAt,
        title: `${flag.severity || 'medium'} risk: ${flag.type}`,
        description: flag.description,
        reportId: report._id,
        severity: flag.severity || 'medium',
      });
    });
  });

  notifications.forEach(notification => {
    events.push({
      type: notification.type === 'medication_reminder' ? 'reminder' : notification.type,
      date: notification.scheduledFor || notification.createdAt,
      title: notification.title,
      description: notification.message,
      notificationId: notification._id,
      severity: notification.priority || 'medium',
    });
  });

  const sortedMetrics = [...metrics].sort((a, b) => new Date(a.date) - new Date(b.date));
  for (let i = 1; i < sortedMetrics.length; i += 1) {
    const previous = sortedMetrics[i - 1];
    const current = sortedMetrics[i];
    extractMetricValues(current).forEach(item => {
      const oldValue = previous[item.key];
      if (oldValue === undefined || oldValue === null) return;
      const delta = Number((Number(item.value) - Number(oldValue)).toFixed(2));
      if (delta === 0 && item.status === 'normal') return;
      events.push({
        type: 'metric_change',
        date: current.date,
        title: `${item.label} changed`,
        description: `${oldValue} to ${item.value} ${item.unit}`,
        metric: item.key,
        delta,
        status: item.status,
        severity: item.status === 'normal' ? 'info' : item.status,
      });
    });
  }

  return events
    .filter(event => event.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(event => ({ ...event, dateLabel: formatDate(event.date) }));
}

function buildHealthSummaryData({ user, reports = [], metrics = [], goals = [], notifications = [] }) {
  const latestReports = reports.slice(0, 5);
  const trendComparison = buildTrendComparison(metrics);
  const visualAlerts = buildVisualAlerts(metrics);
  const riskHistory = buildRiskScoreHistory(metrics, reports);
  const goalProgress = buildGoalProgress(goals, metrics);

  return {
    profile: buildEmergencyCard(user),
    latestReports: latestReports.map(report => ({
      id: report._id,
      title: report.title,
      reportType: report.reportType,
      status: report.status,
      reportDate: report.reportDate,
      severity: report.analysis?.severity || 'unknown',
      summary: report.analysis?.summary || '',
      riskFlags: report.riskFlags || [],
    })),
    trends: trendComparison,
    risks: {
      latestScore: riskHistory.length ? riskHistory[riskHistory.length - 1].score : 0,
      history: riskHistory,
      alerts: visualAlerts,
    },
    goals: goalProgress,
    recommendations: latestReports.flatMap(report => report.analysis?.recommendations || []).slice(0, 12),
    reminders: notifications.filter(n => n.type === 'medication_reminder' || n.scheduledFor).slice(0, 10),
    generatedAt: new Date(),
  };
}

module.exports = {
  METRIC_CONFIG,
  GOAL_METRICS,
  extractMetricValues,
  extractReportValues,
  buildAbnormalExplanationCards,
  buildLifestylePlan,
  buildTrendComparison,
  buildVisualAlerts,
  buildRiskScoreHistory,
  buildGoalProgress,
  buildEmergencyCard,
  buildTimeline,
  buildHealthSummaryData,
  normalRangeText,
  statusForValue,
};
