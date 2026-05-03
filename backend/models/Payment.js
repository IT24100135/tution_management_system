const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    studentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    grade: {
      type: String,
      trim: true,
      default: '',
    },
    receipt: {
      fileName: {
        type: String,
        trim: true,
        default: '',
      },
      mimeType: {
        type: String,
        trim: true,
        default: '',
      },
      dataUrl: {
        type: String,
        trim: true,
        default: '',
      },
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Rejected'],
      default: 'Pending',
    },
    adminNote: {
      type: String,
      trim: true,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: null,
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

paymentSchema.index({ studentUser: 1, monthKey: 1 }, { unique: true });
paymentSchema.index({ grade: 1, status: 1, monthKey: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
