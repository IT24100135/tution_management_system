const mongoose = require('mongoose');

const examMarkSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    absent: {
      type: Boolean,
      default: false,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

examMarkSchema.index({ exam: 1, student: 1, subject: 1 }, { unique: true });
examMarkSchema.index({ exam: 1, subject: 1 });

module.exports = mongoose.model('ExamMark', examMarkSchema);
