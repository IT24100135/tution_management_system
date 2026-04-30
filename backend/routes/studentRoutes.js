const express = require('express');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const {
  validateStudentCreate,
  validateStudentUpdate,
} = require('../middlewares/validationMiddleware');
const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin', 'teacher'));

router.route('/').post(validateStudentCreate, createStudent).get(getStudents);

router
  .route('/:id')
  .get(getStudentById)
  .put(validateStudentUpdate, updateStudent)
  .delete(deleteStudent);

module.exports = router;
