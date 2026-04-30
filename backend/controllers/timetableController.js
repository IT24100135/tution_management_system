const Timetable = require('../models/Timetable');
const TIMETABLE_COURSE_POPULATE = 'name subject grade';

const createTimetableEntry = async (req, res, next) => {
  try {
    const {
      courseId,
      dayOfWeek,
      startTime,
      endTime,
      title,
      subject,
      grade,
      room,
      tutorName,
      notes,
    } = req.body;

    const entry = await Timetable.create({
      courseId,
      dayOfWeek,
      startTime,
      endTime,
      title,
      subject,
      grade,
      room,
      tutorName,
      notes,
      createdBy: req.user._id,
    });
    const populatedEntry = await Timetable.findById(entry._id).populate('courseId', TIMETABLE_COURSE_POPULATE);

    return res.status(201).json({
      message: 'Timetable entry created successfully.',
      timetable: populatedEntry,
    });
  } catch (error) {
    return next(error);
  }
};

const getTimetableEntries = async (req, res, next) => {
  try {
    const { dayOfWeek } = req.query;
    const query = {};

    if (dayOfWeek) {
      query.dayOfWeek = dayOfWeek;
    }

    const timetable = await Timetable.find(query)
      .populate('courseId', TIMETABLE_COURSE_POPULATE)
      .sort({ dayOrder: 1, startTime: 1, endTime: 1, createdAt: 1 });

    return res.status(200).json({
      count: timetable.length,
      timetable,
    });
  } catch (error) {
    return next(error);
  }
};

const getTimetableEntryById = async (req, res, next) => {
  try {
    const entry = await Timetable.findById(req.params.id).populate('courseId', TIMETABLE_COURSE_POPULATE);

    if (!entry) {
      return res.status(404).json({ message: 'Timetable entry not found.' });
    }

    return res.status(200).json({ timetable: entry });
  } catch (error) {
    return next(error);
  }
};

const updateTimetableEntry = async (req, res, next) => {
  try {
    const entry = await Timetable.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Timetable entry not found.' });
    }

    const fieldsToUpdate = [
      'courseId',
      'dayOfWeek',
      'startTime',
      'endTime',
      'title',
      'subject',
      'grade',
      'room',
      'tutorName',
      'notes',
    ];

    fieldsToUpdate.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        entry[field] = req.body[field];
      }
    });

    if (entry.startTime >= entry.endTime) {
      return res.status(400).json({ message: 'End time must be later than start time.' });
    }

    await entry.save();
    const updatedEntry = await Timetable.findById(entry._id).populate('courseId', TIMETABLE_COURSE_POPULATE);

    return res.status(200).json({
      message: 'Timetable entry updated successfully.',
      timetable: updatedEntry,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteTimetableEntry = async (req, res, next) => {
  try {
    const entry = await Timetable.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Timetable entry not found.' });
    }

    return res.status(200).json({ message: 'Timetable entry deleted successfully.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createTimetableEntry,
  getTimetableEntries,
  getTimetableEntryById,
  updateTimetableEntry,
  deleteTimetableEntry,
};
