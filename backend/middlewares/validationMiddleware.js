const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidTime = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || '').trim());
const TIMETABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const validateRegister = (req, res, next) => {
  const { name, email, password, requestedRole, subject, grade } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  if (requestedRole && !['student', 'teacher', 'tutor'].includes(requestedRole)) {
    return res.status(400).json({ message: 'Requested role must be student or tutor.' });
  }

  if (['teacher', 'tutor'].includes(requestedRole) && !String(subject || '').trim()) {
    return res.status(400).json({ message: 'Subject is required for tutor registration.' });
  }

  if ((!requestedRole || requestedRole === 'student') && !String(grade || '').trim()) {
    return res.status(400).json({ message: 'Grade is required for student registration.' });
  }

  if (grade !== undefined && typeof grade !== 'string') {
    return res.status(400).json({ message: 'Grade must be a text value.' });
  }

  return next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  return next();
};

/**
 * Validates the change-password request body.
 * Requires currentPassword and newPassword (min 6 characters).
 */
const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required.' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
  }

  return next();
};

const validateProfileUpdate = (req, res, next) => {
  const allowedFields = ['name', 'email', 'subject'];
  const payloadFields = Object.keys(req.body);
  const { name, email, subject } = req.body;

  if (payloadFields.length === 0) {
    return res.status(400).json({ message: 'Name and email are required.' });
  }

  const hasInvalidField = payloadFields.some((field) => !allowedFields.includes(field));
  if (hasInvalidField) {
    return res.status(400).json({ message: 'Request contains unsupported fields.' });
  }

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required.' });
  }

  if (String(name).trim().length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters long.' });
  }

  if (!isValidEmail(String(email).trim())) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  if (subject !== undefined && typeof subject !== 'string') {
    return res.status(400).json({ message: 'Subject must be a text value.' });
  }

  if (req.user && req.user.role === 'teacher' && !String(subject || '').trim()) {
    return res.status(400).json({ message: 'Subject is required for tutor profiles.' });
  }

  return next();
};

const validateStudentCreate = (req, res, next) => {
  const { firstName, lastName, email, status } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: 'First name, last name, and email are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid student email address.' });
  }

  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Status must be either active or inactive.' });
  }

  return next();
};

const validateStudentUpdate = (req, res, next) => {
  const allowedFields = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'guardianName',
    'guardianPhone',
    'address',
    'status',
  ];
  const payloadFields = Object.keys(req.body);

  if (payloadFields.length === 0) {
    return res.status(400).json({ message: 'Provide at least one field to update.' });
  }

  const hasInvalidField = payloadFields.some((field) => !allowedFields.includes(field));
  if (hasInvalidField) {
    return res.status(400).json({ message: 'Request contains unsupported fields.' });
  }

  if (req.body.email && !isValidEmail(req.body.email)) {
    return res.status(400).json({ message: 'Please provide a valid student email address.' });
  }

  if (req.body.status && !['active', 'inactive'].includes(req.body.status)) {
    return res.status(400).json({ message: 'Status must be either active or inactive.' });
  }

  return next();
};

const validateCourseCreate = (req, res, next) => {
  const { name, code, fee, status, hallAllocation, grade } = req.body;

  if (!name || !code) {
    return res.status(400).json({ message: 'Course name and code are required.' });
  }

  if (fee !== undefined && (Number.isNaN(Number(fee)) || Number(fee) < 0)) {
    return res.status(400).json({ message: 'Fee must be a non-negative number.' });
  }

  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Status must be either active or inactive.' });
  }

  if (hallAllocation !== undefined && typeof hallAllocation !== 'string') {
    return res.status(400).json({ message: 'Hall allocation must be a text value.' });
  }

  if (grade !== undefined && typeof grade !== 'string') {
    return res.status(400).json({ message: 'Grade must be a text value.' });
  }

  return next();
};

const validateCourseUpdate = (req, res, next) => {
  const allowedFields = ['name', 'code', 'description', 'subject', 'grade', 'hallAllocation', 'fee', 'status'];
  const payloadFields = Object.keys(req.body);

  if (payloadFields.length === 0) {
    return res.status(400).json({ message: 'Provide at least one field to update.' });
  }

  const hasInvalidField = payloadFields.some((field) => !allowedFields.includes(field));
  if (hasInvalidField) {
    return res.status(400).json({ message: 'Request contains unsupported fields.' });
  }

  if (req.body.fee !== undefined && (Number.isNaN(Number(req.body.fee)) || Number(req.body.fee) < 0)) {
    return res.status(400).json({ message: 'Fee must be a non-negative number.' });
  }

  if (req.body.status && !['active', 'inactive'].includes(req.body.status)) {
    return res.status(400).json({ message: 'Status must be either active or inactive.' });
  }

  if (req.body.hallAllocation !== undefined && typeof req.body.hallAllocation !== 'string') {
    return res.status(400).json({ message: 'Hall allocation must be a text value.' });
  }

  if (req.body.grade !== undefined && typeof req.body.grade !== 'string') {
    return res.status(400).json({ message: 'Grade must be a text value.' });
  }

  return next();
};

const validateEnrollmentCreate = (req, res, next) => {
  const { studentId, courseId, status } = req.body;

  if (!studentId || !courseId) {
    return res.status(400).json({ message: 'studentId and courseId are required.' });
  }

  if (status && !['enrolled', 'completed', 'dropped'].includes(status)) {
    return res.status(400).json({ message: 'Status must be enrolled, completed, or dropped.' });
  }

  return next();
};

const validateEnrollmentUpdate = (req, res, next) => {
  const allowedFields = ['status', 'notes'];
  const payloadFields = Object.keys(req.body);

  if (payloadFields.length === 0) {
    return res.status(400).json({ message: 'Provide at least one field to update.' });
  }

  const hasInvalidField = payloadFields.some((field) => !allowedFields.includes(field));
  if (hasInvalidField) {
    return res.status(400).json({ message: 'Request contains unsupported fields.' });
  }

  if (req.body.status && !['enrolled', 'completed', 'dropped'].includes(req.body.status)) {
    return res.status(400).json({ message: 'Status must be enrolled, completed, or dropped.' });
  }

  return next();
};

const validateRoleUpdate = (req, res, next) => {
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ message: 'Role is required.' });
  }

  if (!['admin', 'teacher', 'student'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin, teacher, or student.' });
  }

  return next();
};

const validateRegistrationReview = (req, res, next) => {
  const { decision, reason } = req.body;

  if (!decision || !['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be approve or reject.' });
  }

  if (decision === 'reject' && reason && String(reason).length > 500) {
    return res.status(400).json({ message: 'Reason must be 500 characters or less.' });
  }

  return next();
};

const validateTimetableCreate = (req, res, next) => {
  const {
    dayOfWeek,
    startTime,
    endTime,
    title,
  } = req.body;

  if (!dayOfWeek || !startTime || !endTime || !title) {
    return res.status(400).json({
      message: 'dayOfWeek, startTime, endTime, and title are required.',
    });
  }

  if (!TIMETABLE_DAYS.includes(dayOfWeek)) {
    return res.status(400).json({
      message: 'dayOfWeek must be Monday to Sunday.',
    });
  }

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return res.status(400).json({
      message: 'startTime and endTime must be in HH:mm format.',
    });
  }

  if (startTime >= endTime) {
    return res.status(400).json({ message: 'End time must be later than start time.' });
  }

  return next();
};

const validateTimetableUpdate = (req, res, next) => {
  const allowedFields = [
    'courseId',
    'dayOfWeek',
    'startTime',
    'endTime',
    'title',
    'subject',
    'grade',
    'room',
    'tutorName',
    'notes',
  ];
  const payloadFields = Object.keys(req.body);

  if (payloadFields.length === 0) {
    return res.status(400).json({ message: 'Provide at least one field to update.' });
  }

  const hasInvalidField = payloadFields.some((field) => !allowedFields.includes(field));
  if (hasInvalidField) {
    return res.status(400).json({ message: 'Request contains unsupported fields.' });
  }

  if (req.body.dayOfWeek && !TIMETABLE_DAYS.includes(req.body.dayOfWeek)) {
    return res.status(400).json({ message: 'dayOfWeek must be Monday to Sunday.' });
  }

  if (req.body.startTime && !isValidTime(req.body.startTime)) {
    return res.status(400).json({ message: 'startTime must be in HH:mm format.' });
  }

  if (req.body.endTime && !isValidTime(req.body.endTime)) {
    return res.status(400).json({ message: 'endTime must be in HH:mm format.' });
  }

  if (req.body.startTime && req.body.endTime && req.body.startTime >= req.body.endTime) {
    return res.status(400).json({ message: 'End time must be later than start time.' });
  }

  return next();
};

const validateSuggestionCreate = (req, res, next) => {
  const { title, message, type } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: 'Message is required.' });
  }

  if (title !== undefined && typeof title !== 'string') {
    return res.status(400).json({ message: 'Title must be a text value.' });
  }

  if (type !== undefined && !['Suggestion', 'Complaint'].includes(type)) {
    return res.status(400).json({ message: 'Type must be Suggestion or Complaint.' });
  }

  return next();
};

const validateSuggestionUpdate = (req, res, next) => {
  const allowedFields = ['status', 'adminNote', 'reply'];
  const payloadFields = Object.keys(req.body);

  if (payloadFields.length === 0) {
    return res.status(400).json({ message: 'Provide at least one field to update.' });
  }

  const hasInvalidField = payloadFields.some((field) => !allowedFields.includes(field));
  if (hasInvalidField) {
    return res.status(400).json({ message: 'Request contains unsupported fields.' });
  }

  if (req.body.status && !['Open', 'In Review', 'Resolved', 'Closed'].includes(req.body.status)) {
    return res.status(400).json({ message: 'Status must be Open, In Review, Resolved, or Closed.' });
  }

  if (req.body.adminNote !== undefined && typeof req.body.adminNote !== 'string') {
    return res.status(400).json({ message: 'Admin note must be a text value.' });
  }

  if (req.body.reply !== undefined && typeof req.body.reply !== 'string') {
    return res.status(400).json({ message: 'Reply must be a text value.' });
  }

  return next();
};

const validateLeaveRequestCreate = (req, res, next) => {
  const { leaveDate, reason } = req.body;

  if (!leaveDate || !String(leaveDate).trim()) {
    return res.status(400).json({ message: 'Leave date is required.' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(leaveDate).trim())) {
    return res.status(400).json({ message: 'Leave date must be in YYYY-MM-DD format.' });
  }

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ message: 'Reason is required.' });
  }

  return next();
};

const validateLeaveRequestUpdate = (req, res, next) => {
  const allowedFields = ['status', 'adminReply'];
  const payloadFields = Object.keys(req.body);

  if (payloadFields.length === 0) {
    return res.status(400).json({ message: 'Provide at least one field to update.' });
  }

  const hasInvalidField = payloadFields.some((field) => !allowedFields.includes(field));
  if (hasInvalidField) {
    return res.status(400).json({ message: 'Request contains unsupported fields.' });
  }

  if (req.body.status && !['Pending', 'Approved', 'Rejected'].includes(req.body.status)) {
    return res.status(400).json({ message: 'Status must be Pending, Approved, or Rejected.' });
  }

  if (req.body.adminReply !== undefined && typeof req.body.adminReply !== 'string') {
    return res.status(400).json({ message: 'Admin reply must be a text value.' });
  }

  return next();
};

const validatePaymentSubmit = (req, res, next) => {
  const { monthKey, amount, grade, receipt } = req.body;

  if (!monthKey || !/^\d{4}-\d{2}$/.test(String(monthKey).trim())) {
    return res.status(400).json({ message: 'monthKey must be in YYYY-MM format.' });
  }

  if (amount === undefined || Number.isNaN(Number(amount)) || Number(amount) < 0) {
    return res.status(400).json({ message: 'Amount must be a non-negative number.' });
  }

  if (!String(grade || '').trim()) {
    return res.status(400).json({ message: 'Grade is required for payment submission.' });
  }

  if (!receipt || typeof receipt !== 'object') {
    return res.status(400).json({ message: 'Receipt file is required.' });
  }

  if (!String(receipt.fileName || '').trim()) {
    return res.status(400).json({ message: 'Receipt file name is required.' });
  }

  if (!String(receipt.mimeType || '').trim()) {
    return res.status(400).json({ message: 'Receipt file type is required.' });
  }

  if (!String(receipt.dataUrl || '').trim()) {
    return res.status(400).json({ message: 'Receipt file data is required.' });
  }

  return next();
};

const validatePaymentStatusUpdate = (req, res, next) => {
  const allowedFields = ['status', 'adminNote'];
  const payloadFields = Object.keys(req.body);

  if (payloadFields.length === 0) {
    return res.status(400).json({ message: 'Provide at least one field to update.' });
  }

  const hasInvalidField = payloadFields.some((field) => !allowedFields.includes(field));
  if (hasInvalidField) {
    return res.status(400).json({ message: 'Request contains unsupported fields.' });
  }

  if (req.body.status && !['Pending', 'Paid', 'Rejected'].includes(req.body.status)) {
    return res.status(400).json({ message: 'Status must be Pending, Paid, or Rejected.' });
  }

  if (req.body.adminNote !== undefined && typeof req.body.adminNote !== 'string') {
    return res.status(400).json({ message: 'Admin note must be a text value.' });
  }

  return next();
};

const validateSalarySync = (req, res, next) => {
  const { monthKey } = req.body;

  if (monthKey !== undefined && !/^\d{4}-\d{2}$/.test(String(monthKey).trim())) {
    return res.status(400).json({ message: 'monthKey must be in YYYY-MM format.' });
  }

  return next();
};

const validateSalaryStatusUpdate = (req, res, next) => {
  const allowedFields = ['status', 'adminNote'];
  const payloadFields = Object.keys(req.body);

  if (payloadFields.length === 0) {
    return res.status(400).json({ message: 'Provide at least one field to update.' });
  }

  const hasInvalidField = payloadFields.some((field) => !allowedFields.includes(field));
  if (hasInvalidField) {
    return res.status(400).json({ message: 'Request contains unsupported fields.' });
  }

  if (req.body.status && !['Pending', 'Paid', 'Inactive'].includes(req.body.status)) {
    return res.status(400).json({ message: 'Status must be Pending, Paid, or Inactive.' });
  }

  if (req.body.adminNote !== undefined && typeof req.body.adminNote !== 'string') {
    return res.status(400).json({ message: 'Admin note must be a text value.' });
  }

  return next();
};

const validateExamMarksSave = (req, res, next) => {
  const { subject, entries } = req.body;

  if (subject !== undefined && typeof subject !== 'string') {
    return res.status(400).json({ message: 'Subject must be a text value.' });
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ message: 'Entries must be a non-empty array.' });
  }

  const hasInvalidEntry = entries.some((entry) => (
    !entry
    || typeof entry !== 'object'
    || !String(entry.studentId || '').trim()
    || (entry.absent !== undefined && typeof entry.absent !== 'boolean')
    || !(
      entry.score === ''
      || entry.score === null
      || entry.score === undefined
      || (!Number.isNaN(Number(entry.score)) && Number(entry.score) >= 0 && Number(entry.score) <= 100)
    )
  ));

  if (hasInvalidEntry) {
    return res.status(400).json({ message: 'Each mark entry must include studentId, an optional absent flag, and a score between 0 and 100 or an empty value.' });
  }

  return next();
};

const validateAttendanceSubmit = (req, res, next) => {
  const { entries } = req.body;

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ message: 'Attendance entries must be a non-empty array.' });
  }

  const hasInvalidEntry = entries.some((entry) => (
    !entry
    || typeof entry !== 'object'
    || !String(entry.studentId || '').trim()
    || !['Present', 'Absent'].includes(String(entry.status || '').trim())
  ));

  if (hasInvalidEntry) {
    return res.status(400).json({ message: 'Each attendance entry must include studentId and a status of Present or Absent.' });
  }

  return next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateProfileUpdate,
  validateStudentCreate,
  validateStudentUpdate,
  validateCourseCreate,
  validateCourseUpdate,
  validateEnrollmentCreate,
  validateEnrollmentUpdate,
  validateRoleUpdate,
  validateRegistrationReview,
  validateTimetableCreate,
  validateTimetableUpdate,
  validateSuggestionCreate,
  validateSuggestionUpdate,
  validateLeaveRequestCreate,
  validateLeaveRequestUpdate,
  validatePaymentSubmit,
  validatePaymentStatusUpdate,
  validateSalarySync,
  validateSalaryStatusUpdate,
  validateExamMarksSave,
  validateAttendanceSubmit,
};
