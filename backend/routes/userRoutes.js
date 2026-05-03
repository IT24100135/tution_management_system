const express = require('express');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { validateRoleUpdate, validateRegistrationReview } = require('../middlewares/validationMiddleware');
const {
  getUserDirectory,
  getApprovedTutors,
  updateUserRole,
  getPendingRegistrations,
  reviewRegistrationRequest,
} = require('../controllers/userController');

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/', getUserDirectory);
router.get('/tutors', getApprovedTutors);
router.get('/pending-registrations', getPendingRegistrations);
router.patch('/:id/registration-review', validateRegistrationReview, reviewRegistrationRequest);
router.patch('/:id/role', validateRoleUpdate, updateUserRole);

module.exports = router;
