const Timetable = require('../models/Timetable');
const TIMETABLE_COURSE_POPULATE = 'name subject grade';

const normalizeTimetableValue = (value) => String(value || '').trim().toLowerCase();

const getConflictEntryLabel = (entry) => String(
  entry?.subject || entry?.title || entry?.courseId?.subject || entry?.courseId?.name || 'another class'
).trim();

const findTimetableResourceConflict = async ({
  excludeId,
  dayOfWeek,
  startTime,
  endTime,
  room,
  tutorName,
}) => {
  const query = { dayOfWeek, startTime, endTime };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const entriesAtSameTime = await Timetable.find(query).select('title subject room tutorName');
  const normalizedRoom = normalizeTimetableValue(room);
  const normalizedTutorName = normalizeTimetableValue(tutorName);

  if (normalizedRoom) {
    const hallConflict = entriesAtSameTime.find((entry) => (
      normalizeTimetableValue(entry.room) === normalizedRoom
    ));

    if (hallConflict) {
      return {
        field: 'room',
        message: `Hall ${room} is already assigned to ${getConflictEntryLabel(hallConflict)} on ${dayOfWeek} from ${startTime} to ${endTime}.`,
      };
    }
  }

  if (normalizedTutorName) {
    const tutorConflict = entriesAtSameTime.find((entry) => (
      normalizeTimetableValue(entry.tutorName) === normalizedTutorName
    ));

    if (tutorConflict) {
      return {
        field: 'tutorName',
        message: `Tutor ${tutorName} is already assigned to ${getConflictEntryLabel(tutorConflict)} on ${dayOfWeek} from ${startTime} to ${endTime}.`,
      };
    }
  }

  return null;
};

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

    const resourceConflict = await findTimetableResourceConflict({
      dayOfWeek,
      startTime,
      endTime,
      room,
      tutorName,
    });

    if (resourceConflict) {
      return res.status(409).json(resourceConflict);
    }

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

    const resourceConflict = await findTimetableResourceConflict({
      excludeId: entry._id,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room,
      tutorName: entry.tutorName,
    });

    if (resourceConflict) {
      return res.status(409).json(resourceConflict);
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
