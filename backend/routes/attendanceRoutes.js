const express = require('express');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { validateAttendanceSubmit } = require('../middlewares/validationMiddleware');
const {
  getTutorAttendanceSession,
  submitTutorAttendance,
  getMyAttendance,
} = require('../controllers/attendanceController');

const router = express.Router();

router.use(protect);

router.get('/tutor/session', authorizeRoles('teacher'), getTutorAttendanceSession);
router.post('/tutor/session/:id', authorizeRoles('teacher'), validateAttendanceSubmit, submitTutorAttendance);
router.get('/student/me', authorizeRoles('student'), getMyAttendance);

module.exports = router;
