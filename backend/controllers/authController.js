const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Signs a JWT token for a given user ID.
 * Token expires in 7 days.
 */
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

/**
 * Returns only the safe public fields from a User document.
 * Never exposes the password hash.
 */
const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  subject: user.subject || '',
  grade: user.grade || '',
  role: user.role,
  requestedRole: user.requestedRole || user.role || 'student',
  approvalStatus: user.approvalStatus || 'approved',
  approvalReason: user.approvalReason || '',
  mustChangePassword: user.mustChangePassword,
});

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Self-registration creates a pending account request.
 * Requested role can be student/tutor (teacher), approved later by admin.
 */
const register = async (req, res) => {
  try {
    const { name, email, password, requestedRole, subject, grade } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const normalizedRequestedRole = ['teacher', 'tutor'].includes(requestedRole) ? 'teacher' : 'student';

    const user = await User.create({
      name,
      email,
      password,
      subject: normalizedRequestedRole === 'teacher' ? String(subject || '').trim() : '',
      grade: normalizedRequestedRole === 'student' ? String(grade || '').trim() : '',
      role: 'student',
      requestedRole: normalizedRequestedRole,
      approvalStatus: 'pending',
      approvalReason: '',
      reviewedBy: null,
      reviewedAt: null,
      mustChangePassword: false, // User chose their own password, no forced change needed
    });

    return res.status(202).json({
      message: 'Registration submitted successfully. Wait for admin approval before logging in.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Accepts email + password.
 * Returns the user's role and mustChangePassword flag so the
 * mobile app can route to the correct dashboard or change-password screen.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email (include password for comparison)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return a generic message — never reveal whether email exists or not
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Verify password using bcrypt (defined as a method on the User model)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const approvalStatus = user.approvalStatus || 'approved';
    if (approvalStatus === 'pending') {
      return res.status(403).json({
        message: 'Your registration is pending admin approval.',
      });
    }
    if (approvalStatus === 'rejected') {
      return res.status(403).json({
        message: user.approvalReason
          ? `Registration rejected: ${user.approvalReason}`
          : 'Your registration was rejected by admin.',
      });
    }

    return res.status(200).json({
      message: 'Login successful.',
      token: generateToken(user._id),
      user: sanitizeUser(user),
      // Tells the mobile app to redirect to Change Password screen if true
      mustChangePassword: user.mustChangePassword,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * The 'protect' middleware sets req.user before this runs.
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    user: sanitizeUser(req.user),
  });
};

/**
 * PUT /api/auth/profile
 * Updates the logged-in user's editable profile fields.
 */
const updateProfile = async (req, res) => {
  try {
    const { name, email, subject } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    user.name = String(name).trim();
    user.email = normalizedEmail;
    user.subject = user.role === 'teacher' ? String(subject || '').trim() : '';
    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during profile update.' });
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────

/**
 * PUT /api/auth/change-password
 * Authenticated route. Requires:
 *   - currentPassword: the user's existing password
 *   - newPassword: the new password (min 6 chars, validated in middleware)
 *
 * On success:
 *   - Updates the password (bcrypt hash applied via pre-save hook)
 *   - Sets mustChangePassword = false so they aren't asked again
 *   - Returns a fresh JWT token
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Fetch user WITH password field (getMe uses select('-password'), so we refetch)
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Verify the user knows their current password (security check)
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    // Prevent setting the same password as before
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password must be different from the current password.' });
    }

    // Update password — the pre-save hook in User.js will auto-hash it
    user.password = newPassword;
    user.mustChangePassword = false; // Clear the forced-change flag
    await user.save();

    return res.status(200).json({
      message: 'Password changed successfully.',
      token: generateToken(user._id), // Issue a fresh token
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during password change.' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};
