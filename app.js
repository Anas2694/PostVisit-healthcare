/**
 * PostVisit Healthcare Platform
 * Main Application Entry Point
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const jwt = require('jsonwebtoken');
const hpp = require('hpp');

// Routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const apiRoutes = require('./routes/apiRoutes');

// Services
const { initCronJobs } = require('./services/notifications/cronService');

// DB
const connectDB = require('./config/database');

const app = express();
const getJwtSecret = () =>
  process.env.JWT_SECRET || process.env.SESSION_SECRET || 'postvisit_dev_jwt_secret_change_me';

// ========================
// DB CONNECTION
// ========================
connectDB();

// ========================
// SECURITY
// ========================
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
app.set("trust proxy", 1);
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
}));

app.use('/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
}));

// ========================
// CORE MIDDLEWARE
// ========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(methodOverride('_method'));

// ========================
// SESSION + FLASH
// ========================
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/postvisit';
const sessionSecret = process.env.SESSION_SECRET || 'postvisit_dev_secret_change_me';

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[Security] SESSION_SECRET is not set. Configure a strong secret before production use.');
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false, // 🔥 IMPORTANT FIX
  store: MongoStore.create({
    mongoUrl: mongoUri,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  },
}));

app.use(flash());

// ========================
// LOGGER
// ========================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ========================
// VIEW ENGINE
// ========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// ========================
// GLOBAL USER + FLASH
// ========================
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.appName = process.env.APP_NAME || 'PostVisit';

  try {
    const token = req.cookies.token || req.session.token;

    if (token) {
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = decoded;
      res.locals.currentUser = decoded;
    } else {
      res.locals.currentUser = null;
    }
  } catch (err) {
    res.locals.currentUser = null;
  }

  next();
});

// ========================
// ROUTES
// ========================
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/reports', reportRoutes);
app.use('/chat', chatRoutes);
app.use('/notifications', notificationRoutes);
app.use('/admin', adminRoutes);
app.use('/api/v1', apiRoutes);

// Home
app.get('/', (req, res) => {
  res.render('landing', { title: 'PostVisit - AI-Powered Health Insights' });
});

// ========================
// ERROR HANDLING
// ========================
app.use((req, res) => {
  if (req.originalUrl?.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }
  res.status(404).render('errors/404', { title: 'Page Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);

  if (req.originalUrl?.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }

  res.status(err.statusCode || 500).render('errors/error', {
    title: 'Error',
    message: err.message,
    statusCode: err.statusCode || 500, // ✅ FIX
  });
});

// ========================
// CRON JOBS
// ========================
if (process.env.NODE_ENV !== 'test') {
  initCronJobs();
}

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});




