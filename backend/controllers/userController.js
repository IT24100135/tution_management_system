const User = require('../models/User');
const Student = require('../models/Student');

const splitStudentName = (fullName) => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'Student', lastName: 'Account' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Student' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const ensureStudentProfileForUser = async (user, adminId) => {
  if (!user || user.role !== 'student') {
    return null;
  }

  const existingStudent = await Student.findOne({
    $or: [
      { userId: user._id },
      { email: String(user.email || '').toLowerCase() },
    ],
  });

  if (existingStudent) {
    if (!existingStudent.userId) {
      existingStudent.userId = user._id;
      await existingStudent.save();
    }
    return existingStudent;
  }

  const { firstName, lastName } = splitStudentName(user.name);
  return Student.create({
    firstName,
    lastName,
    email: String(user.email || '').toLowerCase(),
    phone: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
    status: 'active',
    userId: user._id,
    createdBy: adminId,
  });
};

const deriveDirectoryRole = (user) => {
  if (user.role === 'admin') {
    return 'admin';
  }

  return user.requestedRole === 'teacher' || user.role === 'teacher'
    ? 'teacher'
    : 'student';
};

const deriveDirectoryStatus = (approvalStatus) => {
  if (approvalStatus === 'pending') {
    return 'pending';
  }

  if (approvalStatus === 'rejected') {
    return 'blocked';
  }

  return 'active';
};

const formatDirectoryUser = (user) => {
  const role = deriveDirectoryRole(user);
  const status = deriveDirectoryStatus(user.approvalStatus);

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    subject: user.subject || '',
    grade: user.grade || '',
    role,
    roleLabel: role === 'teacher' ? 'Tutor' : role === 'admin' ? 'Admin' : 'Student',
    requestedRole: user.requestedRole || 'student',
    approvalStatus: user.approvalStatus || 'approved',
    approvalReason: user.approvalReason || '',
    status,
    statusLabel: status === 'active' ? 'Active' : status === 'pending' ? 'Pending' : 'Blocked',
    createdAt: user.createdAt,
    reviewedAt: user.reviewedAt,
  };
};

const getUserDirectory = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('name email subject grade role requestedRole approvalStatus approvalReason reviewedAt createdAt')
      .sort({ createdAt: -1 });

    const directoryUsers = users.map(formatDirectoryUser);
    const summary = directoryUsers.reduce((acc, directoryUser) => {
      acc.totalUsers += 1;

      if (directoryUser.role === 'teacher') {
        acc.tutorCount += 1;
      }
      if (directoryUser.role === 'student') {
        acc.studentCount += 1;
      }
      if (directoryUser.status === 'active') {
        acc.activeCount += 1;
      }
      if (directoryUser.status === 'pending') {
        acc.pendingCount += 1;
      }
      if (directoryUser.status === 'blocked') {
        acc.blockedCount += 1;
      }

      return acc;
    }, {
      totalUsers: 0,
      tutorCount: 0,
      studentCount: 0,
      activeCount: 0,
      pendingCount: 0,
      blockedCount: 0,
    });

    return res.status(200).json({
      count: directoryUsers.length,
      users: directoryUsers,
      summary,
    });
  } catch (error) {
    return next(error);
  }
};

const getPendingRegistrations = async (req, res, next) => {
  try {
    const pendingUsers = await User.find({ approvalStatus: 'pending' })
      .select('name email requestedRole subject grade approvalStatus createdAt')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      count: pendingUsers.length,
      requests: pendingUsers,
    });
  } catch (error) {
    return next(error);
  }
};

const getApprovedTutors = async (req, res, next) => {
  try {
    const { subject } = req.query;
    const query = {
      role: 'teacher',
      approvalStatus: 'approved',
    };

    if (String(subject || '').trim()) {
      query.subject = new RegExp(`^${String(subject).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    }

    const tutors = await User.find(query)
      .select('name email subject role approvalStatus')
      .sort({ name: 1 });

    return res.status(200).json({
      count: tutors.length,
      tutors,
    });
  } catch (error) {
    return next(error);
  }
};

const reviewRegistrationRequest = async (req, res, next) => {
  try {
    const { decision, reason } = req.body;

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin accounts cannot be reviewed via this endpoint.' });
    }

    if (user.approvalStatus === 'approved' && decision === 'approve') {
      return res.status(409).json({ message: 'This user is already approved.' });
    }

    if (decision === 'approve') {
      user.approvalStatus = 'approved';
      user.role = user.requestedRole || 'student';
      user.approvalReason = '';
    } else {
      user.approvalStatus = 'rejected';
      user.approvalReason = (reason || 'Registration request rejected by admin.').trim();
    }

    user.reviewedBy = req.user._id;
    user.reviewedAt = new Date();
    await user.save();
    await ensureStudentProfileForUser(user, req.user._id);

    return res.status(200).json({
      message: decision === 'approve'
        ? 'Registration request approved successfully.'
        : 'Registration request rejected successfully.',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.role = role;
    user.requestedRole = role === 'teacher' ? 'teacher' : 'student';
    user.approvalStatus = 'approved';
    user.approvalReason = '';
    user.reviewedBy = req.user._id;
    user.reviewedAt = new Date();
    await user.save();
    await ensureStudentProfileForUser(user, req.user._id);

    return res.status(200).json({
      message: 'User role updated successfully.',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getUserDirectory,
  getApprovedTutors,
  getPendingRegistrations,
  reviewRegistrationRequest,
  updateUserRole,
};
