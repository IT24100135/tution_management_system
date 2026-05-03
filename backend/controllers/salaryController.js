const Salary = require('../models/Salary');
const User = require('../models/User');
const Timetable = require('../models/Timetable');

const SALARY_TUTOR_POPULATE = 'name email subject role approvalStatus';

const buildMonthLabel = (monthKey) => {
  const [yearText, monthText] = String(monthKey || '').split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return String(monthKey || '').trim();
  }

  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const buildMonthKey = (dateValue = new Date()) => {
  const parsedDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return [
    parsedDate.getFullYear(),
    String(parsedDate.getMonth() + 1).padStart(2, '0'),
  ].join('-');
};

const getRecentMonthKeys = (count = 3) => Array.from({ length: count }, (_, index) => {
  const dateValue = new Date();
  dateValue.setMonth(dateValue.getMonth() - index);
  return buildMonthKey(dateValue);
});

const countWeekdayOccurrences = (yearValue, monthValue, dayName) => {
  const year = Number(yearValue);
  const month = Number(monthValue);
  const dayIndexMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const targetDayIndex = dayIndexMap[dayName];

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(targetDayIndex)) {
    return 0;
  }

  const totalDays = new Date(year, month, 0).getDate();
  let count = 0;
  for (let day = 1; day <= totalDays; day += 1) {
    if (new Date(year, month - 1, day).getDay() === targetDayIndex) {
      count += 1;
    }
  }
  return count;
};

const getDurationHours = (startTime, endTime) => {
  const [startHour, startMinute] = String(startTime || '').split(':').map(Number);
  const [endHour, endMinute] = String(endTime || '').split(':').map(Number);

  if (![startHour, startMinute, endHour, endMinute].every(Number.isInteger)) {
    return 0;
  }

  const startTotalMinutes = (startHour * 60) + startMinute;
  const endTotalMinutes = (endHour * 60) + endMinute;
  return Math.max(0, endTotalMinutes - startTotalMinutes) / 60;
};

const estimateTutorRatePerHour = (subject) => {
  const premiumSubjects = ['mathematics', 'maths', 'science', 'ict'];
  const normalizedSubject = String(subject || '').trim().toLowerCase();
  return premiumSubjects.includes(normalizedSubject) ? 800 : 700;
};

const normalizeSalary = (salary) => ({
  id: salary._id,
  monthKey: salary.monthKey,
  monthLabel: salary.monthLabel,
  subject: salary.subject || salary.tutorUser?.subject || '',
  hours: salary.hours || 0,
  ratePerHour: salary.ratePerHour || 0,
  amount: salary.amount || 0,
  status: salary.status || 'Pending',
  adminNote: salary.adminNote || '',
  createdAt: salary.createdAt,
  reviewedAt: salary.reviewedAt,
  tutor: {
    id: salary.tutorUser?._id || '',
    name: salary.tutorUser?.name || 'Tutor',
    email: salary.tutorUser?.email || '',
    subject: salary.tutorUser?.subject || salary.subject || '',
  },
});

const buildSalaryPayloadForTutor = (tutor, timetableEntries, monthKey) => {
  const [yearText, monthText] = String(monthKey || '').split('-');
  const subject = String(tutor.subject || '').trim();
  const relevantEntries = timetableEntries.filter((entry) => (
    String(entry.tutorName || '').trim().toLowerCase() === String(tutor.name || '').trim().toLowerCase()
  ));

  const hours = relevantEntries.reduce((sum, entry) => (
    sum + (
      getDurationHours(entry.startTime, entry.endTime)
      * countWeekdayOccurrences(yearText, monthText, entry.dayOfWeek)
    )
  ), 0);
  const roundedHours = Math.round(hours * 10) / 10;
  const ratePerHour = estimateTutorRatePerHour(subject);
  const amount = Math.round(roundedHours * ratePerHour);

  return {
    tutorUser: tutor._id,
    monthKey,
    monthLabel: buildMonthLabel(monthKey),
    subject,
    hours: roundedHours,
    ratePerHour,
    amount,
    status: roundedHours > 0 ? 'Pending' : 'Inactive',
  };
};

const ensureSalaryRecordsForMonths = async (monthKeys = []) => {
  const normalizedMonthKeys = Array.from(new Set(monthKeys.filter((monthKey) => /^\d{4}-\d{2}$/.test(String(monthKey || '').trim()))));
  if (normalizedMonthKeys.length === 0) {
    return [];
  }

  const tutors = await User.find({
    role: 'teacher',
    approvalStatus: 'approved',
  }).select('name email subject role approvalStatus');
  const timetableEntries = await Timetable.find({}).select('tutorName dayOfWeek startTime endTime');

  await Promise.all(normalizedMonthKeys.flatMap((monthKey) => (
    tutors.map(async (tutor) => {
      const salaryPayload = buildSalaryPayloadForTutor(tutor, timetableEntries, monthKey);
      const existingSalary = await Salary.findOne({
        tutorUser: tutor._id,
        monthKey,
      });

      if (existingSalary) {
        existingSalary.monthLabel = salaryPayload.monthLabel;
        existingSalary.subject = salaryPayload.subject;
        existingSalary.hours = salaryPayload.hours;
        existingSalary.ratePerHour = salaryPayload.ratePerHour;
        existingSalary.amount = salaryPayload.amount;
        if (existingSalary.status !== 'Paid') {
          existingSalary.status = salaryPayload.status;
        }
        await existingSalary.save();
      } else {
        await Salary.create(salaryPayload);
      }
    })
  )));

  return normalizedMonthKeys;
};

const getSalaryRecords = async (req, res, next) => {
  try {
    const { monthKey, status } = req.query;
    const query = {};

    if (req.user && req.user.role === 'teacher') {
      query.tutorUser = req.user._id;
    }

    if (status && ['Pending', 'Paid', 'Inactive'].includes(status)) {
      query.status = status;
    }

    if (monthKey && /^\d{4}-\d{2}$/.test(String(monthKey).trim())) {
      query.monthKey = String(monthKey).trim();
      await ensureSalaryRecordsForMonths([query.monthKey]);
    } else {
      await ensureSalaryRecordsForMonths(getRecentMonthKeys(3));
    }

    const salaries = await Salary.find(query)
      .populate('tutorUser', SALARY_TUTOR_POPULATE)
      .sort({ monthKey: -1, createdAt: -1 });

    return res.status(200).json({
      count: salaries.length,
      salaries: salaries.map(normalizeSalary),
    });
  } catch (error) {
    return next(error);
  }
};

const syncSalaryRecords = async (req, res, next) => {
  try {
    const monthKey = String(req.body.monthKey || '').trim() || buildMonthKey(new Date());
    await ensureSalaryRecordsForMonths([monthKey]);

    const salaries = await Salary.find({ monthKey })
      .populate('tutorUser', SALARY_TUTOR_POPULATE)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'Salary records synced successfully.',
      count: salaries.length,
      salaries: salaries.map(normalizeSalary),
    });
  } catch (error) {
    return next(error);
  }
};

const updateSalaryStatus = async (req, res, next) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found.' });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      salary.status = req.body.status;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'adminNote')) {
      salary.adminNote = String(req.body.adminNote || '').trim();
    }

    salary.reviewedAt = new Date();
    salary.reviewedBy = req.user._id;
    await salary.save();

    const updatedSalary = await Salary.findById(salary._id)
      .populate('tutorUser', SALARY_TUTOR_POPULATE);

    return res.status(200).json({
      message: 'Salary status updated successfully.',
      salary: normalizeSalary(updatedSalary),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSalaryRecords,
  syncSalaryRecords,
  updateSalaryStatus,
};
