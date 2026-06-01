/**
 * Chat Controller — PostVisit Healthcare Platform
 *
 * BUGS FIXED:
 * 1. DUPLICATE MESSAGE BUG — user message was saved to DB *before* history was fetched,
 *    so the new message appeared in conversationHistory AND as the final user turn,
 *    causing OpenAI to receive the same message twice and produce confused replies.
 *    FIX: fetch history first, THEN save the user message, then call AI.
 *
 * 2. reportId was passed in POST body but getChatPage (GET) never forwarded it
 *    into the session or template, so "Ask AI" from a report page lost report context.
 *    FIX: store reportId in session on GET, read it in POST buildHealthContext.
 *
 * 3. ObjectId deprecation warning (mongoose.Types.ObjectId()) — already fixed, kept. ✓
 */

const mongoose = require('mongoose');
const { ChatMessage } = require('../models/index');
const Report = require('../models/Report');
const aiService = require('../services/ai/aiService');
const { v4: uuidv4 } = require('uuid');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── GET /chat ────────────────────────────────────────────────────────────────
exports.getChatPage = async (req, res, next) => {
  try {
    const sessionId = req.query.session || uuidv4();

    // FIX 2: persist reportId from query into session so POST handler can use it
    if (req.query.reportId) {
      req.session.chatReportId = req.query.reportId;
    }

    const history = await ChatMessage.find({ user: req.user._id, sessionId })
      .sort({ createdAt: 1 }).limit(50);

    const reports = await Report.find({ user: req.user._id, status: 'analyzed' })
      .populate('analysis', 'summary diagnosis keyFindings')
      .sort({ createdAt: -1 }).limit(5);

    res.render('chat/index', {
      title: 'AI Health Assistant',
      history,
      reports,
      sessionId,
      // pass reportId to template so the UI can highlight the relevant report
      activeReportId: req.query.reportId || null,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /chat/message ───────────────────────────────────────────────────────
exports.sendMessage = async (req, res, next) => {
  try {
    const { message, sessionId, reportId } = req.body;
    const userId = req.user._id;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    const trimmed = message.trim();
    const safeUserMessage = escapeHtml(trimmed);

    // ── FIX 1: Fetch history BEFORE saving the new message ─────────────────
    // Previously: save → fetch (new msg included → sent twice to OpenAI)
    // Now:        fetch → save → call AI
    const rawHistory = await ChatMessage.find({ user: userId, sessionId })
      .sort({ createdAt: -1 })
      .limit(12);

    const conversationHistory = rawHistory
      .reverse()
      .map(m => ({ role: m.role, content: m.content }));

    // Now save the user's message
    await ChatMessage.create({
      user: userId,
      role: 'user',
      content: safeUserMessage,
      sessionId,
      relatedReport: reportId || req.session.chatReportId || undefined,
    });

    // FIX 2: Use reportId from body, fallback to session (set by getChatPage)
    const effectiveReportId = reportId || req.session.chatReportId || null;

    // Build health context string
    const context = await buildHealthContext(userId, effectiveReportId);

    // Call AI
    const aiResponse = await aiService.chat(trimmed, context, conversationHistory);
    const safeAiMessage = escapeHtml(aiResponse.message);

    const savedResponse = await ChatMessage.create({
      user: userId,
      role: 'assistant',
      content: safeAiMessage,
      sessionId,
      tokens: aiResponse.tokens || 0,
    });

    res.json({
      success: true,
      message: safeAiMessage,
      messageId: savedResponse._id,
      timestamp: savedResponse.createdAt,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'AI assistant is temporarily unavailable. Please try again.',
    });
  }
};

// ─── Build health context string ──────────────────────────────────────────────
async function buildHealthContext(userId, specificReportId = null) {
  try {
    const query = {
      user: userId,
      status: 'analyzed',
      ...(specificReportId ? { _id: specificReportId } : {}),
    };

    const reports = await Report.find(query)
      .populate('analysis', 'summary diagnosis keyFindings recommendations riskPredictions precautions')
      .sort({ createdAt: -1 })
      .limit(specificReportId ? 1 : 3);

    const user = await require('../models/User')
      .findById(userId)
      .select('gender dateOfBirth bloodGroup chronicConditions allergies');

    const lines = [];

    if (user) {
      if (user.gender) lines.push(`Patient gender: ${user.gender}`);
      if (user.age) lines.push(`Age: ${user.age}`);
      if (user.bloodGroup) lines.push(`Blood Group: ${user.bloodGroup}`);
      if (user.chronicConditions?.length)
        lines.push(`Known conditions: ${user.chronicConditions.join(', ')}`);
      if (user.allergies?.length)
        lines.push(`Allergies: ${user.allergies.join(', ')}`);
    }

    if (reports.length) {
      lines.push('\nRecent Medical Reports:');
      reports.forEach((r, i) => {
        lines.push(`\n[Report ${i + 1}] ${r.title} (${r.reportType?.replace(/_/g, ' ')})`);
        if (r.analysis?.summary) lines.push(`Summary: ${r.analysis.summary}`);
        if (r.extractedValues) {
          const v = r.extractedValues;
          const vals = [];
          if (v.bloodSugar?.fasting?.value)
            vals.push(`Fasting Sugar: ${v.bloodSugar.fasting.value} mg/dL (${v.bloodSugar.fasting.status})`);
          if (v.bloodSugar?.hba1c?.value)
            vals.push(`HbA1c: ${v.bloodSugar.hba1c.value}% (${v.bloodSugar.hba1c.status})`);
          if (v.cholesterol?.total?.value)
            vals.push(`Cholesterol: ${v.cholesterol.total.value} mg/dL (${v.cholesterol.total.status})`);
          if (v.hemoglobin?.value)
            vals.push(`Hemoglobin: ${v.hemoglobin.value} g/dL (${v.hemoglobin.status})`);
          if (v.bloodPressure?.systolic?.value)
            vals.push(`BP: ${v.bloodPressure.systolic.value}/${v.bloodPressure.diastolic?.value || '?'} mmHg`);
          if (vals.length) lines.push(`Values: ${vals.join(', ')}`);
        }
      });
    } else {
      lines.push('\nNo analyzed reports yet for this patient.');
    }

    return lines.join('\n');
  } catch (e) {
    console.error('Context build error:', e.message);
    return null;
  }
}

// ─── GET /chat/history ────────────────────────────────────────────────────────
exports.getChatHistory = async (req, res, next) => {
  try {
    const sessions = await ChatMessage.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user._id) } },
      {
        $group: {
          _id: '$sessionId',
          lastMessage: { $last: '$content' },
          updatedAt: { $max: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { updatedAt: -1 } },
      { $limit: 20 },
    ]);
    res.render('chat/history', { title: 'Chat History', sessions });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /chat/session/:id ────────────────────────────────────────────────
exports.deleteSession = async (req, res, next) => {
  try {
    await ChatMessage.deleteMany({ user: req.user._id, sessionId: req.params.id });
    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    next(error);
  }
};

