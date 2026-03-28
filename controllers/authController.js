/**
 * Auth Controller — PostVisit Healthcare Platform
 *
 * BUGS FIXED:
 * 1. sendTokenResponse was calling res.redirect() immediately after setting
 *    req.session.token — but express-session writes to the store asynchronously.
 *    The redirect fired before the session was persisted, so the dashboard's
 *    protect middleware found no token in the session → redirected back to login.
 *    FIX: wrap the redirect inside req.session.save(callback) to guarantee
 *    the session is written before the browser follows the redirect.
 *
 * 2. (companion to validation.js fix) — email lookup in login now correctly
 *    matches the lowercase email stored by mongoose { lowercase: true }.
 *    No change needed here since User.findOne({ email }) receives the already-
 *    lowercased value from the fixed loginValidator.
 */

const User = require('../models/User');
const { AuditLog } = require('../models/index');
const emailService = require('../services/notifications/emailService');

// ========================
// Helper: Send JWT via cookie + session
// ========================
const sendTokenResponse = (user, statusCode, req, res, redirectUrl = '/dashboard') => {
  const token = user.getSignedJwtToken();

  const cookieOptions = {
    expires: new Date(
      Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  res.cookie('token', token, cookieOptions);

  // FIX: Set session token then call session.save() before redirecting.
  // Without save(), express-session may not have flushed to store before
  // the browser hits the next route — protect middleware finds no token → logout loop.
  req.session.token = token;

  // Update last login (non-blocking)
  user.lastLogin = Date.now();
  user.loginCount = (user.loginCount || 0) + 1;
  user.save({ validateBeforeSave: false }).catch(() => {});

  // Audit log (non-blocking)
  AuditLog.create({
    user: user._id,
    action: 'login',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    status: 'success',
  }).catch(() => {});

  // JSON response for API / XHR clients
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(statusCode).json({
      success: true,
      token,
      user: { id: user._id, name: user.fullName, role: user.role },
    });
  }

  // FIX: wait for session to be written before redirecting
  req.session.save((err) => {
    if (err) {
      console.error('[Auth] Session save error:', err);
    }
    res.redirect(redirectUrl);
  });
};

// ========================
// GET /auth/register
// ========================
exports.getRegister = (req, res) => {
  res.render('auth/register', { title: 'Create Account' });
};

// ========================
// POST /auth/register
// ========================
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, gender, dateOfBirth, phone } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      req.flash('error_msg', 'Email already registered. Please log in.');
      return res.redirect('/auth/login');
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      gender,
      dateOfBirth,
      phone,
    });

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(user).catch(e =>
      console.error('Welcome email failed:', e.message)
    );

    req.flash('success_msg', `Welcome, ${user.firstName}! Your account is ready.`);
    sendTokenResponse(user, 201, req, res);
  } catch (error) {
    // Surface mongoose validation errors as flash messages instead of 500
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map(e => e.message)[0];
      req.flash('error_msg', msg);
      return res.redirect('/auth/register');
    }
    next(error);
  }
};

// ========================
// GET /auth/login
// ========================
exports.getLogin = (req, res) => {
  res.render('auth/login', { title: 'Sign In' });
};

// ========================
// POST /auth/login
// ========================
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      AuditLog.create({
        action: 'login_failed',
        details: { email },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'failed',
      }).catch(() => {});

      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    if (!user.isActive) {
      req.flash('error_msg', 'Your account has been deactivated. Contact support.');
      return res.redirect('/auth/login');
    }

    sendTokenResponse(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

// ========================
// GET /auth/logout
// ========================
exports.logout = (req, res) => {
  res.clearCookie('token');
  req.flash('success_msg', 'Logged out successfully');
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
};

// ========================
// GET /auth/forgot-password
// ========================
exports.getForgotPassword = (req, res) => {
  res.render('auth/forgot-password', { title: 'Forgot Password' });
};

// ========================
// POST /auth/forgot-password
// ========================
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });
    if (!user) {
      req.flash('success_msg', 'If that email is registered, you will receive a reset link.');
      return res.redirect('/auth/forgot-password');
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.APP_URL}/auth/reset-password/${resetToken}`;
    try {
      await emailService.sendPasswordResetEmail(user, resetUrl);
    } catch (e) {
      user.passwordResetToken = undefined;
      user.passwordResetExpire = undefined;
      await user.save({ validateBeforeSave: false });
      req.flash('error_msg', 'Email could not be sent. Please try again.');
      return res.redirect('/auth/forgot-password');
    }

    req.flash('success_msg', 'Password reset link sent to your email.');
    res.redirect('/auth/forgot-password');
  } catch (error) {
    next(error);
  }
};

// ========================
// GET /auth/profile
// ========================
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    res.render('auth/profile', { title: 'My Profile', user });
  } catch (error) {
    next(error);
  }
};

// ========================
// PUT /auth/profile
// ========================
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'dateOfBirth',
      'gender', 'bloodGroup', 'allergies', 'chronicConditions', 'address',
    ];
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    await User.findByIdAndUpdate(
      req.user._id || req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/auth/profile');
  } catch (error) {
    next(error);
  }
};

// ========================
// PUT /auth/change-password
// ========================
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id || req.user.id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      req.flash('error_msg', 'Current password is incorrect');
      return res.redirect('/auth/profile');
    }

    user.password = newPassword;
    await user.save();

    req.flash('success_msg', 'Password changed successfully. Please log in again.');
    res.clearCookie('token');
    req.session.destroy(() => res.redirect('/auth/login'));
  } catch (error) {
    next(error);
  }
};
