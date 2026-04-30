const LeaveRequest = require('../models/LeaveRequest');

const LEAVE_REQUEST_POPULATE = 'name email subject role approvalStatus';

const createLeaveRequest = async (req, res, next) => {
  try {
    const { leaveDate, reason } = req.body;

    const leaveRequest = await LeaveRequest.create({
      leaveDate: String(leaveDate || '').trim(),
      reason: String(reason || '').trim(),
      createdBy: req.user._id,
    });

    const populatedLeaveRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('createdBy', LEAVE_REQUEST_POPULATE);

    return res.status(201).json({
      message: 'Leave request submitted successfully.',
      leaveRequest: populatedLeaveRequest,
    });
  } catch (error) {
    return next(error);
  }
};

const getLeaveRequests = async (req, res, next) => {
  try {
    const { mine, status } = req.query;
    const query = {};
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isAdmin || mine === 'true') {
      query.createdBy = req.user._id;
    }

    if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
      query.status = status;
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate('createdBy', LEAVE_REQUEST_POPULATE)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: leaveRequests.length,
      leaveRequests,
    });
  } catch (error) {
    return next(error);
  }
};

const updateLeaveRequest = async (req, res, next) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    const fieldsToUpdate = ['status', 'adminReply'];
    fieldsToUpdate.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        leaveRequest[field] = req.body[field];
      }
    });

    await leaveRequest.save();

    const updatedLeaveRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('createdBy', LEAVE_REQUEST_POPULATE);

    return res.status(200).json({
      message: 'Leave request updated successfully.',
      leaveRequest: updatedLeaveRequest,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createLeaveRequest,
  getLeaveRequests,
  updateLeaveRequest,
};
