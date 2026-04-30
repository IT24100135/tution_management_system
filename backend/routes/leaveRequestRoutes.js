const express = require('express');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const {
  validateLeaveRequestCreate,
  validateLeaveRequestUpdate,
} = require('../middlewares/validationMiddleware');
const {
  createLeaveRequest,
  getLeaveRequests,
  updateLeaveRequest,
} = require('../controllers/leaveRequestController');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(authorizeRoles('teacher'), validateLeaveRequestCreate, createLeaveRequest)
  .get(authorizeRoles('admin', 'teacher'), getLeaveRequests);

router
  .route('/:id')
  .patch(authorizeRoles('admin'), validateLeaveRequestUpdate, updateLeaveRequest);

module.exports = router;
