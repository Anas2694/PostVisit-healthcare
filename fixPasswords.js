const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = require('./config/database');
const User = require('./models/User');

async function fixPasswords() {
  await connectDB();

  const users = await User.find().select('+password');

  for (let user of users) {
    if (!user.password) {
      console.log("⚠️ Skipping user (no password):", user.email);
      continue;
    }

    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      continue;
    }

    console.log("🔧 Fixing user:", user.email);

    const hashed = await bcrypt.hash(user.password, 10);
    user.password = hashed;
    await user.save();
  }

  console.log("✅ Done fixing passwords");
  process.exit();
}

fixPasswords();