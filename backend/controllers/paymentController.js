const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');

const PAYMENT_POPULATE = 'name email grade';
const PAYMENT_PROFILE_POPULATE = 'firstName lastName email';
const SENIOR_CHOICE_SUBJECTS = ['Commerce', 'Geography', 'Civics', 'Sinhala', 'ICT', 'Health Science'];

const buildMonthLabel = (monthKey) => {
  const [yearText, monthText] = String(monthKey || '').split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return String(monthKey || '').trim();
  }

  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const getStudentProfileForUser = async (user) => {
  if (!user?.email) return null;

  return Student.findOne({ email: user.email.toLowerCase() }).select('_id firstName lastName email');
};

const normalizeSubjectKey = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ');

const parseGradeNumber = (grade) => {
  const match = String(grade || '').match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

const calculateStudentMonthlyFee = async ({ grade, studentProfileId }) => {
  const gradeNumber = parseGradeNumber(grade);

  if (gradeNumber >= 6 && gradeNumber <= 9) {
    return 3500;
  }

  if (gradeNumber === 10 || gradeNumber === 11) {
    if (!studentProfileId) {
      return 3000;
    }

    const enrollments = await Enrollment.find({
      student: studentProfileId,
      status: { $ne: 'dropped' },
    }).populate('course', 'name subject');

    const choiceSubjectCount = new Set(
      enrollments
        .map((entry) => normalizeSubjectKey(entry.course?.subject || entry.course?.name))
        .filter((subject) => SENIOR_CHOICE_SUBJECTS.some((option) => normalizeSubjectKey(option) === subject))
    ).size;

    return 3000 + (choiceSubjectCount * 300);
  }

  return 0;
};

const normalizePayment = (payment) => {
  const studentProfile = payment.studentProfile || null;
  const studentUser = payment.studentUser || null;
  const receipt = payment.receipt || {};

  return {
    id: payment._id,
    monthKey: payment.monthKey,
    monthLabel: payment.monthLabel,
    amount: payment.amount,
    grade: payment.grade || studentUser?.grade || '',
    receipt: {
      fileName: receipt.fileName || '',
      mimeType: receipt.mimeType || '',
      dataUrl: receipt.dataUrl || '',
    },
    status: payment.status || 'Pending',
    adminNote: payment.adminNote || '',
    submittedAt: payment.submittedAt,
    reviewedAt: payment.reviewedAt,
    createdAt: payment.createdAt,
    student: {
      id: studentUser?._id || '',
      name: studentProfile
        ? `${studentProfile.firstName || ''} ${studentProfile.lastName || ''}`.trim()
        : studentUser?.name || '',
      email: studentUser?.email || studentProfile?.email || '',
      grade: payment.grade || studentUser?.grade || '',
    },
  };
};

const getPayments = async (req, res, next) => {
  try {
    const { grade, status, monthKey } = req.query;
    const query = {};
    const isStudent = req.user && req.user.role === 'student';

    if (isStudent) {
      query.studentUser = req.user._id;
    }

    if (grade && String(grade).trim()) {
      query.grade = String(grade).trim();
    }

    if (status && ['Pending', 'Paid', 'Rejected'].includes(status)) {
      query.status = status;
    }

    if (monthKey && /^\d{4}-\d{2}$/.test(String(monthKey).trim())) {
      query.monthKey = String(monthKey).trim();
    }

    const payments = await Payment.find(query)
      .populate('studentUser', PAYMENT_POPULATE)
      .populate('studentProfile', PAYMENT_PROFILE_POPULATE)
      .sort({ monthKey: -1, createdAt: -1 });

    return res.status(200).json({
      count: payments.length,
      payments: payments.map(normalizePayment),
    });
  } catch (error) {
    return next(error);
  }
};

const submitPayment = async (req, res, next) => {
  try {
    const {
      monthKey,
      amount,
      grade,
      receipt,
    } = req.body;

    const studentProfile = await getStudentProfileForUser(req.user);
    const trimmedMonthKey = String(monthKey || '').trim();
    const trimmedGrade = String(grade || req.user.grade || '').trim();
    const normalizedReceipt = {
      fileName: String(receipt?.fileName || '').trim(),
      mimeType: String(receipt?.mimeType || '').trim(),
      dataUrl: String(receipt?.dataUrl || '').trim(),
    };
    const parsedAmount = await calculateStudentMonthlyFee({
      grade: trimmedGrade,
      studentProfileId: studentProfile?._id || null,
    });

    let payment = await Payment.findOne({
      studentUser: req.user._id,
      monthKey: trimmedMonthKey,
    });

    const nextValues = {
      studentProfile: studentProfile?._id || null,
      monthKey: trimmedMonthKey,
      monthLabel: buildMonthLabel(trimmedMonthKey),
      amount: parsedAmount,
      grade: trimmedGrade,
      receipt: normalizedReceipt,
      status: 'Pending',
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      adminNote: '',
    };

    if (payment) {
      Object.assign(payment, nextValues);
    } else {
      payment = await Payment.create({
        studentUser: req.user._id,
        ...nextValues,
      });
    }

    await payment.save();

    const populatedPayment = await Payment.findById(payment._id)
      .populate('studentUser', PAYMENT_POPULATE)
      .populate('studentProfile', PAYMENT_PROFILE_POPULATE);

    return res.status(200).json({
      message: 'Payment receipt submitted successfully.',
      payment: normalizePayment(populatedPayment),
    });
  } catch (error) {
    return next(error);
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      payment.status = req.body.status;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'adminNote')) {
      payment.adminNote = String(req.body.adminNote || '').trim();
    }

    payment.reviewedAt = new Date();
    payment.reviewedBy = req.user._id;
    await payment.save();

    const updatedPayment = await Payment.findById(payment._id)
      .populate('studentUser', PAYMENT_POPULATE)
      .populate('studentProfile', PAYMENT_PROFILE_POPULATE);

    return res.status(200).json({
      message: 'Payment status updated successfully.',
      payment: normalizePayment(updatedPayment),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPayments,
  submitPayment,
  updatePaymentStatus,
};
