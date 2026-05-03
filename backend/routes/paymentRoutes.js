const express = require('express');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const {
  validatePaymentSubmit,
  validatePaymentStatusUpdate,
} = require('../middlewares/validationMiddleware');
const {
  getPayments,
  submitPayment,
  updatePaymentStatus,
} = require('../controllers/paymentController');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorizeRoles('admin', 'student'), getPayments);

router
  .route('/submit')
  .post(authorizeRoles('student'), validatePaymentSubmit, submitPayment);

router
  .route('/:id/status')
  .patch(authorizeRoles('admin'), validatePaymentStatusUpdate, updatePaymentStatus);

module.exports = router;
