/**
 * AI Service - FIXED & ENHANCED
 * Real OpenAI API integration + intelligent mock fallback
 * Uses gpt-4o-mini for cost efficiency, gpt-4o for deep analysis
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const axios = require('axios');

// Normal reference ranges
const RANGES = {
  bloodSugar: { fasting: [70, 100], hba1c: [4.0, 5.7], postprandial: [70, 140] },
  cholesterol: { total: [0, 200], hdl: [40, 999], ldl: [0, 100], triglycerides: [0, 150] },
  hemoglobin: { default: [12.0, 17.5] },
  bloodPressure: { systolic: [90, 120], diastolic: [60, 80] },
  creatinine: { default: [0.6, 1.2] },
};

// ========================
// Analyze Medical Report
// ========================
exports.analyzeReport = async (params) => {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await analyzeWithGemini(params);
    } catch (e) {
      console.warn('⚠️ Gemini failed, falling back to mock AI:', e.message);
    }
  }
  return mockAnalyze(params);
};

// ========================
// Real OpenAI Analysis
// ========================
async function analyzeWithGemini({ reportType, extractedText, medicalValues, riskFlags, user }) {
  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

  const prompt = `
You are an expert medical AI.

Analyze this medical report carefully.

Patient Info:
- Gender: ${user?.gender || "Unknown"}
- Age: ${user?.age || "Unknown"}

Extracted Values:
${JSON.stringify(medicalValues, null, 2)}

Risk Flags:
${JSON.stringify(riskFlags, null, 2)}

Report Text:
${(extractedText || "").substring(0, 3000)}

IMPORTANT:
- Identify borderline values (VERY IMPORTANT)
- Be medically accurate
- Do NOT say everything is normal blindly
- Explain in simple English

Return ONLY JSON:

{
  "summary": "simple explanation",
  "diagnosis": "main findings",
  "severity": "normal|mild|moderate|severe|critical",
  "keyFindings": [
    {
      "finding": "name",
      "value": "value",
      "interpretation": "meaning",
      "severity": "normal|low|high|critical"
    }
  ],
  "recommendations": ["tip1", "tip2"],
  "precautions": ["precaution1"],
  "dietaryAdvice": ["diet1"],
  "followUpTests": ["test1"]
}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

if (!text) {
  throw new Error("Empty Gemini response");
}

// 🔥 REMOVE markdown ```json ```
text = text
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

let parsed;
try {
  parsed = JSON.parse(text);
} catch (err) {
  console.error("Cleaned Gemini response:", text);
  throw err;
}

  return {
    ...parsed,
    aiProvider: "gemini-2.5-flash",
    confidence: 95
  };
}

// ========================
// Risk Prediction (rule-based)
// ========================
exports.predictRisks = (values) => {
  const flags = [];
  if (!values) return flags;

  const sugar = values.bloodSugar;
  if (sugar?.fasting?.value > 100 || sugar?.hba1c?.value > 5.7) {
    flags.push({
      type: 'diabetes',
      severity: (sugar?.fasting?.value > 126 || sugar?.hba1c?.value > 6.5) ? 'high' : 'medium',
      description: sugar?.fasting?.value > 126
        ? `Fasting sugar ${sugar.fasting.value} mg/dL is in the diabetic range (>126)`
        : 'Pre-diabetic indicators detected',
    });
  }

  const chol = values.cholesterol;
  const bp = values.bloodPressure;
  let cardioScore = 0;
  if (chol?.total?.value > 200) cardioScore++;
  if (chol?.ldl?.value > 130) cardioScore++;
  if (chol?.hdl?.value < 40) cardioScore++;
  if (chol?.triglycerides?.value > 150) cardioScore++;
  if (bp?.systolic?.value > 140) cardioScore++;
  if (cardioScore >= 2) {
    flags.push({
      type: 'heart_disease',
      severity: cardioScore >= 4 ? 'high' : 'medium',
      description: `${cardioScore} cardiovascular risk factors detected`,
    });
  }

  if (values.hemoglobin?.value < 12) {
    flags.push({
      type: 'anemia',
      severity: values.hemoglobin.value < 10 ? 'high' : 'medium',
      description: `Hemoglobin ${values.hemoglobin.value} g/dL is below normal range`,
    });
  }

  if (values.creatinine?.value > 1.2) {
    flags.push({
      type: 'kidney_disease',
      severity: values.creatinine.value > 2.0 ? 'high' : 'medium',
      description: `Elevated creatinine (${values.creatinine.value} mg/dL) — kidney function monitoring advised`,
    });
  }

  return flags;
};

// ========================
// Mock AI Analysis (no API key needed)
// ========================
function mockAnalyze({ reportType, medicalValues, riskFlags, user }) {
  const findings = [];
  const recommendations = [];
  const precautions = [];
  const dietaryAdvice = [];
  const followUpTests = [];
  let severity = 'normal';

  // Blood Sugar Analysis
  if (medicalValues?.bloodSugar?.fasting?.value) {
    const { value, status } = medicalValues.bloodSugar.fasting;
    if (status === 'high') {
      findings.push({ finding: 'Fasting Blood Sugar', value: `${value} mg/dL`, interpretation: value > 126 ? 'Diabetic range — requires medical attention' : 'Pre-diabetic range — lifestyle changes recommended', severity: value > 126 ? 'critical' : 'high' });
      recommendations.push('Monitor blood sugar daily with a glucometer');
      recommendations.push('Follow a low-glycemic diet strictly');
      precautions.push('Avoid all sugary drinks, white rice, and processed foods');
      dietaryAdvice.push('Choose whole grains, legumes, and non-starchy vegetables');
      dietaryAdvice.push('Eat smaller meals more frequently (5-6 small meals/day)');
      followUpTests.push('HbA1c test', 'Oral Glucose Tolerance Test (OGTT)');
      severity = value > 200 ? 'severe' : 'moderate';
    } else if (status === 'low') {
      findings.push({ finding: 'Fasting Blood Sugar', value: `${value} mg/dL`, interpretation: 'Low blood sugar — hypoglycemia risk', severity: 'high' });
      precautions.push('Always carry glucose tablets or a fast-acting sugar source');
      severity = 'moderate';
    } else {
      findings.push({ finding: 'Fasting Blood Sugar', value: `${value} mg/dL`, interpretation: 'Within normal range ✓', severity: 'normal' });
    }
  }

  if (medicalValues?.bloodSugar?.hba1c?.value) {
    const { value, status } = medicalValues.bloodSugar.hba1c;
    if (status === 'high') {
      findings.push({ finding: 'HbA1c', value: `${value}%`, interpretation: value > 6.5 ? 'Diabetic range — 3-month average blood sugar is high' : 'Pre-diabetic range', severity: 'high' });
    } else {
      findings.push({ finding: 'HbA1c', value: `${value}%`, interpretation: 'Good long-term sugar control ✓', severity: 'normal' });
    }
  }

  // Cholesterol Analysis
  if (medicalValues?.cholesterol) {
    const c = medicalValues.cholesterol;
    if (c.total?.status === 'high') {
      findings.push({ finding: 'Total Cholesterol', value: `${c.total.value} mg/dL`, interpretation: 'Elevated — increases cardiovascular disease risk', severity: 'high' });
      recommendations.push('Increase aerobic exercise to 150 minutes per week');
      dietaryAdvice.push('Reduce saturated fats — limit red meat and full-fat dairy');
      dietaryAdvice.push('Increase omega-3 rich foods: salmon, mackerel, walnuts, flaxseed');
      followUpTests.push('Repeat lipid profile in 3 months', 'Coronary calcium score if indicated');
      if (severity === 'normal') severity = 'mild';
    }
    if (c.ldl?.status === 'high') {
      findings.push({ finding: 'LDL Cholesterol', value: `${c.ldl.value} mg/dL`, interpretation: '"Bad" cholesterol is elevated', severity: 'high' });
      precautions.push('Avoid trans fats and deep-fried foods completely');
    }
    if (c.hdl?.status === 'low') {
      findings.push({ finding: 'HDL Cholesterol', value: `${c.hdl.value} mg/dL`, interpretation: '"Good" protective cholesterol is low', severity: 'high' });
      recommendations.push('Regular cardio exercise significantly raises HDL levels');
    }
    if (c.triglycerides?.status === 'high') {
      findings.push({ finding: 'Triglycerides', value: `${c.triglycerides.value} mg/dL`, interpretation: 'Elevated blood fats — often linked to diet and diabetes risk', severity: 'high' });
      precautions.push('Avoid alcohol and limit refined carbohydrates');
    }
    if (!findings.some(f => f.finding.includes('Cholesterol') && f.severity !== 'normal')) {
      findings.push({ finding: 'Cholesterol Profile', value: `${c.total?.value || '?'} mg/dL total`, interpretation: 'Within acceptable range ✓', severity: 'normal' });
    }
  }

  // Hemoglobin
  if (medicalValues?.hemoglobin?.value) {
    const { value, status } = medicalValues.hemoglobin;
    if (status === 'low') {
      findings.push({ finding: 'Hemoglobin', value: `${value} g/dL`, interpretation: `Low — indicates anemia (${value < 10 ? 'moderate' : 'mild'})`, severity: value < 10 ? 'critical' : 'high' });
      recommendations.push('Increase iron-rich foods: spinach, lentils, red meat, fortified cereals');
      recommendations.push('Take iron supplements if recommended by your doctor');
      dietaryAdvice.push('Pair iron foods with Vitamin C (orange juice, lemon) for 2-3x better absorption');
      dietaryAdvice.push('Avoid tea and coffee within 1 hour of iron-rich meals');
      followUpTests.push('Iron studies (serum ferritin, TIBC)', 'Peripheral blood smear');
      if (severity === 'normal') severity = 'moderate';
    } else {
      findings.push({ finding: 'Hemoglobin', value: `${value} g/dL`, interpretation: 'Normal range ✓', severity: 'normal' });
    }
  }

  // Blood Pressure
  if (medicalValues?.bloodPressure?.systolic?.value) {
    const sys = medicalValues.bloodPressure.systolic;
    const dia = medicalValues.bloodPressure.diastolic;
    if (sys.status === 'high' || dia?.status === 'high') {
      findings.push({ finding: 'Blood Pressure', value: `${sys.value}/${dia?.value || '?'} mmHg`, interpretation: sys.value > 160 ? 'Stage 2 hypertension — needs urgent attention' : 'Stage 1 hypertension', severity: sys.value > 160 ? 'critical' : 'high' });
      recommendations.push('Reduce sodium intake to less than 1,500mg per day');
      recommendations.push('Practice stress reduction: meditation, yoga, deep breathing');
      precautions.push('Avoid alcohol, smoking, and stimulants like excessive caffeine');
      dietaryAdvice.push('Follow DASH diet: rich in fruits, vegetables, whole grains, low-fat dairy');
      followUpTests.push('ECG', '24-hour ambulatory blood pressure monitoring', 'Kidney function test');
      severity = sys.value > 160 ? 'severe' : 'moderate';
    } else {
      findings.push({ finding: 'Blood Pressure', value: `${sys.value}/${dia?.value || '?'} mmHg`, interpretation: 'Normal ✓', severity: 'normal' });
    }
  }

  if (findings.length === 0) {
    findings.push({ finding: 'General Assessment', value: 'See full report', interpretation: 'Unable to extract specific values — please consult your doctor for interpretation', severity: 'normal' });
  }

  // Always add universal advice
  if (!recommendations.length || recommendations.length < 3) {
    recommendations.push('Drink at least 8-10 glasses of water daily');
    recommendations.push('Get 7-8 hours of quality sleep each night');
    recommendations.push('Schedule a follow-up with your doctor within 1-3 months');
  }

  const abnormal = findings.filter(f => f.severity !== 'normal');
  const summary = abnormal.length === 0
    ? `Your ${reportType?.replace(/_/g, ' ') || 'report'} results look generally good! All major indicators are within acceptable ranges. Keep maintaining your healthy lifestyle and continue regular checkups.`
    : `Your ${reportType?.replace(/_/g, ' ') || 'report'} shows ${abnormal.length} value(s) that need attention: ${abnormal.map(f => f.finding).join(', ')}. ${abnormal.length > 2 ? 'Please consult your doctor promptly.' : 'With the right lifestyle changes, these can be managed effectively.'}`;

  const riskPredictions = riskFlags.map(flag => {
    const map = {
      diabetes: { condition: 'Type 2 Diabetes', tips: ['Lose 5-7% body weight if overweight', 'Exercise 150 min/week minimum', 'Reduce refined carbohydrates drastically', 'Test blood sugar every 3-6 months'] },
      heart_disease: { condition: 'Cardiovascular Disease', tips: ['Follow heart-healthy diet (Mediterranean)', 'Quit smoking immediately', 'Manage stress through structured techniques', 'Regular cardiac checkups annually'] },
      anemia: { condition: 'Iron Deficiency Anemia', tips: ['Increase dietary iron significantly', 'Take Vitamin C with iron-rich meals', 'Avoid iron inhibitors (tea/coffee) near meals', 'Consider iron supplement after doctor review'] },
      kidney_disease: { condition: 'Chronic Kidney Disease', tips: ['Stay well hydrated throughout the day', 'Avoid NSAIDs (ibuprofen, aspirin) without guidance', 'Control blood pressure strictly', 'Annual nephrology consultation recommended'] },
    };
    const info = map[flag.type] || { condition: flag.type, tips: ['Monitor regularly', 'Consult your doctor'] };
    return {
      condition: info.condition,
      riskLevel: flag.severity === 'high' ? 'high' : flag.severity === 'critical' ? 'very_high' : 'moderate',
      probability: flag.severity === 'high' ? 70 : flag.severity === 'critical' ? 90 : 45,
      explanation: flag.description,
      preventionTips: info.tips,
    };
  });

  return {
    summary,
    diagnosis: abnormal.length ? abnormal.map(f => f.finding).join(', ') : 'No significant abnormalities detected',
    severity,
    keyFindings: findings,
    recommendations,
    precautions,
    dietaryAdvice,
    followUpTests,
    riskPredictions,
    aiProvider: 'postvisit-mock-ai',
    confidence: 76,
  };
}

// ========================
// AI Chatbot
// ========================
// ========================
// AI Chatbot (FINAL CLEAN VERSION)
// ========================
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

exports.chat = async (message, healthContext, conversationHistory = []) => {
  if (!process.env.GEMINI_API_KEY) {
    return mockChat(message, healthContext);
  }

  try {
    // ✅ Build conversation with memory
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `You are Vita, a compassionate healthcare assistant.

Rules:
- Explain in simple English
- Do NOT diagnose serious conditions
- Suggest consulting a doctor when needed
- Be calm, supportive, and helpful
`
          }
        ]
      },
      {
        role: "user",
        parts: [
          {
            text: `Patient Data:\n${healthContext || "No data available"}`
          }
        ]
      },

      // ✅ Add last 6 messages (memory)
      ...conversationHistory.slice(-6).map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      })),

      // ✅ Current user message
      {
        role: "user",
        parts: [{ text: message }]
      }
    ];

    // ✅ Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();

    // ✅ Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log("Gemini RAW response:", JSON.stringify(data, null, 2));
    }

    // ❌ Handle API error
    if (data.error) {
      console.error("Gemini API ERROR:", data.error);
      return mockChat(message, healthContext);
    }

    // ✅ Extract response safely
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't understand that.";

    return {
      message: text,
      tokens: 0
    };

  } catch (error) {
    console.error("Gemini API error:", error.message);

    return mockChat(message, healthContext);
  }
};

    


async function chatWithOpenAI(message, healthContext, conversationHistory) {
  const systemPrompt = `You are PostVisit's compassionate AI health assistant named "Vita". 
You help patients understand their medical reports and answer health questions clearly and empathetically.

${healthContext ? `\n=== Patient Health Context ===\n${healthContext}\n===========================\n` : ''}

Important rules:
- Reference the patient's SPECIFIC report data when answering — be personalized, not generic
- Use simple, clear language — avoid medical jargon without explanation
- Always recommend consulting their doctor for final decisions
- Be warm, encouraging, and supportive — patients are often anxious
- Keep responses focused and practical (2-4 paragraphs max)
- Use emoji occasionally to make responses friendly (but not excessive)
- NEVER diagnose — provide information and guidance only`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10), // last 10 messages for context
    { role: 'user', content: message },
  ];

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 700,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  );

  return {
    message: response.data.choices[0].message.content,
    tokens: response.data.usage?.total_tokens || 0,
  };
}

function mockChat(message, healthContext) {
  const msg = message.toLowerCase();

  const matchers = [
    { triggers: ['sugar', 'glucose', 'diabetes', 'sweet', 'hba1c'],
      reply: healthContext?.includes('Sugar') || healthContext?.includes('sugar')
        ? `Based on your recent reports, your blood sugar levels have been flagged. 🩸 Here's what you should focus on:\n\n**Diet:** Avoid sugary drinks, white rice, and processed carbs. Switch to whole grains, vegetables, and lean proteins.\n\n**Monitoring:** Check your fasting sugar daily with a glucometer — aim for 70-100 mg/dL.\n\n**Exercise:** 30-45 minutes of brisk walking daily can significantly lower blood sugar over time.\n\n⚠️ This is informational only — please discuss with your doctor for a personalized diabetes management plan.`
        : `Managing blood sugar is about consistent habits. Focus on: 🥗 low-glycemic diet (vegetables, legumes, whole grains), 🏃 daily exercise (150 min/week minimum), 💊 medication adherence if prescribed, and 📊 regular HbA1c testing every 3 months. Your doctor can guide you with specific targets for your situation.` },

    { triggers: ['cholesterol', 'lipid', 'ldl', 'hdl', 'triglyceride'],
      reply: `Cholesterol management is highly achievable through diet and lifestyle! ❤️\n\n**Reduce LDL (bad):** Cut saturated fats (red meat, butter, cheese), eliminate trans fats, and eat more soluble fiber (oats, beans, apples).\n\n**Raise HDL (good):** Aerobic exercise is the most effective way — aim for 150+ minutes/week.\n\n**Triglycerides:** Reduce sugar and refined carbs, limit alcohol, and increase omega-3 intake (fish, flaxseed, walnuts).\n\nIf lifestyle changes aren't enough after 3 months, your doctor may recommend statins. Get your lipid profile rechecked in 3 months. 💊` },

    { triggers: ['hemoglobin', 'anemia', 'iron', 'tired', 'fatigue', 'weakness', 'pale'],
      reply: `Low hemoglobin (anemia) is very common and usually treatable! 💪\n\n**Iron-rich foods:** Spinach, lentils, kidney beans, red meat, tofu, fortified cereals.\n\n**Absorption boost:** Eat iron-rich foods WITH Vitamin C (lemon juice on lentils, orange with cereal). This can triple absorption!\n\n**Avoid:** Tea, coffee, and calcium supplements within 1 hour of iron-rich meals — they block absorption.\n\nYour doctor may recommend iron supplements. If anemia is severe, they'll investigate the cause first. Expect 2-3 months to see significant improvement. 🌿` },

    { triggers: ['blood pressure', 'bp', 'hypertension', 'pressure', 'systolic', 'diastolic'],
      reply: `High blood pressure (hypertension) is called the "silent killer" because it often has no symptoms — so you're wise to take it seriously! 💙\n\n**Diet:** Follow DASH diet — rich in fruits, vegetables, whole grains. Reduce sodium to under 1,500mg/day (avoid processed foods, pickles, salty snacks).\n\n**Lifestyle:** Exercise daily, maintain healthy weight, quit smoking, limit alcohol, manage stress.\n\n**Monitor:** Check BP at home — aim for below 120/80 mmHg. Note readings to share with your doctor.\n\nMedication may be needed if BP stays high despite lifestyle changes. Don't skip doses if prescribed. 🏥` },

    { triggers: ['eat', 'food', 'diet', 'meal', 'nutrition', 'can i eat'],
      reply: `Great question about diet! 🥗 A healthy eating pattern for managing most chronic conditions includes:\n\n✅ **Eat more:** Colorful vegetables, whole fruits, legumes, whole grains, lean proteins (fish, chicken, tofu), nuts and seeds in moderation.\n\n❌ **Eat less:** Processed foods, sugary drinks, white rice and bread, fried foods, red and processed meats.\n\n💧 **Drink:** 8-10 glasses of water daily. Herbal teas are fine. Limit coffee to 1-2 cups/day.\n\nIf you have specific conditions (diabetes, high BP, kidney issues), your dietary needs differ — a registered dietitian can create a personalized plan. Would you like advice for a specific condition? 😊` },

    { triggers: ['exercise', 'workout', 'physical activity', 'walk'],
      reply: `Exercise is truly medicine! 🏃 For general health, aim for:\n\n**Cardio:** 150 minutes/week of moderate activity (brisk walking, cycling, swimming) — that's just 30 minutes on 5 days.\n\n**Strength:** 2 days/week of resistance training helps with blood sugar, bone density, and metabolism.\n\n**Start small:** Even 10-minute walks 3x/day count! Gradually build up to avoid injury.\n\n⚠️ If you have heart conditions, high BP, or diabetes, get your doctor's clearance before starting a new exercise program. They may recommend cardiac stress testing first.` },

    { triggers: ['medication', 'medicine', 'drug', 'tablet', 'pill', 'dose', 'dosage'],
      reply: `I can share general information about medications, but specific dosing must always come from your doctor or pharmacist. 💊\n\n**General reminders:**\n- Take medications at consistent times every day\n- Never stop abruptly without medical guidance (especially BP and diabetes meds)\n- Store as directed (some need refrigeration)\n- Report side effects to your doctor promptly\n- Keep an updated medication list for emergencies\n\nIs there a specific medication you'd like to understand better? I can explain how common medications work in general terms.` },

    { triggers: ['worried', 'scared', 'anxious', 'afraid', 'nervous', 'stress', 'panic'],
      reply: `It's completely natural to feel anxious about health test results — it shows you care about your wellbeing! 🤗\n\nHere's something reassuring: most health issues, when caught through regular testing, are very manageable. Many "abnormal" values can be significantly improved through lifestyle changes within just 2-3 months.\n\nTake a breath. Focus on what you CAN control: your diet, exercise, sleep, and stress levels. Small consistent steps make a big difference.\n\nWould you like me to explain any specific test result from your reports? Understanding what the numbers mean often reduces anxiety significantly. 💙` },
  ];

  for (const { triggers, reply } of matchers) {
    if (triggers.some(t => msg.includes(t))) {
      return { message: reply, tokens: 180 };
    }
  }

  // Context-aware default response
  const hasContext = healthContext && healthContext.includes('Report');
  const defaults = hasContext
    ? [
        `Based on your health records in PostVisit, I can see you've had some recent reports analyzed. Is there a specific finding or value you'd like me to explain in more detail? I'm here to help you understand your health data and what steps you can take. 💙`,
        `I can see your report data and I'm ready to help! You can ask me things like:\n• "What does my blood sugar level mean?"\n• "What foods should I avoid with my conditions?"\n• "What follow-up tests should I consider?"\n• "How can I improve my hemoglobin?"\n\nWhat would you like to know? 🏥`,
      ]
    : [
        `I'm your PostVisit AI health assistant! I can help you understand medical reports, explain test values, and provide health guidance. Upload a report first, and I'll give you personalized insights based on your actual data. What health topic would you like to discuss? 😊`,
      ];

  return { message: defaults[Math.floor(Math.random() * defaults.length)], tokens: 80 };
}
