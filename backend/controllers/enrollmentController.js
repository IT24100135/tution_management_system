const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const Course = require('../models/Course');

const getStudentProfileForUser = (user) => {
  if (!user || !user.email) return null;
  return Student.findOne({ email: user.email.toLowerCase() }).select('_id');
};

const createEnrollment = async (req, res, next) => {
  try {
    const { studentId, courseId, status, notes } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const existingEnrollment = await Enrollment.findOne({ student: studentId, course: courseId });
    if (existingEnrollment) {
      return res.status(409).json({ message: 'This student is already enrolled in this course.' });
    }

    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      status,
      notes,
      enrolledBy: req.user._id,
    });

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('student', 'firstName lastName email')
      .populate('course', 'name code subject fee')
      .populate('enrolledBy', 'name email role');

    return res.status(201).json({
      message: 'Enrollment created successfully.',
      enrollment: populatedEnrollment,
    });
  } catch (error) {
    return next(error);
  }
};

const getEnrollments = async (req, res, next) => {
  try {
    const { studentId, courseId, status } = req.query;
    const query = {};
    const isStudent = req.user && req.user.role === 'student';

    if (isStudent) {
      const ownStudentProfile = await getStudentProfileForUser(req.user);
      if (!ownStudentProfile) {
        return res.status(200).json({
          count: 0,
          enrollments: [],
        });
      }
      query.student = ownStudentProfile._id;
    } else if (studentId) {
      query.student = studentId;
    }

    if (courseId) {
      query.course = courseId;
    }

    if (status && ['enrolled', 'completed', 'dropped'].includes(status)) {
      query.status = status;
    }

    const enrollments = await Enrollment.find(query)
      .populate('student', 'firstName lastName email')
      .populate('course', 'name code subject fee')
      .populate('enrolledBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: enrollments.length,
      enrollments,
    });
  } catch (error) {
    return next(error);
  }
};

const getEnrollmentById = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('student', 'firstName lastName email')
      .populate('course', 'name code subject fee')
      .populate('enrolledBy', 'name email role');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found.' });
    }

    if (req.user && req.user.role === 'student') {
      const ownStudentProfile = await getStudentProfileForUser(req.user);
      const enrollmentStudentId = enrollment.student?._id?.toString();
      if (!ownStudentProfile || enrollmentStudentId !== ownStudentProfile._id.toString()) {
        return res.status(403).json({ message: 'Forbidden. You can only view your own enrollments.' });
      }
    }

    return res.status(200).json({ enrollment });
  } catch (error) {
    return next(error);
  }
};

const updateEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found.' });
    }

    const fieldsToUpdate = ['status', 'notes'];

    fieldsToUpdate.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        enrollment[field] = req.body[field];
      }
    });

    await enrollment.save();

    const updatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('student', 'firstName lastName email')
      .populate('course', 'name code subject fee')
      .populate('enrolledBy', 'name email role');

    return res.status(200).json({
      message: 'Enrollment updated successfully.',
      enrollment: updatedEnrollment,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findByIdAndDelete(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found.' });
    }

    return res.status(200).json({ message: 'Enrollment deleted successfully.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createEnrollment,
  getEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
};
