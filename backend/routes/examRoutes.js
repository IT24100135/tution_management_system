const express = require('express');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const {
  validateExamMarksSave,
} = require('../middlewares/validationMiddleware');
const {
  getExams,
  getExamEntry,
  saveExamMarks,
  getExamGradebook,
  getMyExamResults,
} = require('../controllers/examController');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorizeRoles('admin', 'teacher', 'student'), getExams);

router
  .route('/student/me')
  .get(authorizeRoles('student'), getMyExamResults);

router
  .route('/:id/entry')
  .get(authorizeRoles('admin', 'teacher'), getExamEntry);

router
  .route('/:id/marks')
  .post(authorizeRoles('admin', 'teacher'), validateExamMarksSave, saveExamMarks);

router
  .route('/:id/gradebook')
  .get(authorizeRoles('admin', 'teacher'), getExamGradebook);

module.exports = router;
