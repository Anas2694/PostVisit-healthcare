/**
 * Notification Routes
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { Notification, Medication } = require('../models/index');
const { reminderValidator } = require('../middleware/validation');

// GET /notifications
router.get('/', protect, async (req, res, next) => {
  try {
    const [notifications, medications] = await Promise.all([
      Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50),
      Medication.find({ user: req.user.id, isActive: true }),
    ]);
    const unread = notifications.filter(n => !n.isRead).length;
    res.render('notifications/index', { title: 'Notifications & Reminders', notifications, medications, unread });
  } catch (e) { next(e); }
});

// POST /notifications/reminder
router.post('/reminder', protect, reminderValidator, async (req, res, next) => {
  try {
    const { title, message, scheduledFor, isRecurring, recurrenceEnd, deliveryMethod } = req.body;
    await Notification.create({
      user: req.user.id,
      type: 'medication_reminder',
      title,
      message,
      scheduledFor: new Date(scheduledFor),
      isRecurring: isRecurring === 'on',
      recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : undefined,
      deliveryMethod: deliveryMethod || 'both',
      priority: 'high',
    });
    req.flash('success_msg', 'Reminder set successfully!');
    res.redirect('/notifications');
  } catch (e) { next(e); }
});

// PUT /notifications/:id/read
router.put('/:id/read', protect, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (e) { next(e); }
});

// PUT /notifications/read-all
router.put('/read-all', protect, async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /notifications/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /notifications/medication
router.post('/medication', protect, async (req, res, next) => {
  try {
    const { name, dosage, frequency, purpose, startDate, endDate, prescribedBy } = req.body;
    await Medication.create({
      user: req.user.id,
      name,
      dosage,
      frequency,
      purpose,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      prescribedBy,
      isActive: true,
    });
    req.flash('success_msg', 'Medication added successfully!');
    res.redirect('/notifications');
  } catch (e) { next(e); }
});

module.exports = router;
