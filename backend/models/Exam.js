const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    term: {
      type: String,
      enum: ['Term 1', 'Term 2', 'Term 3'],
      required: true,
      trim: true,
    },
    academicYear: {
      type: Number,
      required: true,
      min: 2000,
    },
    examDate: {
      type: Date,
      required: true,
    },
    subjects: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

examSchema.index({ grade: 1, term: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Exam', examSchema);
