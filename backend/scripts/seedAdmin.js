/**
 * scripts/seedAdmin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time setup script to create the default admin account in the database.
 *
 * HOW TO USE:
 *   1. Add these variables to your backend/.env file:
 *        ADMIN_DEFAULT_EMAIL=admin@yourdomain.com
 *        ADMIN_DEFAULT_PASSWORD=ChangeMe123!
 *
 *   2. Run from the backend directory:
 *        node scripts/seedAdmin.js
 *
 * SAFE TO RUN MULTIPLE TIMES — skips creation if the admin already exists.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config(); // Load .env from the project root
const mongoose = require('mongoose');
const User = require('../models/User');

const { MONGODB_URI, ADMIN_DEFAULT_EMAIL, ADMIN_DEFAULT_PASSWORD } = process.env;

// ── Validate environment ───────────────────────────────────────────────────────
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI is not set in your .env file.');
  process.exit(1);
}

if (!ADMIN_DEFAULT_EMAIL || !ADMIN_DEFAULT_PASSWORD) {
  console.error('❌  ADMIN_DEFAULT_EMAIL and ADMIN_DEFAULT_PASSWORD must be set in .env');
  console.error('    Example:');
  console.error('      ADMIN_DEFAULT_EMAIL=admin@yourschool.com');
  console.error('      ADMIN_DEFAULT_PASSWORD=ChangeMe123!');
  process.exit(1);
}

if (ADMIN_DEFAULT_PASSWORD.length < 6) {
  console.error('❌  ADMIN_DEFAULT_PASSWORD must be at least 6 characters.');
  process.exit(1);
}

// ── Seed function ──────────────────────────────────────────────────────────────
const seedAdmin = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('✅  Connected to MongoDB.');

  // Check if an admin already exists with this email
  const existing = await User.findOne({ email: ADMIN_DEFAULT_EMAIL.toLowerCase() });

  if (existing) {
    console.log(`ℹ️   Admin already exists: ${existing.email} (role: ${existing.role})`);
    console.log('    No changes were made. Exiting.');
  } else {
    // Create the admin account.
    // mustChangePassword = true forces the admin to change the default
    // password on their very first login.
    const admin = await User.create({
      name: 'System Admin',
      email: ADMIN_DEFAULT_EMAIL.toLowerCase(),
      password: ADMIN_DEFAULT_PASSWORD, // bcrypt hash applied in pre-save hook
      role: 'admin',
      requestedRole: 'student',
      approvalStatus: 'approved',
      approvalReason: '',
      mustChangePassword: true, // 🔒 Must change password on first login
    });

    console.log('🎉  Default admin created successfully!');
    console.log(`    Email   : ${admin.email}`);
    console.log(`    Role    : ${admin.role}`);
    console.log(`    ⚠️  The admin MUST change their password on first login.`);
  }

  await mongoose.disconnect();
  console.log('🔌  Disconnected from MongoDB.');
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
