const User = require('../models/User');

const getPendingRegistrations = async (req, res, next) => {
  try {
    const pendingUsers = await User.find({ approvalStatus: 'pending' })
      .select('name email requestedRole approvalStatus createdAt')
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

    return res.status(200).json({
      message: 'User role updated successfully.',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getApprovedTutors,
  getPendingRegistrations,
  reviewRegistrationRequest,
  updateUserRole,
};
