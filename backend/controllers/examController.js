const Exam = require('../models/Exam');
const ExamMark = require('../models/ExamMark');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const User = require('../models/User');

const EXAM_TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3'];
const FALLBACK_SUBJECTS_BY_GRADE = {
  'Grade 6': ['Tamil', 'Mathematics', 'Religion', 'Science', 'History', 'Geography', 'Civics', 'Sinhala', 'English', 'ICT', 'Health Science'],
  'Grade 7': ['Tamil', 'Mathematics', 'Religion', 'Science', 'History', 'Geography', 'Civics', 'Sinhala', 'English', 'ICT', 'Health Science'],
  'Grade 8': ['Tamil', 'Mathematics', 'Religion', 'Science', 'History', 'Geography', 'Civics', 'Sinhala', 'English', 'ICT', 'Health Science'],
  'Grade 9': ['Tamil', 'Mathematics', 'Religion', 'Science', 'History', 'Geography', 'Civics', 'Sinhala', 'English', 'ICT', 'Health Science'],
  'Grade 10': ['Tamil', 'Religion', 'Mathematics', 'Science', 'History', 'English', 'Commerce', 'Geography', 'Civics', 'Sinhala', 'ICT', 'Health Science'],
  'Grade 11': ['Tamil', 'Religion', 'Mathematics', 'Science', 'History', 'English', 'Commerce', 'Geography', 'Civics', 'Sinhala', 'ICT', 'Health Science'],
};
const TERM_DEFAULT_DATES = {
  'Term 1': '03-15',
  'Term 2': '07-15',
  'Term 3': '11-15',
};

const normalizeSubjectName = (subject) => String(subject || '').trim();
const normalizeSubjectKey = (subject) => normalizeSubjectName(subject).toLowerCase();
const buildStudentDisplayName = (student) => [student?.firstName, student?.lastName].filter(Boolean).join(' ').trim() || 'Student';

const buildExamTitle = (grade, term) => `${grade} ${term} Examination`;

const buildDefaultExamDate = (term, academicYear) => {
  const year = Number(academicYear) || new Date().getFullYear();
  const monthDay = TERM_DEFAULT_DATES[term] || '03-15';
  return new Date(`${year}-${monthDay}T00:00:00.000Z`);
};

const normalizeExam = (exam) => ({
  id: exam._id,
  title: exam.title,
  grade: exam.grade,
  term: exam.term,
  academicYear: exam.academicYear,
  examDate: exam.examDate,
  subjects: Array.isArray(exam.subjects) ? exam.subjects : [],
  createdAt: exam.createdAt,
  updatedAt: exam.updatedAt,
});

const getStudentProfileForUser = async (user) => {
  if (!user) return null;

  return Student.findOne({
    $or: [
      { userId: user._id },
      { email: String(user.email || '').toLowerCase() },
    ],
  });
};

const getCoursesForGrade = async (grade) => Course.find({
  grade: String(grade || '').trim(),
  status: 'active',
}).select('_id subject grade');

const resolveSubjectsForGrade = async (grade) => {
  const courses = await getCoursesForGrade(grade);
  const courseSubjects = Array.from(new Set(
    courses
      .map((course) => normalizeSubjectName(course.subject || course.name))
      .filter(Boolean)
  ));
  const fallbackSubjects = FALLBACK_SUBJECTS_BY_GRADE[String(grade || '').trim()] || [];
  const mergedSubjects = Array.from(new Set([
    ...fallbackSubjects,
    ...courseSubjects,
  ])).filter(Boolean);

  if (mergedSubjects.length > 0) {
    return mergedSubjects.sort((firstSubject, secondSubject) => firstSubject.localeCompare(secondSubject));
  }

  return [];
};

const resolveStudentGradeForUser = async (user) => {
  const explicitGrade = String(user?.grade || '').trim();
  if (explicitGrade) {
    return explicitGrade;
  }

  const studentProfile = await getStudentProfileForUser(user);
  if (!studentProfile) {
    return '';
  }

  const enrollments = await Enrollment.find({
    student: studentProfile._id,
    status: { $in: ['enrolled', 'completed'] },
  }).populate('course', 'grade');

  const courseGrade = enrollments.find((enrollment) => String(enrollment.course?.grade || '').trim())?.course?.grade || '';
  return String(courseGrade || '').trim();
};

const ensureExamRecord = async ({ grade, term, academicYear, actorId }) => {
  const normalizedGrade = String(grade || '').trim();
  const normalizedTerm = String(term || '').trim();
  const normalizedYear = Number(academicYear) || new Date().getFullYear();

  if (!normalizedGrade || !EXAM_TERM_OPTIONS.includes(normalizedTerm)) {
    return null;
  }

  const subjects = await resolveSubjectsForGrade(normalizedGrade);
  const existingExam = await Exam.findOne({
    grade: normalizedGrade,
    term: normalizedTerm,
    academicYear: normalizedYear,
  });

  if (existingExam) {
    const mergedSubjects = Array.from(new Set([
      ...(Array.isArray(existingExam.subjects) ? existingExam.subjects : []),
      ...subjects,
    ])).filter(Boolean);

    existingExam.title = buildExamTitle(normalizedGrade, normalizedTerm);
    existingExam.subjects = mergedSubjects;
    existingExam.updatedBy = actorId || existingExam.updatedBy || null;
    await existingExam.save();
    return existingExam;
  }

  return Exam.create({
    title: buildExamTitle(normalizedGrade, normalizedTerm),
    grade: normalizedGrade,
    term: normalizedTerm,
    academicYear: normalizedYear,
    examDate: buildDefaultExamDate(normalizedTerm, normalizedYear),
    subjects,
    createdBy: actorId || null,
    updatedBy: actorId || null,
  });
};

const getRosterForGrade = async (grade) => {
  const normalizedGrade = String(grade || '').trim();
  if (!normalizedGrade) {
    return [];
  }

  const courses = await getCoursesForGrade(normalizedGrade);
  const courseIds = courses.map((course) => course._id);
  const enrolledStudentIds = courseIds.length > 0
    ? await Enrollment.find({
      course: { $in: courseIds },
      status: { $in: ['enrolled', 'completed'] },
    }).distinct('student')
    : [];
  const studentUsersForGrade = await User.find({
    role: 'student',
    approvalStatus: 'approved',
    grade: normalizedGrade,
  }).select('_id email');
  const studentUserIds = studentUsersForGrade.map((studentUser) => studentUser._id);
  const studentEmails = studentUsersForGrade
    .map((studentUser) => String(studentUser.email || '').toLowerCase())
    .filter(Boolean);

  const students = await Student.find({
    status: 'active',
    $or: [
      { _id: { $in: enrolledStudentIds } },
      { userId: { $in: studentUserIds } },
      { email: { $in: studentEmails } },
    ],
  }).sort({ firstName: 1, lastName: 1 });

  return students;
};

const buildGradebookPayload = async (exam) => {
  const roster = await getRosterForGrade(exam.grade);
  const marks = await ExamMark.find({ exam: exam._id }).select('student subject score absent');
  const subjects = Array.isArray(exam.subjects) ? exam.subjects : [];
  const highestBySubject = subjects.reduce((result, subject) => {
    result[subject] = 0;
    return result;
  }, {});

  const marksByStudent = new Map();
  marks.forEach((mark) => {
    const studentId = String(mark.student);
    const currentStudentMarks = marksByStudent.get(studentId) || {};
    currentStudentMarks[mark.subject] = mark.absent ? 'Absent' : (typeof mark.score === 'number' ? Number(mark.score) : null);
    marksByStudent.set(studentId, currentStudentMarks);
    if (!mark.absent && typeof mark.score === 'number') {
      if (Object.prototype.hasOwnProperty.call(highestBySubject, mark.subject)) {
        highestBySubject[mark.subject] = Math.max(highestBySubject[mark.subject], Number(mark.score) || 0);
      } else {
        highestBySubject[mark.subject] = Number(mark.score) || 0;
      }
    }
  });

  const rows = roster.map((student) => {
    const studentId = String(student._id);
    const subjectMarks = marksByStudent.get(studentId) || {};
    const marksMap = subjects.reduce((result, subject) => {
      result[subject] = Object.prototype.hasOwnProperty.call(subjectMarks, subject) ? subjectMarks[subject] : null;
      return result;
    }, {});

    const scoredMarks = Object.values(marksMap).filter((score) => typeof score === 'number');
    const total = scoredMarks.reduce((sum, score) => sum + score, 0);
    const average = scoredMarks.length > 0 ? Math.round((total / scoredMarks.length) * 10) / 10 : 0;

    return {
      studentId,
      studentName: buildStudentDisplayName(student),
      marks: marksMap,
      total,
      average,
      rank: 0,
    };
  });

  const rankedRows = [...rows]
    .sort((firstRow, secondRow) => (
      (secondRow.total - firstRow.total)
      || (secondRow.average - firstRow.average)
      || firstRow.studentName.localeCompare(secondRow.studentName)
    ))
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const rankByStudent = new Map(rankedRows.map((row) => [row.studentId, row.rank]));
  const displayRows = rows
    .map((row) => ({ ...row, rank: rankByStudent.get(row.studentId) || 0 }))
    .sort((firstRow, secondRow) => firstRow.rank - secondRow.rank || firstRow.studentName.localeCompare(secondRow.studentName));

  return {
    exam: normalizeExam(exam),
    subjects,
    highestBySubject,
    rows: displayRows,
    totalStudents: displayRows.length,
  };
};

const getExams = async (req, res, next) => {
  try {
    const query = {};
    const grade = String(req.query.grade || '').trim();
    const term = String(req.query.term || '').trim();
    const academicYear = Number(req.query.academicYear) || new Date().getFullYear();

    if (grade && term) {
      await ensureExamRecord({
        grade,
        term,
        academicYear,
        actorId: req.user?._id || null,
      });
    }

    if (req.user?.role === 'student') {
      const studentGrade = await resolveStudentGradeForUser(req.user);
      if (studentGrade) {
        query.grade = studentGrade;
      }
    } else if (grade) {
      query.grade = grade;
    }

    if (term && EXAM_TERM_OPTIONS.includes(term)) {
      query.term = term;
    }

    if (academicYear) {
      query.academicYear = academicYear;
    }

    const exams = await Exam.find(query).sort({ academicYear: -1, examDate: 1, grade: 1 });
    return res.status(200).json({
      count: exams.length,
      exams: exams.map(normalizeExam),
    });
  } catch (error) {
    return next(error);
  }
};

const getExamEntry = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    const requestedSubject = normalizeSubjectName(req.query.subject);
    const editableSubject = req.user?.role === 'teacher'
      ? normalizeSubjectName(req.user.subject)
      : requestedSubject;

    if (!editableSubject) {
      return res.status(400).json({ message: 'Subject is required for mark entry.' });
    }

    const availableSubjects = Array.isArray(exam.subjects) ? exam.subjects : [];
    const matchedSubject = availableSubjects.find((subject) => normalizeSubjectKey(subject) === normalizeSubjectKey(editableSubject));
    if (!matchedSubject) {
      return res.status(400).json({ message: 'This subject is not available for the selected exam.' });
    }

    const roster = await getRosterForGrade(exam.grade);
    const marks = await ExamMark.find({
      exam: exam._id,
      subject: matchedSubject,
      student: { $in: roster.map((student) => student._id) },
    }).select('student score absent');
    const markByStudent = new Map(marks.map((mark) => [String(mark.student), {
      score: typeof mark.score === 'number' ? Number(mark.score) : null,
      absent: Boolean(mark.absent),
    }]));

    return res.status(200).json({
      exam: normalizeExam(exam),
      subject: matchedSubject,
      rows: roster.map((student) => ({
        studentId: student._id,
        studentName: buildStudentDisplayName(student),
        score: markByStudent.has(String(student._id)) ? markByStudent.get(String(student._id)).score : null,
        absent: markByStudent.has(String(student._id)) ? markByStudent.get(String(student._id)).absent : false,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

const saveExamMarks = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    const requestedSubject = normalizeSubjectName(req.body.subject);
    const editableSubject = req.user?.role === 'teacher'
      ? normalizeSubjectName(req.user.subject)
      : requestedSubject;

    if (!editableSubject) {
      return res.status(400).json({ message: 'Subject is required for mark entry.' });
    }

    if (!Array.isArray(req.body.entries) || req.body.entries.length === 0) {
      return res.status(400).json({ message: 'At least one mark entry is required.' });
    }

    const matchedSubject = Array.isArray(exam.subjects)
      ? exam.subjects.find((subject) => normalizeSubjectKey(subject) === normalizeSubjectKey(editableSubject))
      : '';

    if (!matchedSubject) {
      return res.status(400).json({ message: 'This subject is not available for the selected exam.' });
    }

    const roster = await getRosterForGrade(exam.grade);
    const validStudentIds = new Set(roster.map((student) => String(student._id)));

    await Promise.all(req.body.entries.map(async (entry) => {
      const studentId = String(entry.studentId || '').trim();
      const absent = Boolean(entry.absent);
      if (!studentId || !validStudentIds.has(studentId)) {
        return;
      }

      if (!absent && (entry.score === '' || entry.score === null || entry.score === undefined)) {
        await ExamMark.findOneAndDelete({
          exam: exam._id,
          student: studentId,
          subject: matchedSubject,
        });
        return;
      }

      const score = Number(entry.score);
      if (!absent && (Number.isNaN(score) || score < 0 || score > 100)) {
        return;
      }

      await ExamMark.findOneAndUpdate(
        {
          exam: exam._id,
          student: studentId,
          subject: matchedSubject,
        },
        {
          exam: exam._id,
          student: studentId,
          subject: matchedSubject,
          score: absent ? null : score,
          absent,
          enteredBy: req.user._id,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }));

    const refreshedEntry = await getExamEntry({
      ...req,
      query: { subject: matchedSubject },
      params: { id: exam._id },
    }, res, next);

    return refreshedEntry;
  } catch (error) {
    return next(error);
  }
};

const getExamGradebook = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    const gradebook = await buildGradebookPayload(exam);
    return res.status(200).json(gradebook);
  } catch (error) {
    return next(error);
  }
};

const getMyExamResults = async (req, res, next) => {
  try {
    const term = String(req.query.term || '').trim() || 'Term 1';
    const academicYear = Number(req.query.academicYear) || new Date().getFullYear();
    const grade = await resolveStudentGradeForUser(req.user);

    if (!grade) {
      return res.status(200).json({
        exam: null,
        grade: '',
        total: 0,
        average: 0,
        rank: 0,
        highestBySubject: {},
        subjects: [],
      });
    }

    const exam = await ensureExamRecord({
      grade,
      term,
      academicYear,
      actorId: req.user?._id || null,
    });
    const studentProfile = await getStudentProfileForUser(req.user);

    if (!exam || !studentProfile) {
      return res.status(200).json({
        exam: exam ? normalizeExam(exam) : null,
        grade,
        total: 0,
        average: 0,
        rank: 0,
        highestBySubject: {},
        subjects: [],
      });
    }

    const gradebook = await buildGradebookPayload(exam);
    const studentRow = gradebook.rows.find((row) => row.studentId === String(studentProfile._id));

    return res.status(200).json({
      exam: gradebook.exam,
      grade,
      total: studentRow?.total || 0,
      average: studentRow?.average || 0,
      rank: studentRow?.rank || 0,
      totalStudents: gradebook.totalStudents || 0,
      highestBySubject: gradebook.highestBySubject,
      subjects: gradebook.subjects.map((subject) => ({
        subject,
        score: studentRow?.marks?.[subject] ?? null,
        highestScore: gradebook.highestBySubject?.[subject] ?? 0,
        absent: studentRow?.marks?.[subject] === 'Absent',
      })),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getExams,
  getExamEntry,
  saveExamMarks,
  getExamGradebook,
  getMyExamResults,
};
