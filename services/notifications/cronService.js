/**
 * Cron Job Service
 * Scheduled tasks: medication reminders, follow-up alerts, health checks
 */

const cron = require('node-cron');
const { Notification } = require('../../models/index');
const User = require('../../models/User');
const emailService = require('./emailService');

/**
 * Initialize all cron jobs
 */
exports.initCronJobs = () => {
  console.log('⏰ Initializing cron jobs...');

  // Run every 5 minutes — deliver pending notifications
  cron.schedule('*/5 * * * *', async () => {
    await deliverPendingNotifications();
  });

  // Run every day at 8:00 AM — daily health summary (optional)
  cron.schedule('0 8 * * *', async () => {
    await sendDailyReminders();
  });

  // Run every Sunday at 9:00 AM — weekly report summary
  cron.schedule('0 9 * * 0', async () => {
    await sendWeeklyHealthSummary();
  });

  // Run every hour — cleanup old notifications
  cron.schedule('0 * * * *', async () => {
    await cleanupOldNotifications();
  });

  console.log('✅ Cron jobs initialized');
};

/**
 * Deliver pending scheduled notifications
 */
async function deliverPendingNotifications() {
  try {
    const now = new Date();
    const pending = await Notification.find({
      scheduledFor: { $lte: now },
      isDelivered: false,
    }).populate('user', 'email firstName preferences');

    for (const notification of pending) {
      try {
        // Send email if user has email notifications enabled
        if (notification.user?.preferences?.emailNotifications &&
          ['both', 'email'].includes(notification.deliveryMethod)) {
          await emailService.sendMedicationReminder(notification.user, notification);
        }

        // Mark as delivered
        notification.isDelivered = true;
        notification.deliveredAt = now;
        await notification.save();

        // Handle recurring notifications
        if (notification.isRecurring && notification.recurrenceEnd > now) {
          await createNextRecurrence(notification);
        }
      } catch (e) {
        console.error(`Failed to deliver notification ${notification._id}:`, e.message);
      }
    }

    if (pending.length > 0) {
      console.log(`📬 Delivered ${pending.length} pending notification(s)`);
    }
  } catch (error) {
    console.error('Cron error (deliverPendingNotifications):', error.message);
  }
}

/**
 * Create next occurrence of a recurring notification
 */
async function createNextRecurrence(notification) {
  // Simple daily recurrence for now
  const nextDate = new Date(notification.scheduledFor);
  nextDate.setDate(nextDate.getDate() + 1);

  if (nextDate <= notification.recurrenceEnd) {
    await Notification.create({
      user: notification.user._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      scheduledFor: nextDate,
      isDelivered: false,
      deliveryMethod: notification.deliveryMethod,
      isRecurring: true,
      recurrenceEnd: notification.recurrenceEnd,
      priority: notification.priority,
      actionUrl: notification.actionUrl,
    });
  }
}

/**
 * Send daily reminders to users who have active medications
 */
async function sendDailyReminders() {
  try {
    const { Medication } = require('../../models/index');
    const activeMedications = await Medication.find({ isActive: true })
      .populate('user', 'email firstName preferences');

    for (const med of activeMedications) {
      if (!med.user?.preferences?.reminderNotifications) continue;
      await Notification.create({
        user: med.user._id,
        type: 'medication_reminder',
        title: `💊 Take your ${med.name}`,
        message: `Reminder: Take ${med.name} (${med.dosage || 'as prescribed'}) — ${med.purpose || ''}`,
        scheduledFor: new Date(),
        isDelivered: false,
        deliveryMethod: 'both',
        priority: 'high',
      });
    }
  } catch (error) {
    console.error('Cron error (sendDailyReminders):', error.message);
  }
}

/**
 * Send weekly health summary emails
 */
async function sendWeeklyHealthSummary() {
  try {
    const Report = require('../../models/Report');
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const usersWithReports = await Report.distinct('user', {
      createdAt: { $gte: oneWeekAgo },
      status: 'analyzed',
    });

    console.log(`📊 Sending weekly summaries to ${usersWithReports.length} users`);
    // Implementation: send personalized summaries per user
  } catch (error) {
    console.error('Cron error (sendWeeklyHealthSummary):', error.message);
  }
}

/**
 * Cleanup old read notifications older than 30 days
 */
async function cleanupOldNotifications() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await Notification.deleteMany({
      isRead: true,
      createdAt: { $lt: thirtyDaysAgo },
    });
    if (result.deletedCount > 0) {
      console.log(`🗑️  Cleaned up ${result.deletedCount} old notification(s)`);
    }
  } catch (error) {
    console.error('Cron error (cleanupOldNotifications):', error.message);
  }
}
