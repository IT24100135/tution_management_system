const crypto = require('crypto');
const Student = require('../models/Student');
const User = require('../models/User');

const buildStudentDisplayName = (firstName, lastName) =>
  [firstName, lastName].filter(Boolean).join(' ').trim();

const generateTemporaryPassword = () => `Stu${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const createStudent = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      guardianName,
      guardianPhone,
      address,
      status,
    } = req.body;
    const normalizedEmail = email.toLowerCase();
    const fullName = buildStudentDisplayName(firstName, lastName);

    const existingStudent = await Student.findOne({ email: normalizedEmail });
    if (existingStudent) {
      return res.status(409).json({ message: 'Student with this email already exists.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'A login account with this email already exists.' });
    }

    const temporaryPassword = generateTemporaryPassword();
    let user = null;

    try {
      user = await User.create({
        name: fullName,
        email: normalizedEmail,
        password: temporaryPassword,
        role: 'student',
        requestedRole: 'student',
        approvalStatus: 'approved',
        approvalReason: '',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        mustChangePassword: true,
      });

      const student = await Student.create({
        firstName,
        lastName,
        email: normalizedEmail,
        phone,
        guardianName,
        guardianPhone,
        address,
        status,
        userId: user._id,
        createdBy: req.user._id,
      });

      return res.status(201).json({
        message: 'Student created successfully.',
        student,
        loginEmail: normalizedEmail,
        temporaryPassword,
        mustChangePassword: true,
      });
    } catch (error) {
      if (user?._id) {
        await User.findByIdAndDelete(user._id);
      }
      throw error;
    }
  } catch (error) {
    return next(error);
  }
};

const getStudents = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ];
    }

    const students = await Student.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      count: students.length,
      students,
    });
  } catch (error) {
    return next(error);
  }
};

const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    return res.status(200).json({ student });
  } catch (error) {
    return next(error);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const fieldsToUpdate = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'guardianName',
      'guardianPhone',
      'address',
      'status',
    ];
    const previousEmail = student.email.toLowerCase();
    const linkedUser =
      (student.userId ? await User.findById(student.userId) : null)
      || await User.findOne({ email: previousEmail, role: 'student' });

    fieldsToUpdate.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        student[field] = req.body[field];
      }
    });

    const normalizedEmail = student.email.toLowerCase();
    const studentEmailOwner = await Student.findOne({
      email: normalizedEmail,
      _id: { $ne: student._id },
    });
    if (studentEmailOwner) {
      return res.status(409).json({ message: 'Student with this email already exists.' });
    }

    const emailOwner = await User.findOne({
      email: normalizedEmail,
      ...(linkedUser?._id ? { _id: { $ne: linkedUser._id } } : {}),
    });
    if (emailOwner) {
      return res.status(409).json({ message: 'A login account with this email already exists.' });
    }

    if (linkedUser) {
      linkedUser.name = buildStudentDisplayName(student.firstName, student.lastName);
      linkedUser.email = normalizedEmail;
      await linkedUser.save();
      if (!student.userId) {
        student.userId = linkedUser._id;
      }
    }

    student.email = normalizedEmail;

    const updatedStudent = await student.save();

    return res.status(200).json({
      message: 'Student updated successfully.',
      student: updatedStudent,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const linkedUser =
      (student.userId ? await User.findById(student.userId) : null)
      || await User.findOne({ email: student.email.toLowerCase(), role: 'student' });

    await Student.findByIdAndDelete(req.params.id);
    if (linkedUser) {
      await User.findByIdAndDelete(linkedUser._id);
    }

    return res.status(200).json({ message: 'Student deleted successfully.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};
