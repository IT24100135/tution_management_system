const express = require('express');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const {
  validateSalarySync,
  validateSalaryStatusUpdate,
} = require('../middlewares/validationMiddleware');
const {
  getSalaryRecords,
  syncSalaryRecords,
  updateSalaryStatus,
} = require('../controllers/salaryController');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorizeRoles('admin', 'teacher'), getSalaryRecords);

router
  .route('/sync')
  .post(authorizeRoles('admin'), validateSalarySync, syncSalaryRecords);

router
  .route('/:id/status')
  .patch(authorizeRoles('admin'), validateSalaryStatusUpdate, updateSalaryStatus);

module.exports = router;
