/**
 * Authentication Middleware
 * JWT verification and role-based access control
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AuditLog } = require('../models/index');

const wantsJson = (req) =>
  req.originalUrl?.startsWith('/api/') ||
  req.xhr ||
  req.headers.accept?.includes('application/json');

/**
 * Protect routes — requires valid JWT
 */
const protect = async (req, res, next) => {
  let token;

  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check cookie
  else if (req.cookies.token) {
    token = req.cookies.token;
  }
  // Check session
  else if (req.session && req.session.token) {
    token = req.session.token;
  }

  if (!token) {
    if (wantsJson(req)) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
    req.flash('error_msg', 'Please log in to access this page');
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      if (wantsJson(req)) {
        return res.status(401).json({ success: false, message: 'User no longer active' });
      }
      return res.redirect('/auth/login');
    }

    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (err) {
    if (wantsJson(req)) {
      return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
    }
    req.flash('error_msg', 'Session expired. Please log in again.');
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }
};

/**
 * Optional auth — populate user if logged in but don't block
 */
const optionalAuth = async (req, res, next) => {
  let token = req.cookies.token || (req.session && req.session.token);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
      res.locals.currentUser = user;
    }
  } catch (e) { /* Ignore */ }
  next();
};

/**
 * Authorize specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      if (wantsJson(req)) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
      }
      req.flash('error_msg', 'You do not have permission to access this page');
      return res.redirect('/dashboard');
    }
    next();
  };
};

/**
 * Audit logging middleware
 */
const auditLog = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // Log after response
      AuditLog.create({
        user: req.user?._id,
        action,
        resource: req.baseUrl,
        details: { method: req.method, path: req.path, body: sanitizeBody(req.body) },
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: res.statusCode < 400 ? 'success' : 'failed',
      }).catch(() => {}); // Non-blocking
      return originalJson(data);
    };
    next();
  };
};

const sanitizeBody = (body) => {
  if (!body) return {};
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.confirmPassword;
  delete sanitized.token;
  return sanitized;
};

module.exports = { protect, authorize, optionalAuth, auditLog };
