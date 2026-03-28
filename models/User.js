/**
 * User Model
 * Handles patient/admin accounts with JWT auth
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  // Basic Info
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
match: [
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  'Please enter a valid email'
],

  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Never return password in queries
  },

  // Profile
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  phone: { type: String, trim: true },
  avatar: { type: String, default: null },

  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zip: String,
  },

  // Medical Profile
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  allergies: [String],
  chronicConditions: [String],
  emergencyContact: {
    name: String,
    phone: String,
    relation: String,
  },

  // Auth & Roles
  role: {
    type: String,
    enum: ['user', 'admin', 'doctor'],
    default: 'user',
  },
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  // Password Reset
  passwordResetToken: String,
  passwordResetExpire: Date,

  // Email Verification
  emailVerificationToken: String,
  emailVerificationExpire: Date,

  // Preferences
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    reminderNotifications: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: false },
    language: { type: String, default: 'en' },
  },

  // Stats
  totalReports: { type: Number, default: 0 },
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },

}, { timestamps: true });

// ========================
// Indexes
// ========================
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

// ========================
// Virtual Fields
// ========================
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
});

// ========================
// Middleware
// ========================

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

// ========================
// Instance Methods
// ========================

// Compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate password reset token
UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// ========================
// Static Methods
// ========================
UserSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email }).select('+password');
  if (!user) throw new Error('Invalid credentials');
  const isMatch = await user.matchPassword(password);
  if (!isMatch) throw new Error('Invalid credentials');
  return user;
};

module.exports = mongoose.model('User', UserSchema);
