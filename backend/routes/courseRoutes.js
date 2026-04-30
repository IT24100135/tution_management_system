const express = require('express');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { validateCourseCreate, validateCourseUpdate } = require('../middlewares/validationMiddleware');
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(authorizeRoles('admin', 'teacher'), validateCourseCreate, createCourse)
  .get(authorizeRoles('admin', 'teacher', 'student'), getCourses);

router
  .route('/:id')
  .get(authorizeRoles('admin', 'teacher', 'student'), getCourseById)
  .put(authorizeRoles('admin', 'teacher'), validateCourseUpdate, updateCourse)
  .delete(authorizeRoles('admin', 'teacher'), deleteCourse);

module.exports = router;
