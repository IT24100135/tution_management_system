const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

const createCourse = async (req, res, next) => {
  try {
    const { name, code, description, subject, grade, hallAllocation, fee, status } = req.body;

    const existingCourse = await Course.findOne({ code: code.toUpperCase() });
    if (existingCourse) {
      return res.status(409).json({ message: 'Course with this code already exists.' });
    }

    const course = await Course.create({
      name,
      code,
      description,
      subject,
      grade,
      hallAllocation,
      fee,
      status,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: 'Course created successfully.',
      course,
    });
  } catch (error) {
    return next(error);
  }
};

const getCourses = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const query = {};
    const isStudent = req.user && req.user.role === 'student';

    if (isStudent) {
      // Students can view only active courses regardless of requested status.
      query.status = 'active';
    } else if (status && ['active', 'inactive'].includes(status)) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [{ name: searchRegex }, { code: searchRegex }, { subject: searchRegex }];
    }

    const courses = await Course.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      count: courses.length,
      courses,
    });
  } catch (error) {
    return next(error);
  }
};

const getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    if (req.user && req.user.role === 'student' && course.status !== 'active') {
      return res.status(403).json({ message: 'Forbidden. Students can only access active courses.' });
    }

    return res.status(200).json({ course });
  } catch (error) {
    return next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const fieldsToUpdate = ['name', 'code', 'description', 'subject', 'grade', 'hallAllocation', 'fee', 'status'];

    fieldsToUpdate.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        course[field] = req.body[field];
      }
    });

    const updatedCourse = await course.save();

    return res.status(200).json({
      message: 'Course updated successfully.',
      course: updatedCourse,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const enrollmentCount = await Enrollment.countDocuments({ course: req.params.id });
    if (enrollmentCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete course with existing enrollments. Remove enrollments first.',
      });
    }

    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    return res.status(200).json({ message: 'Course deleted successfully.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
};
