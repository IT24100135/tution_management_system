const express = require('express');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const {
  validateEnrollmentCreate,
  validateEnrollmentUpdate,
} = require('../middlewares/validationMiddleware');
const {
  createEnrollment,
  getEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
} = require('../controllers/enrollmentController');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(authorizeRoles('admin', 'teacher'), validateEnrollmentCreate, createEnrollment)
  .get(authorizeRoles('admin', 'teacher', 'student'), getEnrollments);

router
  .route('/:id')
  .get(authorizeRoles('admin', 'teacher', 'student'), getEnrollmentById)
  .put(authorizeRoles('admin', 'teacher'), validateEnrollmentUpdate, updateEnrollment)
  .delete(authorizeRoles('admin', 'teacher'), deleteEnrollment);

module.exports = router;
