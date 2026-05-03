const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    timetableEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timetable',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    tutorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    studentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    attendanceDate: {
      type: String,
      required: true,
      trim: true,
    },
    monthKey: {
      type: String,
      required: true,
      trim: true,
    },
    dayOfWeek: {
      type: String,
      trim: true,
      default: '',
    },
    startTime: {
      type: String,
      trim: true,
      default: '',
    },
    endTime: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    grade: {
      type: String,
      trim: true,
      default: '',
    },
    room: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Present', 'Absent'],
      default: 'Present',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ timetableEntry: 1, studentProfile: 1, attendanceDate: 1 }, { unique: true });
attendanceSchema.index({ studentProfile: 1, monthKey: -1, attendanceDate: -1 });
attendanceSchema.index({ tutorUser: 1, attendanceDate: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
