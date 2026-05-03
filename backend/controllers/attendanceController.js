const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const User = require('../models/User');

const TIMEZONE = 'Asia/Colombo';
const TIMETABLE_POPULATE = 'name subject grade code';
const ENROLLMENT_STUDENT_POPULATE = 'firstName lastName email userId';
const ENROLLMENT_COURSE_POPULATE = 'name subject grade';

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

const compareTimes = (firstTime, secondTime) => (
  String(firstTime || '').localeCompare(String(secondTime || ''))
);

const getLocalDateParts = (dateValue = new Date()) => {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateParts = dateFormatter.formatToParts(dateValue);
  const year = dateParts.find((part) => part.type === 'year')?.value || '';
  const month = dateParts.find((part) => part.type === 'month')?.value || '';
  const day = dateParts.find((part) => part.type === 'day')?.value || '';
  const dateKey = [year, month, day].filter(Boolean).join('-');
  const monthKey = [year, month].filter(Boolean).join('-');
  const dayOfWeek = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'long',
  }).format(dateValue);
  const timeValue = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dateValue);
  const timeLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(dateValue);
  const fullDateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(dateValue);

  return {
    dateKey,
    monthKey,
    dayOfWeek,
    timeValue,
    timeLabel,
    fullDateLabel,
  };
};

const getStudentProfileForUser = async (user) => {
  if (!user?.email) return null;

  return Student.findOne({ email: user.email.toLowerCase() }).select('_id userId firstName lastName email');
};

const buildStudentName = (studentProfile, studentUser) => {
  const profileName = `${studentProfile?.firstName || ''} ${studentProfile?.lastName || ''}`.trim();
  return profileName || studentUser?.name || '';
};

const getTutorEntriesForToday = async (user, dayOfWeek) => {
  const allEntries = await Timetable.find({ dayOfWeek })
    .populate('courseId', TIMETABLE_POPULATE)
    .sort({ startTime: 1, endTime: 1, createdAt: 1 });

  const normalizedTutorName = normalizeText(user?.name);
  const normalizedSubject = normalizeText(user?.subject);

  const tutorNameMatches = allEntries.filter((entry) => normalizeText(entry.tutorName) === normalizedTutorName);
  if (tutorNameMatches.length > 0) {
    return tutorNameMatches;
  }

  return allEntries.filter((entry) => {
    const entrySubject = normalizeText(entry.subject || entry.courseId?.subject || entry.title);
    return Boolean(normalizedSubject) && entrySubject === normalizedSubject;
  });
};

const getRosterForTimetableEntry = async (entry) => {
  const directCourseId = entry?.courseId?._id || entry?.courseId || null;

  if (directCourseId) {
    const enrollments = await Enrollment.find({
      course: directCourseId,
      status: 'enrolled',
    })
      .populate('student', ENROLLMENT_STUDENT_POPULATE)
      .populate('course', ENROLLMENT_COURSE_POPULATE)
      .sort({ createdAt: 1 });

    return enrollments
      .filter((enrollment) => enrollment.student)
      .map((enrollment) => ({
        studentProfileId: String(enrollment.student._id),
        studentUserId: enrollment.student.userId ? String(enrollment.student.userId) : '',
        studentName: buildStudentName(enrollment.student, null),
        email: enrollment.student.email || '',
      }));
  }

  const grade = String(entry?.grade || '').trim();
  if (!grade) return [];

  const studentUsers = await User.find({
    role: 'student',
    grade,
    approvalStatus: 'approved',
  }).select('_id name email grade');

  const studentProfiles = await Student.find({
    $or: [
      { userId: { $in: studentUsers.map((studentUser) => studentUser._id) } },
      { email: { $in: studentUsers.map((studentUser) => studentUser.email) } },
    ],
  }).select('_id userId firstName lastName email');

  const profileByUserId = new Map(
    studentProfiles
      .filter((profile) => profile.userId)
      .map((profile) => [String(profile.userId), profile])
  );
  const profileByEmail = new Map(studentProfiles.map((profile) => [String(profile.email || '').toLowerCase(), profile]));

  return studentUsers.map((studentUser) => {
    const matchedProfile = profileByUserId.get(String(studentUser._id))
      || profileByEmail.get(String(studentUser.email || '').toLowerCase())
      || null;

    return {
      studentProfileId: matchedProfile ? String(matchedProfile._id) : '',
      studentUserId: String(studentUser._id),
      studentName: buildStudentName(matchedProfile, studentUser),
      email: studentUser.email || '',
    };
  }).filter((student) => student.studentProfileId);
};

const buildSessionCard = async ({ entry, attendanceDate, currentTimeValue }) => {
  const roster = await getRosterForTimetableEntry(entry);
  const existingCount = await Attendance.countDocuments({
    timetableEntry: entry._id,
    attendanceDate,
  });

  return {
    id: String(entry._id),
    title: entry.title || entry.courseId?.name || entry.subject || 'Class Session',
    subject: entry.subject || entry.courseId?.subject || '',
    grade: entry.grade || entry.courseId?.grade || '',
    room: entry.room || '',
    startTime: entry.startTime,
    endTime: entry.endTime,
    isCurrent: compareTimes(entry.startTime, currentTimeValue) <= 0 && compareTimes(entry.endTime, currentTimeValue) >= 0,
    isUpcoming: compareTimes(entry.startTime, currentTimeValue) > 0,
    isMarked: existingCount > 0,
    studentCount: roster.length,
  };
};

const buildTutorAttendancePayload = async (user) => {
  const nowParts = getLocalDateParts();
  const todayEntries = await getTutorEntriesForToday(user, nowParts.dayOfWeek);

  const todaySessions = [];
  for (const entry of todayEntries) {
    // Keep session cards aligned to the real timetable order and status for today.
    todaySessions.push(await buildSessionCard({
      entry,
      attendanceDate: nowParts.dateKey,
      currentTimeValue: nowParts.timeValue,
    }));
  }

  const nextSessionCard = todaySessions.find((session) => !session.isMarked && (session.isCurrent || session.isUpcoming))
    || todaySessions.find((session) => !session.isMarked)
    || null;

  let rows = [];
  if (nextSessionCard) {
    const matchedEntry = todayEntries.find((entry) => String(entry._id) === nextSessionCard.id);
    const roster = matchedEntry ? await getRosterForTimetableEntry(matchedEntry) : [];
    rows = roster.map((student) => ({
      studentId: student.studentProfileId,
      studentUserId: student.studentUserId,
      studentName: student.studentName,
      email: student.email,
      status: 'Present',
    }));
  }

  return {
    serverNow: nowParts,
    todaySessions,
    session: nextSessionCard,
    rows,
  };
};

const getTutorAttendanceSession = async (req, res, next) => {
  try {
    const payload = await buildTutorAttendancePayload(req.user);

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

const submitTutorAttendance = async (req, res, next) => {
  try {
    const timetableEntry = await Timetable.findById(req.params.id).populate('courseId', TIMETABLE_POPULATE);
    if (!timetableEntry) {
      return res.status(404).json({ message: 'Timetable session not found.' });
    }

    const nowParts = getLocalDateParts();
    const tutorEntries = await getTutorEntriesForToday(req.user, nowParts.dayOfWeek);
    const canManageSession = tutorEntries.some((entry) => String(entry._id) === String(timetableEntry._id));

    if (!canManageSession) {
      return res.status(403).json({ message: 'You can only mark attendance for your own timetable session today.' });
    }

    const roster = await getRosterForTimetableEntry(timetableEntry);
    if (roster.length === 0) {
      return res.status(400).json({ message: 'No enrolled students were found for this timetable session.' });
    }

    const submittedEntries = Array.isArray(req.body.entries) ? req.body.entries : [];
    const rosterByStudentId = new Map(roster.map((student) => [student.studentProfileId, student]));
    const invalidStudent = submittedEntries.find((entry) => !rosterByStudentId.has(String(entry.studentId || '').trim()));

    if (invalidStudent) {
      return res.status(400).json({ message: 'Attendance entries must match the class roster for this session.' });
    }

    const nextAttendanceRows = roster.map((student) => {
      const matchedEntry = submittedEntries.find((entry) => String(entry.studentId) === student.studentProfileId);
      return {
        studentProfile: student.studentProfileId,
        studentUser: student.studentUserId || null,
        status: matchedEntry?.status || 'Present',
      };
    });

    await Attendance.deleteMany({
      timetableEntry: timetableEntry._id,
      attendanceDate: nowParts.dateKey,
    });

    await Attendance.insertMany(
      nextAttendanceRows.map((attendanceRow) => ({
        timetableEntry: timetableEntry._id,
        courseId: timetableEntry.courseId?._id || timetableEntry.courseId || null,
        tutorUser: req.user._id,
        studentProfile: attendanceRow.studentProfile,
        studentUser: attendanceRow.studentUser,
        attendanceDate: nowParts.dateKey,
        monthKey: nowParts.monthKey,
        dayOfWeek: nowParts.dayOfWeek,
        startTime: timetableEntry.startTime,
        endTime: timetableEntry.endTime,
        subject: timetableEntry.subject || timetableEntry.courseId?.subject || timetableEntry.title || '',
        grade: timetableEntry.grade || timetableEntry.courseId?.grade || '',
        room: timetableEntry.room || '',
        status: attendanceRow.status,
        recordedAt: new Date(),
      }))
    );

    const payload = await buildTutorAttendancePayload(req.user);
    return res.status(200).json({
      message: 'Attendance saved successfully.',
      ...payload,
    });
  } catch (error) {
    return next(error);
  }
};

const normalizeAttendanceRecord = (record) => ({
  id: String(record._id),
  attendanceDate: record.attendanceDate,
  monthKey: record.monthKey,
  dayOfWeek: record.dayOfWeek,
  startTime: record.startTime,
  endTime: record.endTime,
  subject: record.subject || record.courseId?.subject || '',
  grade: record.grade || record.courseId?.grade || '',
  room: record.room || '',
  status: record.status,
  recordedAt: record.recordedAt || record.createdAt,
  timetableId: record.timetableEntry?._id ? String(record.timetableEntry._id) : String(record.timetableEntry || ''),
});

const getMyAttendance = async (req, res, next) => {
  try {
    const studentProfile = await getStudentProfileForUser(req.user);
    if (!studentProfile) {
      return res.status(200).json({
        count: 0,
        records: [],
        summary: {
          totalClasses: 0,
          presentClasses: 0,
          absentClasses: 0,
          attendancePercentage: 0,
        },
      });
    }

    const query = { studentProfile: studentProfile._id };
    if (req.query.monthKey && /^\d{4}-\d{2}$/.test(String(req.query.monthKey).trim())) {
      query.monthKey = String(req.query.monthKey).trim();
    }

    const records = await Attendance.find(query)
      .populate('courseId', TIMETABLE_POPULATE)
      .populate('timetableEntry', 'title subject grade room startTime endTime')
      .sort({ attendanceDate: -1, startTime: -1, createdAt: -1 });

    const normalizedRecords = records.map(normalizeAttendanceRecord);
    const presentClasses = normalizedRecords.filter((record) => record.status === 'Present').length;
    const absentClasses = normalizedRecords.filter((record) => record.status === 'Absent').length;
    const totalClasses = normalizedRecords.length;
    const attendancePercentage = totalClasses > 0
      ? Math.round((presentClasses / totalClasses) * 100)
      : 0;

    return res.status(200).json({
      count: normalizedRecords.length,
      records: normalizedRecords,
      summary: {
        totalClasses,
        presentClasses,
        absentClasses,
        attendancePercentage,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getTutorAttendanceSession,
  submitTutorAttendance,
  getMyAttendance,
};
