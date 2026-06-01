/**
 * Validation Middleware — PostVisit Healthcare Platform
 *
 * BUGS FIXED:
 * 1. normalizeEmail() was used in BOTH registerValidator and loginValidator.
 *    express-validator v7's normalizeEmail() strips dots from Gmail addresses by default
 *    (gmail_remove_dots: true). This means "john.doe@gmail.com" becomes "johndoe@gmail.com".
 *    If a user registered via a path where normalizeEmail ran differently, or if the
 *    User model's { lowercase: true } handled it differently than normalizeEmail,
 *    the stored email wouldn't match the login lookup → "Invalid email or password"
 *    even with correct credentials.
 *    FIX: Replace normalizeEmail() with .toLowerCase() — consistent with mongoose's
 *    { lowercase: true } on the email field, no dot-stripping side effects.
 */

const { body, validationResult } = require('express-validator');

// ========================
// Helper
// ========================
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg);
    if (req.originalUrl?.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(422).json({ success: false, errors: errors.array(), message: errorMessages[0] });
    }
    req.flash('error_msg', errorMessages[0]);
    return res.redirect('back');
  }
  next();
};

// ========================
// Auth Validators
// ========================
const registerValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
  // FIX: was .normalizeEmail() — replaced with .toLowerCase() to avoid gmail dot-stripping
  body('email').trim().isEmail().withMessage('Please provide a valid email').customSanitizer(v => v.toLowerCase()),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
  validate,
];

const loginValidator = [
  // FIX: was .normalizeEmail() — replaced with .toLowerCase() to match what's stored in DB
  body('email').trim().isEmail().withMessage('Please provide a valid email').customSanitizer(v => v.toLowerCase()),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

// ========================
// Report Validators
// ========================
const uploadReportValidator = [
  body('title').trim().notEmpty().withMessage('Report title is required').isLength({ max: 200 }),
  body('reportType').optional().isIn(['blood_test', 'urine_test', 'xray', 'mri', 'ct_scan', 'ecg', 'ultrasound', 'pathology', 'prescription', 'discharge_summary', 'other']),
  body('reportDate').optional().isISO8601().withMessage('Invalid date format'),
  validate,
];

// ========================
// Chat Validators
// ========================
const chatMessageValidator = [
  body('message').trim().notEmpty().withMessage('Message cannot be empty').isLength({ max: 2000 }),
  validate,
];

// ========================
// Notification Validators
// ========================
const reminderValidator = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('scheduledFor').isISO8601().withMessage('Invalid date/time format'),
  validate,
];

module.exports = {
  registerValidator,
  loginValidator,
  uploadReportValidator,
  chatMessageValidator,
  reminderValidator,
  validate,
};
