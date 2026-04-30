const express = require('express');
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateChangePassword,
} = require('../middlewares/validationMiddleware');

const router = express.Router();

// Public routes — no JWT required
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Protected routes — JWT required (protect middleware runs first)
router.get('/me', protect, getMe);
router.put('/profile', protect, validateProfileUpdate, updateProfile);

/**
 * PUT /api/auth/change-password
 * Forced on first login if mustChangePassword = true.
 * Validates input → checks current password → sets new hashed password.
 */
router.put('/change-password', protect, validateChangePassword, changePassword);

module.exports = router;
