const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema(
  {
    tutorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    monthKey: {
      type: String,
      required: true,
      trim: true,
    },
    monthLabel: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    hours: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    ratePerHour: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Inactive'],
      default: 'Pending',
    },
    adminNote: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

salarySchema.index({ tutorUser: 1, monthKey: 1 }, { unique: true });
salarySchema.index({ monthKey: -1, status: 1 });

module.exports = mongoose.model('Salary', salarySchema);
