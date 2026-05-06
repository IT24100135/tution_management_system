import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Modal,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { API_BASE_URL } from './src/config';

const TOKEN_KEY = 'auth_token';
const ANDROID_TOP_INSET = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
const TIMETABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ALL_GRADES_FILTER = 'All Grades';
const ALL_USER_ROLES_FILTER = 'All Roles';
const ALL_USER_STATUSES_FILTER = 'All Statuses';
const COURSE_GRADE_OPTIONS = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'];
const buildCourseSubjectOptions = (subjects, category = '') => (
  subjects.map((subject) => ({ label: subject, value: subject, category }))
);
const GRADE_6_TO_9_SUBJECT_OPTIONS = buildCourseSubjectOptions([
  'Tamil',
  'Mathematics',
  'Religion',
  'Science',
  'History',
  'Geography',
  'Civics',
  'Sinhala',
  'English',
  'ICT',
  'Health Science',
]);
const GRADE_10_11_SUBJECT_OPTIONS = [
  ...buildCourseSubjectOptions(
    ['Tamil', 'Religion', 'Mathematics', 'Science', 'History', 'English'],
    'Main Subjects',
  ),
  ...buildCourseSubjectOptions(
    ['Commerce', 'Geography', 'Civics', 'Sinhala'],
    'Choice 1 Subjects',
  ),
  ...buildCourseSubjectOptions(
    ['ICT', 'Health Science'],
    'Choice 2 Subjects',
  ),
];
const COURSE_SUBJECT_OPTIONS_BY_GRADE = {
  'Grade 6': GRADE_6_TO_9_SUBJECT_OPTIONS,
  'Grade 7': GRADE_6_TO_9_SUBJECT_OPTIONS,
  'Grade 8': GRADE_6_TO_9_SUBJECT_OPTIONS,
  'Grade 9': GRADE_6_TO_9_SUBJECT_OPTIONS,
  'Grade 10': GRADE_10_11_SUBJECT_OPTIONS,
  'Grade 11': GRADE_10_11_SUBJECT_OPTIONS,
};
const SENIOR_CHOICE_SUBJECTS = ['Commerce', 'Geography', 'Civics', 'Sinhala', 'ICT', 'Health Science'];
const PROJECT_SUBJECT_OPTIONS = Array.from(
  COURSE_GRADE_OPTIONS.reduce((subjectMap, grade) => {
    (COURSE_SUBJECT_OPTIONS_BY_GRADE[grade] || []).forEach((option) => {
      if (!subjectMap.has(option.value)) {
        subjectMap.set(option.value, { label: option.label, value: option.value });
      }
    });
    return subjectMap;
  }, new Map()).values(),
);
const BRAND_NAME = 'NKEC';
const TIMETABLE_HALL_OPTIONS = ['Hall 1', 'Hall 2', 'Hall 3', 'Hall 4', 'Hall 5'];
const SALARY_MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];
const TIMETABLE_TIME_SLOTS = [
  { start: '07:00', end: '08:00' },
  { start: '08:00', end: '09:00' },
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
  { start: '16:00', end: '17:00' },
  { start: '17:00', end: '18:00' },
];
const EXAM_TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3'];
const SUGGESTION_STATUS_OPTIONS = ['Open', 'In Review', 'Resolved', 'Closed'];
const SUGGESTION_MESSAGE_WORD_LIMIT = 150;
const LEAVE_REQUEST_STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected'];
const REQUEST_TIMEOUT_MS = 12000;
const ADMIN_TIMETABLE_LIMITED_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const ADMIN_TIMETABLE_FULL_ACCESS_DAYS = ['Saturday', 'Sunday'];
const ADMIN_TIMETABLE_ACCESS_START = '15:00';
const ADMIN_TIMETABLE_ACCESS_END = '18:00';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// API Helper
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const request = async (path, { method = 'GET', token, body } = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : {};
    if (!response.ok) {
      const requestError = new Error(data.message || 'Request failed');
      requestError.status = response.status;
      requestError.payload = data;
      throw requestError;
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1000)} seconds`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const splitFullName = (fullName) => {
  const trimmedName = String(fullName || '').trim();
  const nameParts = trimmedName.split(/\s+/).filter(Boolean);

  if (nameParts.length < 2) {
    return { firstName: '', lastName: '' };
  }

  return {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' '),
  };
};

const formatCourseLabel = (course) => {
  const subject = String(course?.subject || course?.name || '').trim();
  const grade = String(course?.grade || '').trim();
  return [subject, grade].filter(Boolean).join(' - ') || 'Untitled Class';
};

const sanitizeRegistrationName = (value) => String(value || '').replace(/[^A-Za-z\s]/g, '');
const isValidRegistrationName = (value) => /^[A-Za-z\s]+$/.test(String(value || '').trim());
const isStrongPassword = (value) => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/.test(String(value || ''));
const getPasswordRuleStatus = (value) => {
  const passwordValue = String(value || '');
  return {
    hasLetter: /[A-Za-z]/.test(passwordValue),
    hasNumber: /\d/.test(passwordValue),
    hasSpecialCharacter: /[^A-Za-z\d]/.test(passwordValue),
    hasMinLength: passwordValue.length >= 6,
  };
};

const normalizeSubjectKey = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ');

const parseGradeNumber = (grade) => {
  const match = String(grade || '').match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

const calculateStudentMonthlyFee = (grade, enrollments = []) => {
  const gradeNumber = parseGradeNumber(grade);

  if (gradeNumber >= 6 && gradeNumber <= 9) {
    return 3500;
  }

  if (gradeNumber === 10 || gradeNumber === 11) {
    const choiceSubjectCount = new Set(
      enrollments
        .filter((entry) => entry.status !== 'dropped')
        .map((entry) => normalizeSubjectKey(entry.course?.subject || entry.course?.name))
        .filter((subject) => SENIOR_CHOICE_SUBJECTS.some((option) => normalizeSubjectKey(option) === subject))
    ).size;

    return 3000 + (choiceSubjectCount * 300);
  }

  return enrollments.reduce((sum, entry) => (
    entry.status === 'dropped' ? sum : sum + (Number(entry.course?.fee) || 0)
  ), 0);
};

const formatLkr = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-LK')}`;
const countWords = (value) => {
  const trimmedValue = String(value || '').trim();
  return trimmedValue ? trimmedValue.split(/\s+/).filter(Boolean).length : 0;
};

const findCourseForTimetableEntry = (entry, courses = []) => {
  const directCourseId = entry?.courseId?._id || entry?.courseId || '';
  if (directCourseId) {
    const matchedById = courses.find((course) => String(course._id) === String(directCourseId));
    if (matchedById) return matchedById;
  }

  const title = String(entry?.title || '').trim();
  const subject = String(entry?.subject || '').trim();
  if (!title && !subject) return null;

  const titleMatches = title
    ? courses.filter((course) => {
      const courseName = String(course?.name || '').trim();
      const courseSubject = String(course?.subject || '').trim();
      const courseLabel = formatCourseLabel(course);
      return [courseLabel, courseName, courseSubject].includes(title);
    })
    : [];
  if (titleMatches.length === 1) {
    return titleMatches[0];
  }

  const subjectMatches = subject
    ? courses.filter((course) => {
      const courseName = String(course?.name || '').trim();
      const courseSubject = String(course?.subject || '').trim();
      return [courseName, courseSubject].includes(subject);
    })
    : [];
  if (subjectMatches.length === 1) {
    return subjectMatches[0];
  }

  return null;
};

const formatTimetableEntryTitle = (entry, courses = []) => {
  const matchedCourse = findCourseForTimetableEntry(entry, courses);
  if (matchedCourse) {
    return formatCourseLabel(matchedCourse);
  }

  const title = String(entry?.title || '').trim();
  const grade = String(entry?.grade || '').trim();
  if (title && grade && !title.includes(grade)) {
    return `${title} - ${grade}`;
  }

  return title || grade || 'Untitled Class';
};

const formatTimetableTime = (timeValue) => {
  const [hourText, minuteText] = String(timeValue || '').split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return String(timeValue || '');
  }

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const formatAppDate = (dateValue) => {
  const parsedDate = dateValue ? new Date(dateValue) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return '-';
  }
  return parsedDate.toLocaleDateString('en-CA');
};

const formatLongAppDate = (dateValue) => {
  const parsedDate = dateValue ? new Date(dateValue) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const buildPaymentMonthKey = (dateValue = new Date()) => {
  const parsedDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return [
    parsedDate.getFullYear(),
    String(parsedDate.getMonth() + 1).padStart(2, '0'),
  ].join('-');
};

const buildPaymentMonthLabel = (monthKey) => {
  const [yearText, monthText] = String(monthKey || '').split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return String(monthKey || '');
  }

  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const timeStringToMinutes = (timeValue) => {
  const [hourText, minuteText] = String(timeValue || '').split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return -1;
  }
  return (hour * 60) + minute;
};

const compareTimes = (firstTime, secondTime) => (
  timeStringToMinutes(firstTime) - timeStringToMinutes(secondTime)
);

const isAdminTimetableSlotAccessible = (day, startTime, endTime) => {
  if (ADMIN_TIMETABLE_FULL_ACCESS_DAYS.includes(day)) {
    return true;
  }

  if (day === 'Friday') {
    return false;
  }

  if (ADMIN_TIMETABLE_LIMITED_DAYS.includes(day)) {
    return (
      timeStringToMinutes(startTime) >= timeStringToMinutes(ADMIN_TIMETABLE_ACCESS_START)
      && timeStringToMinutes(endTime) <= timeStringToMinutes(ADMIN_TIMETABLE_ACCESS_END)
    );
  }

  return false;
};

const formatLiveClockTime = (dateValue = new Date()) => (
  new Date(dateValue).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
);

const buildMonthDateFromKey = (monthKey) => {
  const [yearText, monthText] = String(monthKey || '').split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return new Date();
  }

  return new Date(year, monthIndex, 1);
};

const buildAttendanceCalendar = ({ monthDate, records = [], todayDateKey = '' }) => {
  const baseDate = monthDate instanceof Date ? monthDate : new Date(monthDate);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstWeekDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const recordSummaryByDate = records.reduce((summaryMap, record) => {
    const dateKey = String(record.attendanceDate || '').trim();
    if (!dateKey) return summaryMap;

    const currentSummary = summaryMap.get(dateKey) || { present: 0, absent: 0 };
    if (record.status === 'Absent') {
      currentSummary.absent += 1;
    } else {
      currentSummary.present += 1;
    }
    summaryMap.set(dateKey, currentSummary);
    return summaryMap;
  }, new Map());

  const cells = [];
  for (let index = 0; index < firstWeekDay; index += 1) {
    cells.push({ key: `blank-${index}`, day: null, status: 'empty', dateKey: '' });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const summary = recordSummaryByDate.get(dateKey) || { present: 0, absent: 0 };
    let status = 'none';
    if (summary.present > 0 && summary.absent > 0) {
      status = 'mixed';
    } else if (summary.absent > 0) {
      status = 'absent';
    } else if (summary.present > 0) {
      status = 'present';
    }

    cells.push({
      key: dateKey,
      day,
      dateKey,
      status,
      isToday: dateKey === todayDateKey,
      isFuture: Boolean(todayDateKey) && dateKey > todayDateKey,
      presentCount: summary.present,
      absentCount: summary.absent,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `blank-end-${cells.length}`, day: null, status: 'empty', dateKey: '' });
  }

  return {
    monthLabel: baseDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    cells,
  };
};

const buildIsoDateString = (yearValue, monthValue, dayValue) => {
  const year = String(yearValue || '').trim();
  const month = String(monthValue || '').trim();
  const day = String(dayValue || '').trim();

  if (!year || !month || !day) {
    return '';
  }

  return `${year}-${month}-${day}`;
};

const getDaysForMonth = (yearValue, monthValue) => {
  const year = Number(yearValue);
  const month = Number(monthValue);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return [];
  }

  const dayCount = new Date(year, month, 0).getDate();
  return Array.from({ length: dayCount }, (_, index) => String(index + 1).padStart(2, '0'));
};

const getAllowedMonthOptions = (yearValue, referenceDate = new Date()) => {
  const selectedYear = Number(yearValue);
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;

  if (!Number.isInteger(selectedYear)) {
    return [];
  }

  if (selectedYear > currentYear) {
    return SALARY_MONTH_OPTIONS;
  }

  return SALARY_MONTH_OPTIONS.filter((option) => Number(option.value) >= currentMonth);
};

const getAllowedDayOptions = (yearValue, monthValue, referenceDate = new Date()) => {
  const selectedYear = Number(yearValue);
  const selectedMonth = Number(monthValue);
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;
  const currentDay = referenceDate.getDate();
  const allDays = getDaysForMonth(yearValue, monthValue);

  if (
    !Number.isInteger(selectedYear)
    || !Number.isInteger(selectedMonth)
    || selectedMonth < 1
    || selectedMonth > 12
  ) {
    return [];
  }

  if (selectedYear === currentYear && selectedMonth === currentMonth) {
    return allDays.filter((day) => Number(day) >= currentDay);
  }

  return allDays;
};

const isDateOnOrAfterToday = (yearValue, monthValue, dayValue, referenceDate = new Date()) => {
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);

  if (
    !Number.isInteger(year)
    || !Number.isInteger(month)
    || !Number.isInteger(day)
    || month < 1
    || month > 12
    || day < 1
    || day > 31
  ) {
    return false;
  }

  const selectedDate = new Date(year, month - 1, day);
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  return selectedDate >= today;
};

const LEAVE_CALENDAR_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const buildLeaveRequestCalendar = (yearValue, monthValue, referenceDate = new Date(), selectedDateKey = '') => {
  const year = Number(yearValue);
  const month = Number(monthValue);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return {
      monthLabel: '',
      availableDayCount: 0,
      cells: [],
    };
  }

  const firstWeekDay = new Date(year, month - 1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const cells = [];
  let availableDayCount = 0;

  for (let index = 0; index < firstWeekDay; index += 1) {
    cells.push({ key: `blank-start-${index}`, day: null, dateKey: '', isDisabled: true, isToday: false, isSelected: false });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const currentDate = new Date(year, month - 1, day);
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isDisabled = currentDate < today;
    const isToday = currentDate.getTime() === today.getTime();
    const isSelected = dateKey === selectedDateKey;

    if (!isDisabled) {
      availableDayCount += 1;
    }

    cells.push({
      key: dateKey,
      day,
      dateKey,
      isDisabled,
      isToday,
      isSelected,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `blank-end-${cells.length}`, day: null, dateKey: '', isDisabled: true, isToday: false, isSelected: false });
  }

  return {
    monthLabel: new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    availableDayCount,
    cells,
  };
};

const formatLongDate = (dateValue) => {
  const parsedDate = dateValue ? new Date(`${dateValue}T00:00:00`) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getPaymentStatusTone = (status) => {
  if (status === 'Paid') {
    return 'green';
  }

  if (status === 'Rejected') {
    return 'red';
  }

  if (status === 'Inactive') {
    return 'blue';
  }

  return 'yellow';
};

const getSalaryStatusTone = (status) => {
  if (status === 'Paid') {
    return 'green';
  }

  if (status === 'Inactive') {
    return 'blue';
  }

  return 'yellow';
};

const formatExamOptionLabel = (exam) => {
  if (!exam) {
    return 'No exam available';
  }

  return `${exam.title} (${exam.term} - ${formatAppDate(exam.examDate)})`;
};

const formatAverageLabel = (average) => `${Math.round(Number(average) || 0)}%`;

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
  const durationMinutes = Math.max(0, endTotalMinutes - startTotalMinutes);
  return durationMinutes / 60;
};

const estimateTutorRatePerHour = (subject) => {
  const premiumSubjects = ['mathematics', 'maths', 'science', 'ict'];
  const normalizedSubject = String(subject || '').trim().toLowerCase();
  return premiumSubjects.includes(normalizedSubject) ? 800 : 700;
};

const pickWebReceiptFile = () => new Promise((resolve, reject) => {
  if (Platform.OS !== 'web' || !globalThis.document) {
    reject(new Error('Receipt file selection is currently supported on web only.'));
    return;
  }

  const input = globalThis.document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,.pdf';

  input.onchange = () => {
    const selectedFile = input.files && input.files[0];
    if (!selectedFile) {
      resolve(null);
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      reject(new Error('Receipt file must be 5 MB or smaller.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        dataUrl: String(reader.result || ''),
      });
    };
    reader.onerror = () => reject(new Error('Failed to read the selected receipt file.'));
    reader.readAsDataURL(selectedFile);
  };

  input.click();
});

const openReceiptFile = (receipt) => {
  const dataUrl = String(receipt?.dataUrl || '').trim();
  if (!dataUrl) {
    throw new Error('No uploaded receipt is available for this payment yet.');
  }

  if (Platform.OS === 'web' && typeof globalThis.open === 'function') {
    globalThis.open(dataUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  throw new Error('Viewing uploaded receipt files is currently supported on web only.');
};

const showPopupMessage = (title, message) => {
  if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
    globalThis.alert([title, message].filter(Boolean).join('\n\n'));
    return;
  }

  Alert.alert(title, message);
};

const getNotificationKey = (notification, index = 0) => String(
  notification?.id
  || notification?.key
  || notification?.title
  || `notification-${index}`
);

const NotificationCenterModal = ({
  visible,
  title,
  notifications = [],
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={notificationModal.overlay}>
      <View style={notificationModal.card}>
        <View style={notificationModal.header}>
          <View style={notificationModal.headerTextWrap}>
            <Text style={notificationModal.title}>{title}</Text>
            <Text style={notificationModal.subtitle}>
              {notifications.length > 0 ? `${notifications.length} unread notification${notifications.length > 1 ? 's' : ''}` : 'All caught up'}
            </Text>
          </View>
          <TouchableOpacity style={notificationModal.closeButton} onPress={onClose}>
            <Text style={notificationModal.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {notifications.length === 0 ? (
          <View style={notificationModal.emptyState}>
            <Text style={notificationModal.emptyTitle}>No new notifications right now.</Text>
            <Text style={notificationModal.emptyDetail}>Any new dashboard changes will appear here.</Text>
          </View>
        ) : (
          <ScrollView
            style={notificationModal.scrollArea}
            contentContainerStyle={notificationModal.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {notifications.map((item, index) => (
              <View key={getNotificationKey(item, index)} style={notificationModal.itemCard}>
                <Text style={notificationModal.itemTitle}>{item.title}</Text>
                {item.detail ? <Text style={notificationModal.itemDetail}>{item.detail}</Text> : null}
                <TouchableOpacity
                  style={notificationModal.markButton}
                  onPress={() => onMarkAsRead(item, index)}
                >
                  <Text style={notificationModal.markButtonText}>Mark as Read</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={notificationModal.footer}>
          {notifications.length > 1 ? (
            <TouchableOpacity style={notificationModal.secondaryAction} onPress={onMarkAllAsRead}>
              <Text style={notificationModal.secondaryActionText}>Mark All as Read</Text>
            </TouchableOpacity>
          ) : <View />}
          <TouchableOpacity style={notificationModal.primaryAction} onPress={onClose}>
            <Text style={notificationModal.primaryActionText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const getTimetableEntryGrade = (entry, courses = []) => {
  const matchedCourse = findCourseForTimetableEntry(entry, courses);
  return String(
    matchedCourse?.grade
    || entry?.courseId?.grade
    || entry?.grade
    || ''
  ).trim();
};

const getAdminUserStatusTone = (status) => {
  if (status === 'pending') {
    return 'yellow';
  }

  if (status === 'blocked') {
    return 'red';
  }

  return 'green';
};

const SHOULD_USE_NATIVE_DRIVER = Platform.OS !== 'web';

const WebForm = ({ children, onSubmit }) => {
  if (Platform.OS === 'web') {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        style={{ margin: 0 }}
      >
        {children}
      </form>
    );
  }

  return <View>{children}</View>;
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AUTH SCREEN
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AuthScreen = ({ onAuthenticated, onGoHome }) => {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [requestedRole, setRequestedRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [showSubjectOptions, setShowSubjectOptions] = useState(false);
  const [showGradeOptions, setShowGradeOptions] = useState(false);
  const isRegister = mode === 'register';
  const passwordRuleStatus = getPasswordRuleStatus(password);

  const submit = async () => {
    if (!email || !password || (isRegister && !name)) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }
    if (isRegister && !isValidRegistrationName(name)) {
      Alert.alert('Invalid Full Name', 'Full name can contain letters only.');
      return;
    }
    if (isRegister && !isStrongPassword(password)) {
      Alert.alert('Invalid Password', 'Password must include letters, numbers, and at least one special character.');
      return;
    }
    if (isRegister && requestedRole === 'teacher' && !subject.trim()) {
      Alert.alert('Missing Fields', 'Subject is required for tutor registration.');
      return;
    }
    if (isRegister && requestedRole === 'student' && !grade.trim()) {
      Alert.alert('Missing Fields', 'Grade is required for student registration.');
      return;
    }
    setAuthNotice('');
    setLoading(true);
    try {
      if (isRegister) {
        const body = {
          name,
          email,
          password,
          requestedRole,
          subject: requestedRole === 'teacher' ? subject.trim() : '',
          grade: requestedRole === 'student' ? grade.trim() : '',
        };
        const data = await request('/api/auth/register', { method: 'POST', body });
        Alert.alert(
          'Registration Submitted',
          data.message || 'Your account request is pending admin approval.',
        );
        setMode('login');
        setName('');
        setSubject('');
        setGrade('');
        setShowSubjectOptions(false);
        setShowGradeOptions(false);
        setPassword('');
        setAuthNotice('Registration submitted successfully. Waitting for admin approvel.');
        return;
      }

      const data = await request('/api/auth/login', { method: 'POST', body: { email, password } });
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      onAuthenticated(data.token, data.user || null);
    } catch (error) {
      const errorMessage = String(error?.message || '').trim();
      const normalizedErrorMessage = errorMessage.toLowerCase();
      const isPendingApprovalError = error?.status === 403 && normalizedErrorMessage.includes('pending');

      if (isPendingApprovalError) {
        setAuthNotice('Waitting for admin approvel');
        return;
      }

      setAuthNotice('');
      Alert.alert('Failed', errorMessage || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={auth.container}>
      <ImageBackground
        source={require('./assets/loginpageimg.png')}
        style={auth.background}
        imageStyle={auth.backgroundImage}
        resizeMode="cover"
      >
        <View style={auth.backgroundOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={auth.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={auth.cornerHomeBtn} onPress={onGoHome}>
            <MaterialIcons name="home" size={22} color="#ffffff" />
          </TouchableOpacity>
          {/* Logo area */}
          <View style={auth.logoArea}>
            <View style={auth.logoCircle}>
              <Image
                source={require('./assets/logo.jpeg')}
                style={auth.logoImage}
                resizeMode="cover"
              />
              <Text style={auth.logoIcon}>ðŸŽ“</Text>
            </View>
            <Text style={auth.appName}>TuitionApp</Text>
            <Text style={auth.tagline}>Smart Learning Management</Text>
          </View>

          {/* Card */}
          <View style={auth.card}>
            <WebForm onSubmit={submit}>
            {/* Tab switcher */}
            <View style={auth.tabRow}>
              <TouchableOpacity
                style={[auth.tab, mode === 'login' && auth.tabActive]}
                onPress={() => {
                  setMode('login');
                  setAuthNotice('');
                }}
              >
                <Text style={[auth.tabText, mode === 'login' && auth.tabTextActive]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[auth.tab, mode === 'register' && auth.tabActive]}
                onPress={() => {
                  setMode('register');
                  setAuthNotice('');
                }}
              >
                <Text style={[auth.tabText, mode === 'register' && auth.tabTextActive]}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            {authNotice ? (
              <View style={auth.noticeBox}>
                <Text style={auth.noticeText}>{authNotice}</Text>
              </View>
            ) : null}

            {isRegister && (
              <View style={auth.inputWrap}>
                <Text style={auth.inputLabel}>Full Name</Text>
                <TextInput
                  placeholder="Enter your full name"
                  value={name}
                  onChangeText={(value) => {
                    setName(sanitizeRegistrationName(value));
                    setAuthNotice('');
                  }}
                  style={auth.input}
                  showSoftInputOnFocus
                  autoCorrect={false}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            )}

            {isRegister && (
              <View style={auth.inputWrap}>
                <Text style={auth.inputLabel}>Register As</Text>
                <View style={auth.roleRow}>
                  <TouchableOpacity
                    style={[auth.roleBtn, requestedRole === 'student' && auth.roleBtnActive]}
                    onPress={() => {
                      setRequestedRole('student');
                      setSubject('');
                      setShowGradeOptions(false);
                      setShowSubjectOptions(false);
                    }}
                  >
                    <Text style={[auth.roleBtnText, requestedRole === 'student' && auth.roleBtnTextActive]}>
                      Student
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[auth.roleBtn, requestedRole === 'teacher' && auth.roleBtnActive]}
                    onPress={() => {
                      setRequestedRole('teacher');
                      setGrade('');
                      setShowGradeOptions(false);
                      setShowSubjectOptions(false);
                    }}
                  >
                    <Text style={[auth.roleBtnText, requestedRole === 'teacher' && auth.roleBtnTextActive]}>
                      Tutor
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={auth.helperText}>Admin approval is required before first login.</Text>
              </View>
            )}

            {isRegister && requestedRole === 'student' && (
              <View style={auth.inputWrap}>
                <Text style={auth.inputLabel}>Grade</Text>
                <TouchableOpacity
                  style={auth.selectField}
                  onPress={() => {
                    setShowSubjectOptions(false);
                    setShowGradeOptions((current) => !current);
                  }}
                >
                  <Text style={grade ? auth.selectText : auth.selectPlaceholder}>
                    {grade || 'Select your grade'}
                  </Text>
                  <Text style={auth.selectArrow}>{showGradeOptions ? '^' : 'v'}</Text>
                </TouchableOpacity>
                {showGradeOptions ? (
                  <ScrollView
                    style={auth.selectOptions}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {COURSE_GRADE_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[auth.selectOption, grade === option && auth.selectOptionActive]}
                        onPress={() => {
                          setGrade(option);
                          setShowGradeOptions(false);
                        }}
                      >
                        <Text style={[auth.selectOptionText, grade === option && auth.selectOptionTextActive]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            )}

            {isRegister && requestedRole === 'teacher' && (
              <View style={auth.inputWrap}>
                <Text style={auth.inputLabel}>Subject</Text>
                <TouchableOpacity
                  style={auth.selectField}
                  onPress={() => {
                    setShowGradeOptions(false);
                    setShowSubjectOptions((current) => !current);
                  }}
                >
                  <Text style={subject ? auth.selectText : auth.selectPlaceholder}>
                    {subject || 'Select your subject'}
                  </Text>
                  <Text style={auth.selectArrow}>{showSubjectOptions ? '^' : 'v'}</Text>
                </TouchableOpacity>
                {showSubjectOptions ? (
                  <ScrollView
                    style={auth.selectOptions}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {PROJECT_SUBJECT_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[auth.selectOption, subject === option.value && auth.selectOptionActive]}
                        onPress={() => {
                          setSubject(option.value);
                          setShowSubjectOptions(false);
                        }}
                      >
                        <Text style={[auth.selectOptionText, subject === option.value && auth.selectOptionTextActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            )}

            <View style={auth.inputWrap}>
              <Text style={auth.inputLabel}>Email Address</Text>
              <TextInput
                placeholder="Enter your email"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setAuthNotice('');
                }}
                style={auth.input}
                autoCapitalize="none"
                keyboardType="email-address"
                showSoftInputOnFocus
                autoCorrect={false}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={auth.inputWrap}>
              <Text style={auth.inputLabel}>Password</Text>
              <TextInput
                placeholder="Enter your password"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setAuthNotice('');
                }}
                onSubmitEditing={submit}
                style={auth.input}
                secureTextEntry
                showSoftInputOnFocus
                placeholderTextColor="#94a3b8"
              />
              {isRegister ? (
                <Text
                  style={[
                    auth.passwordRuleText,
                    isStrongPassword(password) && auth.passwordRuleTextValid,
                  ]}
                >
                  Password must include:
                  {' '}
                  {passwordRuleStatus.hasLetter ? 'letter' : 'letter'}
                  ,
                  {' '}
                  {passwordRuleStatus.hasNumber ? 'number' : 'number'}
                  ,
                  {' '}
                  {passwordRuleStatus.hasSpecialCharacter ? 'special character' : 'special character'}
                  ,
                  {' '}
                  and at least 6 characters.
                </Text>
              ) : null}
            </View>

            <TouchableOpacity style={auth.btn} onPress={submit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={auth.btnText}>{isRegister ? 'Submit Request' : 'Sign In'}</Text>
              )}
            </TouchableOpacity>
            </WebForm>
          </View>

              <Text style={auth.version}>API: {API_BASE_URL}</Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const auth = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  background: { flex: 1 },
  backgroundImage: { opacity: 0.95 },
  backgroundOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.58)' },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 44, justifyContent: 'flex-start' },
  cornerHomeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 2,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  logoIcon: { fontSize: 36, opacity: 0 },
  appName: { fontSize: 30, fontWeight: '800', color: '#f8fafc', letterSpacing: 0.5 },
  tagline: { fontSize: 14, color: '#64748b', marginTop: 4 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#0ea5e9' },
  tabText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  noticeBox: {
    backgroundColor: '#45210f',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  noticeText: {
    color: '#fde68a',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  inputWrap: { marginBottom: 14 },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleBtnActive: {
    borderColor: '#0ea5e9',
    backgroundColor: '#082f49',
  },
  roleBtnText: { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  roleBtnTextActive: { color: '#38bdf8' },
  helperText: { marginTop: 8, color: '#64748b', fontSize: 11 },
  passwordRuleText: { marginTop: 8, color: '#fca5a5', fontSize: 11, lineHeight: 16 },
  passwordRuleTextValid: { color: '#86efac' },
  inputLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  selectField: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: { color: '#fff', fontSize: 14 },
  selectPlaceholder: { color: '#94a3b8', fontSize: 14 },
  selectArrow: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  selectOptions: {
    marginTop: 8,
    maxHeight: 220,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    overflow: 'hidden',
  },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  selectOptionActive: { backgroundColor: '#082f49' },
  selectOptionText: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  selectOptionTextActive: { color: '#38bdf8' },
  btn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  version: { color: '#334155', fontSize: 11, textAlign: 'center', marginTop: 20 },
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SHARED COMPONENTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StatCard = ({ icon, number, label, color }) => (
  <View style={[shared.statCard, { borderTopColor: color }]}>
    <Text style={shared.statIcon}>{icon}</Text>
    <Text style={[shared.statNum, { color }]}>{number}</Text>
    <Text style={shared.statLabel}>{label}</Text>
  </View>
);

const SectionHeader = ({ title, action, actionLabel }) => (
  <View style={shared.sectionHeader}>
    <Text style={shared.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={action}>
        <Text style={shared.sectionAction}>{actionLabel || 'Refresh'}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const getDrawerSections = (menuItems = []) => {
  const groupedSections = [];
  const sectionMap = new Map();

  menuItems.forEach((item) => {
    const sectionTitle = item.section || 'Menu';
    if (!sectionMap.has(sectionTitle)) {
      const nextSection = { title: sectionTitle, items: [] };
      sectionMap.set(sectionTitle, nextSection);
      groupedSections.push(nextSection);
    }
    sectionMap.get(sectionTitle).items.push(item);
  });

  return groupedSections;
};

const getActiveMenuTitle = (menuItems = [], activeTab, fallbackTitle = 'Dashboard') => {
  const matchedItem = menuItems.find((item) => item.key === activeTab);
  if (matchedItem?.label) {
    return matchedItem.label;
  }
  if (activeTab === 'profile') {
    return 'Profile';
  }
  return fallbackTitle;
};

const DashboardDrawer = ({
  visible,
  onClose,
  menuItems,
  activeTab,
  onSelect,
  userName,
  theme,
  footerActionLabel,
  onFooterAction,
}) => {
  const { width } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }

    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 240 : 200,
      useNativeDriver: SHOULD_USE_NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
      }
    });
  }, [progress, visible]);

  if (!mounted) {
    return null;
  }

  const drawerWidth = Math.min(Math.max(width * 0.8, 280), 360);
  const drawerTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });
  const overlayOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const sections = getDrawerSections(menuItems);

  return (
    <View style={[drawer.overlayWrap, { pointerEvents: 'box-none' }]}>
      <AnimatedTouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={[
          drawer.overlay,
          {
            opacity: overlayOpacity,
            backgroundColor: theme.overlayColor,
          },
        ]}
      />

      <Animated.View
        style={[
          drawer.panel,
          {
            width: drawerWidth,
            backgroundColor: theme.panelColor,
            borderColor: theme.borderColor,
            transform: [{ translateX: drawerTranslateX }],
          },
        ]}
      >
        <View style={[drawer.header, { borderBottomColor: theme.borderColor }]}>
          <View style={drawer.headerUserBlock}>
            <Text style={[drawer.headerUserLabel, { color: theme.eyebrowColor }]}>Signed In</Text>
            <Text style={[drawer.headerUserName, { color: theme.titleColor }]}>
              {userName || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            style={[drawer.closeButton, { backgroundColor: theme.closeButtonColor }]}
            onPress={onClose}
          >
            <Text style={[drawer.closeButtonText, { color: theme.closeButtonTextColor }]}>X</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={drawer.scrollContent}
        >
          {sections.map((section) => (
            <View key={section.title} style={drawer.sectionBlock}>
              <Text style={[drawer.sectionTitle, { color: theme.sectionTitleColor }]}>{section.title}</Text>
              <View style={drawer.sectionItems}>
                {section.items.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <Pressable
                      key={item.key || item.label}
                      style={({ hovered, pressed }) => [
                        drawer.itemButton,
                        {
                          backgroundColor: theme.itemColor,
                          borderColor: theme.borderColor,
                        },
                        isActive && {
                          backgroundColor: theme.activeItemColor,
                          borderColor: theme.activeItemColor,
                        },
                        hovered && !item.disabled && drawer.itemButtonHovered,
                        hovered && !item.disabled && { transform: [{ translateX: 4 }, { scale: 1.01 }] },
                        pressed && !item.disabled && drawer.itemButtonPressed,
                        pressed && !item.disabled && { transform: [{ translateX: 2 }, { scale: 0.995 }] },
                        item.disabled && drawer.itemButtonDisabled,
                      ]}
                      onPress={() => {
                        if (item.disabled || !item.key) {
                          return;
                        }
                        onSelect(item.key);
                        onClose();
                      }}
                      disabled={item.disabled}
                    >
                      <View
                        style={[
                          drawer.itemIcon,
                          {
                            backgroundColor: theme.iconBackgroundColor,
                            borderColor: theme.iconBorderColor,
                          },
                          isActive && {
                            backgroundColor: theme.activeIconBackgroundColor,
                            borderColor: theme.activeIconBorderColor,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={item.icon || 'apps'}
                          size={20}
                          style={[
                            drawer.itemIconText,
                            { color: theme.iconTextColor },
                            isActive && { color: theme.activeIconTextColor },
                          ]}
                        />
                      </View>

                      <View style={drawer.itemCopy}>
                        <Text
                          style={[
                            drawer.itemText,
                            { color: theme.itemTextColor },
                            isActive && { color: theme.activeItemTextColor },
                            item.disabled && { color: theme.disabledTextColor },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>

                      {item.badge ? (
                        <View
                          style={[
                            drawer.itemBadge,
                            { backgroundColor: theme.badgeColor },
                            isActive && { backgroundColor: theme.activeBadgeColor },
                            item.disabled && { backgroundColor: theme.disabledBadgeColor },
                          ]}
                        >
                          <Text
                            style={[
                              drawer.itemBadgeText,
                              { color: theme.badgeTextColor },
                              isActive && { color: theme.activeBadgeTextColor },
                              item.disabled && { color: theme.disabledTextColor },
                            ]}
                          >
                            {item.badge}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        {footerActionLabel && onFooterAction ? (
          <View style={[drawer.footer, { borderTopColor: theme.borderColor }]}>
            <TouchableOpacity
              style={[drawer.footerButton, { backgroundColor: theme.footerButtonColor }]}
              onPress={() => {
                onClose();
                onFooterAction();
              }}
            >
              <Text style={[drawer.footerButtonText, { color: theme.footerButtonTextColor }]}>
                {footerActionLabel}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
};

const WebDashboardShell = ({
  welcome,
  roleLabel,
  user,
  activeTab,
  onTabChange,
  menuItems,
  onLogout,
  onOpenProfile,
  notifications = [],
  children,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [readNotificationKeys, setReadNotificationKeys] = useState([]);
  const activeNotificationKeys = notifications.map((item, index) => getNotificationKey(item, index));
  const unreadNotifications = notifications.filter((item, index) => !readNotificationKeys.includes(getNotificationKey(item, index)));

  useEffect(() => {
    setReadNotificationKeys((previousKeys) => previousKeys.filter((key) => activeNotificationKeys.includes(key)));
  }, [activeNotificationKeys.join('|')]);

  const markNotificationAsRead = (notification, index) => {
    const notificationKey = getNotificationKey(notification, index);
    setReadNotificationKeys((previousKeys) => (
      previousKeys.includes(notificationKey) ? previousKeys : [...previousKeys, notificationKey]
    ));
  };

  const markAllNotificationsAsRead = () => {
    setReadNotificationKeys(activeNotificationKeys);
  };

  return (
    <SafeAreaView style={webDash.page}>
      <View style={[webDash.header, { paddingTop: 12 + ANDROID_TOP_INSET }]}>
        <View style={webDash.headerTopRow}>
          <View style={webDash.headerLeftCluster}>
            <TouchableOpacity style={webDash.menuToggle} onPress={() => setDrawerOpen(true)}>
              <Text style={webDash.menuToggleText}>|||</Text>
            </TouchableOpacity>
            <View style={webDash.headerTitleBlock}>
              <Text style={webDash.headerWelcomeText}>{welcome}</Text>
              <Text style={webDash.headerBrandText}>{BRAND_NAME}</Text>
            </View>
          </View>
          <View style={webDash.headerActions}>
            <TouchableOpacity
              style={webDash.notificationButton}
              onPress={() => setNotificationOpen(true)}
            >
              <MaterialIcons name="notifications-none" size={20} color="#0f172a" />
              {unreadNotifications.length > 0 ? (
                <View style={webDash.notificationBadge}>
                  <Text style={webDash.notificationBadgeText}>{unreadNotifications.length > 9 ? '9+' : String(unreadNotifications.length)}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity style={webDash.profileButton} onPress={onOpenProfile}>
              <View style={webDash.profileGlyph}>
                <View style={webDash.profileGlyphHead} />
                <View style={webDash.profileGlyphBody} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={webDash.logoutButton} onPress={onLogout}>
              <Text style={webDash.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <DashboardDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        menuItems={menuItems}
        activeTab={activeTab}
        onSelect={onTabChange}
        userName={user?.name}
        theme={{
          overlayColor: 'rgba(15, 23, 42, 0.55)',
          panelColor: '#0f172a',
          borderColor: '#1e293b',
          eyebrowColor: '#94a3b8',
          titleColor: '#f8fafc',
          closeButtonColor: '#1e293b',
          closeButtonTextColor: '#f8fafc',
          sectionTitleColor: '#94a3b8',
          itemColor: '#111c34',
          activeItemColor: '#2563eb',
          itemTextColor: '#e2e8f0',
          activeItemTextColor: '#ffffff',
          disabledTextColor: '#94a3b8',
          iconBackgroundColor: '#172554',
          iconBorderColor: '#1d4ed8',
          activeIconBackgroundColor: '#ffffff',
          activeIconBorderColor: '#dbeafe',
          iconTextColor: '#bfdbfe',
          activeIconTextColor: '#2563eb',
          badgeColor: '#dc2626',
          activeBadgeColor: '#ffffff',
          badgeTextColor: '#ffffff',
          activeBadgeTextColor: '#2563eb',
          disabledBadgeColor: '#cbd5e1',
          footerButtonColor: '#dc2626',
          footerButtonTextColor: '#ffffff',
        }}
      />

      <NotificationCenterModal
        visible={notificationOpen}
        title={`${roleLabel} Notifications`}
        notifications={unreadNotifications}
        onClose={() => setNotificationOpen(false)}
        onMarkAsRead={markNotificationAsRead}
        onMarkAllAsRead={markAllNotificationsAsRead}
      />

      <View style={webDash.body}>
        <View style={webDash.mainScroll}>
          <View style={webDash.contentPanel}>{children}</View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const WebPageTitle = ({ title, subtitle, actionLabel, onActionPress }) => (
  <View style={webDash.pageTitleRow}>
    <View style={webDash.pageTitleBlock}>
      <Text style={webDash.pageTitle}>{title}</Text>
      <Text style={webDash.pageSubtitle}>{subtitle}</Text>
    </View>
    {actionLabel && onActionPress ? (
      <TouchableOpacity style={webDash.pageTitleAction} onPress={onActionPress}>
        <Text style={webDash.pageTitleActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const WebMetricCard = ({ label, value, accent = '#2563eb', badge, detail, progress }) => (
  <View style={[webDash.metricCard, { borderLeftColor: accent }]}>
    <View style={webDash.metricHeader}>
      <View style={{ flex: 1 }}>
        <Text style={webDash.metricLabel}>{label}</Text>
        <Text style={[webDash.metricValue, { color: detail ? '#0f172a' : accent }]}>{value}</Text>
      </View>
      {badge ? (
        <View style={[webDash.metricBadge, { backgroundColor: accent }]}>
          <Text style={webDash.metricBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
    {detail ? <Text style={webDash.metricDetail}>{detail}</Text> : null}
    {progress !== undefined ? (
      <View style={webDash.progressTrack}>
        <View style={[webDash.progressFill, { width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: accent }]} />
      </View>
    ) : null}
  </View>
);

const StatusPill = ({ label, tone = 'blue' }) => (
  <View style={[webDash.statusPill, webDash[`status_${tone}`]]}>
    <Text style={[webDash.statusText, webDash[`statusText_${tone}`]]}>{label}</Text>
  </View>
);

const DetailField = ({ label, value }) => (
  <View style={webDash.detailField}>
    <Text style={webDash.detailLabel}>{label}</Text>
    <Text style={webDash.detailValue}>{value || '-'}</Text>
  </View>
);

const shared = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statIcon: { fontSize: 15, fontWeight: '800', marginBottom: 6, letterSpacing: 0.6 },
  statNum: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sectionAction: { fontSize: 13, color: '#0ea5e9', fontWeight: '700' },
});

const drawer = StyleSheet.create({
  overlayWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 18,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 22 + ANDROID_TOP_INSET,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerUserBlock: { flex: 1 },
  headerUserLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerUserName: { fontSize: 18, fontWeight: '900' },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: { fontSize: 14, fontWeight: '900' },
  scrollContent: { paddingHorizontal: 14, paddingVertical: 16, paddingBottom: 26 },
  sectionBlock: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  sectionItems: { gap: 8 },
  itemButton: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemButtonHovered: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  itemButtonPressed: {
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  itemButtonDisabled: { opacity: 0.68 },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  itemCopy: { flex: 1 },
  itemText: { fontSize: 14, fontWeight: '800' },
  itemBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBadgeText: { fontSize: 11, fontWeight: '900' },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  footerButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: { fontSize: 14, fontWeight: '900' },
});

const webDash = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4f7fb' },
  header: {
    backgroundColor: '#233f92',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeftCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    transform: [{ rotate: '90deg' }],
  },
  headerTitleBlock: { flex: 1 },
  headerWelcomeText: { color: '#dbeafe', fontSize: 15, fontWeight: '900' },
  headerBrandText: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 4, lineHeight: 21 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileGlyph: { alignItems: 'center', justifyContent: 'center' },
  profileGlyphHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0f172a',
  },
  profileGlyphBody: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: '#0f172a',
    marginTop: 2,
  },
  profileIcon: { color: '#0f172a', fontWeight: '900', fontSize: 12 },
  logoutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  logoutButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  body: { flex: 1, flexDirection: 'column' },
  menuScroll: { paddingHorizontal: 12, gap: 8 },
  menuButton: {
    minHeight: 38,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  menuButtonDisabled: { opacity: 0.65 },
  menuButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuText: { color: '#111827', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  menuTextActive: { color: '#fff' },
  menuTextDisabled: { color: '#64748b' },
  menuBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadgeActive: { backgroundColor: '#fff' },
  menuBadgeDisabled: { backgroundColor: '#cbd5e1' },
  menuBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  menuBadgeTextActive: { color: '#2563eb' },
  menuBadgeTextDisabled: { color: '#64748b' },
  userCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  userName: { color: '#111827', fontSize: 12, fontWeight: '900' },
  userEmail: { color: '#64748b', fontSize: 10, marginTop: 4 },
  mainScroll: { flex: 1 },
  mainScrollContent: { padding: 0, paddingBottom: 0 },
  contentPanel: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  pageTitleRow: {
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  pageTitleBlock: { flex: 1, minWidth: 220 },
  pageTitle: { color: '#111827', fontSize: 24, fontWeight: '900' },
  pageSubtitle: { color: '#64748b', fontSize: 13, lineHeight: 19, marginTop: 6 },
  pageTitleAction: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  pageTitleActionText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  metricGrid: { gap: 10 },
  metricCard: {
    width: '100%',
    minHeight: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    backgroundColor: '#fff',
    padding: 14,
  },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  metricValue: { color: '#111827', fontSize: 24, fontWeight: '900', marginTop: 8 },
  metricBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  metricDetail: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 8 },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: '#e2e8f0', marginTop: 14, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 4 },
  filterBar: {
    gap: 14,
    backgroundColor: '#eef6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  filterField: { width: '100%' },
  filterLabel: { color: '#475569', fontSize: 12, fontWeight: '900', marginBottom: 8 },
  selectBox: {
    height: 40,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  selectText: { color: '#111827', fontSize: 13, fontWeight: '700' },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    backgroundColor: '#fff',
  },
  sectionTitle: { color: '#111827', fontSize: 17, fontWeight: '900' },
  sectionText: { color: '#64748b', fontSize: 13, lineHeight: 20, marginTop: 8 },
  detailGrid: { gap: 10 },
  detailField: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 9,
    padding: 16,
    backgroundColor: '#fff',
  },
  detailLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  detailValue: { color: '#1f2937', fontSize: 14, fontWeight: '800', marginTop: 10 },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  attendanceRosterRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    marginTop: 10,
  },
  tableHeader: { backgroundColor: '#f8fafc', minHeight: 48 },
  tableCell: { flexGrow: 1, flexBasis: 128, paddingHorizontal: 10, paddingVertical: 10 },
  tableCellWide: { flexGrow: 1, flexBasis: 170, paddingHorizontal: 10, paddingVertical: 10 },
  tableCellSmall: { flexGrow: 1, flexBasis: 74, paddingHorizontal: 10, paddingVertical: 10 },
  tableHeadText: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  tableText: { color: '#334155', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buttonBlue: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  buttonGreen: { backgroundColor: '#16a34a', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  buttonRed: { backgroundColor: '#dc2626', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  buttonSoft: { backgroundColor: '#eaf2ff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  buttonTextLight: { color: '#fff', fontSize: 12, fontWeight: '900' },
  buttonTextBlue: { color: '#1d4ed8', fontSize: 12, fontWeight: '900' },
  statusPill: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  status_green: { backgroundColor: '#dcfce7' },
  status_yellow: { backgroundColor: '#fef3c7' },
  status_red: { backgroundColor: '#fee2e2' },
  status_blue: { backgroundColor: '#dbeafe' },
  status_pink: { backgroundColor: '#fee2e2' },
  statusText_green: { color: '#166534' },
  statusText_yellow: { color: '#92400e' },
  statusText_red: { color: '#991b1b' },
  statusText_blue: { color: '#1d4ed8' },
  statusText_pink: { color: '#991b1b' },
  statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  segmentButton: {
    flexGrow: 1,
    minWidth: 96,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segmentButtonActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  segmentText: { color: '#111827', fontSize: 13, fontWeight: '900' },
  segmentTextActive: { color: '#fff' },
  quickDateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  quickDateChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickDateChipText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  leaveCalendarCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
    padding: 14,
  },
  leaveCalendarHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  leaveCalendarTitle: { color: '#0f172a', fontSize: 14, fontWeight: '900' },
  leaveCalendarHint: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  leaveCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  leaveCalendarDayLabel: {
    width: '13%',
    color: '#8a98ac',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  leaveCalendarCell: {
    width: '13%',
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#ffffff',
  },
  leaveCalendarCellEmpty: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  leaveCalendarCellDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.4,
  },
  leaveCalendarCellToday: {
    backgroundColor: '#eff6ff',
    borderColor: '#60a5fa',
  },
  leaveCalendarCellSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  leaveCalendarCellText: { color: '#334155', fontSize: 13, fontWeight: '800' },
  leaveCalendarCellTextDisabled: { color: '#94a3b8' },
  leaveCalendarCellTextToday: { color: '#1d4ed8', fontWeight: '900' },
  leaveCalendarCellTextSelected: { color: '#1d4ed8', fontWeight: '900' },
  leaveCalendarEmptyState: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  leaveCalendarEmptyText: { color: '#64748b', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  selectedDateBox: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedDateLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  selectedDateValue: { color: '#0f172a', fontSize: 14, fontWeight: '800', marginTop: 6 },
  examMarkCell: { gap: 8, alignItems: 'flex-start' },
  examMarkInputDisabled: { backgroundColor: '#f8fafc', color: '#dc2626' },
  examAbsentChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  examAbsentChipActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  examAbsentChipText: { color: '#b91c1c', fontSize: 11, fontWeight: '800' },
  examAbsentChipTextActive: { color: '#fff' },
  formInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    minHeight: 42,
    paddingHorizontal: 12,
    color: '#111827',
    backgroundColor: '#fff',
    marginTop: 8,
  },
  textArea: { minHeight: 82, paddingTop: 12, textAlignVertical: 'top' },
  twoColumn: { gap: 12, marginTop: 14 },
  halfPanel: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 18,
    backgroundColor: '#fff',
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 16,
    marginTop: 14,
    alignItems: 'center',
  },
  emptyText: { color: '#64748b', fontSize: 13, fontWeight: '800', textAlign: 'center' },
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ADMIN DASHBOARD
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AdminDashboard = ({ token, user, onUserUpdated, onLogout }) => {
  const [stats, setStats] = useState({ students: 0, courses: 0, enrollments: 0, pendingApprovals: 0 });
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [userSummary, setUserSummary] = useState({
    totalUsers: 0,
    tutorCount: 0,
    studentCount: 0,
    activeCount: 0,
    pendingCount: 0,
    blockedCount: 0,
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [reviewingRequestId, setReviewingRequestId] = useState('');
  const [deletingUserId, setDeletingUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // overview | students | courses | timetable | approvals
  const [approvalView, setApprovalView] = useState('student'); // student | teacher
  const [userRoleFilter, setUserRoleFilter] = useState(ALL_USER_ROLES_FILTER);
  const [userGradeFilter, setUserGradeFilter] = useState(ALL_GRADES_FILTER);
  const [userStatusFilter, setUserStatusFilter] = useState(ALL_USER_STATUSES_FILTER);
  const [userSearchText, setUserSearchText] = useState('');
  const [showUserRoleOptions, setShowUserRoleOptions] = useState(false);
  const [showUserGradeOptions, setShowUserGradeOptions] = useState(false);
  const [showUserStatusOptions, setShowUserStatusOptions] = useState(false);
  const [paymentGradeFilter, setPaymentGradeFilter] = useState(ALL_GRADES_FILTER);
  const [showPaymentGradeOptions, setShowPaymentGradeOptions] = useState(false);
  const defaultSalaryMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const defaultSalaryYear = String(new Date().getFullYear());
  const [salaryMonthFilter, setSalaryMonthFilter] = useState(defaultSalaryMonth);
  const [salaryYearFilter, setSalaryYearFilter] = useState(defaultSalaryYear);
  const [showSalaryMonthOptions, setShowSalaryMonthOptions] = useState(false);
  const [showSalaryYearOptions, setShowSalaryYearOptions] = useState(false);
  const [reviewingPaymentId, setReviewingPaymentId] = useState('');
  const [reviewingSalaryId, setReviewingSalaryId] = useState('');
  const [selectedExamGrade, setSelectedExamGrade] = useState(COURSE_GRADE_OPTIONS[0]);
  const [selectedExamTerm, setSelectedExamTerm] = useState(EXAM_TERM_OPTIONS[0]);
  const [examOptions, setExamOptions] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [showExamOptions, setShowExamOptions] = useState(false);
  const [examGradebook, setExamGradebook] = useState(null);
  const [profileName, setProfileName] = useState(user.name || '');
  const [profileEmail, setProfileEmail] = useState(user.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [adminSuggestionTitle, setAdminSuggestionTitle] = useState('');
  const [adminSuggestionMessage, setAdminSuggestionMessage] = useState('');
  const [adminSuggestions, setAdminSuggestions] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selectedLeaveRequestId, setSelectedLeaveRequestId] = useState('');
  const [leaveReviewStatus, setLeaveReviewStatus] = useState('Pending');
  const [leaveAdminReply, setLeaveAdminReply] = useState('');
  const [savingLeaveReview, setSavingLeaveReview] = useState(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState('');
  const [suggestionReviewStatus, setSuggestionReviewStatus] = useState(SUGGESTION_STATUS_OPTIONS[0]);
  const [suggestionReply, setSuggestionReply] = useState('');
  const [suggestionAdminNote, setSuggestionAdminNote] = useState('');
  const [savingSuggestionReview, setSavingSuggestionReview] = useState(false);
  const [submittingAdminSuggestion, setSubmittingAdminSuggestion] = useState(false);

  // Add student form
  const [studentFullName, setStudentFullName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [creating, setCreating] = useState(false);

  // Add course form
  const [cSubject, setCSubject] = useState('');
  const [cGrade, setCGrade] = useState('');
  const [showGradeOptions, setShowGradeOptions] = useState(false);
  const [showSubjectOptions, setShowSubjectOptions] = useState(false);
  const [courseFilterGrade, setCourseFilterGrade] = useState(ALL_GRADES_FILTER);
  const [showCourseFilterOptions, setShowCourseFilterOptions] = useState(false);
  const [cFee, setCFee] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState('');
  const [editingCourseFee, setEditingCourseFee] = useState('');
  const [savingCourseFeeId, setSavingCourseFeeId] = useState('');
  const [deletingCourseId, setDeletingCourseId] = useState('');
  const [timetable, setTimetable] = useState([]);
  const [ttGrade, setTtGrade] = useState('');
  const [showTtGradeOptions, setShowTtGradeOptions] = useState(false);
  const [ttViewGrade, setTtViewGrade] = useState(COURSE_GRADE_OPTIONS[0]);
  const [showTtViewGradeOptions, setShowTtViewGradeOptions] = useState(false);
  const [ttCourseId, setTtCourseId] = useState('');
  const [showTtCourseOptions, setShowTtCourseOptions] = useState(false);
  const [ttDay, setTtDay] = useState(TIMETABLE_DAYS[0]);
  const [ttStart, setTtStart] = useState('');
  const [ttEnd, setTtEnd] = useState('');
  const [showTtStartOptions, setShowTtStartOptions] = useState(false);
  const [showTtEndOptions, setShowTtEndOptions] = useState(false);
  const [ttTitle, setTtTitle] = useState('');
  const [ttSubject, setTtSubject] = useState('');
  const [ttRoom, setTtRoom] = useState('');
  const [showTtHallOptions, setShowTtHallOptions] = useState(false);
  const [ttTutor, setTtTutor] = useState('');
  const [showTtTutorOptions, setShowTtTutorOptions] = useState(false);
  const [ttSaving, setTtSaving] = useState(false);
  const [ttEditingId, setTtEditingId] = useState('');
  const [ttDeletingId, setTtDeletingId] = useState('');
  const adminScrollRef = useRef(null);
  const adminTimetableEditorOffsetRef = useRef(0);

  const loadAll = async () => {
    setLoading(true);
    try {
      const selectedSalaryMonthKey = `${salaryYearFilter}-${salaryMonthFilter}`;
      const [sData, cData, eData, pData, tData, tutorData, userData, paymentData, salaryData, suggestionData, leaveRequestData] = await Promise.all([
        request('/api/students', { token }),
        request('/api/courses', { token }),
        request('/api/enrollments', { token }),
        request('/api/users/pending-registrations', { token }),
        request('/api/timetable', { token }),
        request('/api/users/tutors', { token }),
        request('/api/users', { token }),
        request('/api/payments', { token }),
        request(`/api/salaries?monthKey=${selectedSalaryMonthKey}`, { token }),
        request('/api/suggestions', { token }),
        request('/api/leave-requests', { token }),
      ]);
      const loadedCourses = cData.courses || [];
      setStudents(sData.students || []);
      setCourses(loadedCourses);
      setTutors(tutorData.tutors || []);
      setAdminUsers(userData.users || []);
      setPayments(paymentData.payments || []);
      setSalaryRecords(salaryData.salaries || []);
      setUserSummary(userData.summary || {
        totalUsers: 0,
        tutorCount: 0,
        studentCount: 0,
        activeCount: 0,
        pendingCount: 0,
        blockedCount: 0,
      });
      setAdminSuggestions(suggestionData.suggestions || []);
      setLeaveRequests(leaveRequestData.leaveRequests || []);
      setPendingRequests(pData.requests || []);
      setTimetable(tData.timetable || []);
      setStats({
        students: sData.count || 0,
        courses: cData.count || 0,
        enrollments: eData.count || 0,
        pendingApprovals: pData.count || 0,
      });
    } catch (e) {
      Alert.alert('Load Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (!token) return;
    const loadSalaryDataForPeriod = async () => {
      try {
        const salaryData = await request(`/api/salaries?monthKey=${salaryYearFilter}-${salaryMonthFilter}`, { token });
        setSalaryRecords(salaryData.salaries || []);
      } catch (e) {
        Alert.alert('Load Error', e.message);
      }
    };
    loadSalaryDataForPeriod();
  }, [salaryMonthFilter, salaryYearFilter]);
  useEffect(() => {
    setProfileName(user.name || '');
    setProfileEmail(user.email || '');
  }, [user.name, user.email]);
  useEffect(() => {
    if (!selectedSuggestionId) return;
    const matchedSuggestion = adminSuggestions.find((item) => item._id === selectedSuggestionId);
    if (!matchedSuggestion) return;
    setSuggestionReviewStatus(matchedSuggestion.status || 'Open');
    setSuggestionReply(matchedSuggestion.reply || '');
    setSuggestionAdminNote(matchedSuggestion.adminNote || '');
  }, [adminSuggestions, selectedSuggestionId]);
  useEffect(() => {
    if (!selectedLeaveRequestId) return;
    const matchedLeaveRequest = leaveRequests.find((item) => item._id === selectedLeaveRequestId);
    if (!matchedLeaveRequest) return;
    setLeaveReviewStatus(matchedLeaveRequest.status || 'Pending');
    setLeaveAdminReply(matchedLeaveRequest.adminReply || '');
  }, [leaveRequests, selectedLeaveRequestId]);
  useEffect(() => {
    if (!token) return;

    const loadExamOptions = async () => {
      try {
        const examData = await request(
          `/api/exams?grade=${encodeURIComponent(selectedExamGrade)}&term=${encodeURIComponent(selectedExamTerm)}&academicYear=${new Date().getFullYear()}`,
          { token }
        );
        const nextExams = examData.exams || [];
        setExamOptions(nextExams);
        setSelectedExamId((currentExamId) => (
          nextExams.some((exam) => exam.id === currentExamId) ? currentExamId : (nextExams[0]?.id || '')
        ));
        setShowExamOptions(false);
      } catch (e) {
        Alert.alert('Load Error', e.message);
      }
    };

    loadExamOptions();
  }, [token, selectedExamGrade, selectedExamTerm]);

  const deleteAdminUser = async (directoryUser) => {
    const userId = directoryUser.id || directoryUser._id;
    if (!userId) {
      showPopupMessage('Error', 'User id is missing.');
      return;
    }

    setDeletingUserId(userId);
    try {
      const data = await request(`/api/users/${userId}`, {
        method: 'DELETE',
        token,
      });
      await loadAll();
      showPopupMessage('Deleted', data.message || 'User deleted successfully.');
    } catch (e) {
      showPopupMessage('Error', e.message);
    } finally {
      setDeletingUserId('');
    }
  };
  useEffect(() => {
    if (!token || !selectedExamId) {
      setExamGradebook(null);
      return;
    }

    const loadExamGradebook = async () => {
      try {
        const gradebookData = await request(`/api/exams/${selectedExamId}/gradebook`, { token });
        setExamGradebook(gradebookData);
      } catch (e) {
        Alert.alert('Load Error', e.message);
      }
    };

    loadExamGradebook();
  }, [token, selectedExamId]);

  const addStudent = async () => {
    const fullName = studentFullName.trim();
    const email = sEmail.trim();
    const phone = sPhone.trim();
    const { firstName, lastName } = splitFullName(fullName);

    if (!fullName || !email || !phone) {
      Alert.alert('Missing Fields', 'Full name, email, and contact number are required.');
      return;
    }
    if (!firstName || !lastName) {
      Alert.alert('Invalid Name', 'Please enter the full name with at least first and last name.');
      return;
    }
    setCreating(true);
    try {
      const data = await request('/api/students', {
        method: 'POST', token,
        body: { firstName, lastName, email, phone, status: 'active' },
      });
      setStudentFullName('');
      setSEmail('');
      setSPhone('');
      await loadAll();
      Alert.alert(
        'Student Added',
        `Student added successfully.\n\nLogin email: ${data.loginEmail || email}\nTemporary password: ${data.temporaryPassword || 'Not available'}\n\nThe student must change this password after the first login.`,
      );
      return;
      Alert.alert('âœ… Success', 'Student added successfully.');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setCreating(false); }
  };

  const addCourse = async () => {
    const subject = cSubject.trim();
    const grade = cGrade.trim();

    if (!subject || !grade) {
      Alert.alert('Missing Fields', 'Subject and grade are required.');
      return;
    }

    const codePrefix = subject.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'COURSE';
    const generatedCode = `${codePrefix}${Date.now().toString().slice(-6)}`;

    setCreatingCourse(true);
    try {
      await request('/api/courses', {
        method: 'POST',
        token,
        body: {
          name: subject,
          code: generatedCode,
          subject,
          grade,
          fee: Number(cFee) || 0,
          status: 'active',
        },
      });
      setCSubject('');
      setCGrade('');
      setShowGradeOptions(false);
      setShowSubjectOptions(false);
      setCFee('');
      await loadAll();
      showPopupMessage('Success', 'Course added successfully.');
    } catch (e) {
      if (e?.status === 409) {
        showPopupMessage('Course Already Exists', e.message || `You already have ${subject} for ${grade}.`);
      } else {
        showPopupMessage('Error', e.message);
      }
    }
    finally { setCreatingCourse(false); }
  };

  const startCourseFeeEdit = (course) => {
    setEditingCourseId(course._id);
    setEditingCourseFee(String(Number(course.fee) || 0));
  };

  const cancelCourseFeeEdit = () => {
    setEditingCourseId('');
    setEditingCourseFee('');
  };

  const saveCourseFee = async (course) => {
    const feeValue = editingCourseFee.trim();
    const nextFee = Number(feeValue);

    if (!feeValue) {
      Alert.alert('Missing Fee', 'Please enter the course fee.');
      return;
    }

    if (Number.isNaN(nextFee) || nextFee < 0) {
      Alert.alert('Invalid Fee', 'Course fee must be a valid number greater than or equal to 0.');
      return;
    }

    setSavingCourseFeeId(course._id);
    try {
      const data = await request(`/api/courses/${course._id}`, {
        method: 'PUT',
        token,
        body: { fee: nextFee },
      });
      setCourses((currentCourses) => (
        currentCourses.map((currentCourse) => (
          currentCourse._id === course._id
            ? { ...currentCourse, ...(data.course || {}), fee: Number(data.course?.fee ?? nextFee) }
            : currentCourse
        ))
      ));
      cancelCourseFeeEdit();
      Alert.alert('Success', 'Course fee updated successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingCourseFeeId('');
    }
  };

  const deleteCourse = async (course) => {
    setDeletingCourseId(course._id);
    try {
      await request(`/api/courses/${course._id}`, {
        method: 'DELETE',
        token,
      });
      if (editingCourseId === course._id) {
        cancelCourseFeeEdit();
      }
      await loadAll();
      showPopupMessage('Deleted', 'Course removed successfully.');
    } catch (e) {
      showPopupMessage('Error', e.message);
    } finally {
      setDeletingCourseId('');
    }
  };

  const resetTimetableForm = () => {
    setTtGrade('');
    setShowTtGradeOptions(false);
    setTtCourseId('');
    setShowTtCourseOptions(false);
    setTtDay(TIMETABLE_DAYS[0]);
    setTtStart('');
    setTtEnd('');
    setShowTtStartOptions(false);
    setShowTtEndOptions(false);
    setTtTitle('');
    setTtSubject('');
    setTtRoom('');
    setShowTtHallOptions(false);
    setTtTutor('');
    setShowTtTutorOptions(false);
    setTtEditingId('');
  };

  const selectTimetableGrade = (grade) => {
    setTtGrade(grade);
    setShowTtGradeOptions(false);
    setTtCourseId('');
    setShowTtCourseOptions(false);
    setTtTitle('');
    setTtSubject('');
    setTtRoom('');
    setTtTutor('');
    setShowTtTutorOptions(false);
  };

  const selectCourseGrade = (grade) => {
    const nextSubjectOptions = COURSE_SUBJECT_OPTIONS_BY_GRADE[grade] || [];
    setCGrade(grade);
    setShowGradeOptions(false);
    setShowSubjectOptions(false);
    setCSubject((currentSubject) => (
      nextSubjectOptions.some((option) => option.value === currentSubject) ? currentSubject : ''
    ));
  };

  const selectCourseSubject = (subject) => {
    setCSubject(subject);
    setShowSubjectOptions(false);
  };

  const selectTimetableCourse = (course) => {
    setTtCourseId(course._id);
    setShowTtCourseOptions(false);
    setTtGrade(course.grade || '');
    setTtTitle(course.subject || course.name || '');
    setTtSubject(course.subject || course.name || '');
    setTtRoom(TIMETABLE_HALL_OPTIONS.includes(course.hallAllocation) ? course.hallAllocation : '');
    setShowTtHallOptions(false);
    setTtTutor('');
    setShowTtTutorOptions(false);
  };

  const beginTimetableEdit = (entry) => {
    const matchedCourse = findCourseForTimetableEntry(entry, courses);
    const matchedCourseId = matchedCourse?._id || entry?.courseId?._id || entry?.courseId || '';
    setTtGrade(matchedCourse?.grade || entry?.grade || '');
    setShowTtGradeOptions(false);
    setTtCourseId(matchedCourseId);
    setShowTtCourseOptions(false);
    setTtEditingId(entry._id);
    setTtDay(entry.dayOfWeek || TIMETABLE_DAYS[0]);
    setTtStart(entry.startTime || '');
    setTtEnd(entry.endTime || '');
    setShowTtStartOptions(false);
    setShowTtEndOptions(false);
    setTtTitle(entry.subject || matchedCourse?.subject || matchedCourse?.name || entry.title || '');
    setTtSubject(entry.subject || matchedCourse?.subject || matchedCourse?.name || '');
    setTtRoom(TIMETABLE_HALL_OPTIONS.includes(entry.room) ? entry.room : '');
    setShowTtHallOptions(false);
    setTtTutor(entry.tutorName || '');
    setShowTtTutorOptions(false);
  };

  const openTimetableSlotEditor = (day, slot, entry = null) => {
    if (!isAdminTimetableSlotAccessible(day, slot.startTime, slot.endTime)) {
      return;
    }

    const scrollToEditor = () => {
      setTimeout(() => {
        const targetY = Math.max(adminTimetableEditorOffsetRef.current - 24, 0);
        const scrollView = adminScrollRef.current;
        if (scrollView && typeof scrollView.scrollTo === 'function') {
          scrollView.scrollTo({ y: targetY, animated: true });
        }
      }, 120);
    };

    if (entry) {
      beginTimetableEdit(entry);
      scrollToEditor();
      return;
    }

    if (!ttViewGrade || ttViewGrade === ALL_GRADES_FILTER) {
      Alert.alert('Select Grade', 'Choose a grade first so the slot can be assigned correctly.');
      return;
    }

    resetTimetableForm();
    setTtGrade(ttViewGrade);
    setTtDay(day);
    setTtStart(slot.startTime);
    setTtEnd(slot.endTime);
    scrollToEditor();
  };

  const selectTimetableStartTime = (slot) => {
    setTtStart(slot.start);
    setTtEnd(slot.end);
    setShowTtStartOptions(false);
    setShowTtEndOptions(false);
  };

  const selectTimetableEndTime = (slot) => {
    setTtStart(slot.start);
    setTtEnd(slot.end);
    setShowTtEndOptions(false);
  };

  const selectTimetableHall = (hall) => {
    setTtRoom(hall);
    setShowTtHallOptions(false);
  };

  const selectTimetableTutor = (tutorName) => {
    setTtTutor(tutorName);
    setShowTtTutorOptions(false);
  };

  const findTimetableAssignmentConflict = ({
    entryId,
    dayOfWeek,
    startTime,
    endTime,
    room,
    tutorName,
  }) => {
    const normalizedRoom = String(room || '').trim().toLowerCase();
    const normalizedTutorName = String(tutorName || '').trim().toLowerCase();
    const conflictingEntries = timetable.filter((entry) => (
      String(entry._id || '') !== String(entryId || '')
      && entry.dayOfWeek === dayOfWeek
      && entry.startTime === startTime
      && entry.endTime === endTime
    ));

    if (normalizedRoom) {
      const hallConflict = conflictingEntries.find((entry) => (
        String(entry.room || '').trim().toLowerCase() === normalizedRoom
      ));

      if (hallConflict) {
        return `Hall ${room} is already assigned to ${String(hallConflict.subject || hallConflict.title || 'another class').trim()} during this time slot.`;
      }
    }

    if (normalizedTutorName) {
      const tutorConflict = conflictingEntries.find((entry) => (
        String(entry.tutorName || '').trim().toLowerCase() === normalizedTutorName
      ));

      if (tutorConflict) {
        return `Tutor ${tutorName} is already assigned to ${String(tutorConflict.subject || tutorConflict.title || 'another class').trim()} during this time slot.`;
      }
    }

    return '';
  };

  const saveTimetable = async () => {
    const selectedCourse = courses.find((course) => course._id === ttCourseId) || null;
    const selectedTimeSlot = TIMETABLE_TIME_SLOTS.find((slot) => slot.start === ttStart && slot.end === ttEnd) || null;
    const timetableTitle = selectedCourse
      ? String(selectedCourse.subject || selectedCourse.name || '').trim()
      : ttTitle.trim();

    if (!ttGrade || !ttCourseId || !ttDay || !ttStart || !ttEnd || !timetableTitle) {
      Alert.alert('Missing Fields', 'Grade, subject, day, start time, and end time are required.');
      return;
    }
    if (!selectedTimeSlot) {
      Alert.alert('Invalid Time', 'Please select a valid 1-hour time slot.');
      return;
    }

    const assignmentConflictMessage = findTimetableAssignmentConflict({
      entryId: ttEditingId,
      dayOfWeek: ttDay,
      startTime: ttStart,
      endTime: ttEnd,
      room: ttRoom,
      tutorName: ttTutor,
    });

    if (assignmentConflictMessage) {
      Alert.alert('Schedule Conflict', assignmentConflictMessage);
      return;
    }

    setTtSaving(true);
    try {
      const isEdit = Boolean(ttEditingId);
      const body = {
        courseId: ttCourseId,
        dayOfWeek: ttDay,
        startTime: ttStart,
        endTime: ttEnd,
        title: timetableTitle,
        subject: ttSubject,
        grade: selectedCourse?.grade || '',
        room: ttRoom,
        tutorName: ttTutor,
      };

      if (isEdit) {
        await request(`/api/timetable/${ttEditingId}`, { method: 'PUT', token, body });
      } else {
        await request('/api/timetable', { method: 'POST', token, body });
      }

      resetTimetableForm();
      await loadAll();
      Alert.alert('Success', isEdit ? 'Timetable updated.' : 'Timetable entry created.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setTtSaving(false);
    }
  };

  const deleteTimetableEntry = async (entryId) => {
    setTtDeletingId(entryId);
    try {
      await request(`/api/timetable/${entryId}`, { method: 'DELETE', token });
      if (ttEditingId === entryId) {
        resetTimetableForm();
      }
      await loadAll();
      Alert.alert('Deleted', 'Timetable entry removed.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setTtDeletingId('');
    }
  };

  const confirmDeleteTimetable = (entry) => {
    Alert.alert(
      'Delete Timetable',
      `Delete ${getTimetableEntryTitle(entry)} on ${entry.dayOfWeek}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTimetableEntry(entry._id),
        },
      ],
    );
  };

  const reviewRegistration = async (requestId, decision) => {
    if (reviewingRequestId) return;

    const reason = decision === 'reject'
      ? 'Rejected by admin. Contact support for review details.'
      : '';

    setReviewingRequestId(requestId);
    try {
      await request(`/api/users/${requestId}/registration-review`, {
        method: 'PATCH',
        token,
        body: { decision, reason },
      });
      await loadAll();
      Alert.alert(
        'Success',
        decision === 'approve' ? 'Registration approved.' : 'Registration rejected.',
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setReviewingRequestId('');
    }
  };

  const updateAdminProfile = async () => {
    const name = profileName.trim();
    const email = profileEmail.trim();

    if (!name || !email) {
      Alert.alert('Missing Fields', 'Name and email are required.');
      return;
    }

    setProfileSaving(true);
    try {
      const data = await request('/api/auth/profile', {
        method: 'PUT',
        token,
        body: { name, email },
      });
      onUserUpdated(data.user);
      setProfileName(data.user.name || '');
      setProfileEmail(data.user.email || '');
      Alert.alert('Updated', data.message || 'Admin profile updated successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const submitAdminSuggestion = async () => {
    const title = adminSuggestionTitle.trim();
    const message = adminSuggestionMessage.trim();

    if (!title || !message) {
      Alert.alert('Missing Fields', 'Title and message are required.');
      return;
    }

    setSubmittingAdminSuggestion(true);
    try {
      await request('/api/suggestions', {
        method: 'POST',
        token,
        body: {
          title,
          message,
          type: 'Suggestion',
        },
      });
      setAdminSuggestionTitle('');
      setAdminSuggestionMessage('');
      await loadAll();
      Alert.alert('Submitted', 'Your suggestion has been saved.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingAdminSuggestion(false);
    }
  };

  const beginSuggestionReview = (suggestion) => {
    setSelectedSuggestionId(suggestion._id);
    setSuggestionReviewStatus(suggestion.status || 'Open');
    setSuggestionReply(suggestion.reply || '');
    setSuggestionAdminNote(suggestion.adminNote || '');
  };

  const saveSuggestionReview = async () => {
    if (!selectedSuggestionId) {
      Alert.alert('Select Suggestion', 'Choose a suggestion to review first.');
      return;
    }

    setSavingSuggestionReview(true);
    try {
      await request(`/api/suggestions/${selectedSuggestionId}`, {
        method: 'PATCH',
        token,
        body: {
          status: suggestionReviewStatus,
          reply: suggestionReply,
          adminNote: suggestionAdminNote,
        },
      });
      await loadAll();
      Alert.alert('Updated', 'Suggestion review saved successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingSuggestionReview(false);
    }
  };

  const beginLeaveRequestReview = (leaveRequest) => {
    setSelectedLeaveRequestId(leaveRequest._id);
    setLeaveReviewStatus(leaveRequest.status || 'Pending');
    setLeaveAdminReply(leaveRequest.adminReply || '');
  };

  const saveLeaveRequestReview = async () => {
    if (!selectedLeaveRequestId) {
      Alert.alert('Select Request', 'Choose a leave request to review first.');
      return;
    }

    setSavingLeaveReview(true);
    try {
      await request(`/api/leave-requests/${selectedLeaveRequestId}`, {
        method: 'PATCH',
        token,
        body: {
          status: leaveReviewStatus,
          adminReply: leaveAdminReply,
        },
      });
      await loadAll();
      Alert.alert('Updated', 'Leave request review saved successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingLeaveReview(false);
    }
  };

  const reviewLeaveRequestInline = async (leaveRequest, status) => {
    if (!leaveRequest?._id || savingLeaveReview) return;

    setSelectedLeaveRequestId(leaveRequest._id);
    setLeaveReviewStatus(status);
    setLeaveAdminReply(leaveRequest.adminReply || '');
    setSavingLeaveReview(true);

    try {
      await request(`/api/leave-requests/${leaveRequest._id}`, {
        method: 'PATCH',
        token,
        body: {
          status,
          adminReply: leaveRequest.adminReply || '',
        },
      });
      await loadAll();
      Alert.alert('Updated', `Leave request ${status.toLowerCase()} successfully.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingLeaveReview(false);
    }
  };

  const reviewPaymentStatus = async (paymentId, status) => {
    if (!paymentId || reviewingPaymentId) return;

    setReviewingPaymentId(paymentId);
    try {
      await request(`/api/payments/${paymentId}/status`, {
        method: 'PATCH',
        token,
        body: {
          status,
          adminNote: status === 'Paid' ? 'Payment confirmed by admin.' : 'Receipt needs attention.',
        },
      });
      await loadAll();
      Alert.alert('Updated', `Payment marked as ${status}.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setReviewingPaymentId('');
    }
  };

  const reviewSalaryStatus = async (salaryId, status) => {
    if (!salaryId || reviewingSalaryId) return;

    setReviewingSalaryId(salaryId);
    try {
      await request(`/api/salaries/${salaryId}/status`, {
        method: 'PATCH',
        token,
        body: {
          status,
          adminNote: status === 'Paid' ? 'Salary paid by admin.' : 'Salary recalculated and pending payment.',
        },
      });
      const salaryData = await request(`/api/salaries?monthKey=${salaryYearFilter}-${salaryMonthFilter}`, { token });
      setSalaryRecords(salaryData.salaries || []);
      Alert.alert('Updated', `Salary marked as ${status}.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setReviewingSalaryId('');
    }
  };

  const studentPendingRequests = pendingRequests.filter((req) => (req.requestedRole || 'student') !== 'teacher');
  const tutorPendingRequests = pendingRequests.filter((req) => (req.requestedRole || 'student') === 'teacher');
  const filteredPendingRequests = approvalView === 'teacher' ? tutorPendingRequests : studentPendingRequests;
  const userGradeOptions = [
    ALL_GRADES_FILTER,
    ...Array.from(new Set([
      ...COURSE_GRADE_OPTIONS,
      ...adminUsers
        .map((directoryUser) => String(directoryUser.grade || '').trim())
      .filter(Boolean),
    ])).sort((firstGrade, secondGrade) => {
      const firstGradeNumber = parseGradeNumber(firstGrade);
      const secondGradeNumber = parseGradeNumber(secondGrade);

      if (firstGradeNumber !== secondGradeNumber) {
        return firstGradeNumber - secondGradeNumber;
      }

      return firstGrade.localeCompare(secondGrade);
    }),
  ];
  const paymentGradeOptions = [
    ALL_GRADES_FILTER,
    ...Array.from(new Set([
      ...COURSE_GRADE_OPTIONS,
      ...payments
        .map((payment) => String(payment.grade || payment.student?.grade || '').trim())
        .filter(Boolean),
    ]))
      .sort((firstGrade, secondGrade) => {
        const firstGradeNumber = parseGradeNumber(firstGrade);
        const secondGradeNumber = parseGradeNumber(secondGrade);

        if (firstGradeNumber !== secondGradeNumber) {
          return firstGradeNumber - secondGradeNumber;
        }

        return firstGrade.localeCompare(secondGrade);
      }),
  ];
  const isStudentRoleFilterActive = userRoleFilter === 'Student';
  const filteredPayments = paymentGradeFilter === ALL_GRADES_FILTER
    ? payments
    : payments.filter((payment) => String(payment.grade || payment.student?.grade || '').trim() === paymentGradeFilter);
  const filteredAdminUsers = adminUsers.filter((directoryUser) => {
    const matchesRole = userRoleFilter === ALL_USER_ROLES_FILTER
      || directoryUser.roleLabel === userRoleFilter;
    const matchesGrade = !isStudentRoleFilterActive
      || userGradeFilter === ALL_GRADES_FILTER
      || String(directoryUser.grade || '').trim() === userGradeFilter;
    const matchesStatus = userStatusFilter === ALL_USER_STATUSES_FILTER
      || directoryUser.statusLabel === userStatusFilter;
    const searchValue = userSearchText.trim().toLowerCase();
    const matchesSearch = !searchValue
      || String(directoryUser.name || '').toLowerCase().includes(searchValue)
      || String(directoryUser.email || '').toLowerCase().includes(searchValue);

    return matchesRole && matchesGrade && matchesStatus && matchesSearch;
  });
  const filteredCourses = courseFilterGrade === ALL_GRADES_FILTER
    ? courses
    : courses.filter((course) => course.grade === courseFilterGrade);
  const filteredTimetableEntries = ttViewGrade === ALL_GRADES_FILTER
    ? timetable
    : timetable.filter((entry) => getTimetableEntryGrade(entry, courses) === ttViewGrade);
  const adminTimetableRows = STUDENT_TIME_SLOTS.map((slot) => {
    const { start: startTime, end: endTime, label, key } = slot;
    return {
      slot: label,
      key,
      startTime,
      endTime,
      cells: TIMETABLE_DAYS.map((day) => {
        const entry = filteredTimetableEntries.find(
          (item) => item.dayOfWeek === day && item.startTime === startTime && item.endTime === endTime
        );
        return { day, entry };
      }),
    };
  });
  const courseSubjectOptions = cGrade
    ? (COURSE_SUBJECT_OPTIONS_BY_GRADE[cGrade] || [])
    : [];
  const timetableCoursesForGrade = ttGrade
    ? courses.filter((course) => course.grade === ttGrade)
    : [];
  const timetableTutorsForSubject = tutors.filter((tutor) => (
    String(tutor.subject || '').trim().toLowerCase() === String(ttSubject || '').trim().toLowerCase()
  ));
  const selectedTtTimeSlot = TIMETABLE_TIME_SLOTS.find((slot) => slot.start === ttStart && slot.end === ttEnd) || null;
  const timetableEndOptions = selectedTtTimeSlot ? [selectedTtTimeSlot] : [];
  const selectedTtCourse = courses.find((course) => course._id === ttCourseId) || null;
  const selectedAdminTimetableEntry = ttEditingId
    ? timetable.find((entry) => entry._id === ttEditingId) || null
    : null;
  const getTimetableEntryTitle = (entry) => formatTimetableEntryTitle(entry, courses);
  const selectedTimetableSlotLabel = selectedTtTimeSlot
    ? `${selectedTtTimeSlot.label} • ${ttDay || 'Day not selected'}`
    : '';
  const adminMySuggestions = adminSuggestions.filter((item) => (
    String(item.createdBy?._id || item.createdBy?.id || item.createdBy || '') === String(user.id || user._id || '')
  ));
  const selectedTimetableTimeLabel = ttStart && ttEnd
    ? `${formatTimetableTime(ttStart)} - ${formatTimetableTime(ttEnd)}`
    : '';
  const selectedTimetableSelectionLabel = ttDay && selectedTimetableTimeLabel
    ? `${ttDay} • ${selectedTimetableTimeLabel}`
    : selectedTimetableTimeLabel || ttDay || '';
  const timetableAssignmentConflictMessage = selectedTimetableSelectionLabel
    ? findTimetableAssignmentConflict({
      entryId: ttEditingId,
      dayOfWeek: ttDay,
      startTime: ttStart,
      endTime: ttEnd,
      room: ttRoom,
      tutorName: ttTutor,
    })
    : '';
  const selectedSuggestion = adminSuggestions.find((item) => item._id === selectedSuggestionId) || null;
  const selectedLeaveRequest = leaveRequests.find((item) => item._id === selectedLeaveRequestId) || null;
  const pendingLeaveRequests = leaveRequests.filter((item) => item.status === 'Pending');
  const resolvedLeaveRequests = leaveRequests.filter((item) => item.status !== 'Pending');
  const salaryYearOptions = Array.from({ length: 4 }, (_, index) => String(new Date().getFullYear() - index));
  const salaryPeriodKey = `${salaryYearFilter}-${salaryMonthFilter}`;
  const salaryRows = salaryRecords
    .map((salary) => ({
      id: salary.id,
      name: salary.tutor?.name || 'Tutor',
      subject: salary.subject || salary.tutor?.subject || '-',
      month: salary.monthLabel || salary.monthKey || salaryPeriodKey,
      hours: salary.hours || 0,
      ratePerHour: salary.ratePerHour || 0,
      amount: salary.amount || 0,
      status: salary.status || 'Pending',
      adminNote: salary.adminNote || '',
      reviewedAt: salary.reviewedAt || '',
    }))
    .sort((firstTutor, secondTutor) => firstTutor.name.localeCompare(secondTutor.name));
  const selectedExam = examOptions.find((exam) => exam.id === selectedExamId) || examOptions[0] || null;
  const adminExamSubjects = examGradebook?.subjects || [];
  const adminExamRows = examGradebook?.rows || [];
  const sortedAdminTimetableEntries = [...filteredTimetableEntries].sort((firstEntry, secondEntry) => (
    (TIMETABLE_DAYS.indexOf(firstEntry.dayOfWeek) - TIMETABLE_DAYS.indexOf(secondEntry.dayOfWeek))
    || (timeStringToMinutes(firstEntry.startTime) - timeStringToMinutes(secondEntry.startTime))
    || String(firstEntry.subject || firstEntry.title || '').localeCompare(String(secondEntry.subject || secondEntry.title || ''))
  ));
  const openAdminSuggestions = adminSuggestions.filter((item) => item.status === 'Open' || item.status === 'In Review');
  const resolvedAdminSuggestions = adminSuggestions.filter((item) => item.status === 'Resolved' || item.status === 'Closed');
  const adminNotifications = [
    pendingRequests.length > 0 ? {
      id: 'admin-pending-users',
      title: `${pendingRequests.length} user approval${pendingRequests.length > 1 ? 's are' : ' is'} waiting`,
      detail: 'Review the Pending Users panel for new registrations.',
    } : null,
    pendingLeaveRequests.length > 0 ? {
      id: 'admin-pending-leave',
      title: `${pendingLeaveRequests.length} leave request${pendingLeaveRequests.length > 1 ? 's are' : ' is'} pending`,
      detail: 'Open Leave Requests to approve or reject them.',
    } : null,
    payments.filter((item) => item.status === 'Pending').length > 0 ? {
      id: 'admin-pending-payments',
      title: `${payments.filter((item) => item.status === 'Pending').length} payment${payments.filter((item) => item.status === 'Pending').length > 1 ? 's are' : ' is'} awaiting review`,
      detail: 'Student Payment Details has receipts that still need confirmation.',
    } : null,
    salaryRows.filter((item) => item.status === 'Pending').length > 0 ? {
      id: 'admin-pending-salaries',
      title: `${salaryRows.filter((item) => item.status === 'Pending').length} salary record${salaryRows.filter((item) => item.status === 'Pending').length > 1 ? 's are' : ' is'} pending`,
      detail: 'Check Salary Details to review pending tutor payments.',
    } : null,
    openAdminSuggestions.length > 0 ? {
      id: 'admin-open-suggestions',
      title: `${openAdminSuggestions.length} suggestion${openAdminSuggestions.length > 1 ? 's need' : ' needs'} attention`,
      detail: 'Open All Suggestions to review open or in-review feedback.',
    } : null,
  ].filter(Boolean);
  const adminMenuItems = [
    { key: 'overview', label: 'Dashboard', section: 'Overview', icon: 'dashboard' },
    { key: 'users', label: 'Users', section: 'Management', icon: 'groups' },
    { key: 'approvals', label: 'Pending Users', section: 'Management', icon: 'person-add-alt-1' },
    { key: 'students', label: 'Students', section: 'Management', icon: 'school' },
    { key: 'courses', label: 'Class Details', section: 'Management', icon: 'menu-book' },
    { key: 'timetable', label: 'Timetable', section: 'Management', icon: 'calendar-today' },
    {
      key: 'leaveRequests',
      label: 'Leave Requests',
      section: 'Operations',
      icon: 'event-note',
      badge: pendingLeaveRequests.length > 0 ? String(pendingLeaveRequests.length) : '',
    },
    { key: 'studentPayments', label: 'Student Payment Details', section: 'Finance', icon: 'payments' },
    { key: 'salaryDetails', label: 'Salary Details', section: 'Finance', icon: 'account-balance-wallet' },
    { key: 'examResults', label: 'Exams & Results', section: 'Academics', icon: 'fact-check' },
    { key: 'allSuggestions', label: 'All Suggestions', section: 'Suggestions', icon: 'forum' },
    { key: 'mySuggestion', label: 'My Suggestion', section: 'Suggestions', icon: 'lightbulb' },
  ];
  const totalMonthlyIncome = courses.reduce((sum, course) => sum + (Number(course.fee) || 0), 0);
  const activeUsers = userSummary.activeCount;

  return (
    <WebDashboardShell
      welcome="Welcome, Admin!"
      roleLabel="Admin"
      user={user}
      activeTab={tab}
      onTabChange={setTab}
      menuItems={adminMenuItems}
      notifications={adminNotifications}
      onLogout={onLogout}
      onOpenProfile={() => setTab('profile')}
    >
      {/* Header */}
      <View style={{ display: 'none' }}>
        <View>
          <Text style={adm.headerRole}>ðŸ›  Admin Panel</Text>
          <Text style={adm.headerName}>Hello, {user.name.split(' ')[0]}</Text>
        </View>
        <TouchableOpacity
          style={adm.logoutBtn}
          onPress={onLogout}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Text style={adm.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={{ display: 'none' }}>
        {['overview', 'students', 'courses', 'timetable', 'approvals'].map((t) => (
          <TouchableOpacity key={t} style={[adm.tabBtn, tab === t && adm.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[adm.tabBtnText, tab === t && adm.tabBtnTextActive]}>
              {t === 'overview'
                ? 'ðŸ“Š Overview'
                : t === 'students'
                  ? 'ðŸ‘¥ Students'
                  : t === 'courses'
                    ? 'ðŸ“š Courses'
                    : t === 'halls'
                      ? 'Halls'
                    : t === 'timetable'
                      ? 'ðŸ—“ Timetable'
                      : 'â³ Approvals'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView ref={adminScrollRef} style={{ flex: 1 }} contentContainerStyle={adm.scroll}>
        {loading && <ActivityIndicator color="#7c3aed" style={{ marginTop: 20 }} />}

        {!loading && tab === 'overview' && (
          <>
            <WebPageTitle
              title="Admin Dashboard"
              subtitle="Track the institution overview, fee status, class activity, and user growth from one place."
            />
            <View style={webDash.metricGrid}>
              <WebMetricCard label="Total Students" value={stats.students} badge="ST" accent="#2563eb" />
              <WebMetricCard label="Total Tutors" value={userSummary.tutorCount} badge="TU" accent="#22c55e" />
              <WebMetricCard label="Total Monthly Income" value={`LKR ${totalMonthlyIncome.toLocaleString()}`} badge="RS" accent="#7c3aed" />
              <WebMetricCard label="Pending Users" value={userSummary.pendingCount} badge="PD" accent="#f59e0b" />
              <WebMetricCard label="Total Active Users" value={activeUsers} badge="AC" accent="#0f766e" />
              <WebMetricCard label="All Class Attendance" value={timetable.length} badge="AT" accent="#0f172a" />
            </View>
            <View style={adm.statsRow}>
              <StatCard icon="ST" number={stats.students} label="Students" color="#7c3aed" />
              <StatCard icon="CR" number={stats.courses} label="Courses" color="#0ea5e9" />
              <StatCard icon="EN" number={stats.enrollments} label="Enrollments" color="#f59e0b" />
            </View>

            <View style={adm.card}>
              <SectionHeader title={`Pending Registrations (${stats.pendingApprovals})`} action={loadAll} />
              {pendingRequests.length === 0
                ? <Text style={adm.empty}>No pending approvals.</Text>
                : pendingRequests.slice(0, 4).map((req) => (
                  <View key={req._id} style={adm.listRow}>
                    <View style={adm.avatar}>
                      <Text style={adm.avatarText}>{req.name?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={adm.rowName}>{req.name}</Text>
                      <Text style={adm.rowSub}>{req.email}</Text>
                      <Text style={adm.requestMeta}>
                        {(req.requestedRole || 'student') === 'teacher'
                          ? `Subject: ${req.subject || 'Not set'}`
                          : `Grade: ${req.grade || 'Not set'}`}
                      </Text>
                    </View>
                    <View style={adm.requestRolePill}>
                      <Text style={adm.requestRolePillText}>
                        {(req.requestedRole || 'student') === 'teacher' ? 'Tutor' : 'Student'}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>

            <View style={adm.card}>
              <SectionHeader title="Recent Students" action={loadAll} />
              {students.slice(0, 5).map((s) => (
                <View key={s._id} style={adm.listRow}>
                  <View style={adm.avatar}>
                    <Text style={adm.avatarText}>{s.firstName?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={adm.rowName}>{s.firstName} {s.lastName}</Text>
                    <Text style={adm.rowSub}>{s.email}</Text>
                  </View>
                  <View style={[adm.statusPill, s.status === 'active' ? adm.pillGreen : adm.pillGray]}>
                    <Text style={adm.pillText}>{s.status}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={adm.card}>
              <SectionHeader title="Recent Courses" />
              {courses.slice(0, 5).map((c) => (
                <View key={c._id} style={adm.listRow}>
                  <View style={adm.codeBox}>
                    <Text style={adm.codeText}>{c.code?.slice(0, 3)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={adm.rowName}>{c.name}</Text>
                    {c.grade ? <Text style={adm.rowSub}>Grade: {c.grade}</Text> : null}
                    <Text style={adm.rowSub}>
                      {[c.subject, c.hallAllocation ? `Hall ${c.hallAllocation}` : null].filter(Boolean).join(' â€¢ ')}
                    </Text>
                  </View>
                  <Text style={adm.feeText}>{formatLkr(c.fee)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {!loading && tab === 'users' && (
          <>
            <WebPageTitle
              title="Users"
              subtitle="View all registered accounts, track user status quickly, and filter the list by role, grade, or search text."
            />

            <View style={adm.userMetricGrid}>
              <View style={adm.userMetricItem}>
                <WebMetricCard label="Tutor Count" value={userSummary.tutorCount} badge="TU" accent="#2563eb" />
              </View>
              <View style={adm.userMetricItem}>
                <WebMetricCard label="Student Count" value={userSummary.studentCount} badge="ST" accent="#16a34a" />
              </View>
              <View style={adm.userMetricItem}>
                <WebMetricCard label="Total User Count" value={userSummary.totalUsers} badge="US" accent="#7c3aed" />
              </View>
              <View style={adm.userMetricItem}>
                <WebMetricCard label="Active Users" value={userSummary.activeCount} badge="AC" accent="#0f766e" />
              </View>
              <View style={adm.userMetricItem}>
                <WebMetricCard label="Pending" value={userSummary.pendingCount} badge="PD" accent="#f59e0b" />
              </View>
              <View style={adm.userMetricItem}>
                <WebMetricCard label="Blocked" value={userSummary.blockedCount} badge="BL" accent="#dc2626" />
              </View>
            </View>

            <View style={webDash.filterBar}>
              <View style={adm.userFilterRow}>
                <View style={adm.userFilterField}>
                  <Text style={webDash.filterLabel}>Role</Text>
                  <TouchableOpacity
                    style={[adm.selectField, adm.userFilterSelect]}
                    onPress={() => {
                      setShowUserGradeOptions(false);
                      setShowUserStatusOptions(false);
                      setShowUserRoleOptions((current) => !current);
                    }}
                  >
                    <Text style={adm.selectFieldText}>{userRoleFilter}</Text>
                    <Text style={adm.selectFieldArrow}>{showUserRoleOptions ? '^' : 'v'}</Text>
                  </TouchableOpacity>
                  {showUserRoleOptions ? (
                    <View style={adm.selectOptions}>
                      {[ALL_USER_ROLES_FILTER, 'Tutor', 'Student'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[adm.selectOption, userRoleFilter === option && adm.selectOptionActive]}
                          onPress={() => {
                            setUserRoleFilter(option);
                            if (option !== 'Student') {
                              setUserGradeFilter(ALL_GRADES_FILTER);
                              setShowUserGradeOptions(false);
                            }
                            setShowUserRoleOptions(false);
                          }}
                        >
                          <Text style={[adm.selectOptionText, userRoleFilter === option && adm.selectOptionTextActive]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={adm.userFilterField}>
                  <Text style={webDash.filterLabel}>Grade</Text>
                  <TouchableOpacity
                    style={[
                      adm.selectField,
                      adm.userFilterSelect,
                      !isStudentRoleFilterActive && { opacity: 0.55 },
                    ]}
                    onPress={() => {
                      if (!isStudentRoleFilterActive) return;
                      setShowUserRoleOptions(false);
                      setShowUserStatusOptions(false);
                      setShowUserGradeOptions((current) => !current);
                    }}
                  >
                    <Text style={userGradeFilter === ALL_GRADES_FILTER ? adm.selectFieldPlaceholder : adm.selectFieldText}>
                      {isStudentRoleFilterActive ? userGradeFilter : 'Available for Student only'}
                    </Text>
                    <Text style={adm.selectFieldArrow}>{showUserGradeOptions ? '^' : 'v'}</Text>
                  </TouchableOpacity>
                  {showUserGradeOptions && isStudentRoleFilterActive ? (
                    <View style={adm.selectOptions}>
                      {userGradeOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[adm.selectOption, userGradeFilter === option && adm.selectOptionActive]}
                          onPress={() => {
                            setUserGradeFilter(option);
                            setShowUserGradeOptions(false);
                          }}
                        >
                          <Text style={[adm.selectOptionText, userGradeFilter === option && adm.selectOptionTextActive]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={adm.userFilterField}>
                  <Text style={webDash.filterLabel}>Status</Text>
                  <TouchableOpacity
                    style={[adm.selectField, adm.userFilterSelect]}
                    onPress={() => {
                      setShowUserRoleOptions(false);
                      setShowUserGradeOptions(false);
                      setShowUserStatusOptions((current) => !current);
                    }}
                  >
                    <Text style={adm.selectFieldText}>{userStatusFilter}</Text>
                    <Text style={adm.selectFieldArrow}>{showUserStatusOptions ? '^' : 'v'}</Text>
                  </TouchableOpacity>
                  {showUserStatusOptions ? (
                    <View style={adm.selectOptions}>
                      {[ALL_USER_STATUSES_FILTER, 'Active', 'Pending', 'Blocked'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[adm.selectOption, userStatusFilter === option && adm.selectOptionActive]}
                          onPress={() => {
                            setUserStatusFilter(option);
                            setShowUserStatusOptions(false);
                          }}
                        >
                          <Text style={[adm.selectOptionText, userStatusFilter === option && adm.selectOptionTextActive]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={adm.userFilterField}>
                  <Text style={webDash.filterLabel}>Search</Text>
                  <TextInput
                    style={adm.userSearchInput}
                    placeholder="Search by name or email"
                    value={userSearchText}
                    onChangeText={setUserSearchText}
                    autoCapitalize="none"
                    autoCorrect={false}
                    showSoftInputOnFocus
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={adm.userResultsRow}>
                <Text style={adm.userResultsText}>
                  Showing {filteredAdminUsers.length} of {adminUsers.length} users
                </Text>
                <TouchableOpacity
                  style={adm.userResetBtn}
                  onPress={() => {
                    setUserRoleFilter(ALL_USER_ROLES_FILTER);
                    setUserGradeFilter(ALL_GRADES_FILTER);
                    setUserStatusFilter(ALL_USER_STATUSES_FILTER);
                    setUserSearchText('');
                    setShowUserRoleOptions(false);
                    setShowUserGradeOptions(false);
                    setShowUserStatusOptions(false);
                  }}
                >
                  <Text style={adm.userResetBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            </View>

            {filteredAdminUsers.length === 0 ? (
              <View style={webDash.emptyBox}>
                <Text style={webDash.emptyText}>No users match the selected filters.</Text>
              </View>
            ) : (
              <View style={webDash.table}>
                <View style={[webDash.tableRow, webDash.tableHeader]}>
                  {['Name', 'Email', 'Role', 'Grade', 'Subject', 'Status', 'Actions'].map((heading) => (
                    <View key={heading} style={heading === 'Name' ? webDash.tableCellWide : webDash.tableCell}>
                      <Text style={webDash.tableHeadText}>{heading}</Text>
                    </View>
                  ))}
                </View>
                {filteredAdminUsers.map((directoryUser) => (
                  <View key={directoryUser.id || directoryUser.email} style={webDash.tableRow}>
                    <View style={webDash.tableCellWide}>
                      <Text style={[webDash.tableText, adm.userTablePrimary]}>{directoryUser.name}</Text>
                      <Text style={adm.userTableSecondary}>{formatAppDate(directoryUser.createdAt)}</Text>
                    </View>
                    <View style={webDash.tableCell}>
                      <Text style={webDash.tableText}>{directoryUser.email}</Text>
                    </View>
                    <View style={webDash.tableCell}>
                      <Text style={webDash.tableText}>{directoryUser.roleLabel}</Text>
                    </View>
                    <View style={webDash.tableCell}>
                      <Text style={webDash.tableText}>{directoryUser.grade || '-'}</Text>
                    </View>
                    <View style={webDash.tableCell}>
                      <Text style={webDash.tableText}>{directoryUser.subject || '-'}</Text>
                    </View>
                    <View style={webDash.tableCell}>
                      <StatusPill
                        label={directoryUser.statusLabel}
                        tone={getAdminUserStatusTone(directoryUser.status)}
                      />
                      {directoryUser.approvalReason ? (
                        <Text style={adm.userTableSecondary}>{directoryUser.approvalReason}</Text>
                      ) : null}
                    </View>
                    <View style={webDash.tableCell}>
                      <TouchableOpacity
                        style={[adm.userDeleteBtn, deletingUserId === (directoryUser.id || directoryUser._id) && adm.actionBtnDisabled]}
                        onPress={() => deleteAdminUser(directoryUser)}
                        disabled={deletingUserId === (directoryUser.id || directoryUser._id)}
                      >
                        <Text style={adm.userDeleteBtnText}>
                          {deletingUserId === (directoryUser.id || directoryUser._id) ? 'Deleting...' : 'Delete'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {!loading && tab === 'approvals' && (
          <>
            <WebPageTitle
              title="Pending Users"
              subtitle="Review new registrations and approve the right accounts quickly."
              actionLabel="Refresh"
              onActionPress={loadAll}
            />

            <View style={webDash.metricGrid}>
              <WebMetricCard
                label="All Pending Users"
                value={String(pendingRequests.length)}
                badge="PD"
                accent="#f59e0b"
              />
              <WebMetricCard
                label="Pending Students"
                value={String(studentPendingRequests.length)}
                badge="ST"
                accent="#2563eb"
              />
              <WebMetricCard
                label="Pending Tutors"
                value={String(tutorPendingRequests.length)}
                badge="TU"
                accent="#16a34a"
              />
            </View>

            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Review Queue</Text>
              <Text style={webDash.sectionText}>
                Switch between student and tutor requests, then approve or reject each registration.
              </Text>

              <View style={[adm.manageSwitchRow, { marginTop: 18 }]}>
                {[
                  { key: 'student', label: `Students (${studentPendingRequests.length})` },
                  { key: 'teacher', label: `Tutors (${tutorPendingRequests.length})` },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      adm.manageSwitchBtn,
                      approvalView === option.key && adm.manageSwitchBtnActive,
                    ]}
                    onPress={() => setApprovalView(option.key)}
                  >
                    <Text
                      style={[
                        adm.manageSwitchText,
                        approvalView === option.key && adm.manageSwitchTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {filteredPendingRequests.length === 0 ? (
                <View style={webDash.emptyBox}>
                  <Text style={webDash.emptyText}>
                    {approvalView === 'teacher'
                      ? 'No pending tutor registrations right now.'
                      : 'No pending student registrations right now.'}
                  </Text>
                </View>
              ) : (
                <View style={[webDash.table, { marginTop: 18 }]}>
                  <View style={[webDash.tableRow, webDash.tableHeader]}>
                    {['Full Name', 'Email', 'Role', approvalView === 'teacher' ? 'Subject' : 'Grade', 'Created At', 'Actions'].map((heading) => (
                      <View key={heading} style={heading === 'Full Name' || heading === 'Email' ? webDash.tableCellWide : webDash.tableCell}>
                        <Text style={webDash.tableHeadText}>{heading}</Text>
                      </View>
                    ))}
                  </View>
                  {filteredPendingRequests.map((pendingUser) => {
                    const isBusy = reviewingRequestId === pendingUser._id;
                    const roleLabel = (pendingUser.requestedRole || 'student') === 'teacher' ? 'Tutor' : 'Student';

                    return (
                      <View key={pendingUser._id} style={webDash.tableRow}>
                        <View style={webDash.tableCellWide}>
                          <Text style={[webDash.tableText, adm.userTablePrimary]}>{pendingUser.name}</Text>
                        </View>
                        <View style={webDash.tableCellWide}>
                          <Text style={webDash.tableText}>{pendingUser.email}</Text>
                        </View>
                        <View style={webDash.tableCell}>
                          <StatusPill
                            label={roleLabel}
                            tone={(pendingUser.requestedRole || 'student') === 'teacher' ? 'green' : 'blue'}
                          />
                        </View>
                        <View style={webDash.tableCell}>
                          <Text style={webDash.tableText}>
                            {(pendingUser.requestedRole || 'student') === 'teacher'
                              ? pendingUser.subject || '-'
                              : pendingUser.grade || '-'}
                          </Text>
                        </View>
                        <View style={webDash.tableCell}>
                          <Text style={webDash.tableText}>{formatAppDate(pendingUser.createdAt)}</Text>
                        </View>
                        <View style={webDash.tableCell}>
                          <View style={adm.approvalActions}>
                            <TouchableOpacity
                              style={[adm.approveBtn, isBusy && adm.actionBtnDisabled]}
                              onPress={() => reviewRegistration(pendingUser._id, 'approve')}
                              disabled={isBusy}
                            >
                              <Text style={adm.approveBtnText}>{isBusy ? 'Working...' : 'Approve'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[adm.rejectBtn, isBusy && adm.actionBtnDisabled]}
                              onPress={() => reviewRegistration(pendingUser._id, 'reject')}
                              disabled={isBusy}
                            >
                              <Text style={adm.rejectBtnText}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}

        {!loading && tab === 'students' && (
          <View style={adm.card}>
            <SectionHeader title="Add New Student" />
            <Text style={adm.helperText}>
              Use the same student identity details you expect during registration so records stay consistent.
            </Text>
            {[
              {
                label: 'Full Name',
                val: studentFullName,
                set: setStudentFullName,
                ph: 'Enter full name',
                cap: 'words',
              },
              {
                label: 'Email Address',
                val: sEmail,
                set: setSEmail,
                ph: 'Enter email address',
                kb: 'email-address',
                cap: 'none',
              },
              {
                label: 'Contact No',
                val: sPhone,
                set: setSPhone,
                ph: 'Enter contact number',
                kb: 'phone-pad',
                cap: 'none',
              },
            ].map(({ label, val, set, ph, kb, cap }) => (
              <View key={label} style={adm.formField}>
                <Text style={adm.formLabel}>{label}</Text>
                <TextInput
                  style={[adm.input, adm.formInput]}
                  placeholder={ph}
                  value={val}
                  onChangeText={set}
                  keyboardType={kb || 'default'}
                  autoCapitalize={cap || 'none'}
                  autoCorrect={false}
                  showSoftInputOnFocus
                  placeholderTextColor="#94a3b8"
                />
              </View>
            ))}
            <TouchableOpacity style={adm.actionBtn} onPress={addStudent} disabled={creating}>
              <Text style={adm.actionBtnText}>{creating ? 'Adding...' : '+ Add Student'}</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 20 }}>
              <SectionHeader title={`All Students (${students.length})`} action={loadAll} />
              {students.length === 0
                ? <Text style={adm.empty}>No students yet.</Text>
                : students.map((s) => (
                  <View key={s._id} style={adm.listRow}>
                    <View style={adm.avatar}>
                      <Text style={adm.avatarText}>{s.firstName?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={adm.rowName}>{s.firstName} {s.lastName}</Text>
                      <Text style={adm.rowSub}>{s.email}</Text>
                    </View>
                    <View style={[adm.statusPill, s.status === 'active' ? adm.pillGreen : adm.pillGray]}>
                      <Text style={adm.pillText}>{s.status}</Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}

        {!loading && tab === 'courses' && (
          <View style={adm.card}>
            <SectionHeader title="Manage Courses" />
            <View style={adm.formField}>
              <Text style={adm.formLabel}>Grade</Text>
              <TouchableOpacity
                style={adm.selectField}
                onPress={() => {
                  setShowSubjectOptions(false);
                  setShowCourseFilterOptions(false);
                  setShowGradeOptions((current) => !current);
                }}
              >
                <Text style={cGrade ? adm.selectFieldText : adm.selectFieldPlaceholder}>
                  {cGrade || 'Select grade'}
                </Text>
                <Text style={adm.selectFieldArrow}>{showGradeOptions ? '^' : 'v'}</Text>
              </TouchableOpacity>
              {showGradeOptions ? (
                <View style={adm.selectOptions}>
                  {COURSE_GRADE_OPTIONS.map((grade) => (
                    <TouchableOpacity
                      key={grade}
                      style={[adm.selectOption, cGrade === grade && adm.selectOptionActive]}
                      onPress={() => selectCourseGrade(grade)}
                    >
                      <Text style={[adm.selectOptionText, cGrade === grade && adm.selectOptionTextActive]}>
                        {grade}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
            <View style={adm.formField}>
              <Text style={adm.formLabel}>Subject</Text>
              <TouchableOpacity
                style={adm.selectField}
                onPress={() => {
                  if (!cGrade) return;
                  setShowCourseFilterOptions(false);
                  setShowGradeOptions(false);
                  setShowSubjectOptions((current) => !current);
                }}
              >
                <Text style={cSubject ? adm.selectFieldText : adm.selectFieldPlaceholder}>
                  {cSubject || (cGrade ? 'Select subject' : 'Select grade first')}
                </Text>
                <Text style={adm.selectFieldArrow}>{showSubjectOptions ? '^' : 'v'}</Text>
              </TouchableOpacity>
              {showSubjectOptions ? (
                <View style={adm.selectOptions}>
                  {courseSubjectOptions.length === 0 ? (
                    <Text style={adm.selectEmptyText}>No subjects available for this grade.</Text>
                  ) : courseSubjectOptions.map((option, index) => (
                    <React.Fragment key={`${option.category || 'subject'}-${option.value}`}>
                      {cGrade && option.category && (index === 0 || courseSubjectOptions[index - 1].category !== option.category) ? (
                        <Text style={adm.selectSectionTitle}>{option.category}</Text>
                      ) : null}
                      <TouchableOpacity
                        style={[adm.selectOption, cSubject === option.value && adm.selectOptionActive]}
                        onPress={() => selectCourseSubject(option.value)}
                      >
                        <Text style={[adm.selectOptionText, cSubject === option.value && adm.selectOptionTextActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              ) : null}
            </View>
            <TextInput
              style={adm.input}
              placeholder="Fee (Rs.)"
              value={cFee}
              onChangeText={setCFee}
              keyboardType="numeric"
              autoCapitalize="none"
              showSoftInputOnFocus
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity style={adm.actionBtn} onPress={addCourse} disabled={creatingCourse}>
              <Text style={adm.actionBtnText}>
                {creatingCourse ? 'Adding...' : '+ Add Course'}
              </Text>
            </TouchableOpacity>

            <View style={{ marginTop: 20 }}>
              <SectionHeader title={`All Courses (${filteredCourses.length})`} action={loadAll} />
              <View style={adm.formField}>
                <Text style={adm.formLabel}>View By Grade</Text>
                <TouchableOpacity
                  style={adm.selectField}
                  onPress={() => {
                    setShowGradeOptions(false);
                    setShowCourseFilterOptions((current) => !current);
                  }}
                >
                  <Text style={adm.selectFieldText}>{courseFilterGrade}</Text>
                  <Text style={adm.selectFieldArrow}>{showCourseFilterOptions ? '^' : 'v'}</Text>
                </TouchableOpacity>
                {showCourseFilterOptions ? (
                  <View style={adm.selectOptions}>
                    {[ALL_GRADES_FILTER, ...COURSE_GRADE_OPTIONS].map((grade) => (
                      <TouchableOpacity
                        key={grade}
                        style={[adm.selectOption, courseFilterGrade === grade && adm.selectOptionActive]}
                        onPress={() => {
                          setCourseFilterGrade(grade);
                          setShowCourseFilterOptions(false);
                        }}
                      >
                        <Text style={[adm.selectOptionText, courseFilterGrade === grade && adm.selectOptionTextActive]}>
                          {grade}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
              {filteredCourses.length === 0
                ? (
                  <Text style={adm.empty}>
                    {courseFilterGrade === ALL_GRADES_FILTER
                      ? 'No courses yet.'
                      : `No courses found for ${courseFilterGrade}.`}
                  </Text>
                )
                : filteredCourses.map((c) => (
                  <React.Fragment key={c._id}>
                    <View style={adm.listRow}>
                      <View style={adm.codeBox}>
                        <Text style={adm.codeText}>{c.code?.slice(0, 3)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={adm.rowName}>{c.name}</Text>
                        <Text style={adm.rowSub}>{[c.subject, c.grade, c.status].filter(Boolean).join(' • ')}</Text>
                      </View>
                      <View style={adm.courseFeeActionWrap}>
                        <Text style={adm.feeText}>{formatLkr(c.fee)}</Text>
                        {editingCourseId !== c._id ? (
                          <>
                            <TouchableOpacity
                              style={adm.courseInlineEditBtn}
                              onPress={() => startCourseFeeEdit(c)}
                              disabled={deletingCourseId === c._id}
                            >
                              <Text style={adm.courseInlineEditBtnText}>Edit Fee</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={adm.courseInlineDeleteBtn}
                              onPress={() => deleteCourse(c)}
                              disabled={deletingCourseId === c._id}
                            >
                              <Text style={adm.courseInlineDeleteBtnText}>
                                {deletingCourseId === c._id ? 'Deleting...' : 'Delete'}
                              </Text>
                            </TouchableOpacity>
                          </>
                        ) : null}
                      </View>
                    </View>
                    {editingCourseId === c._id ? (
                      <View style={adm.courseEditPanel}>
                        <View style={adm.courseEditPanelHeader}>
                          <Text style={adm.courseEditPanelTitle}>Update Course Fee</Text>
                          <Text style={adm.courseEditPanelMeta}>{c.name} • {c.grade}</Text>
                        </View>
                        <View style={adm.courseEditStats}>
                          <View style={adm.courseEditStatCard}>
                            <Text style={adm.courseEditStatLabel}>Current Fee</Text>
                            <Text style={adm.courseEditStatValue}>{formatLkr(c.fee)}</Text>
                          </View>
                          <View style={adm.courseEditStatCard}>
                            <Text style={adm.courseEditStatLabel}>New Fee</Text>
                            <TextInput
                              style={[adm.input, adm.formInput, adm.courseFeeEditorInput]}
                              placeholder="Enter new fee"
                              value={editingCourseFee}
                              onChangeText={setEditingCourseFee}
                              keyboardType="numeric"
                              autoCapitalize="none"
                              placeholderTextColor="#94a3b8"
                            />
                          </View>
                        </View>
                        <Text style={adm.courseEditHint}>
                          Change the class fee for this subject and grade here.
                        </Text>
                        <View style={adm.courseEditActionRow}>
                          <TouchableOpacity
                            style={adm.courseInlineSaveBtn}
                            onPress={() => saveCourseFee(c)}
                            disabled={savingCourseFeeId === c._id}
                          >
                            <Text style={adm.courseInlineSaveBtnText}>
                              {savingCourseFeeId === c._id ? 'Saving...' : 'Save Changes'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={adm.courseInlineCancelBtn}
                            onPress={cancelCourseFeeEdit}
                            disabled={savingCourseFeeId === c._id}
                          >
                            <Text style={adm.courseInlineCancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </React.Fragment>
                ))}
            </View>
          </View>
        )}

        {!loading && tab === 'timetable' && (
          <>
            <WebPageTitle
              title="Institution Timetable"
              subtitle="Use the fixed weekly time slots, then assign a teacher, subject, and room to each class period."
              actionLabel="Refresh"
              onActionPress={loadAll}
            />

            <View style={webDash.sectionCard}>
              <View style={adm.timetableHeroFilter}>
                <Text style={adm.timetableFilterLabel}>Select Grade</Text>
                <TouchableOpacity
                  style={adm.timetableGradeSelector}
                  onPress={() => setShowTtViewGradeOptions((current) => !current)}
                >
                  <Text style={adm.timetableGradeSelectorText}>{ttViewGrade}</Text>
                  <Text style={adm.selectFieldArrow}>{showTtViewGradeOptions ? '^' : 'v'}</Text>
                </TouchableOpacity>
                {showTtViewGradeOptions ? (
                  <View style={adm.selectOptions}>
                    {COURSE_GRADE_OPTIONS.map((grade) => (
                      <TouchableOpacity
                        key={grade}
                        style={[adm.selectOption, ttViewGrade === grade && adm.selectOptionActive]}
                        onPress={() => {
                          setTtViewGrade(grade);
                          setShowTtViewGradeOptions(false);
                          if (!ttEditingId) {
                            setTtGrade(grade);
                          }
                        }}
                      >
                        <Text style={[adm.selectOptionText, ttViewGrade === grade && adm.selectOptionTextActive]}>{grade}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>

            <View style={adm.timetableOverviewGrid}>
              <View style={adm.timetableOverviewCard}>
                <Text style={adm.timetableOverviewLabel}>Grade</Text>
                <Text style={adm.timetableOverviewValue}>{ttViewGrade}</Text>
              </View>
              <View style={adm.timetableOverviewCard}>
                <Text style={adm.timetableOverviewLabel}>Scheduled Slots</Text>
                <Text style={adm.timetableOverviewValue}>{String(filteredTimetableEntries.length)}</Text>
              </View>
              <View style={adm.timetableOverviewCard}>
                <Text style={adm.timetableOverviewLabel}>Approved Tutors</Text>
                <Text style={adm.timetableOverviewValue}>{String(tutors.length)}</Text>
              </View>
            </View>

            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Weekly Timetable Grid</Text>
              <Text style={webDash.sectionText}>Tap an empty slot to assign a class, or tap an existing class to edit it.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={adm.adminTimetableBoard}>
                  <View style={adm.adminTimetableHeaderRow}>
                    <View style={adm.adminTimetableTimeHeader}>
                      <Text style={adm.adminTimetableHeadText}>Time</Text>
                    </View>
                    {TIMETABLE_DAYS.map((day) => (
                      <View key={day} style={adm.adminTimetableDayHeader}>
                        <Text style={adm.adminTimetableHeadText}>{day}</Text>
                      </View>
                    ))}
                  </View>
                  {adminTimetableRows.map((row) => (
                    <View key={row.key} style={adm.adminTimetableGridRow}>
                      <View style={adm.adminTimetableTimeCell}>
                        <Text style={adm.adminTimetableTimeText}>{row.slot}</Text>
                      </View>
                      {row.cells.map(({ day, entry }) => {
                        const isAccessible = isAdminTimetableSlotAccessible(day, row.startTime, row.endTime);
                        return (
                        <View key={`${row.key}-${day}`} style={adm.adminTimetableDayCell}>
                          <TouchableOpacity
                            style={[
                              adm.adminTimetableSlotCard,
                              entry ? adm.adminTimetableSlotFilled : adm.adminTimetableSlotEmpty,
                              !isAccessible && adm.adminTimetableSlotDisabled,
                            ]}
                            onPress={() => openTimetableSlotEditor(day, row, entry)}
                            disabled={!isAccessible}
                          >
                            {!isAccessible ? (
                              <>
                                <Text style={adm.adminTimetableSlotDisabledTitle}>Unavailable</Text>
                              </>
                            ) : entry ? (
                              <>
                                <Text style={adm.adminTimetableSlotTitle} numberOfLines={2}>
                                  {entry.subject || getTimetableEntryTitle(entry)}
                                </Text>
                                <Text style={adm.adminTimetableSlotMeta} numberOfLines={1}>{entry.tutorName || 'Tutor not set'}</Text>
                                <Text style={adm.adminTimetableSlotMeta} numberOfLines={1}>{entry.room || 'Hall not set'}</Text>
                                <Text style={adm.adminTimetableSlotHint}>Tap to edit</Text>
                              </>
                            ) : (
                              <>
                                <Text style={adm.adminTimetableSlotEmptyTitle}>Not assigned</Text>
                                <Text style={adm.adminTimetableSlotEmptyHint}>Tap to assign</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )})}
                    </View>
                  ))}
                </View>
              </ScrollView>
              {filteredTimetableEntries.length === 0 ? (
                <View style={adm.adminTimetableGridNote}>
                  <Text style={adm.adminTimetableGridNoteText}>
                    No scheduled classes are saved for {ttViewGrade} yet. Start by tapping any empty slot.
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={webDash.sectionCard}
              onLayout={({ nativeEvent }) => {
                adminTimetableEditorOffsetRef.current = nativeEvent.layout.y;
              }}
            >
              <Text style={webDash.sectionTitle}>{ttEditingId ? 'Update Scheduled Slot' : 'Assign Selected Slot'}</Text>
              <Text style={webDash.sectionText}>
                {selectedTimetableSelectionLabel
                  ? `Selected slot: ${selectedTimetableSelectionLabel}`
                  : 'Select a timetable slot from the grid above to assign a subject, hall, and tutor.'}
              </Text>

              {selectedTimetableSelectionLabel ? (
                <>
                  <View style={adm.timetableEditorSummaryRow}>
                    <View style={adm.timetableEditorSummaryCard}>
                      <Text style={adm.timetableOverviewLabel}>Grade</Text>
                      <Text style={adm.timetableOverviewValue}>{ttGrade || ttViewGrade}</Text>
                    </View>
                    <View style={adm.timetableEditorSummaryCard}>
                      <Text style={adm.timetableOverviewLabel}>Day</Text>
                      <Text style={adm.timetableOverviewValue}>{ttDay || '-'}</Text>
                    </View>
                    <View style={adm.timetableEditorSummaryCard}>
                      <Text style={adm.timetableOverviewLabel}>Time Slot</Text>
                      <Text style={adm.timetableOverviewValue}>{selectedTimetableTimeLabel || '-'}</Text>
                    </View>
                  </View>

                  <View style={webDash.filterBar}>
                    <View style={webDash.filterField}>
                      <Text style={webDash.filterLabel}>Subject / Course</Text>
                      <TouchableOpacity
                        style={adm.paymentSelectBox}
                        onPress={() => {
                          if (!(ttGrade || ttViewGrade)) return;
                          setShowTtHallOptions(false);
                          setShowTtTutorOptions(false);
                          setShowTtCourseOptions((current) => !current);
                        }}
                      >
                        <Text style={webDash.selectText}>{selectedTtCourse ? formatCourseLabel(selectedTtCourse) : 'Select subject'}</Text>
                        <Text style={adm.selectFieldArrow}>{showTtCourseOptions ? '^' : 'v'}</Text>
                      </TouchableOpacity>
                      {showTtCourseOptions ? (
                        <View style={adm.selectOptions}>
                          {timetableCoursesForGrade.length === 0 ? (
                            <Text style={adm.selectEmptyText}>No courses are available for this grade yet.</Text>
                          ) : timetableCoursesForGrade.map((course) => (
                            <TouchableOpacity
                              key={course._id}
                              style={[adm.selectOption, ttCourseId === course._id && adm.selectOptionActive]}
                              onPress={() => selectTimetableCourse(course)}
                            >
                              <Text style={[adm.selectOptionText, ttCourseId === course._id && adm.selectOptionTextActive]}>
                                {formatCourseLabel(course)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </View>

                    <View style={webDash.filterField}>
                      <Text style={webDash.filterLabel}>Hall</Text>
                      <TouchableOpacity
                        style={adm.paymentSelectBox}
                        onPress={() => {
                          setShowTtCourseOptions(false);
                          setShowTtTutorOptions(false);
                          setShowTtHallOptions((current) => !current);
                        }}
                      >
                        <Text style={webDash.selectText}>{ttRoom || 'Select hall'}</Text>
                        <Text style={adm.selectFieldArrow}>{showTtHallOptions ? '^' : 'v'}</Text>
                      </TouchableOpacity>
                      {showTtHallOptions ? (
                        <View style={adm.selectOptions}>
                          {TIMETABLE_HALL_OPTIONS.map((hall) => (
                            <TouchableOpacity
                              key={hall}
                              style={[adm.selectOption, ttRoom === hall && adm.selectOptionActive]}
                              onPress={() => selectTimetableHall(hall)}
                            >
                              <Text style={[adm.selectOptionText, ttRoom === hall && adm.selectOptionTextActive]}>{hall}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </View>

                    <View style={webDash.filterField}>
                      <Text style={webDash.filterLabel}>Tutor</Text>
                      <TouchableOpacity
                        style={adm.paymentSelectBox}
                        onPress={() => {
                          if (!ttSubject) return;
                          setShowTtCourseOptions(false);
                          setShowTtHallOptions(false);
                          setShowTtTutorOptions((current) => !current);
                        }}
                      >
                        <Text style={webDash.selectText}>{ttTutor || (ttSubject ? 'Select tutor' : 'Select subject first')}</Text>
                        <Text style={adm.selectFieldArrow}>{showTtTutorOptions ? '^' : 'v'}</Text>
                      </TouchableOpacity>
                      {showTtTutorOptions ? (
                        <View style={adm.selectOptions}>
                          {timetableTutorsForSubject.length === 0 ? (
                            <Text style={adm.selectEmptyText}>No tutor is approved for this subject yet.</Text>
                          ) : timetableTutorsForSubject.map((tutor) => (
                            <TouchableOpacity
                              key={tutor.id || tutor._id || tutor.email}
                              style={[adm.selectOption, ttTutor === tutor.name && adm.selectOptionActive]}
                              onPress={() => selectTimetableTutor(tutor.name)}
                            >
                              <Text style={[adm.selectOptionText, ttTutor === tutor.name && adm.selectOptionTextActive]}>{tutor.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {timetableAssignmentConflictMessage ? (
                    <View style={adm.timetableConflictBanner}>
                      <Text style={adm.timetableConflictText}>{timetableAssignmentConflictMessage}</Text>
                    </View>
                  ) : null}

                  <View style={webDash.actionRow}>
                    <TouchableOpacity
                      style={[webDash.buttonBlue, (ttSaving || timetableAssignmentConflictMessage) && adm.actionBtnDisabled]}
                      onPress={saveTimetable}
                      disabled={ttSaving || Boolean(timetableAssignmentConflictMessage)}
                    >
                      <Text style={webDash.buttonTextLight}>{ttSaving ? 'Saving...' : (ttEditingId ? 'Update Entry' : 'Assign Slot')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={webDash.buttonSoft} onPress={resetTimetableForm} disabled={ttSaving}>
                      <Text style={webDash.buttonTextBlue}>Clear Selection</Text>
                    </TouchableOpacity>
                    {selectedAdminTimetableEntry ? (
                      <TouchableOpacity
                        style={webDash.buttonRed}
                        onPress={() => confirmDeleteTimetable(selectedAdminTimetableEntry)}
                        disabled={ttDeletingId === selectedAdminTimetableEntry._id}
                      >
                        <Text style={webDash.buttonTextLight}>
                          {ttDeletingId === selectedAdminTimetableEntry._id ? 'Deleting...' : 'Delete Entry'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </>
              ) : (
                <View style={webDash.emptyBox}>
                  <Text style={webDash.emptyText}>Tap a timetable cell to start assigning a class.</Text>
                </View>
              )}
            </View>
          </>
        )}

        {!loading && tab === 'leaveRequests' && (
          <>
            <WebPageTitle
              title="Leave Requests"
              subtitle="Review tutor leave requests, approve or reject them, and send back an admin reply."
              actionLabel="Refresh"
              onActionPress={loadAll}
            />

            <View style={webDash.metricGrid}>
              <WebMetricCard label="Total Requests" value={String(leaveRequests.length)} badge="TR" accent="#2563eb" />
              <WebMetricCard label="Pending" value={String(pendingLeaveRequests.length)} badge="PD" accent="#f59e0b" />
              <WebMetricCard label="Resolved" value={String(resolvedLeaveRequests.length)} badge="RS" accent="#16a34a" />
            </View>

            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Request Queue</Text>
              <Text style={webDash.sectionText}>Use the quick actions for fast decisions or open a request to write a detailed reply.</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                <View style={[webDash.table, adm.leaveTable]}>
                  <View style={[webDash.tableRow, webDash.tableHeader, adm.leaveTableRow]}>
                    {['Requester', 'Role', 'Leave Date', 'Reason', 'Status', 'Admin Reply', 'Actions'].map((heading) => (
                      <View key={heading} style={heading === 'Requester' || heading === 'Reason' || heading === 'Admin Reply' ? webDash.tableCellWide : webDash.tableCell}>
                        <Text style={webDash.tableHeadText}>{heading}</Text>
                      </View>
                    ))}
                  </View>
                  {leaveRequests.length === 0 ? (
                    <View style={[webDash.tableRow, adm.leaveTableRow]}>
                      <View style={adm.leaveEmptyCell}>
                        <Text style={adm.leaveEmptyText}>No leave requests are available right now.</Text>
                      </View>
                    </View>
                  ) : leaveRequests.map((item) => (
                    <View key={item._id} style={[webDash.tableRow, adm.leaveTableRow]}>
                      <View style={webDash.tableCellWide}>
                        <Text style={[webDash.tableText, { fontWeight: '900' }]}>{item.createdBy?.name || 'Tutor'}</Text>
                        <Text style={webDash.tableText}>{item.createdBy?.email || '-'}</Text>
                      </View>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.createdBy?.role || '-'}</Text></View>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.leaveDate}</Text></View>
                      <View style={webDash.tableCellWide}><Text style={webDash.tableText}>{item.reason}</Text></View>
                      <View style={webDash.tableCell}>
                        <StatusPill
                          label={item.status}
                          tone={item.status === 'Approved' ? 'green' : item.status === 'Rejected' ? 'red' : 'yellow'}
                        />
                      </View>
                      <View style={webDash.tableCellWide}><Text style={webDash.tableText}>{item.adminReply || '-'}</Text></View>
                      <View style={webDash.tableCell}>
                        <View style={adm.leaveActionStack}>
                          <TouchableOpacity style={webDash.buttonSoft} onPress={() => beginLeaveRequestReview(item)}>
                            <Text style={webDash.buttonTextBlue}>Review</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[webDash.buttonGreen, savingLeaveReview && adm.leaveActionDisabled]}
                            onPress={() => reviewLeaveRequestInline(item, 'Approved')}
                            disabled={savingLeaveReview}
                          >
                            <Text style={webDash.buttonTextLight}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[webDash.buttonRed, savingLeaveReview && adm.leaveActionDisabled]}
                            onPress={() => reviewLeaveRequestInline(item, 'Rejected')}
                            disabled={savingLeaveReview}
                          >
                            <Text style={webDash.buttonTextLight}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Selected Request Review</Text>
              {selectedLeaveRequest ? (
                <>
                  <View style={webDash.detailGrid}>
                    <DetailField label="Tutor" value={selectedLeaveRequest.createdBy?.name || '-'} />
                    <DetailField label="Date" value={selectedLeaveRequest.leaveDate} />
                    <DetailField label="Reason" value={selectedLeaveRequest.reason} />
                  </View>
                  <View style={[webDash.segmentRow, { marginTop: 18 }]}>
                    {['Pending', 'Approved', 'Rejected'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[webDash.segmentButton, leaveReviewStatus === status && webDash.segmentButtonActive]}
                        onPress={() => setLeaveReviewStatus(status)}
                      >
                        <Text style={[webDash.segmentText, leaveReviewStatus === status && webDash.segmentTextActive]}>{status}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={webDash.filterLabel}>Admin Reply</Text>
                  <TextInput
                    style={[webDash.formInput, webDash.textArea]}
                    placeholder="Write a reply for this leave request"
                    value={leaveAdminReply}
                    onChangeText={setLeaveAdminReply}
                    placeholderTextColor="#94a3b8"
                    multiline
                  />
                  <TouchableOpacity
                    style={[webDash.buttonBlue, { marginTop: 18 }]}
                    onPress={saveLeaveRequestReview}
                    disabled={savingLeaveReview}
                  >
                    <Text style={webDash.buttonTextLight}>{savingLeaveReview ? 'Saving...' : 'Save Review'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={webDash.emptyBox}>
                  <Text style={webDash.emptyText}>Select a leave request from the table above to review it here.</Text>
                </View>
              )}
            </View>
          </>
        )}

        {!loading && tab === 'studentPayments' && (
          <>
            <WebPageTitle
              title="Student Payment Details"
              subtitle="Track every submitted payment receipt and update the payment status quickly."
              actionLabel="Refresh"
              onActionPress={loadAll}
            />

            <View style={webDash.metricGrid}>
              <WebMetricCard label="Total Payments" value={String(payments.length)} badge="PM" accent="#2563eb" />
              <WebMetricCard label="Pending" value={String(payments.filter((item) => item.status === 'Pending').length)} badge="PD" accent="#f59e0b" />
              <WebMetricCard label="Paid" value={String(payments.filter((item) => item.status === 'Paid').length)} badge="OK" accent="#16a34a" />
            </View>

            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Payment Queue</Text>
              <Text style={webDash.sectionText}>Filter by grade and review uploaded receipts with quick status actions.</Text>

              <View style={webDash.filterBar}>
                <View style={webDash.filterField}>
                  <Text style={webDash.filterLabel}>Grade</Text>
                  <TouchableOpacity
                    style={adm.paymentSelectBox}
                    onPress={() => setShowPaymentGradeOptions((current) => !current)}
                  >
                    <Text style={webDash.selectText}>{paymentGradeFilter}</Text>
                    <Text style={adm.selectFieldArrow}>{showPaymentGradeOptions ? '^' : 'v'}</Text>
                  </TouchableOpacity>
                  {showPaymentGradeOptions ? (
                    <View style={adm.selectOptions}>
                      {paymentGradeOptions.map((grade) => (
                        <TouchableOpacity
                          key={grade}
                          style={[adm.selectOption, paymentGradeFilter === grade && adm.selectOptionActive]}
                          onPress={() => {
                            setPaymentGradeFilter(grade);
                            setShowPaymentGradeOptions(false);
                          }}
                        >
                          <Text style={[adm.selectOptionText, paymentGradeFilter === grade && adm.selectOptionTextActive]}>{grade}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[webDash.table, adm.paymentTable]}>
                  <View style={[webDash.tableRow, webDash.tableHeader]}>
                    {['Student', 'Month', 'Grade', 'Amount', 'Receipt', 'Status', 'Actions'].map((heading) => (
                      <View key={heading} style={heading === 'Student' || heading === 'Receipt' ? webDash.tableCellWide : webDash.tableCell}>
                        <Text style={webDash.tableHeadText}>{heading}</Text>
                      </View>
                    ))}
                  </View>
                  {filteredPayments.length === 0 ? (
                    <View style={webDash.tableRow}>
                      <View style={adm.paymentEmptyCell}>
                        <Text style={adm.leaveEmptyText}>No payment records match the selected grade.</Text>
                      </View>
                    </View>
                  ) : filteredPayments.map((payment) => {
                    const isBusy = reviewingPaymentId === payment.id;
                    const receipt = payment.receipt || {};
                    const hasReceipt = Boolean(receipt.fileName || receipt.dataUrl);

                    return (
                      <View key={payment.id} style={webDash.tableRow}>
                        <View style={webDash.tableCellWide}>
                          <Text style={[webDash.tableText, { fontWeight: '900' }]}>{payment.student?.name || 'Student'}</Text>
                          <Text style={webDash.tableText}>{payment.student?.email || '-'}</Text>
                        </View>
                        <View style={webDash.tableCell}><Text style={webDash.tableText}>{payment.monthLabel || payment.monthKey}</Text></View>
                        <View style={webDash.tableCell}><Text style={webDash.tableText}>{payment.grade || '-'}</Text></View>
                        <View style={webDash.tableCell}><Text style={webDash.tableText}>{formatLkr(payment.amount)}</Text></View>
                        <View style={webDash.tableCellWide}>
                          <Text style={webDash.tableText}>{hasReceipt ? (receipt.fileName || 'Uploaded receipt') : 'No receipt uploaded'}</Text>
                          {payment.submittedAt ? <Text style={adm.paymentSubtext}>Submitted {formatAppDate(payment.submittedAt)}</Text> : null}
                        </View>
                        <View style={webDash.tableCell}>
                          <StatusPill label={payment.status} tone={getPaymentStatusTone(payment.status)} />
                          {payment.adminNote ? <Text style={adm.paymentSubtext}>{payment.adminNote}</Text> : null}
                        </View>
                        <View style={webDash.tableCell}>
                          <View style={webDash.actionRow}>
                            <TouchableOpacity
                              style={[webDash.buttonGreen, isBusy && adm.actionBtnDisabled]}
                              onPress={() => reviewPaymentStatus(payment.id, 'Paid')}
                              disabled={isBusy}
                            >
                              <Text style={webDash.buttonTextLight}>{isBusy ? 'Working...' : 'Paid'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[webDash.buttonRed, isBusy && adm.actionBtnDisabled]}
                              onPress={() => reviewPaymentStatus(payment.id, 'Rejected')}
                              disabled={isBusy}
                            >
                              <Text style={webDash.buttonTextLight}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </>
        )}

        {!loading && tab === 'salaryDetails' && (
          <>
            <WebPageTitle
              title="Salary Details"
              subtitle="Review tutor salary records by month and update the payout status from the dashboard."
              actionLabel="Refresh"
              onActionPress={loadAll}
            />

            <View style={webDash.metricGrid}>
              <WebMetricCard label="Rows" value={String(salaryRows.length)} badge="SL" accent="#2563eb" />
              <WebMetricCard label="Pending" value={String(salaryRows.filter((item) => item.status === 'Pending').length)} badge="PD" accent="#f59e0b" />
              <WebMetricCard label="Paid" value={String(salaryRows.filter((item) => item.status === 'Paid').length)} badge="OK" accent="#16a34a" />
            </View>

            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Salary Status Review</Text>
              <Text style={webDash.sectionText}>Switch the active month and year to review the current tutor salary records.</Text>

              <View style={webDash.filterBar}>
                <View style={webDash.filterField}>
                  <Text style={webDash.filterLabel}>Month</Text>
                  <TouchableOpacity
                    style={adm.paymentSelectBox}
                    onPress={() => {
                      setShowSalaryYearOptions(false);
                      setShowSalaryMonthOptions((current) => !current);
                    }}
                  >
                    <Text style={webDash.selectText}>
                      {SALARY_MONTH_OPTIONS.find((option) => option.value === salaryMonthFilter)?.label || 'Select month'}
                    </Text>
                    <Text style={adm.selectFieldArrow}>{showSalaryMonthOptions ? '^' : 'v'}</Text>
                  </TouchableOpacity>
                  {showSalaryMonthOptions ? (
                    <View style={adm.selectOptions}>
                      {SALARY_MONTH_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[adm.selectOption, salaryMonthFilter === option.value && adm.selectOptionActive]}
                          onPress={() => {
                            setSalaryMonthFilter(option.value);
                            setShowSalaryMonthOptions(false);
                          }}
                        >
                          <Text style={[adm.selectOptionText, salaryMonthFilter === option.value && adm.selectOptionTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={webDash.filterField}>
                  <Text style={webDash.filterLabel}>Year</Text>
                  <TouchableOpacity
                    style={adm.paymentSelectBox}
                    onPress={() => {
                      setShowSalaryMonthOptions(false);
                      setShowSalaryYearOptions((current) => !current);
                    }}
                  >
                    <Text style={webDash.selectText}>{salaryYearFilter}</Text>
                    <Text style={adm.selectFieldArrow}>{showSalaryYearOptions ? '^' : 'v'}</Text>
                  </TouchableOpacity>
                  {showSalaryYearOptions ? (
                    <View style={adm.selectOptions}>
                      {salaryYearOptions.map((year) => (
                        <TouchableOpacity
                          key={year}
                          style={[adm.selectOption, salaryYearFilter === year && adm.selectOptionActive]}
                          onPress={() => {
                            setSalaryYearFilter(year);
                            setShowSalaryYearOptions(false);
                          }}
                        >
                          <Text style={[adm.selectOptionText, salaryYearFilter === year && adm.selectOptionTextActive]}>{year}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[webDash.table, adm.salaryTable]}>
                  <View style={[webDash.tableRow, webDash.tableHeader]}>
                    {['Tutor', 'Subject', 'Month', 'Hours', 'Amount', 'Status', 'Actions'].map((heading) => (
                      <View key={heading} style={heading === 'Tutor' ? webDash.tableCellWide : webDash.tableCell}>
                        <Text style={webDash.tableHeadText}>{heading}</Text>
                      </View>
                    ))}
                  </View>
                  {salaryRows.length === 0 ? (
                    <View style={webDash.tableRow}>
                      <View style={adm.salaryEmptyCell}>
                        <Text style={adm.leaveEmptyText}>No salary records are available for this period.</Text>
                      </View>
                    </View>
                  ) : salaryRows.map((salary) => {
                    const isBusy = reviewingSalaryId === salary.id;

                    return (
                      <View key={salary.id} style={webDash.tableRow}>
                        <View style={webDash.tableCellWide}>
                          <Text style={[webDash.tableText, { fontWeight: '900' }]}>{salary.name}</Text>
                          {salary.reviewedAt ? <Text style={adm.salaryStatusNote}>Reviewed {formatAppDate(salary.reviewedAt)}</Text> : null}
                        </View>
                        <View style={webDash.tableCell}><Text style={webDash.tableText}>{salary.subject}</Text></View>
                        <View style={webDash.tableCell}><Text style={webDash.tableText}>{salary.month}</Text></View>
                        <View style={webDash.tableCell}><Text style={webDash.tableText}>{salary.hours}</Text></View>
                        <View style={webDash.tableCell}><Text style={webDash.tableText}>{formatLkr(salary.amount)}</Text></View>
                        <View style={webDash.tableCell}>
                          <View style={adm.salaryStatusStack}>
                            <StatusPill label={salary.status} tone={getSalaryStatusTone(salary.status)} />
                            {salary.adminNote ? <Text style={adm.salaryStatusNote}>{salary.adminNote}</Text> : null}
                          </View>
                        </View>
                        <View style={webDash.tableCell}>
                          <View style={webDash.actionRow}>
                            <TouchableOpacity
                              style={[webDash.buttonGreen, isBusy && adm.actionBtnDisabled]}
                              onPress={() => reviewSalaryStatus(salary.id, 'Paid')}
                              disabled={isBusy}
                            >
                              <Text style={webDash.buttonTextLight}>{isBusy ? 'Working...' : 'Paid'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[webDash.buttonSoft, isBusy && adm.actionBtnDisabled]}
                              onPress={() => reviewSalaryStatus(salary.id, 'Pending')}
                              disabled={isBusy}
                            >
                              <Text style={webDash.buttonTextBlue}>Pending</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </>
        )}

        {!loading && tab === 'examResults' && (
          <>
            <WebPageTitle
              title="Exams & Results"
              subtitle="Select a grade and term to review the generated exam gradebook for all students."
              actionLabel="Refresh"
              onActionPress={loadAll}
            />

            <View style={webDash.metricGrid}>
              <WebMetricCard label="Selected Grade" value={selectedExamGrade} badge="GR" accent="#2563eb" />
              <WebMetricCard label="Exams Found" value={String(examOptions.length)} badge="EX" accent="#7c3aed" />
              <WebMetricCard label="Students Ranked" value={String(adminExamRows.length)} badge="RK" accent="#16a34a" />
            </View>

            <View style={webDash.sectionCard}>
              <View style={webDash.segmentRow}>
                {COURSE_GRADE_OPTIONS.map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    style={[webDash.segmentButton, selectedExamGrade === grade && webDash.segmentButtonActive]}
                    onPress={() => setSelectedExamGrade(grade)}
                  >
                    <Text style={[webDash.segmentText, selectedExamGrade === grade && webDash.segmentTextActive]}>{grade}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={webDash.segmentRow}>
                {EXAM_TERM_OPTIONS.map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={[webDash.segmentButton, selectedExamTerm === term && webDash.segmentButtonActive]}
                    onPress={() => setSelectedExamTerm(term)}
                  >
                    <Text style={[webDash.segmentText, selectedExamTerm === term && webDash.segmentTextActive]}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={webDash.filterLabel}>Select Exam</Text>
              <TouchableOpacity
                style={adm.paymentSelectBox}
                onPress={() => setShowExamOptions((current) => !current)}
              >
                <Text style={webDash.selectText}>{formatExamOptionLabel(selectedExam)}</Text>
                <Text style={adm.selectFieldArrow}>{showExamOptions ? '^' : 'v'}</Text>
              </TouchableOpacity>
              {showExamOptions ? (
                <View style={adm.selectOptions}>
                  {examOptions.length === 0 ? (
                    <Text style={adm.selectEmptyText}>No exam is available for this grade and term yet.</Text>
                  ) : examOptions.map((exam) => (
                    <TouchableOpacity
                      key={exam.id}
                      style={[adm.selectOption, selectedExamId === exam.id && adm.selectOptionActive]}
                      onPress={() => {
                        setSelectedExamId(exam.id);
                        setShowExamOptions(false);
                      }}
                    >
                      <Text style={[adm.selectOptionText, selectedExamId === exam.id && adm.selectOptionTextActive]}>
                        {formatExamOptionLabel(exam)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {!selectedExam || !examGradebook ? (
                <View style={webDash.emptyBox}>
                  <Text style={webDash.emptyText}>Select an exam to view the gradebook.</Text>
                </View>
              ) : (
                <>
                  <Text style={[webDash.sectionText, { marginTop: 14 }]}>
                    {`${selectedExam.grade} ${selectedExam.term} • Exam Date ${formatLongAppDate(selectedExam.examDate)}`}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
                    <View style={[webDash.table, adm.examTable]}>
                      <View style={[webDash.tableRow, webDash.tableHeader]}>
                        <View style={webDash.tableCellWide}><Text style={webDash.tableHeadText}>Student Name</Text></View>
                        {adminExamSubjects.map((subject) => (
                          <View key={subject} style={webDash.tableCell}><Text style={webDash.tableHeadText}>{subject}</Text></View>
                        ))}
                        <View style={webDash.tableCell}><Text style={webDash.tableHeadText}>Total</Text></View>
                        <View style={webDash.tableCell}><Text style={webDash.tableHeadText}>Average</Text></View>
                        <View style={webDash.tableCell}><Text style={webDash.tableHeadText}>Rank</Text></View>
                      </View>
                      {adminExamRows.length === 0 ? (
                        <View style={webDash.tableRow}>
                          <View style={adm.examEmptyCell}>
                            <Text style={adm.leaveEmptyText}>No student marks are available for this exam yet.</Text>
                          </View>
                        </View>
                      ) : adminExamRows.map((row) => (
                        <View key={row.studentId} style={webDash.tableRow}>
                          <View style={webDash.tableCellWide}><Text style={webDash.tableText}>{row.studentName}</Text></View>
                          {adminExamSubjects.map((subject) => (
                            <View key={`${row.studentId}-${subject}`} style={webDash.tableCell}>
                              <Text style={webDash.tableText}>{row.marks?.[subject] ?? '-'}</Text>
                            </View>
                          ))}
                          <View style={webDash.tableCell}><Text style={webDash.tableText}>{row.total}</Text></View>
                          <View style={webDash.tableCell}><Text style={webDash.tableText}>{row.average}</Text></View>
                          <View style={webDash.tableCell}><Text style={webDash.tableText}>#{row.rank}</Text></View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}
            </View>
          </>
        )}

        {!loading && tab === 'allSuggestions' && (
          <>
            <WebPageTitle
              title="All Suggestions"
              subtitle="Review every suggestion or complaint and update the reply and status from one admin screen."
              actionLabel="Refresh"
              onActionPress={loadAll}
            />

            <View style={webDash.metricGrid}>
              <WebMetricCard label="Total Suggestions" value={String(adminSuggestions.length)} badge="SG" accent="#2563eb" />
              <WebMetricCard label="Open / Review" value={String(openAdminSuggestions.length)} badge="OP" accent="#f59e0b" />
              <WebMetricCard label="Resolved / Closed" value={String(resolvedAdminSuggestions.length)} badge="RS" accent="#16a34a" />
            </View>

            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Suggestion Queue</Text>
              <Text style={webDash.sectionText}>Pick any suggestion below to review the admin note, reply, and status.</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                <View style={webDash.table}>
                  <View style={[webDash.tableRow, webDash.tableHeader]}>
                    {['Type', 'Title', 'From', 'Role', 'Status', 'Actions'].map((heading) => (
                      <View key={heading} style={heading === 'Title' || heading === 'From' ? webDash.tableCellWide : webDash.tableCell}>
                        <Text style={webDash.tableHeadText}>{heading}</Text>
                      </View>
                    ))}
                  </View>
                  {adminSuggestions.length === 0 ? (
                    <View style={webDash.tableRow}>
                      <View style={webDash.tableCellWide}>
                        <Text style={webDash.tableText}>No suggestions or complaints have been submitted yet.</Text>
                      </View>
                    </View>
                  ) : adminSuggestions.map((item) => (
                    <View key={item._id} style={webDash.tableRow}>
                      <View style={webDash.tableCell}>
                        <StatusPill label={item.type} tone={item.type === 'Complaint' ? 'yellow' : 'blue'} />
                      </View>
                      <View style={webDash.tableCellWide}>
                        <Text style={[webDash.tableText, { fontWeight: '900' }]}>{item.title}</Text>
                        <Text style={webDash.tableText}>{formatAppDate(item.createdAt)}</Text>
                      </View>
                      <View style={webDash.tableCellWide}>
                        <Text style={webDash.tableText}>{item.createdBy?.name || 'User'}</Text>
                        <Text style={webDash.tableText}>{item.createdBy?.email || '-'}</Text>
                      </View>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.createdBy?.role || '-'}</Text></View>
                      <View style={webDash.tableCell}>
                        <StatusPill label={item.status} tone={item.status === 'Resolved' ? 'green' : item.status === 'Closed' ? 'red' : 'blue'} />
                      </View>
                      <View style={webDash.tableCell}>
                        <TouchableOpacity style={webDash.buttonSoft} onPress={() => beginSuggestionReview(item)}>
                          <Text style={webDash.buttonTextBlue}>Review</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Selected Suggestion Review</Text>
              {selectedSuggestion ? (
                <>
                  <View style={webDash.detailGrid}>
                    <DetailField label="Submitted By" value={selectedSuggestion.createdBy?.name || '-'} />
                    <DetailField label="Type" value={selectedSuggestion.type} />
                    <DetailField label="Title" value={selectedSuggestion.title} />
                    <DetailField label="Message" value={selectedSuggestion.message} />
                  </View>
                  <View style={[webDash.segmentRow, { marginTop: 18 }]}>
                    {SUGGESTION_STATUS_OPTIONS.map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[webDash.segmentButton, suggestionReviewStatus === status && webDash.segmentButtonActive]}
                        onPress={() => setSuggestionReviewStatus(status)}
                      >
                        <Text style={[webDash.segmentText, suggestionReviewStatus === status && webDash.segmentTextActive]}>{status}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={webDash.filterLabel}>Reply</Text>
                  <TextInput
                    style={[webDash.formInput, webDash.textArea]}
                    placeholder="Write your reply"
                    value={suggestionReply}
                    onChangeText={setSuggestionReply}
                    placeholderTextColor="#94a3b8"
                    multiline
                  />
                  <Text style={[webDash.filterLabel, { marginTop: 14 }]}>Admin Note</Text>
                  <TextInput
                    style={[webDash.formInput, webDash.textArea]}
                    placeholder="Internal admin note"
                    value={suggestionAdminNote}
                    onChangeText={setSuggestionAdminNote}
                    placeholderTextColor="#94a3b8"
                    multiline
                  />
                  <TouchableOpacity
                    style={[webDash.buttonBlue, { marginTop: 18 }]}
                    onPress={saveSuggestionReview}
                    disabled={savingSuggestionReview}
                  >
                    <Text style={webDash.buttonTextLight}>{savingSuggestionReview ? 'Saving...' : 'Save Review'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={webDash.emptyBox}>
                  <Text style={webDash.emptyText}>Select a suggestion from the table above to review it here.</Text>
                </View>
              )}
            </View>
          </>
        )}

        {!loading && tab === 'mySuggestion' && (
          <>
            <WebPageTitle
              title="My Suggestion"
              subtitle="Create your own admin suggestion and keep track of the suggestions you already submitted."
              actionLabel="Refresh"
              onActionPress={loadAll}
            />

            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Create Suggestion</Text>
              <Text style={webDash.sectionText}>Send a new internal suggestion or improvement note from the admin account.</Text>
              <Text style={[webDash.filterLabel, { marginTop: 14 }]}>Title</Text>
              <TextInput
                style={webDash.formInput}
                placeholder="Enter suggestion title"
                value={adminSuggestionTitle}
                onChangeText={setAdminSuggestionTitle}
                placeholderTextColor="#94a3b8"
              />
              <Text style={[webDash.filterLabel, { marginTop: 14 }]}>Message</Text>
              <TextInput
                style={[webDash.formInput, webDash.textArea]}
                placeholder="Write your suggestion"
                value={adminSuggestionMessage}
                onChangeText={setAdminSuggestionMessage}
                placeholderTextColor="#94a3b8"
                multiline
              />
              <TouchableOpacity
                style={[webDash.buttonBlue, { marginTop: 18 }]}
                onPress={submitAdminSuggestion}
                disabled={submittingAdminSuggestion}
              >
                <Text style={webDash.buttonTextLight}>{submittingAdminSuggestion ? 'Submitting...' : 'Submit Suggestion'}</Text>
              </TouchableOpacity>
            </View>

            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>My Submitted Suggestions</Text>
              <Text style={webDash.sectionText}>Review the status, reply, and submitted date for your own admin suggestions.</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                <View style={webDash.table}>
                  <View style={[webDash.tableRow, webDash.tableHeader]}>
                    {['Title', 'Status', 'Reply', 'Created'].map((heading) => (
                      <View key={heading} style={heading === 'Title' || heading === 'Reply' ? webDash.tableCellWide : webDash.tableCell}>
                        <Text style={webDash.tableHeadText}>{heading}</Text>
                      </View>
                    ))}
                  </View>
                  {adminMySuggestions.length === 0 ? (
                    <View style={webDash.tableRow}>
                      <View style={webDash.tableCellWide}>
                        <Text style={webDash.tableText}>You have not submitted any admin suggestions yet.</Text>
                      </View>
                    </View>
                  ) : adminMySuggestions.map((item) => (
                    <View key={item._id} style={webDash.tableRow}>
                      <View style={webDash.tableCellWide}>
                        <Text style={[webDash.tableText, { fontWeight: '900' }]}>{item.title}</Text>
                        <Text style={webDash.tableText}>{item.message}</Text>
                      </View>
                      <View style={webDash.tableCell}>
                        <StatusPill label={item.status} tone={item.status === 'Resolved' ? 'green' : item.status === 'Closed' ? 'red' : 'blue'} />
                      </View>
                      <View style={webDash.tableCellWide}><Text style={webDash.tableText}>{item.reply || '-'}</Text></View>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{formatAppDate(item.createdAt)}</Text></View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </>
        )}

        {!loading && tab === 'profile' && (
          <View style={[adm.card, adm.profileCardDark]}>
            <Text style={adm.profileTitle}>Admin Profile</Text>
            <View style={[adm.avatar, { width: 70, height: 70, borderRadius: 35, alignSelf: 'center', marginBottom: 14 }]}>
              <Text style={[adm.avatarText, { fontSize: 22 }]}>
                {(user.name || 'A').split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <Text style={[adm.formLabel, adm.profileLabelDark, { textAlign: 'center', marginBottom: 14 }]}>ADMIN ACCOUNT</Text>
            <View style={adm.formField}>
              <Text style={[adm.formLabel, adm.profileLabelDark]}>Full Name</Text>
              <TextInput
                style={[adm.input, adm.formInput, adm.profileInputDark]}
                placeholder="Full name"
                value={profileName}
                onChangeText={setProfileName}
                showSoftInputOnFocus
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={adm.formField}>
              <Text style={[adm.formLabel, adm.profileLabelDark]}>Email</Text>
              <TextInput
                style={[adm.input, adm.formInput, adm.profileInputDark]}
                placeholder="Email"
                value={profileEmail}
                onChangeText={setProfileEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                showSoftInputOnFocus
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={[adm.card, adm.profileInfoCardDark, { marginBottom: 0 }]}>
              <Text style={[adm.formLabel, adm.profileLabelDark]}>Role</Text>
              <Text style={[adm.rowName, adm.profileValueDark]}>Admin</Text>
              <Text style={[adm.formLabel, adm.profileLabelDark, { marginTop: 12 }]}>Status</Text>
              <Text style={[adm.rowName, adm.profileValueDark]}>{user.approvalStatus || 'approved'}</Text>
            </View>
            <TouchableOpacity
              style={[adm.actionBtn, profileSaving && adm.actionBtnDisabled]}
              onPress={updateAdminProfile}
              disabled={profileSaving}
            >
              <Text style={adm.actionBtnText}>{profileSaving ? 'Saving...' : 'Update Profile'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </WebDashboardShell>
  );
};

const adm = StyleSheet.create({
  header: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRole: { color: '#c4b5fd', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  logoutBtn: { backgroundColor: '#6d28d9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  logoutText: { color: '#ddd6fe', fontWeight: '700', fontSize: 13 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, backgroundColor: '#f8fafc' },
  tabBtnActive: { backgroundColor: '#7c3aed' },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabBtnTextActive: { color: '#fff' },
  scroll: { padding: 14, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  profileCardDark: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  profileTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#7c3aed', fontWeight: '800', fontSize: 16 },
  codeBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  codeText: { color: '#1d4ed8', fontWeight: '800', fontSize: 13 },
  rowName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  helperText: { fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 18 },
  formField: { marginBottom: 14 },
  formLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  profileLabelDark: { color: '#94a3b8' },
  profileValueDark: { color: '#f8fafc' },
  manageSwitchRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  manageSwitchBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d8b4fe',
    backgroundColor: '#faf5ff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  manageSwitchBtnActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#7c3aed',
  },
  manageSwitchText: { color: '#7c3aed', fontWeight: '700', fontSize: 13 },
  manageSwitchTextActive: { color: '#fff' },
  courseCard: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 10 },
  courseRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  courseMeta: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  courseMetaFilled: { color: '#7c3aed' },
  courseMetaEmpty: { color: '#94a3b8' },
  courseActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  courseFeeInput: { flex: 1, marginBottom: 0 },
  courseFeeActionWrap: { alignItems: 'flex-end', gap: 8, minWidth: 108 },
  courseEditPanel: {
    marginTop: -2,
    marginBottom: 12,
    marginLeft: 54,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 14,
    backgroundColor: '#f8fbff',
    padding: 14,
  },
  courseEditPanelHeader: { gap: 4, marginBottom: 12 },
  courseEditPanelTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  courseEditPanelMeta: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  courseEditStats: { gap: 10 },
  courseEditStatCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
  },
  courseEditStatLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  courseEditStatValue: { color: '#0f172a', fontSize: 18, fontWeight: '900', marginTop: 8 },
  courseFeeEditorInput: { marginTop: 10, marginBottom: 0, backgroundColor: '#f8fafc' },
  courseEditHint: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 12 },
  courseEditActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  courseInlineEditBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  courseInlineEditBtnText: { color: '#1d4ed8', fontWeight: '800', fontSize: 12 },
  courseInlineDeleteBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  courseInlineDeleteBtnText: { color: '#dc2626', fontWeight: '800', fontSize: 12 },
  courseInlineSaveBtn: {
    borderRadius: 10,
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  courseInlineSaveBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  courseInlineCancelBtn: {
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  courseInlineCancelBtnText: { color: '#475569', fontWeight: '800', fontSize: 12 },
  hallInput: { marginTop: 12, marginBottom: 0 },
  feeText: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  pillGreen: { backgroundColor: '#dcfce7' },
  pillGray: { backgroundColor: '#f1f5f9' },
  pillText: { fontSize: 10, fontWeight: '700', color: '#15803d' },
  userMetricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  userMetricItem: { flexBasis: 220, flexGrow: 1 },
  userFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  userFilterField: { flexBasis: 180, flexGrow: 1 },
  userFilterSelect: { marginBottom: 0 },
  userSearchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 14,
  },
  userResultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  userResultsText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  userResetBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  userResetBtnText: { color: '#1d4ed8', fontSize: 12, fontWeight: '800' },
  userTablePrimary: { color: '#0f172a', fontWeight: '800' },
  userTableSecondary: { color: '#64748b', fontSize: 11, marginTop: 6, lineHeight: 16 },
  userDeleteBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  userDeleteBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '800' },
  leaveTable: { minWidth: 1120 },
  leaveCompactTable: { minWidth: 720 },
  paymentTable: { minWidth: 1260 },
  examTable: { minWidth: 2000 },
  salaryTable: { minWidth: 1260 },
  paymentSelectBox: {
    height: 40,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  paymentEmptyCell: { minWidth: 1260, paddingHorizontal: 16, paddingVertical: 18, alignItems: 'center' },
  examEmptyCell: { minWidth: 2000, paddingHorizontal: 16, paddingVertical: 18, alignItems: 'center' },
  salaryEmptyCell: { minWidth: 1260, paddingHorizontal: 16, paddingVertical: 18, alignItems: 'center' },
  paymentLink: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  paymentSubtext: { color: '#64748b', fontSize: 11, fontWeight: '700', marginTop: 6 },
  leaveTableRow: { flexWrap: 'nowrap' },
  leaveEmptyCell: { minWidth: 1120, paddingHorizontal: 16, paddingVertical: 18, alignItems: 'center' },
  leaveCompactEmptyCell: { minWidth: 720, paddingHorizontal: 16, paddingVertical: 18, alignItems: 'center' },
  leaveEmptyText: { color: '#64748b', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  leaveActionStack: { gap: 8, alignItems: 'flex-start' },
  leaveActionDisabled: { opacity: 0.7 },
  leaveActionNote: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  salaryStatusStack: { alignItems: 'flex-start', gap: 6 },
  salaryInlineAction: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  salaryInlineActionText: { color: '#2563eb', fontSize: 11, fontWeight: '800' },
  salaryStatusNote: { color: '#64748b', fontSize: 10, fontWeight: '700', lineHeight: 14 },
  requestRolePill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#ede9fe',
  },
  requestRolePillText: { fontSize: 10, fontWeight: '700', color: '#6d28d9' },
  approvalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestMeta: { fontSize: 11, color: '#7c3aed', marginTop: 4, fontWeight: '600' },
  approvalActions: { flexDirection: 'row', gap: 8 },
  approveBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rejectBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  rejectBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  actionBtnDisabled: { opacity: 0.6 },
  selectField: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldText: { color: '#0f172a', fontSize: 14 },
  selectFieldPlaceholder: { color: '#94a3b8', fontSize: 14 },
  selectFieldArrow: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  selectOptions: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 10,
  },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  selectEmptyText: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  selectSectionTitle: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: '#f8fafc',
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  selectOptionActive: { backgroundColor: '#ede9fe' },
  selectOptionText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  selectOptionTextActive: { color: '#6d28d9', fontWeight: '700' },
  dayPickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  dayChipActive: { borderColor: '#7c3aed', backgroundColor: '#ede9fe' },
  dayChipText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  dayChipTextActive: { color: '#6d28d9' },
  timeRowWrap: { flexDirection: 'row', gap: 10 },
  timeInput: { flex: 1 },
  cancelEditBtn: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelEditBtnText: { color: '#475569', fontWeight: '700', fontSize: 13 },
  ttRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 12,
  },
  ttMeta: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  ttActions: { flexDirection: 'row', gap: 8 },
  ttEditBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ttDeleteBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearHallBtn: {
    backgroundColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ttEditBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  ttDeleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  clearHallBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  timetableHeroFilter: {
    backgroundColor: '#edf4ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d6e4ff',
    padding: 16,
  },
  timetableFilterLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  timetableGradeSelector: {
    maxWidth: 220,
    borderWidth: 1,
    borderColor: '#c6d6f8',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timetableGradeSelectorText: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  timetableOverviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14, marginBottom: 14 },
  timetableOverviewCard: {
    flexBasis: 180,
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 16,
  },
  timetableOverviewLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  timetableOverviewValue: { color: '#0f172a', fontSize: 22, fontWeight: '900', marginTop: 10 },
  adminTimetableBoard: {
    minWidth: 1180,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  adminTimetableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  adminTimetableTimeHeader: {
    width: 128,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  adminTimetableDayHeader: {
    width: 150,
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#eef2f7',
  },
  adminTimetableHeadText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  adminTimetableGridRow: {
    flexDirection: 'row',
    minHeight: 138,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  adminTimetableTimeCell: {
    width: 128,
    paddingHorizontal: 14,
    paddingVertical: 16,
    justifyContent: 'flex-start',
    backgroundColor: '#fff',
  },
  adminTimetableTimeText: { color: '#334155', fontSize: 14, fontWeight: '900', lineHeight: 20 },
  adminTimetableDayCell: {
    width: 150,
    borderLeftWidth: 1,
    borderLeftColor: '#eef2f7',
    padding: 10,
    backgroundColor: '#fff',
  },
  adminTimetableSlotCard: {
    flex: 1,
    minHeight: 118,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminTimetableSlotFilled: {
    backgroundColor: '#eef6ff',
    borderColor: '#dbeafe',
  },
  adminTimetableSlotEmpty: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  adminTimetableSlotDisabled: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  adminTimetableSlotTitle: {
    color: '#123053',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 18,
  },
  adminTimetableSlotMeta: {
    color: '#46627f',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  adminTimetableSlotHint: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  adminTimetableSlotEmptyTitle: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  adminTimetableSlotEmptyHint: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  adminTimetableSlotDisabledTitle: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  adminTimetableSlotDisabledHint: {
    color: '#e11d48',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  adminTimetableGridNote: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  adminTimetableGridNoteText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  timetableEditorSummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16, marginBottom: 14 },
  timetableEditorSummaryCard: {
    flexBasis: 220,
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
    padding: 14,
  },
  timetableConflictBanner: {
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timetableConflictText: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  profileInputDark: {
    backgroundColor: '#111c34',
    borderColor: '#334155',
    color: '#e2e8f0',
  },
  profileInfoCardDark: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  formInput: { marginBottom: 0 },
  actionBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  hallActionBtn: { flex: 1 },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 12, fontSize: 13 },
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TUTOR DASHBOARD
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TutorDashboard = ({ token, user, onUserUpdated, onLogout }) => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [profileName, setProfileName] = useState(user.name || '');
  const [profileEmail, setProfileEmail] = useState(user.email || '');
  const [profileSubject, setProfileSubject] = useState(user.subject || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [selectedTutorDayFilter, setSelectedTutorDayFilter] = useState('All Days');
  const [suggestionType, setSuggestionType] = useState('Suggestion');
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveDateYear, setLeaveDateYear] = useState('');
  const [leaveDateMonth, setLeaveDateMonth] = useState('');
  const [leaveDateDay, setLeaveDateDay] = useState('');
  const [showLeaveYearOptions, setShowLeaveYearOptions] = useState(false);
  const [showLeaveMonthOptions, setShowLeaveMonthOptions] = useState(false);
  const [showLeaveDayOptions, setShowLeaveDayOptions] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [submittingLeaveRequest, setSubmittingLeaveRequest] = useState(false);
  const [tutorExamGrade, setTutorExamGrade] = useState(COURSE_GRADE_OPTIONS[0]);
  const [tutorExamTerm, setTutorExamTerm] = useState(EXAM_TERM_OPTIONS[0]);
  const [tutorExamOptions, setTutorExamOptions] = useState([]);
  const [selectedTutorExamId, setSelectedTutorExamId] = useState('');
  const [showTutorExamOptions, setShowTutorExamOptions] = useState(false);
  const [tutorExamEntry, setTutorExamEntry] = useState(null);
  const [tutorMarkDrafts, setTutorMarkDrafts] = useState({});
  const [tutorAbsentDrafts, setTutorAbsentDrafts] = useState({});
  const [savingTutorExamMarks, setSavingTutorExamMarks] = useState(false);
  const [attendanceSessionData, setAttendanceSessionData] = useState({ serverNow: null, todaySessions: [], session: null, rows: [] });
  const [attendanceDrafts, setAttendanceDrafts] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [liveNow, setLiveNow] = useState(new Date());

  const [studentFullName, setStudentFullName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sData, cData, eData, tData, suggestionData, leaveRequestData, salaryData, attendanceData] = await Promise.all([
        request('/api/students', { token }),
        request('/api/courses', { token }),
        request('/api/enrollments', { token }),
        request('/api/timetable', { token }),
        request('/api/suggestions?mine=true', { token }),
        request('/api/leave-requests?mine=true', { token }),
        request('/api/salaries', { token }),
        request('/api/attendance/tutor/session', { token }),
      ]);
      setStudents(sData.students || []);
      setCourses(cData.courses || []);
      setEnrollments(eData.enrollments || []);
      setTimetable(tData.timetable || []);
      setSuggestions(suggestionData.suggestions || []);
      setLeaveRequests(leaveRequestData.leaveRequests || []);
      setSalaryRecords(salaryData.salaries || []);
      setAttendanceSessionData(attendanceData || { serverNow: null, todaySessions: [], session: null, rows: [] });
      setAttendanceDrafts(
        (attendanceData?.rows || []).reduce((result, row) => {
          result[row.studentId] = row.status || 'Present';
          return result;
        }, {})
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setProfileName(user.name || '');
    setProfileEmail(user.email || '');
    setProfileSubject(user.subject || '');
  }, [user.name, user.email, user.subject]);
  useEffect(() => {
    setLeaveDate(buildIsoDateString(leaveDateYear, leaveDateMonth, leaveDateDay));
  }, [leaveDateYear, leaveDateMonth, leaveDateDay]);
  useEffect(() => {
    if (!leaveDateMonth) {
      return;
    }

    const allowedMonthValues = getAllowedMonthOptions(leaveDateYear, liveNow).map((option) => option.value);
    if (!allowedMonthValues.includes(leaveDateMonth)) {
      setLeaveDateMonth('');
      setLeaveDateDay('');
    }
  }, [leaveDateYear, leaveDateMonth, liveNow]);
  useEffect(() => {
    if (!leaveDateDay) {
      return;
    }

    const allowedDayValues = getAllowedDayOptions(leaveDateYear, leaveDateMonth, liveNow);
    if (!allowedDayValues.includes(leaveDateDay)) {
      setLeaveDateDay('');
    }
  }, [leaveDateYear, leaveDateMonth, leaveDateDay, liveNow]);
  useEffect(() => {
    if (!token) return;

    const loadTutorExamOptions = async () => {
      try {
        const examData = await request(
          `/api/exams?grade=${encodeURIComponent(tutorExamGrade)}&term=${encodeURIComponent(tutorExamTerm)}&academicYear=${new Date().getFullYear()}`,
          { token }
        );
        const nextExams = examData.exams || [];
        setTutorExamOptions(nextExams);
        setSelectedTutorExamId((currentExamId) => (
          nextExams.some((exam) => exam.id === currentExamId) ? currentExamId : (nextExams[0]?.id || '')
        ));
        setShowTutorExamOptions(false);
      } catch (e) {
        Alert.alert('Load Error', e.message);
      }
    };

    loadTutorExamOptions();
  }, [token, tutorExamGrade, tutorExamTerm]);
  useEffect(() => {
    if (!token || !selectedTutorExamId) {
      setTutorExamEntry(null);
      setTutorMarkDrafts({});
      setTutorAbsentDrafts({});
      return;
    }

    const loadTutorExamEntry = async () => {
      try {
        const entryData = await request(`/api/exams/${selectedTutorExamId}/entry`, { token });
        setTutorExamEntry(entryData);
        setTutorMarkDrafts(
          (entryData.rows || []).reduce((result, row) => {
            result[row.studentId] = row.score === null || row.score === undefined ? '' : String(row.score);
            return result;
          }, {})
        );
        setTutorAbsentDrafts(
          (entryData.rows || []).reduce((result, row) => {
            result[row.studentId] = Boolean(row.absent);
            return result;
          }, {})
        );
      } catch (e) {
        Alert.alert('Load Error', e.message);
      }
    };

    loadTutorExamEntry();
  }, [token, selectedTutorExamId]);

  const applyTutorLeaveDateSelection = (dateValue) => {
    const parsedDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
      return;
    }

    const yearValue = String(parsedDate.getFullYear());
    const monthValue = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const dayValue = String(parsedDate.getDate()).padStart(2, '0');

    if (!isDateOnOrAfterToday(yearValue, monthValue, dayValue, liveNow)) {
      Alert.alert('Invalid Date', 'Please choose today or a future date for your leave request.');
      return;
    }

    setLeaveDateYear(yearValue);
    setLeaveDateMonth(monthValue);
    setLeaveDateDay(dayValue);
    setShowLeaveYearOptions(false);
    setShowLeaveMonthOptions(false);
    setShowLeaveDayOptions(false);
  };

  const updateTutorProfile = async () => {
    const name = profileName.trim();
    const email = profileEmail.trim();
    const subject = profileSubject.trim();

    if (!name || !email || !subject) {
      Alert.alert('Missing Fields', 'Name, email, and subject are required.');
      return;
    }

    setProfileSaving(true);
    try {
      const data = await request('/api/auth/profile', {
        method: 'PUT',
        token,
        body: { name, email, subject },
      });
      onUserUpdated(data.user);
      setProfileName(data.user.name || '');
      setProfileEmail(data.user.email || '');
      setProfileSubject(data.user.subject || '');
      showPopupMessage('Updated', data.message || 'Tutor profile updated successfully.');
    } catch (e) {
      showPopupMessage('Error', e.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const submitTutorSuggestion = async () => {
    if (!suggestionTitle.trim() || !suggestionMessage.trim()) {
      Alert.alert('Missing Fields', 'Type, title, and message are required.');
      return;
    }

    setSubmittingSuggestion(true);
    try {
      const data = await request('/api/suggestions', {
        method: 'POST',
        token,
        body: {
          type: suggestionType,
          title: suggestionTitle.trim(),
          message: suggestionMessage.trim(),
        },
      });
      setSuggestions((current) => [data.suggestion, ...current]);
      setSuggestionTitle('');
      setSuggestionMessage('');
      setSuggestionType('Suggestion');
      setTab('mySuggestion');
      Alert.alert('Submitted', 'Your suggestion has been sent for review.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  const submitLeaveRequest = async () => {
    if (!leaveDate.trim() || !leaveReason.trim()) {
      Alert.alert('Missing Fields', 'Leave date and reason are required.');
      return;
    }

    const allowedMonthValues = getAllowedMonthOptions(leaveDateYear, liveNow).map((option) => option.value);
    if (!allowedMonthValues.includes(leaveDateMonth)) {
      Alert.alert('Invalid Month', 'Please choose the current month or a future month for your leave request.');
      return;
    }

    const allowedDayValues = getAllowedDayOptions(leaveDateYear, leaveDateMonth, liveNow);
    if (!allowedDayValues.includes(leaveDateDay)) {
      Alert.alert('Invalid Day', 'Please choose today or a future date for your leave request.');
      return;
    }

    if (!isDateOnOrAfterToday(leaveDateYear, leaveDateMonth, leaveDateDay, liveNow)) {
      Alert.alert('Invalid Date', 'Please choose today or a future date for your leave request.');
      return;
    }

    setSubmittingLeaveRequest(true);
    try {
      const data = await request('/api/leave-requests', {
        method: 'POST',
        token,
        body: {
          leaveDate: leaveDate.trim(),
          reason: leaveReason.trim(),
        },
      });
      setLeaveRequests((current) => [data.leaveRequest, ...current]);
      setLeaveDate('');
      setLeaveDateYear('');
      setLeaveDateMonth('');
      setLeaveDateDay('');
      setLeaveReason('');
      Alert.alert('Submitted', 'Your leave request has been sent for review.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingLeaveRequest(false);
    }
  };

  const saveTutorExamMarks = async () => {
    if (!selectedTutorExamId || !tutorExamEntry?.subject) {
      Alert.alert('Select Exam', 'Choose an exam before saving marks.');
      return;
    }

    setSavingTutorExamMarks(true);
    try {
      const entries = (tutorExamEntry.rows || []).map((row) => ({
        studentId: row.studentId,
        absent: Boolean(tutorAbsentDrafts[row.studentId]),
        score: tutorMarkDrafts[row.studentId] === '' ? '' : Number(tutorMarkDrafts[row.studentId]),
      }));
      const updatedEntry = await request(`/api/exams/${selectedTutorExamId}/marks`, {
        method: 'POST',
        token,
        body: {
          subject: tutorExamEntry.subject,
          entries,
        },
      });
      setTutorExamEntry(updatedEntry);
      setTutorMarkDrafts(
        (updatedEntry.rows || []).reduce((result, row) => {
          result[row.studentId] = row.score === null || row.score === undefined ? '' : String(row.score);
          return result;
        }, {})
      );
      setTutorAbsentDrafts(
        (updatedEntry.rows || []).reduce((result, row) => {
          result[row.studentId] = Boolean(row.absent);
          return result;
        }, {})
      );
      Alert.alert('Saved', 'Marks saved successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingTutorExamMarks(false);
    }
  };

  const addStudent = async () => {
    const fullName = studentFullName.trim();
    const email = sEmail.trim();
    const phone = sPhone.trim();
    const { firstName, lastName } = splitFullName(fullName);

    if (!fullName || !email || !phone) {
      Alert.alert('Missing Fields', 'Full name, email, and contact number are required.');
      return;
    }
    if (!firstName || !lastName) {
      Alert.alert('Invalid Name', 'Please enter the full name with at least first and last name.');
      return;
    }
    setCreating(true);
    try {
      const data = await request('/api/students', {
        method: 'POST', token,
        body: { firstName, lastName, email, phone, status: 'active' },
      });
      setStudentFullName('');
      setSEmail('');
      setSPhone('');
      await loadAll();
      Alert.alert('âœ… Added', 'Student added successfully.');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setCreating(false); }
  };

  const markAttendanceStatus = (studentId, status) => {
    setAttendanceDrafts((current) => ({
      ...current,
      [studentId]: status,
    }));
  };

  const markAllAttendancePresent = () => {
    setAttendanceDrafts(
      (attendanceSessionData.rows || []).reduce((result, row) => {
        result[row.studentId] = 'Present';
        return result;
      }, {})
    );
  };

  const submitTutorAttendance = async () => {
    const activeSession = attendanceSessionData.session;
    if (!activeSession?.id) {
      Alert.alert('No Session', 'There is no pending class session available for attendance marking right now.');
      return;
    }

    setSavingAttendance(true);
    try {
      const data = await request(`/api/attendance/tutor/session/${activeSession.id}`, {
        method: 'POST',
        token,
        body: {
          entries: (attendanceSessionData.rows || []).map((row) => ({
            studentId: row.studentId,
            status: attendanceDrafts[row.studentId] || 'Present',
          })),
        },
      });
      setAttendanceSessionData(data);
      setAttendanceDrafts(
        (data.rows || []).reduce((result, row) => {
          result[row.studentId] = row.status || 'Present';
          return result;
        }, {})
      );
      Alert.alert('Saved', data.message || 'Attendance saved successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const tutorMenuItems = [
    { key: 'overview', label: 'Overview', section: 'Overview', icon: 'dashboard' },
    { key: 'timetable', label: 'My Classes', section: 'Teaching', icon: 'co-present' },
    { key: 'students', label: 'Attendance', section: 'Teaching', icon: 'how-to-reg' },
    { key: 'enrollments', label: 'Salary Summary', section: 'Teaching', icon: 'payments' },
    { key: 'leaveRequests', label: 'Leave Requests', section: 'Teaching', icon: 'event-note' },
    { key: 'examResults', label: 'Exam & Results', section: 'Teaching', icon: 'grading' },
    { key: 'mySuggestion', label: 'My Suggestion', section: 'Suggestions', icon: 'lightbulb' },
    { key: 'newSuggestion', label: 'New Suggestion/Complaints', section: 'Suggestions', icon: 'edit-note' },
    { key: 'profile', label: 'Tutor Profile', section: 'Account', icon: 'person' },
  ];
  const selectedTutorExam = tutorExamOptions.find((exam) => exam.id === selectedTutorExamId) || tutorExamOptions[0] || null;
  const leaveYearOptions = Array.from({ length: 3 }, (_, index) => String(new Date().getFullYear() + index));
  const leaveMonthOptions = getAllowedMonthOptions(leaveDateYear, liveNow);
  const leaveDayOptions = getAllowedDayOptions(leaveDateYear, leaveDateMonth, liveNow);
  const leaveCalendar = buildLeaveRequestCalendar(leaveDateYear, leaveDateMonth, liveNow, leaveDate);
  const selectedLeaveDateLabel = leaveDate ? formatLongDate(leaveDate) : 'No leave date selected yet.';
  const currentSalaryMonthKey = buildPaymentMonthKey(liveNow);
  const currentDayName = STUDENT_WEEK_DAYS[liveNow.getDay()];
  const tutorLiveClock = formatLiveClockTime(liveNow);
  const tutorLiveDateLabel = formatLongAppDate(liveNow);
  const tutorSalaryHistory = [...salaryRecords]
    .sort((firstSalary, secondSalary) => String(secondSalary.monthKey || '').localeCompare(String(firstSalary.monthKey || '')))
    .slice(0, 3);
  const currentTutorSalary = tutorSalaryHistory.find((salary) => salary.monthKey === currentSalaryMonthKey) || tutorSalaryHistory[0] || null;
  const monthHours = currentTutorSalary?.hours || 0;
  const tutorRatePerHour = currentTutorSalary?.ratePerHour || estimateTutorRatePerHour(user.subject || currentTutorSalary?.subject || '');
  const tutorBaseSalary = currentTutorSalary?.amount || 0;
  const tutorSalaryStatus = currentTutorSalary?.status || 'Inactive';
  const tutorSalaryStatusTone = getSalaryStatusTone(tutorSalaryStatus);
  const pendingTutorLeaveRequests = leaveRequests.filter((item) => item.status === 'Pending');
  const resolvedTutorLeaveRequests = leaveRequests.filter((item) => item.status !== 'Pending');
  const tutorNameKey = normalizeSubjectKey(user.name || profileName || '');
  const tutorSubjectKey = normalizeSubjectKey(user.subject || profileSubject || '');
  const tutorTimetableByName = timetable.filter(
    (entry) => normalizeSubjectKey(entry.tutorName || '') === tutorNameKey
  );
  const tutorTimetable = tutorTimetableByName.length > 0
    ? tutorTimetableByName
    : timetable.filter((entry) => {
      const entrySubject = normalizeSubjectKey(entry.subject || entry.courseId?.subject || entry.title || '');
      return Boolean(tutorSubjectKey) && entrySubject === tutorSubjectKey;
    });
  const tutorTimetableGroups = TIMETABLE_DAYS.map((day) => ({
    day,
    entries: tutorTimetable
      .filter((entry) => entry.dayOfWeek === day)
      .sort((firstEntry, secondEntry) => String(firstEntry.startTime || '').localeCompare(String(secondEntry.startTime || ''))),
  }));
  const visibleTutorTimetableGroups = tutorTimetableGroups.filter((group) => (
    (selectedTutorDayFilter === 'All Days' || group.day === selectedTutorDayFilter) && group.entries.length > 0
  ));
  const tutorTodayClasses = tutorTimetable
    .filter((entry) => entry.dayOfWeek === currentDayName)
    .sort((firstEntry, secondEntry) => String(firstEntry.startTime || '').localeCompare(String(secondEntry.startTime || '')));
  const activeAttendanceSession = attendanceSessionData.session || null;
  const tutorAttendanceRows = attendanceSessionData.rows || [];
  const tutorAttendanceSessions = attendanceSessionData.todaySessions || [];
  const tutorNotifications = [
    tutorTodayClasses.length > 0 ? {
      id: 'tutor-today-classes',
      title: `${tutorTodayClasses.length} class${tutorTodayClasses.length > 1 ? 'es are' : ' is'} scheduled today`,
      detail: 'Check My Classes for the latest timetable updates.',
    } : null,
    activeAttendanceSession ? {
      id: 'tutor-active-attendance',
      title: 'Attendance session is active',
      detail: 'Attendance panel has a live class session ready to update.',
    } : null,
    pendingTutorLeaveRequests.length > 0 ? {
      id: 'tutor-pending-leave',
      title: `${pendingTutorLeaveRequests.length} leave request${pendingTutorLeaveRequests.length > 1 ? 's are' : ' is'} still pending`,
      detail: 'Open Leave Requests to follow the current request status.',
    } : null,
    tutorSalaryStatus === 'Pending' ? {
      id: 'tutor-pending-salary',
      title: 'Current salary is pending',
      detail: 'Salary Summary shows this month payment has not been marked as paid yet.',
    } : null,
    tutorAttendanceSessions.length > 0 ? {
      id: 'tutor-attendance-updated',
      title: `${tutorAttendanceSessions.length} attendance session${tutorAttendanceSessions.length > 1 ? 's were' : ' was'} recorded today`,
      detail: 'Attendance records were updated for today.',
    } : null,
  ].filter(Boolean);

  return (
    <WebDashboardShell
      welcome="Welcome, Tutor!"
      roleLabel="Tutor Dashboard"
      user={user}
      activeTab={tab}
      onTabChange={setTab}
      menuItems={tutorMenuItems}
      notifications={tutorNotifications}
      onLogout={onLogout}
      onOpenProfile={() => setTab('profile')}
    >
      {/* Header */}
      <View style={{ display: 'none' }}>
        <View>
          <Text style={tut.headerRole}>ðŸ“š Tutor Dashboard</Text>
          <Text style={tut.headerName}>Mr/Ms. {user.name.split(' ')[0]}</Text>
        </View>
        <TouchableOpacity
          style={tut.logoutBtn}
          onPress={onLogout}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Text style={tut.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Email */}
      <View style={{ display: 'none' }}>
        <Text style={tut.emailText}>âœ‰ {user.email}</Text>
      </View>

      {/* Tabs */}
      <View style={{ display: 'none' }}>
        {['profile', 'overview', 'students', 'enrollments', 'timetable'].map((t) => (
          <TouchableOpacity key={t} style={[tut.tabBtn, tab === t && tut.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[tut.tabText, tab === t && tut.tabTextActive]}>
              {t === 'profile' ? 'Profile' : t === 'overview' ? 'Home' : t === 'students' ? 'Students' : t === 'enrollments' ? 'Enrollments' : 'Timetable'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={tut.scroll}>
        {loading && <ActivityIndicator color="#0ea5e9" style={{ marginTop: 20 }} />}

        {!loading && tab === 'overview' && (
          <>
            <WebPageTitle
              title="Overview"
              subtitle="Review your classes, student reach, hours, and current salary status."
            />
            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Tutor Overview</Text>
              <Text style={webDash.sectionText}>A quick look at today's work, current teaching load, and salary progress.</Text>
              <View style={[webDash.metricGrid, { marginTop: 18 }]}>
                <WebMetricCard label="Classes Today" value={tutorTodayClasses.length} detail="Scheduled active classes for today" accent="#2563eb" />
                <WebMetricCard label="Total Students" value={students.length} detail="Distinct students across assigned classes" accent="#2563eb" />
                <WebMetricCard label="Hours This Month" value={monthHours} detail="60 hour target this month" progress={(monthHours / 60) * 100} accent="#2563eb" />
                <WebMetricCard
                  label="Salary Status"
                  value={tutorSalaryStatus}
                  detail={currentTutorSalary?.monthLabel || 'No salary record yet'}
                  accent={tutorSalaryStatus === 'Paid' ? '#16a34a' : tutorSalaryStatus === 'Inactive' ? '#64748b' : '#f59e0b'}
                />
              </View>
            </View>
            <View style={webDash.sectionCard}>
              <View style={[webDash.tableRow, { borderBottomWidth: 0, minHeight: 0, paddingBottom: 12 }]}>
                <View style={webDash.tableCellWide}>
                  <Text style={webDash.sectionTitle}>{`Today's Schedule - ${currentDayName}`}</Text>
                  <Text style={webDash.sectionText}>A timetable-style preview of today's classes with quick access to the full schedule page.</Text>
                </View>
                <View style={[webDash.tableCell, { alignItems: 'flex-end', justifyContent: 'center' }]}>
                  <TouchableOpacity style={webDash.buttonBlue} onPress={() => setTab('timetable')}>
                    <Text style={webDash.buttonTextLight}>Open Full Schedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[webDash.table, { marginTop: 8 }]}>
                <View style={[webDash.tableRow, webDash.tableHeader]}>
                  {['Time Slot', 'Subject', 'Grade', 'Room'].map((heading) => (
                    <View key={heading} style={heading === 'Subject' ? webDash.tableCellWide : webDash.tableCell}>
                      <Text style={webDash.tableHeadText}>{heading}</Text>
                    </View>
                  ))}
                </View>
                {tutorTodayClasses.length === 0 ? (
                  <View style={webDash.tableRow}>
                    <View style={webDash.tableCellWide}>
                      <Text style={webDash.tableText}>No classes are scheduled for today.</Text>
                    </View>
                  </View>
                ) : tutorTodayClasses.map((entry) => (
                  <View key={entry._id} style={webDash.tableRow}>
                    <View style={webDash.tableCell}>
                      <Text style={[webDash.tableText, { fontWeight: '900' }]}>{`${formatTimetableTime(entry.startTime)} - ${formatTimetableTime(entry.endTime)}`}</Text>
                      <Text style={webDash.tableText}>{entry.dayOfWeek}</Text>
                    </View>
                    <View style={webDash.tableCellWide}>
                      <Text style={[webDash.tableText, { fontWeight: '900' }]}>{entry.subject || formatTimetableEntryTitle(entry, courses)}</Text>
                      <Text style={webDash.tableText}>Scheduled class</Text>
                    </View>
                    <View style={webDash.tableCell}>
                      <Text style={[webDash.tableText, { fontWeight: '900' }]}>{getTimetableEntryGrade(entry, courses) || '-'}</Text>
                      <Text style={webDash.tableText}>Student level</Text>
                    </View>
                    <View style={webDash.tableCell}>
                      <Text style={[webDash.tableText, { fontWeight: '900', color: '#2563eb' }]}>{entry.room || '-'}</Text>
                      <Text style={webDash.tableText}>Classroom</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {!loading && tab === 'profile' && (
          <View style={[tut.card, tut.profileCardDark]}>
            <Text style={tut.profileTitle}>Tutor Profile</Text>
            <View style={tut.profileAvatar}>
              <Text style={tut.profileAvatarText}>
                {(user.name || 'T').split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <Text style={tut.profileRole}>TUTOR ACCOUNT</Text>
            <TextInput
              style={[tut.input, tut.profileInputDark]}
              placeholder="Full name"
              value={profileName}
              onChangeText={setProfileName}
              showSoftInputOnFocus
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={[tut.input, tut.profileInputDark]}
              placeholder="Email"
              value={profileEmail}
              onChangeText={setProfileEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              showSoftInputOnFocus
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={[tut.input, tut.profileInputDark]}
              placeholder="Subject"
              value={profileSubject}
              onChangeText={setProfileSubject}
              showSoftInputOnFocus
              placeholderTextColor="#94a3b8"
            />
            <View style={[tut.profileInfoBox, tut.profileInfoBoxDark]}>
              <Text style={[tut.profileInfoLabel, tut.profileInfoLabelDark]}>Role</Text>
              <Text style={[tut.profileInfoValue, tut.profileInfoValueDark]}>Tutor</Text>
              <Text style={[tut.profileInfoLabel, tut.profileInfoLabelDark]}>Subject</Text>
              <Text style={[tut.profileInfoValue, tut.profileInfoValueDark]}>{user.subject || 'Not set'}</Text>
              <Text style={[tut.profileInfoLabel, tut.profileInfoLabelDark]}>Status</Text>
              <Text style={[tut.profileInfoValue, tut.profileInfoValueDark]}>{user.approvalStatus || 'approved'}</Text>
            </View>
            <TouchableOpacity
              style={[tut.addBtn, profileSaving && tut.btnDisabled]}
              onPress={updateTutorProfile}
              disabled={profileSaving}
            >
              <Text style={tut.addBtnText}>{profileSaving ? 'Saving...' : 'Update Profile'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && tab === 'students_legacy' && (
          <View style={tut.card}>
            <SectionHeader title="Add Student" />
            <TextInput style={tut.input} placeholder="Full name" value={studentFullName}
              onChangeText={setStudentFullName} showSoftInputOnFocus placeholderTextColor="#94a3b8" />
            <TextInput style={tut.input} placeholder="Email" value={sEmail}
              onChangeText={setSEmail} autoCapitalize="none" keyboardType="email-address"
              showSoftInputOnFocus placeholderTextColor="#94a3b8" />
            <TextInput style={tut.input} placeholder="Contact no" value={sPhone}
              onChangeText={setSPhone} keyboardType="phone-pad"
              showSoftInputOnFocus placeholderTextColor="#94a3b8" />
            <TouchableOpacity style={tut.addBtn} onPress={addStudent} disabled={creating}>
              <Text style={tut.addBtnText}>{creating ? 'Adding...' : '+ Add Student'}</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 16 }}>
              <SectionHeader title={`Students (${students.length})`} action={loadAll} />
              {students.length === 0
                ? <Text style={tut.empty}>No students yet.</Text>
                : students.map((s) => (
                  <View key={s._id} style={tut.studentRow}>
                    <View style={tut.studentAvatar}>
                      <Text style={tut.studentAvatarText}>{s.firstName?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={tut.studentName}>{s.firstName} {s.lastName}</Text>
                      <Text style={tut.studentEmail}>{s.email}</Text>
                    </View>
                    <View style={[tut.statusChip, s.status === 'active' ? tut.chipGreen : tut.chipGray]}>
                      <Text style={tut.chipText}>{s.status}</Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}

        {!loading && tab === 'enrollments_legacy' && (
          <View style={tut.card}>
            <SectionHeader title={`Enrollments (${enrollments.length})`} action={loadAll} />
            {enrollments.length === 0
              ? <Text style={tut.empty}>No enrollments yet.</Text>
              : enrollments.map((e) => (
                <View key={e._id} style={tut.enrollRow}>
                  <View style={tut.enrollIcon}>
                    <Text style={{ fontSize: 18 }}>ðŸ“‹</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={tut.enrollName}>
                      {e.student?.firstName} {e.student?.lastName}
                    </Text>
                    <Text style={tut.enrollSub}>{e.course?.name} â€¢ {e.course?.code}</Text>
                  </View>
                  <View style={[tut.statusChip,
                    e.status === 'enrolled' ? tut.chipBlue
                    : e.status === 'completed' ? tut.chipGreen
                    : tut.chipRed]}>
                    <Text style={tut.chipText}>{e.status}</Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {!loading && tab === 'timetable' && (
          <>
            <WebPageTitle
              title="My Classes"
              subtitle="Review all timetable periods assigned to you from the central timetable."
              actionLabel="View Today Schedule"
              onActionPress={() => setSelectedTutorDayFilter(currentDayName)}
            />
            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>My Classes</Text>
              <Text style={webDash.sectionText}>View your full timetable from the central admin timetable, grouped by day.</Text>

              <Text style={[webDash.detailLabel, { marginTop: 16, marginBottom: 10 }]}>Select Day</Text>
              <View style={webDash.segmentRow}>
                {['All Days', ...TIMETABLE_DAYS].map((dayOption) => (
                  <TouchableOpacity
                    key={dayOption}
                    style={[
                      webDash.segmentButton,
                      selectedTutorDayFilter === dayOption && webDash.segmentButtonActive,
                    ]}
                    onPress={() => setSelectedTutorDayFilter(dayOption)}
                  >
                    <Text
                      style={[
                        webDash.segmentText,
                        selectedTutorDayFilter === dayOption && webDash.segmentTextActive,
                      ]}
                    >
                      {dayOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {tutorTimetable.length === 0 ? (
                <Text style={webDash.emptyText}>No timetable is assigned to your registered subject yet.</Text>
              ) : visibleTutorTimetableGroups.length === 0 ? (
                <Text style={webDash.emptyText}>No classes are scheduled for the selected day.</Text>
              ) : visibleTutorTimetableGroups.map((group) => (
                <View key={group.day} style={[webDash.table, { marginTop: 14 }]}>
                  <View style={[webDash.tableRow, webDash.tableHeader]}>
                    <View style={webDash.tableCellWide}>
                      <Text style={[webDash.tableHeadText, { fontSize: 13, color: '#2563eb' }]}>{group.day}</Text>
                    </View>
                  </View>
                  {group.entries.map((entry) => (
                    <View key={entry._id} style={webDash.tableRow}>
                      <View style={webDash.tableCell}>
                        <Text style={[webDash.tableText, { fontWeight: '900' }]}>
                          {`${formatTimetableTime(entry.startTime)} - ${formatTimetableTime(entry.endTime)}`}
                        </Text>
                      </View>
                      <View style={webDash.tableCellWide}>
                        <Text style={[webDash.tableText, { fontWeight: '900' }]}>
                          {entry.subject || formatTimetableEntryTitle(entry, courses)}
                        </Text>
                        <Text style={webDash.tableText}>{getTimetableEntryGrade(entry, courses) || '-'}</Text>
                      </View>
                      <View style={[webDash.tableCell, { alignItems: 'flex-end' }]}>
                        <Text style={[webDash.tableText, { fontWeight: '900', color: '#0f172a' }]}>{entry.room || '-'}</Text>
                        <Text style={webDash.tableText}>Room</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}

        {!loading && tab === 'students' && (
          <>
            <WebPageTitle
              title="Attendance Marking"
              subtitle="Mark present and absent students for the next real timetable session and keep student attendance synced."
            />
            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Attendance Marking</Text>
              <Text style={webDash.sectionText}>The next pending class from today&apos;s timetable is loaded automatically using the real day and current time.</Text>
              <View style={[webDash.filterBar, { marginTop: 18 }]}>
                <Text style={[webDash.tableText, { fontWeight: '900' }]}>{`${currentDayName} • ${tutorLiveDateLabel}`}</Text>
                <Text style={webDash.sectionText}>{`Live time: ${tutorLiveClock}`}</Text>
              </View>
              {activeAttendanceSession ? (
                <>
                  <View style={webDash.detailGrid}>
                    <View style={webDash.detailField}>
                      <Text style={webDash.detailLabel}>Session</Text>
                      <Text style={webDash.detailValue}>{`${activeAttendanceSession.subject || activeAttendanceSession.title} • ${activeAttendanceSession.grade || 'No Grade'}`}</Text>
                    </View>
                    <View style={webDash.detailField}>
                      <Text style={webDash.detailLabel}>Time</Text>
                      <Text style={webDash.detailValue}>{`${formatTimetableTime(activeAttendanceSession.startTime)} - ${formatTimetableTime(activeAttendanceSession.endTime)}`}</Text>
                    </View>
                    <View style={webDash.detailField}>
                      <Text style={webDash.detailLabel}>Room</Text>
                      <Text style={webDash.detailValue}>{activeAttendanceSession.room || '-'}</Text>
                    </View>
                    <View style={webDash.detailField}>
                      <Text style={webDash.detailLabel}>Students</Text>
                      <Text style={webDash.detailValue}>{String(activeAttendanceSession.studentCount || tutorAttendanceRows.length)}</Text>
                    </View>
                  </View>

                  {tutorAttendanceRows.map((studentRow) => (
                    <View key={studentRow.studentId} style={[webDash.tableRow, webDash.attendanceRosterRow]}>
                      <View style={[webDash.tableCellSmall, { alignItems: 'center', justifyContent: 'center' }]}>
                        <View style={adm.avatar}>
                          <Text style={adm.avatarText}>{(studentRow.studentName || 'S')[0]}</Text>
                        </View>
                      </View>
                      <View style={webDash.tableCellWide}>
                        <Text style={[webDash.tableText, { fontWeight: '900' }]}>{studentRow.studentName}</Text>
                        <Text style={webDash.tableText}>{studentRow.email || 'Student email unavailable'}</Text>
                      </View>
                      <View style={webDash.tableCell}>
                        <View style={webDash.actionRow}>
                          <TouchableOpacity
                            style={[
                              webDash.buttonGreen,
                              attendanceDrafts[studentRow.studentId] !== 'Present' && webDash.buttonSoft,
                            ]}
                            onPress={() => markAttendanceStatus(studentRow.studentId, 'Present')}
                          >
                            <Text
                              style={
                                attendanceDrafts[studentRow.studentId] === 'Present'
                                  ? webDash.buttonTextLight
                                  : webDash.buttonTextBlue
                              }
                            >
                              Present
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              webDash.buttonRed,
                              attendanceDrafts[studentRow.studentId] !== 'Absent' && webDash.buttonSoft,
                            ]}
                            onPress={() => markAttendanceStatus(studentRow.studentId, 'Absent')}
                          >
                            <Text
                              style={
                                attendanceDrafts[studentRow.studentId] === 'Absent'
                                  ? webDash.buttonTextLight
                                  : webDash.buttonTextBlue
                              }
                            >
                              Absent
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}

                  <View style={[webDash.actionRow, { justifyContent: 'space-between', marginTop: 16 }]}>
                    <TouchableOpacity style={webDash.buttonSoft} onPress={markAllAttendancePresent}>
                      <Text style={webDash.buttonTextBlue}>Mark All Present</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={webDash.buttonBlue} onPress={submitTutorAttendance} disabled={savingAttendance}>
                      <Text style={webDash.buttonTextLight}>{savingAttendance ? 'Saving...' : 'Submit Attendance'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={webDash.emptyBox}>
                  <Text style={webDash.emptyText}>No pending class session is available for attendance marking right now.</Text>
                </View>
              )}
              <Text style={[webDash.sectionTitle, { marginTop: 22 }]}>Today&apos;s Sessions</Text>
              <View style={[webDash.table, { marginTop: 12 }]}>
                <View style={[webDash.tableRow, webDash.tableHeader]}>
                  {['Subject', 'Grade', 'Time', 'Status'].map((heading) => (
                    <View key={heading} style={webDash.tableCell}>
                      <Text style={webDash.tableHeadText}>{heading}</Text>
                    </View>
                  ))}
                </View>
                {tutorAttendanceSessions.length === 0 ? (
                  <View style={webDash.tableRow}>
                    <View style={webDash.tableCellWide}>
                      <Text style={webDash.tableText}>No timetable sessions are assigned to you today.</Text>
                    </View>
                  </View>
                ) : tutorAttendanceSessions.map((sessionItem) => (
                  <View key={sessionItem.id} style={webDash.tableRow}>
                    <View style={webDash.tableCell}>
                      <Text style={webDash.tableText}>{sessionItem.subject || sessionItem.title}</Text>
                    </View>
                    <View style={webDash.tableCell}>
                      <Text style={webDash.tableText}>{sessionItem.grade || '-'}</Text>
                    </View>
                    <View style={webDash.tableCell}>
                      <Text style={webDash.tableText}>{`${formatTimetableTime(sessionItem.startTime)} - ${formatTimetableTime(sessionItem.endTime)}`}</Text>
                    </View>
                    <View style={webDash.tableCell}>
                      <StatusPill
                        label={sessionItem.isMarked ? 'Marked' : sessionItem.isCurrent ? 'Current' : sessionItem.isUpcoming ? 'Upcoming' : 'Pending'}
                        tone={sessionItem.isMarked ? 'green' : sessionItem.isCurrent ? 'blue' : 'yellow'}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {!loading && tab === 'enrollments' && (
          <>
            <WebPageTitle
              title="Salary Summary"
              subtitle="Review your working hours, salary calculation, and recent payment history."
            />
            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Salary Summary</Text>
              <Text style={webDash.sectionText}>Review your monthly hours, calculated amount, and latest admin payment updates.</Text>
              <View style={[webDash.metricGrid, { marginTop: 18 }]}>
                <WebMetricCard label="Hours This Month" value={monthHours} accent="#2563eb" />
                <WebMetricCard label="Rate Per Hour" value={formatLkr(tutorRatePerHour)} accent="#2563eb" />
                <WebMetricCard label="Base Salary" value={formatLkr(tutorBaseSalary)} accent="#2563eb" />
                <WebMetricCard label="Payment Status" value={tutorSalaryStatus} accent={tutorSalaryStatusTone === 'green' ? '#16a34a' : tutorSalaryStatusTone === 'blue' ? '#64748b' : '#f59e0b'} />
              </View>
              <Text style={[webDash.sectionTitle, { marginTop: 20 }]}>Last 3 months</Text>
              <View style={[webDash.table, { marginTop: 12 }]}>
                {tutorSalaryHistory.length === 0 ? (
                  <View style={webDash.tableRow}>
                    <View style={webDash.tableCellWide}>
                      <Text style={webDash.tableText}>No salary records are available yet.</Text>
                    </View>
                  </View>
                ) : tutorSalaryHistory.map((item) => (
                  <View key={item.id} style={webDash.tableRow}>
                    <View style={webDash.tableCellWide}>
                      <Text style={[webDash.tableText, { fontWeight: '900' }]}>{item.monthLabel || item.monthKey}</Text>
                      <Text style={webDash.tableText}>{formatLkr(item.amount)}</Text>
                      <Text style={webDash.tableText}>{`${item.hours || 0} hours at ${formatLkr(item.ratePerHour || 0)}/hour`}</Text>
                      {item.adminNote ? <Text style={webDash.tableText}>{item.adminNote}</Text> : null}
                    </View>
                    <View style={webDash.tableCell}><StatusPill label={item.status} tone={getSalaryStatusTone(item.status)} /></View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {!loading && tab === 'leaveRequests' && (
          <>
            <WebPageTitle
              title="Leave Requests"
              subtitle="Submit your leave requests and review every request in a cleaner table view."
            />
            <View style={webDash.metricGrid}>
              <WebMetricCard label="Total Requests" value={String(leaveRequests.length)} badge="TR" accent="#2563eb" />
              <WebMetricCard label="Pending" value={String(pendingTutorLeaveRequests.length)} badge="PD" accent="#f59e0b" />
              <WebMetricCard label="Resolved" value={String(resolvedTutorLeaveRequests.length)} badge="RS" accent="#16a34a" />
            </View>

            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Submit Leave Request</Text>
              <Text style={webDash.sectionText}>Choose a leave date and provide the reason for your absence.</Text>
              <Text style={webDash.filterLabel}>Leave Date</Text>
              <View style={webDash.quickDateRow}>
                <TouchableOpacity
                  style={webDash.quickDateChip}
                  onPress={() => applyTutorLeaveDateSelection(new Date())}
                >
                  <Text style={webDash.quickDateChipText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={webDash.quickDateChip}
                  onPress={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    applyTutorLeaveDateSelection(tomorrow);
                  }}
                >
                  <Text style={webDash.quickDateChipText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={webDash.quickDateChip}
                  onPress={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    applyTutorLeaveDateSelection(nextWeek);
                  }}
                >
                  <Text style={webDash.quickDateChipText}>Next Week</Text>
                </TouchableOpacity>
              </View>
              <View style={webDash.filterBar}>
                <View style={webDash.filterField}>
                  <Text style={webDash.filterLabel}>Year</Text>
                  <TouchableOpacity
                    style={adm.paymentSelectBox}
                    onPress={() => {
                      setShowLeaveMonthOptions(false);
                      setShowLeaveDayOptions(false);
                      setShowLeaveYearOptions((current) => !current);
                    }}
                  >
                    <Text style={webDash.selectText}>{leaveDateYear || 'Select year'}</Text>
                    <Text style={adm.selectFieldArrow}>{showLeaveYearOptions ? '^' : 'v'}</Text>
                  </TouchableOpacity>
                  {showLeaveYearOptions ? (
                    <View style={adm.selectOptions}>
                      {leaveYearOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[adm.selectOption, leaveDateYear === option && adm.selectOptionActive]}
                          onPress={() => {
                            setLeaveDateYear(option);
                            setLeaveDateDay('');
                            setShowLeaveDayOptions(false);
                            setShowLeaveYearOptions(false);
                          }}
                        >
                          <Text style={[adm.selectOptionText, leaveDateYear === option && adm.selectOptionTextActive]}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
                <View style={webDash.filterField}>
                  <Text style={webDash.filterLabel}>Month</Text>
                  <TouchableOpacity
                    style={adm.paymentSelectBox}
                    onPress={() => {
                      setShowLeaveYearOptions(false);
                      setShowLeaveDayOptions(false);
                      setShowLeaveMonthOptions((current) => !current);
                    }}
                  >
                    <Text style={webDash.selectText}>
                      {SALARY_MONTH_OPTIONS.find((option) => option.value === leaveDateMonth)?.label || 'Select month'}
                    </Text>
                    <Text style={adm.selectFieldArrow}>{showLeaveMonthOptions ? '^' : 'v'}</Text>
                  </TouchableOpacity>
                  {showLeaveMonthOptions ? (
                    <View style={adm.selectOptions}>
                      {leaveMonthOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[adm.selectOption, leaveDateMonth === option.value && adm.selectOptionActive]}
                          onPress={() => {
                            setLeaveDateMonth(option.value);
                            setLeaveDateDay('');
                            setShowLeaveDayOptions(false);
                            setShowLeaveMonthOptions(false);
                          }}
                        >
                          <Text style={[adm.selectOptionText, leaveDateMonth === option.value && adm.selectOptionTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
                <View style={webDash.filterField}>
                  <Text style={webDash.filterLabel}>Day</Text>
                  {!leaveDateYear || !leaveDateMonth ? (
                    <View style={webDash.leaveCalendarEmptyState}>
                      <Text style={webDash.leaveCalendarEmptyText}>Choose the year and month to view the calendar.</Text>
                    </View>
                  ) : leaveDayOptions.length === 0 ? (
                    <View style={webDash.leaveCalendarEmptyState}>
                      <Text style={webDash.leaveCalendarEmptyText}>Only today or future dates can be selected for this month.</Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={adm.paymentSelectBox}
                        onPress={() => {
                          setShowLeaveYearOptions(false);
                          setShowLeaveMonthOptions(false);
                          setShowLeaveDayOptions((current) => !current);
                        }}
                      >
                        <Text style={webDash.selectText}>{leaveDateDay || 'Select day'}</Text>
                        <Text style={adm.selectFieldArrow}>{showLeaveDayOptions ? '^' : 'v'}</Text>
                      </TouchableOpacity>
                      {showLeaveDayOptions ? (
                        <View style={webDash.leaveCalendarCard}>
                          <View style={webDash.leaveCalendarHeader}>
                            <Text style={webDash.leaveCalendarTitle}>{leaveCalendar.monthLabel}</Text>
                            <Text style={webDash.leaveCalendarHint}>{`${leaveCalendar.availableDayCount} selectable days`}</Text>
                          </View>
                          <View style={webDash.leaveCalendarGrid}>
                            {LEAVE_CALENDAR_WEEK_SHORT.map((dayLabel) => (
                              <Text key={dayLabel} style={webDash.leaveCalendarDayLabel}>{dayLabel}</Text>
                            ))}
                            {leaveCalendar.cells.map((dayCell) => (
                              <TouchableOpacity
                                key={dayCell.key}
                                style={[
                                  webDash.leaveCalendarCell,
                                  !dayCell.day && webDash.leaveCalendarCellEmpty,
                                  dayCell.isDisabled && dayCell.day && webDash.leaveCalendarCellDisabled,
                                  dayCell.isToday && !dayCell.isDisabled && webDash.leaveCalendarCellToday,
                                  dayCell.isSelected && !dayCell.isDisabled && webDash.leaveCalendarCellSelected,
                                ]}
                                disabled={!dayCell.day || dayCell.isDisabled}
                                onPress={() => {
                                  if (!dayCell.dateKey || dayCell.isDisabled) {
                                    return;
                                  }
                                  setLeaveDateDay(String(dayCell.day).padStart(2, '0'));
                                  setShowLeaveDayOptions(false);
                                }}
                              >
                                {dayCell.day ? (
                                  <Text
                                    style={[
                                      webDash.leaveCalendarCellText,
                                      dayCell.isDisabled && webDash.leaveCalendarCellTextDisabled,
                                      dayCell.isToday && !dayCell.isDisabled && webDash.leaveCalendarCellTextToday,
                                      dayCell.isSelected && !dayCell.isDisabled && webDash.leaveCalendarCellTextSelected,
                                    ]}
                                  >
                                    {dayCell.day}
                                  </Text>
                                ) : null}
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
              <View style={webDash.selectedDateBox}>
                <Text style={webDash.selectedDateLabel}>Selected Date</Text>
                <Text style={webDash.selectedDateValue}>{selectedLeaveDateLabel}</Text>
              </View>
              <Text style={[webDash.filterLabel, { marginTop: 14 }]}>Reason</Text>
              <TextInput
                style={[webDash.formInput, webDash.textArea]}
                placeholder="Enter your leave reason"
                value={leaveReason}
                onChangeText={setLeaveReason}
                placeholderTextColor="#94a3b8"
                multiline
              />
              <TouchableOpacity
                style={[webDash.buttonGreen, { marginTop: 18 }]}
                onPress={submitLeaveRequest}
                disabled={submittingLeaveRequest}
              >
                <Text style={webDash.buttonTextLight}>{submittingLeaveRequest ? 'Submitting...' : 'Submit Request'}</Text>
              </TouchableOpacity>
            </View>

            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>My Leave Requests</Text>
              <Text style={webDash.sectionText}>Review the status of your submitted requests and the admin reply in table format.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                <View style={[webDash.table, adm.leaveCompactTable]}>
                  <View style={[webDash.tableRow, webDash.tableHeader, adm.leaveTableRow]}>
                    {['Leave Date', 'Reason', 'Status', 'Admin Reply'].map((h) => (
                      <View key={h} style={h === 'Reason' || h === 'Admin Reply' ? webDash.tableCellWide : webDash.tableCell}>
                        <Text style={webDash.tableHeadText}>{h}</Text>
                      </View>
                    ))}
                  </View>
                  {leaveRequests.length === 0 ? (
                    <View style={[webDash.tableRow, adm.leaveTableRow]}>
                      <View style={adm.leaveCompactEmptyCell}>
                        <Text style={adm.leaveEmptyText}>You have not submitted any leave requests yet.</Text>
                      </View>
                    </View>
                  ) : leaveRequests.map((item) => (
                    <View key={item._id} style={[webDash.tableRow, adm.leaveTableRow]}>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.leaveDate}</Text></View>
                      <View style={webDash.tableCellWide}><Text style={webDash.tableText}>{item.reason}</Text></View>
                      <View style={webDash.tableCell}>
                        <StatusPill
                          label={item.status}
                          tone={item.status === 'Approved' ? 'green' : item.status === 'Rejected' ? 'red' : 'yellow'}
                        />
                      </View>
                      <View style={webDash.tableCellWide}><Text style={webDash.tableText}>{item.adminReply || '-'}</Text></View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </>
        )}

        {!loading && tab === 'examResults' && (
          <>
            <WebPageTitle
              title="Exam & Results Mark Entry"
              subtitle="Click a grade to see all registered students. When an exam exists for the selected term, you can update only your own subject marks."
            />
            <View style={webDash.sectionCard}>
              <StatusPill label={`Subject: ${tutorExamEntry?.subject || user.subject || 'Not Assigned'}`} tone="blue" />
              <View style={[webDash.segmentRow, { marginTop: 18 }]}>
                {COURSE_GRADE_OPTIONS.map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    style={[webDash.segmentButton, tutorExamGrade === grade && webDash.segmentButtonActive]}
                    onPress={() => setTutorExamGrade(grade)}
                  >
                    <Text style={[webDash.segmentText, tutorExamGrade === grade && webDash.segmentTextActive]}>{grade}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={webDash.segmentRow}>
                {EXAM_TERM_OPTIONS.map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={[webDash.segmentButton, tutorExamTerm === term && webDash.segmentButtonActive]}
                    onPress={() => setTutorExamTerm(term)}
                  >
                    <Text style={[webDash.segmentText, tutorExamTerm === term && webDash.segmentTextActive]}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={webDash.filterLabel}>Select Exam</Text>
              <TouchableOpacity
                style={adm.paymentSelectBox}
                onPress={() => setShowTutorExamOptions((current) => !current)}
              >
                <Text style={webDash.selectText}>{formatExamOptionLabel(selectedTutorExam)}</Text>
                <Text style={adm.selectFieldArrow}>{showTutorExamOptions ? '^' : 'v'}</Text>
              </TouchableOpacity>
              {showTutorExamOptions ? (
                <View style={adm.selectOptions}>
                  {tutorExamOptions.length === 0 ? (
                    <Text style={adm.selectEmptyText}>No exams available for this grade and term yet.</Text>
                  ) : tutorExamOptions.map((exam) => (
                    <TouchableOpacity
                      key={exam.id}
                      style={[adm.selectOption, selectedTutorExamId === exam.id && adm.selectOptionActive]}
                      onPress={() => {
                        setSelectedTutorExamId(exam.id);
                        setShowTutorExamOptions(false);
                      }}
                    >
                      <Text style={[adm.selectOptionText, selectedTutorExamId === exam.id && adm.selectOptionTextActive]}>
                        {formatExamOptionLabel(exam)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              {!selectedTutorExam || !tutorExamEntry ? (
                <View style={webDash.emptyBox}>
                  <Text style={webDash.emptyText}>Select an exam to load the students for your subject mark entry.</Text>
                </View>
              ) : (
                <>
                  <Text style={[webDash.sectionText, { marginTop: 14 }]}>
                    {`${selectedTutorExam.grade} ${selectedTutorExam.term} â€¢ Exam Date ${formatLongAppDate(selectedTutorExam.examDate)}`}
                  </Text>
                  <View style={[webDash.table, { marginTop: 18 }]}>
                    <View style={[webDash.tableRow, webDash.tableHeader]}>
                      <View style={webDash.tableCellWide}><Text style={webDash.tableHeadText}>Student Name</Text></View>
                      <View style={webDash.tableCell}><Text style={webDash.tableHeadText}>{tutorExamEntry.subject}</Text></View>
                    </View>
                    {tutorExamEntry.rows.length === 0 ? (
                      <View style={webDash.tableRow}>
                        <View style={webDash.tableCellWide}>
                          <Text style={webDash.tableText}>No enrolled students found for this grade yet.</Text>
                        </View>
                      </View>
                    ) : tutorExamEntry.rows.map((row) => (
                      <View key={row.studentId} style={webDash.tableRow}>
                        <View style={webDash.tableCellWide}><Text style={webDash.tableText}>{row.studentName}</Text></View>
                        <View style={webDash.tableCell}>
                          <View style={webDash.examMarkCell}>
                            <TextInput
                              style={[
                                webDash.formInput,
                                { width: 120, marginTop: 0 },
                                tutorAbsentDrafts[row.studentId] && webDash.examMarkInputDisabled,
                              ]}
                              value={tutorAbsentDrafts[row.studentId] ? 'Absent' : (tutorMarkDrafts[row.studentId] ?? '')}
                              onChangeText={(value) => {
                                if (tutorAbsentDrafts[row.studentId]) {
                                  return;
                                }
                                const sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 3);
                                if (sanitizedValue && Number(sanitizedValue) > 100) {
                                  return;
                                }
                                setTutorMarkDrafts((current) => ({ ...current, [row.studentId]: sanitizedValue }));
                              }}
                              keyboardType="numeric"
                              placeholder="0 - 100"
                              placeholderTextColor="#94a3b8"
                              editable={!tutorAbsentDrafts[row.studentId]}
                            />
                            <TouchableOpacity
                              style={[
                                webDash.examAbsentChip,
                                tutorAbsentDrafts[row.studentId] && webDash.examAbsentChipActive,
                              ]}
                              onPress={() => {
                                const nextAbsent = !tutorAbsentDrafts[row.studentId];
                                setTutorAbsentDrafts((current) => ({ ...current, [row.studentId]: nextAbsent }));
                                if (nextAbsent) {
                                  setTutorMarkDrafts((current) => ({ ...current, [row.studentId]: '' }));
                                }
                              }}
                            >
                              <Text
                                style={[
                                  webDash.examAbsentChipText,
                                  tutorAbsentDrafts[row.studentId] && webDash.examAbsentChipTextActive,
                                ]}
                              >
                                Absent
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[webDash.buttonBlue, { alignSelf: 'flex-end', marginTop: 18 }]}
                    onPress={saveTutorExamMarks}
                    disabled={savingTutorExamMarks}
                  >
                    <Text style={webDash.buttonTextLight}>{savingTutorExamMarks ? 'Saving...' : 'Save Marks'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        {!loading && tab === 'mySuggestion' && (
          <>
            <WebPageTitle title="My Suggestion" subtitle="Review and manage your submitted suggestions or complaints." />
            {suggestions.length === 0 ? (
              <View style={webDash.emptyBox}><Text style={webDash.emptyText}>No submitted suggestions yet.</Text></View>
            ) : (
              <View style={webDash.table}>
                <View style={[webDash.tableRow, webDash.tableHeader]}>
                  {['Type', 'Title', 'Status', 'Reply', 'Created'].map((h) => (
                    <View key={h} style={webDash.tableCell}><Text style={webDash.tableHeadText}>{h}</Text></View>
                  ))}
                </View>
                {suggestions.map((item) => (
                  <View key={item._id} style={webDash.tableRow}>
                    <View style={webDash.tableCell}><StatusPill label={item.type} tone={item.type === 'Complaint' ? 'yellow' : 'blue'} /></View>
                    <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.title}</Text></View>
                    <View style={webDash.tableCell}><StatusPill label={item.status} tone={item.status === 'Resolved' ? 'green' : 'blue'} /></View>
                    <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.reply || '-'}</Text></View>
                    <View style={webDash.tableCell}><Text style={webDash.tableText}>{formatAppDate(item.createdAt)}</Text></View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {!loading && tab === 'newSuggestion' && (
          <>
            <WebPageTitle title="New Suggestion/Complaints" subtitle="Create a new suggestion or complaint for admin review." />
            <View style={webDash.sectionCard}>
              <Text style={webDash.filterLabel}>Type</Text>
              <View style={webDash.segmentRow}>
                {['Suggestion', 'Complaint'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[webDash.segmentButton, suggestionType === type && webDash.segmentButtonActive]}
                    onPress={() => setSuggestionType(type)}
                  >
                    <Text style={[webDash.segmentText, suggestionType === type && webDash.segmentTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[webDash.filterLabel, { marginTop: 14 }]}>Title</Text>
              <TextInput
                style={webDash.formInput}
                placeholder="Enter title"
                value={suggestionTitle}
                onChangeText={setSuggestionTitle}
                placeholderTextColor="#94a3b8"
              />
              <Text style={[webDash.filterLabel, { marginTop: 14 }]}>Message</Text>
              <TextInput
                style={[webDash.formInput, webDash.textArea]}
                placeholder="Write your suggestion or complaint"
                value={suggestionMessage}
                onChangeText={setSuggestionMessage}
                placeholderTextColor="#94a3b8"
                multiline
              />
              <TouchableOpacity
                style={[webDash.buttonBlue, { marginTop: 18 }]}
                onPress={submitTutorSuggestion}
                disabled={submittingSuggestion}
              >
                <Text style={webDash.buttonTextLight}>{submittingSuggestion ? 'Submitting...' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </WebDashboardShell>
  );
};

const tut = StyleSheet.create({
  header: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRole: { color: '#bae6fd', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  logoutBtn: { backgroundColor: '#0284c7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  logoutText: { color: '#e0f2fe', fontWeight: '700', fontSize: 13 },
  emailBar: { backgroundColor: '#0284c7', paddingHorizontal: 20, paddingVertical: 8 },
  emailText: { color: '#bae6fd', fontSize: 12 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, backgroundColor: '#f0f9ff' },
  tabBtnActive: { backgroundColor: '#0ea5e9' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#0284c7' },
  tabTextActive: { color: '#fff' },
  scroll: { padding: 14, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  profileCardDark: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  profileTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
  },
  profileAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#bae6fd',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  profileAvatarText: { color: '#0369a1', fontSize: 24, fontWeight: '900' },
  profileRole: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  profileInfoBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 12,
    marginBottom: 12,
  },
  profileInfoBoxDark: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
  },
  profileInfoLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  profileInfoValue: { color: '#0f172a', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  profileInfoLabelDark: { color: '#94a3b8' },
  profileInfoValueDark: { color: '#f8fafc' },
  courseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f9ff', gap: 10 },
  courseIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  courseName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  courseHall: { fontSize: 12, color: '#0284c7', marginTop: 3, fontWeight: '600' },
  courseSub: { fontSize: 12, color: '#64748b' },
  courseFee: { fontSize: 14, fontWeight: '800', color: '#0ea5e9', textAlign: 'right' },
  studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f9ff', gap: 10 },
  studentAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#bae6fd', alignItems: 'center', justifyContent: 'center' },
  studentAvatarText: { color: '#0284c7', fontWeight: '800', fontSize: 17 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  studentEmail: { fontSize: 12, color: '#64748b' },
  enrollRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f9ff', gap: 10 },
  enrollIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center' },
  enrollName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  enrollSub: { fontSize: 12, color: '#64748b' },
  statusChip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  chipGreen: { backgroundColor: '#dcfce7' },
  chipBlue: { backgroundColor: '#dbeafe' },
  chipRed: { backgroundColor: '#fee2e2' },
  chipGray: { backgroundColor: '#f1f5f9' },
  chipText: { fontSize: 10, fontWeight: '700', color: '#0f172a' },
  ttRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f9ff' },
  ttDayBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#bae6fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ttDayText: { color: '#0369a1', fontWeight: '800', fontSize: 12 },
  ttMeta: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  input: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  profileInputDark: {
    backgroundColor: '#111c34',
    borderColor: '#334155',
    color: '#e2e8f0',
  },
  addBtn: { backgroundColor: '#0ea5e9', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.7 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 12, fontSize: 13 },
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const notificationModal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '82%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dbe4f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 4, fontSize: 13, color: '#64748b', fontWeight: '700' },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
  },
  closeButtonText: { color: '#1d4ed8', fontWeight: '800', fontSize: 12 },
  scrollArea: { flexGrow: 0 },
  scrollContent: { gap: 12, paddingBottom: 8 },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
    paddingHorizontal: 18,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  emptyDetail: { marginTop: 8, fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  itemCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe4f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', lineHeight: 21 },
  itemDetail: { marginTop: 6, fontSize: 13, color: '#475569', lineHeight: 20 },
  markButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
  },
  markButtonText: { color: '#1d4ed8', fontSize: 12, fontWeight: '900' },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  secondaryActionText: { color: '#334155', fontSize: 12, fontWeight: '900' },
  primaryAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
  },
  primaryActionText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});

const STUDENT_WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STUDENT_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STUDENT_RESULT_TERMS = ['Term 1', 'Term 2', 'Term 3'];
const STUDENT_RESULT_SUBJECTS = ['Tamil', 'Maths', 'Science', 'Religion', 'English', 'Civics'];
const STUDENT_TIME_SLOTS = TIMETABLE_TIME_SLOTS.map((slot) => ({
  key: `${slot.start}-${slot.end}`,
  start: slot.start,
  end: slot.end,
  label: `${formatTimetableTime(slot.start)} - ${formatTimetableTime(slot.end)}`,
}));

const buildStudentCalendar = (date) => {
  const baseDate = date || new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstWeekDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstWeekDay; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return {
    monthLabel: baseDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    today: baseDate.getDate(),
    cells,
  };
};

const StudentPageTitle = ({ title, subtitle }) => (
  <View style={studentDash.pageTitleWrap}>
    <Text style={studentDash.pageTitle}>{title}</Text>
    <Text style={studentDash.pageSubtitle}>{subtitle}</Text>
  </View>
);

const StudentMetricCard = ({ label, value, detail }) => (
  <View style={studentDash.metricCard}>
    <Text style={studentDash.metricLabel}>{label}</Text>
    <Text style={studentDash.metricValue}>{value}</Text>
    {detail ? <Text style={studentDash.metricDetail}>{detail}</Text> : null}
  </View>
);

const StudentDashboardShell = ({
  user,
  activeTab,
  onTabChange,
  menuItems,
  onLogout,
  onOpenProfile,
  isDesktop,
  notifications = [],
  children,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [readNotificationKeys, setReadNotificationKeys] = useState([]);
  const activeNotificationKeys = notifications.map((item, index) => getNotificationKey(item, index));
  const unreadNotifications = notifications.filter((item, index) => !readNotificationKeys.includes(getNotificationKey(item, index)));

  useEffect(() => {
    setReadNotificationKeys((previousKeys) => previousKeys.filter((key) => activeNotificationKeys.includes(key)));
  }, [activeNotificationKeys.join('|')]);

  const markNotificationAsRead = (notification, index) => {
    const notificationKey = getNotificationKey(notification, index);
    setReadNotificationKeys((previousKeys) => (
      previousKeys.includes(notificationKey) ? previousKeys : [...previousKeys, notificationKey]
    ));
  };

  const markAllNotificationsAsRead = () => {
    setReadNotificationKeys(activeNotificationKeys);
  };

  return (
    <SafeAreaView style={studentShell.page}>
      <View style={[studentShell.header, { paddingTop: 12 + ANDROID_TOP_INSET }]}>
        <View style={studentShell.headerLeft}>
          <TouchableOpacity style={studentShell.menuToggle} onPress={() => setDrawerOpen(true)}>
            <Text style={studentShell.menuToggleText}>|||</Text>
          </TouchableOpacity>
          <View style={studentShell.titleBlock}>
            <Text style={studentShell.pageTitle}>Welcome, Student!</Text>
            <Text style={studentShell.brandName}>{BRAND_NAME}</Text>
          </View>
        </View>

        <View style={studentShell.headerRight}>
          <TouchableOpacity
            style={studentShell.notificationButton}
            onPress={() => setNotificationOpen(true)}
          >
            <MaterialIcons name="notifications-none" size={20} color="#1f2937" />
            {unreadNotifications.length > 0 ? (
              <View style={studentShell.notificationBadge}>
                <Text style={studentShell.notificationBadgeText}>{unreadNotifications.length > 9 ? '9+' : String(unreadNotifications.length)}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity style={studentShell.profileButton} onPress={onOpenProfile}>
            <View style={studentShell.profileGlyph}>
              <View style={studentShell.profileGlyphHead} />
              <View style={studentShell.profileGlyphBody} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={studentShell.logoutButton} onPress={onLogout}>
            <Text style={studentShell.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <DashboardDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        menuItems={menuItems}
        activeTab={activeTab}
        onSelect={onTabChange}
        userName={user?.name}
        theme={{
          overlayColor: 'rgba(12, 23, 43, 0.5)',
          panelColor: '#0f172a',
          borderColor: '#1e293b',
          eyebrowColor: '#94a3b8',
          titleColor: '#f8fafc',
          closeButtonColor: '#1e293b',
          closeButtonTextColor: '#f8fafc',
          sectionTitleColor: '#94a3b8',
          itemColor: '#111c34',
          activeItemColor: '#2f60d3',
          itemTextColor: '#e2e8f0',
          activeItemTextColor: '#ffffff',
          disabledTextColor: '#94a3b8',
          iconBackgroundColor: '#172554',
          iconBorderColor: '#1d4ed8',
          activeIconBackgroundColor: '#ffffff',
          activeIconBorderColor: '#e0eaff',
          iconTextColor: '#bfdbfe',
          activeIconTextColor: '#2f60d3',
          badgeColor: '#ef4444',
          activeBadgeColor: '#ffffff',
          badgeTextColor: '#ffffff',
          activeBadgeTextColor: '#2f60d3',
          disabledBadgeColor: '#cbd5e1',
          footerButtonColor: '#ef3b36',
          footerButtonTextColor: '#ffffff',
        }}
      />

      <NotificationCenterModal
        visible={notificationOpen}
        title="Student Notifications"
        notifications={unreadNotifications}
        onClose={() => setNotificationOpen(false)}
        onMarkAsRead={markNotificationAsRead}
        onMarkAllAsRead={markAllNotificationsAsRead}
      />

      <View style={[studentShell.body, isDesktop ? studentShell.bodyDesktop : studentShell.bodyMobile]}>
        <View style={studentShell.contentArea}>
          <ScrollView contentContainerStyle={studentShell.contentScroll} showsVerticalScrollIndicator={false}>
            <View style={studentShell.contentCard}>{children}</View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const StudentDashboard = ({ token, user, onUserUpdated, onLogout }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isWide = width >= 760;
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [liveNow, setLiveNow] = useState(new Date());
  const [profileName, setProfileName] = useState(user.name || '');
  const [profileEmail, setProfileEmail] = useState(user.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [studentExamResults, setStudentExamResults] = useState(null);
  const [attendanceData, setAttendanceData] = useState({
    records: [],
    summary: {
      totalClasses: 0,
      presentClasses: 0,
      absentClasses: 0,
      attendancePercentage: 0,
    },
  });
  const [selectedAttendanceMonthKey, setSelectedAttendanceMonthKey] = useState(buildPaymentMonthKey(new Date()));
  const [selectedAttendanceDateKey, setSelectedAttendanceDateKey] = useState('');
  const [suggestionType, setSuggestionType] = useState('Suggestion');
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [submittingPaymentMonthKey, setSubmittingPaymentMonthKey] = useState('');
  const suggestionWordCount = countWords(suggestionText);
  const isSuggestionOverLimit = suggestionWordCount > SUGGESTION_MESSAGE_WORD_LIMIT;

  const loadData = async () => {
    setLoading(true);
    try {
      const [cData, eData, tData, paymentData, suggestionData, attendanceResponse] = await Promise.all([
        request('/api/courses?status=active', { token }),
        request('/api/enrollments', { token }),
        request('/api/timetable', { token }),
        request('/api/payments', { token }),
        request('/api/suggestions?mine=true', { token }),
        request('/api/attendance/student/me', { token }),
      ]);
      setCourses(Array.isArray(cData.courses) ? cData.courses : []);
      setEnrollments(Array.isArray(eData.enrollments) ? eData.enrollments : []);
      setTimetable(Array.isArray(tData.timetable) ? tData.timetable : []);
      setPayments(Array.isArray(paymentData.payments) ? paymentData.payments : []);
      setSuggestions(Array.isArray(suggestionData.suggestions) ? suggestionData.suggestions : []);
      setAttendanceData({
        records: Array.isArray(attendanceResponse.records) ? attendanceResponse.records : [],
        summary: attendanceResponse.summary || {
          totalClasses: 0,
          presentClasses: 0,
          absentClasses: 0,
          attendancePercentage: 0,
        },
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
    const needsLiveClock = tab === 'attendance' || tab === 'timetable';
    if (!needsLiveClock) {
      return undefined;
    }

    setLiveNow(new Date());
    const timer = setInterval(() => {
      setLiveNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [tab]);
  useEffect(() => {
    if (!token || tab !== 'results') return;

    const loadStudentExamResults = async () => {
      try {
        const resultData = await request(
          `/api/exams/student/me?term=${encodeURIComponent(selectedTerm)}&academicYear=${new Date().getFullYear()}`,
          { token }
        );
        setStudentExamResults(resultData);
      } catch (e) {
        Alert.alert('Error', e.message);
      }
    };

    loadStudentExamResults();
  }, [token, selectedTerm, tab]);

  useEffect(() => {
    setProfileName(user.name || '');
    setProfileEmail(user.email || '');
  }, [user.name, user.email]);

  const currentDayName = STUDENT_WEEK_DAYS[liveNow.getDay()];
  const currentMonthLabel = liveNow.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const currentDateLabel = liveNow.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const lastUpdated = formatLiveClockTime(liveNow);
  const todayDateKey = formatAppDate(liveNow);
  const courseList = Array.isArray(courses) ? courses.filter(Boolean) : [];
  const enrollmentList = Array.isArray(enrollments) ? enrollments.filter(Boolean) : [];
  const activeEnrollmentList = enrollmentList.filter((item) => item.status === 'enrolled');
  const timetableEntries = Array.isArray(timetable) ? timetable.filter(Boolean) : [];
  const paymentList = Array.isArray(payments) ? payments.filter(Boolean) : [];
  const suggestionList = Array.isArray(suggestions) ? suggestions.filter(Boolean) : [];
  const attendanceRecords = Array.isArray(attendanceData?.records) ? attendanceData.records.filter(Boolean) : [];
  const assignedGrade =
    user.grade ||
    activeEnrollmentList.find((item) => item.course?.grade)?.course?.grade ||
    enrollmentList.find((item) => item.course?.grade)?.course?.grade ||
    '';
  const currentGrade =
    assignedGrade ||
    courseList.find((course) => course.grade)?.grade ||
    'Grade 7';
  const filteredTimetable = currentGrade
    ? timetableEntries.filter((entry) => getTimetableEntryGrade(entry, courseList) === currentGrade)
    : timetableEntries;
  const timetableStatus = filteredTimetable.length > 0 ? 'Auto-updating' : 'Waiting for entries';
  const timetableSubjects = [
    ...new Set(
      filteredTimetable
        .map((entry) => entry.subject || entry.title)
        .filter(Boolean)
    ),
  ];
  const resultSubjects = Array.isArray(studentExamResults?.subjects) ? studentExamResults.subjects.filter(Boolean) : [];
  const todayClasses = filteredTimetable
    .filter((entry) => entry.dayOfWeek === currentDayName)
    .sort((firstEntry, secondEntry) => compareTimes(firstEntry.startTime, secondEntry.startTime));
  const currentTimeMinutes = (liveNow.getHours() * 60) + liveNow.getMinutes();
  const remainingTodayClasses = todayClasses
    .filter((entry) => timeStringToMinutes(entry.endTime) >= currentTimeMinutes);
  const nextClassToday = todayClasses.find((entry) => timeStringToMinutes(entry.endTime) >= currentTimeMinutes) || null;
  const currentMonthKey = buildPaymentMonthKey(liveNow);
  const currentMonthPaymentAmount = calculateStudentMonthlyFee(currentGrade, enrollmentList);
  const currentMonthDraftPayment = currentMonthPaymentAmount > 0 ? {
    id: `draft-${currentMonthKey}`,
    monthKey: currentMonthKey,
    monthLabel: buildPaymentMonthLabel(currentMonthKey),
    amount: currentMonthPaymentAmount,
    grade: currentGrade,
    status: 'Pending',
    receipt: { fileName: '', mimeType: '', dataUrl: '' },
    createdAt: null,
    isDraft: true,
  } : null;
  const mergedPayments = [...paymentList];
  if (currentMonthDraftPayment && !mergedPayments.some((payment) => payment.monthKey === currentMonthKey)) {
    mergedPayments.unshift(currentMonthDraftPayment);
  }
  const paymentRows = mergedPayments
    .sort((firstPayment, secondPayment) => String(secondPayment.monthKey || '').localeCompare(String(firstPayment.monthKey || '')))
    .map((payment, index) => ({
      id: payment.id || `payment-row-${index}`,
      monthKey: payment.monthKey,
      monthLabel: payment.monthLabel || buildPaymentMonthLabel(payment.monthKey),
      amount: Number(payment.amount) || 0,
      status: payment.status || 'Pending',
      receipt: payment.receipt || { fileName: '', mimeType: '', dataUrl: '' },
      createdAt: payment.createdAt || null,
      grade: payment.grade || currentGrade,
      isDraft: Boolean(payment.isDraft),
    }));
  const totalPaidAmount = paymentRows
    .filter((row) => row.status === 'Paid')
    .reduce((sum, row) => sum + row.amount, 0);
  const pendingPaymentAmount = paymentRows
    .filter((row) => row.status === 'Pending')
    .reduce((sum, row) => sum + row.amount, 0);
  const uploadedReceiptCount = paymentRows.filter((row) => row.receipt?.dataUrl).length;
  const pendingPaymentsCount = paymentRows.filter((row) => row.status === 'Pending').length;
  const openStudentSuggestions = suggestionList.filter((item) => item.status === 'Open' || item.status === 'In Review');
  const attendanceYear = liveNow.getFullYear();
  const attendanceMonthOptions = SALARY_MONTH_OPTIONS.map((option) => ({
    ...option,
    monthKey: `${attendanceYear}-${option.value}`,
    label: `${option.label} ${attendanceYear}`,
  }));
  const selectedAttendanceMonthDate = buildMonthDateFromKey(selectedAttendanceMonthKey);
  const selectedMonthAttendanceRecords = attendanceRecords.filter((record) => record.monthKey === selectedAttendanceMonthKey);
  useEffect(() => {
    const selectedMonthDates = [...new Set(
      selectedMonthAttendanceRecords
        .map((record) => String(record.attendanceDate || '').trim())
        .filter(Boolean)
    )]
      .filter((dateKey) => dateKey <= todayDateKey)
      .sort();
    const isCurrentSelectionInsideMonth = String(selectedAttendanceDateKey || '').startsWith(`${selectedAttendanceMonthKey}-`);
    const isCurrentSelectionAllowed = isCurrentSelectionInsideMonth && selectedAttendanceDateKey <= todayDateKey;

    if (isCurrentSelectionAllowed) {
      return;
    }

    if (selectedAttendanceMonthKey > currentMonthKey) {
      setSelectedAttendanceDateKey('');
      return;
    }

    if (selectedAttendanceMonthKey === currentMonthKey) {
      setSelectedAttendanceDateKey(todayDateKey);
      return;
    }

    setSelectedAttendanceDateKey(selectedMonthDates[0] || '');
  }, [
    currentMonthKey,
    selectedAttendanceDateKey,
    selectedAttendanceMonthKey,
    selectedMonthAttendanceRecords,
    todayDateKey,
  ]);
  const attendanceDaySummaryMap = selectedMonthAttendanceRecords.reduce((summaryMap, record) => {
    const currentSummary = summaryMap.get(record.attendanceDate) || { present: 0, absent: 0 };
    if (record.status === 'Absent') {
      currentSummary.absent += 1;
    } else {
      currentSummary.present += 1;
    }
    summaryMap.set(record.attendanceDate, currentSummary);
    return summaryMap;
  }, new Map());
  const attendanceStats = {
    percentage: selectedMonthAttendanceRecords.length > 0
      ? Math.round((selectedMonthAttendanceRecords.filter((record) => record.status === 'Present').length / selectedMonthAttendanceRecords.length) * 100)
      : 0,
    workingDays: attendanceDaySummaryMap.size,
    present: selectedMonthAttendanceRecords.filter((record) => record.status === 'Present').length,
    absent: selectedMonthAttendanceRecords.filter((record) => record.status === 'Absent').length,
    presentDays: Array.from(attendanceDaySummaryMap.values()).filter((daySummary) => daySummary.present > 0).length,
    absentDays: Array.from(attendanceDaySummaryMap.values()).filter((daySummary) => daySummary.absent > 0).length,
  };
  const studentNotifications = [
    remainingTodayClasses.length > 0 ? {
      id: 'student-remaining-classes',
      title: `${remainingTodayClasses.length} class${remainingTodayClasses.length > 1 ? 'es are' : ' is'} remaining today`,
      detail: nextClassToday
        ? `Next class: ${formatTimetableEntryTitle(nextClassToday, courseList)} at ${formatTimetableTime(nextClassToday.startTime)}.`
        : 'Check Today\'s Classes for the remaining timetable.',
    } : null,
    pendingPaymentsCount > 0 ? {
      id: 'student-pending-payments',
      title: `${pendingPaymentsCount} payment${pendingPaymentsCount > 1 ? 's are' : ' is'} pending`,
      detail: `Pending amount: ${formatLkr(pendingPaymentAmount)}.`,
    } : null,
    openStudentSuggestions.length > 0 ? {
      id: 'student-open-suggestions',
      title: `${openStudentSuggestions.length} suggestion${openStudentSuggestions.length > 1 ? 's are' : ' is'} still open`,
      detail: 'Your submitted suggestions are still awaiting closure or review.',
    } : null,
    attendanceStats.absent > 0 ? {
      id: 'student-absences',
      title: `${attendanceStats.absent} absence${attendanceStats.absent > 1 ? 's were' : ' was'} recorded`,
      detail: 'Attendance Overview has recent absent records for the selected month.',
    } : null,
  ].filter(Boolean);
  const attendanceCalendar = buildAttendanceCalendar({
    monthDate: selectedAttendanceMonthDate,
    records: selectedMonthAttendanceRecords,
    todayDateKey,
  });
  const selectedAttendanceDateRecords = selectedMonthAttendanceRecords
    .filter((record) => record.attendanceDate === selectedAttendanceDateKey)
    .sort((firstRecord, secondRecord) => compareTimes(firstRecord.startTime, secondRecord.startTime));
  const selectedAttendanceDateLabel = selectedAttendanceDateKey
    ? formatLongAppDate(selectedAttendanceDateKey)
    : 'Select a date to view class attendance';
  const attendanceSummaryCards = [
    { label: 'Total Present', value: String(attendanceStats.present), detail: 'Classes marked present' },
    { label: 'Total Absent', value: String(attendanceStats.absent), detail: 'Classes missed' },
    { label: 'Attendance %', value: `${attendanceStats.percentage}%`, detail: `${selectedMonthAttendanceRecords.length} tracked classes` },
  ];
  const metricCards = [
    { label: 'Total Enrolled Classes', value: String(enrollmentList.length) },
    { label: 'Attendance Percentage', value: `${attendanceStats.percentage}%` },
    { label: 'Pending Payments Count', value: String(pendingPaymentsCount) },
    { label: 'Upcoming Exams Count', value: '2' },
  ];
  const activeTimetableSlotKey = STUDENT_TIME_SLOTS.find((slot) => (
    timeStringToMinutes(slot.start) <= currentTimeMinutes && timeStringToMinutes(slot.end) > currentTimeMinutes
  ))?.key || '';
  const timetableRows = STUDENT_TIME_SLOTS.map((slot) => {
    const { start: startTime, end: endTime, label } = slot;
    return {
      slot: label,
      key: slot.key,
      startTime,
      endTime,
      cells: TIMETABLE_DAYS.map((day) => {
        const entry = filteredTimetable.find(
          (item) => item.dayOfWeek === day && item.startTime === startTime && item.endTime === endTime
        );
        return { day, entry };
      }),
    };
  });
  const studentExamAverage = studentExamResults?.average || 0;
  const studentExamTotal = studentExamResults?.total || 0;
  const studentExamRank = studentExamResults?.rank || 0;
  const studentExamTotalStudents = studentExamResults?.totalStudents || 0;

  const submitSuggestion = async () => {
    if (!suggestionText.trim()) {
      Alert.alert('Missing details', 'Please enter your suggestion or complaint first.');
      return;
    }

    if (isSuggestionOverLimit) {
      Alert.alert('Message too long', `Please keep your message within ${SUGGESTION_MESSAGE_WORD_LIMIT} words.`);
      return;
    }

    setSubmittingSuggestion(true);
    try {
      const data = await request('/api/suggestions', {
        method: 'POST',
        token,
        body: {
          type: suggestionType,
          message: suggestionText.trim(),
        },
      });
      setSuggestions((current) => [data.suggestion, ...(Array.isArray(current) ? current : [])]);
      setSuggestionText('');
      setTab('mySuggestion');
      Alert.alert('Submitted', 'Your message has been saved in My Suggestion.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  const submitStudentPayment = async (paymentRow) => {
    const monthKey = String(paymentRow?.monthKey || '').trim();
    if (!monthKey) {
      Alert.alert('Missing Month', 'A payment month is required.');
      return;
    }

    let receiptFile = null;
    try {
      receiptFile = await pickWebReceiptFile();
    } catch (error) {
      Alert.alert('Upload Unavailable', error.message);
      return;
    }

    if (!receiptFile) return;

    setSubmittingPaymentMonthKey(monthKey);
    try {
      await request('/api/payments/submit', {
        method: 'POST',
        token,
        body: {
          monthKey,
          amount: paymentRow.amount,
          grade: paymentRow.grade || currentGrade,
          receipt: receiptFile,
        },
      });
      await loadData();
      Alert.alert('Submitted', 'Payment receipt submitted successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingPaymentMonthKey('');
    }
  };

  const viewStudentReceipt = (paymentRow) => {
    try {
      openReceiptFile(paymentRow?.receipt);
    } catch (error) {
      Alert.alert('No Receipt', error.message);
    }
  };

  const updateStudentProfile = async () => {
    const name = profileName.trim();
    const email = profileEmail.trim();

    if (!name || !email) {
      Alert.alert('Missing Fields', 'Name and email are required.');
      return;
    }

    setProfileSaving(true);
    try {
      const data = await request('/api/auth/profile', {
        method: 'PUT',
        token,
        body: { name, email },
      });
      onUserUpdated(data.user);
      setProfileName(data.user.name || '');
      setProfileEmail(data.user.email || '');
      showPopupMessage('Updated', data.message || 'Student profile updated successfully.');
    } catch (e) {
      showPopupMessage('Error', e.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const studentMenuItems = [
    { key: 'overview', label: 'Overview', section: 'Overview', icon: 'dashboard' },
    { key: 'timetable', label: 'Timetable', section: 'Study', icon: 'calendar-month' },
    { key: 'fee', label: 'Fee & Payment', section: 'Study', icon: 'receipt-long' },
    { key: 'attendance', label: 'Attendance', section: 'Study', icon: 'fact-check' },
    { key: 'results', label: 'Exam & Results', section: 'Study', icon: 'emoji-events' },
    { key: 'mySuggestion', label: 'My Suggestion', section: 'Suggestions', icon: 'lightbulb' },
    { key: 'newSuggestion', label: 'New Suggestion/Complaints', section: 'Suggestions', icon: 'edit-note' },
    { key: 'profile', label: 'Student Profile', section: 'Account', icon: 'person' },
  ];

  return (
    <StudentDashboardShell
      user={user}
      activeTab={tab}
      onTabChange={setTab}
      menuItems={studentMenuItems}
      onLogout={onLogout}
      onOpenProfile={() => setTab('profile')}
      isDesktop={isDesktop}
      notifications={studentNotifications}
    >
      {loading ? (
        <View style={studentDash.loadingWrap}>
          <ActivityIndicator color="#2f60d3" size="large" />
          <Text style={studentDash.loadingText}>Loading student dashboard...</Text>
        </View>
      ) : null}

      {!loading && tab === 'overview' && (
        <>
          <StudentPageTitle
            title="Overview"
            subtitle="Review your classes, attendance, payments, exams, and important updates in one place."
          />

          <View style={[studentDash.metricGrid, isWide && studentDash.metricGridWide]}>
            {metricCards.map((card) => (
              <View key={card.label} style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemWide]}>
                <StudentMetricCard label={card.label} value={card.value} />
              </View>
            ))}
          </View>

          <View style={[studentDash.splitGrid, isWide && studentDash.splitGridWide]}>
            <View style={[studentDash.panel, isWide && studentDash.splitPanel]}>
              <Text style={studentDash.panelTitle}>Today's Classes</Text>
              <View style={studentDash.placeholderCard}>
                {remainingTodayClasses.length === 0 ? (
                  <Text style={studentDash.placeholderText}>No classes scheduled for today.</Text>
                ) : (
                  remainingTodayClasses.map((entry) => (
                    <View key={entry._id} style={studentDash.classRow}>
                      <Text style={studentDash.classTitle}>{formatTimetableEntryTitle(entry, courseList)}</Text>
                      <Text style={studentDash.classMeta}>{entry.startTime} - {entry.endTime}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={[studentDash.panel, isWide && studentDash.splitPanel]}>
              <Text style={studentDash.panelTitle}>Latest Announcements</Text>
              <View style={studentDash.placeholderCard}>
                <Text style={studentDash.placeholderText}>No announcements available.</Text>
              </View>
            </View>
          </View>
        </>
        )}

      {!loading && tab === 'fee' && (
        <>
          <StudentPageTitle
            title="Fee & Payment"
            subtitle="Review your monthly fee amount, upload payment receipt, and track payment status."
          />

          <View style={[studentDash.metricGrid, isWide && studentDash.metricGridWide]}>
            <View style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemHalf]}>
              <StudentMetricCard label="Total Paid" value={formatLkr(totalPaidAmount)} detail={`${paymentRows.filter((row) => row.status === 'Paid').length} Months`} />
            </View>
            <View style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemHalf]}>
              <StudentMetricCard label="Pending Amount" value={formatLkr(pendingPaymentAmount)} detail={`${pendingPaymentsCount} Months`} />
            </View>
            <View style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemHalf]}>
              <StudentMetricCard label="Receipts Uploaded" value={String(uploadedReceiptCount)} detail="This Year" />
            </View>
          </View>

          <View style={studentDash.panel}>
            <Text style={studentDash.panelTitle}>Monthly Receipts</Text>
            {paymentRows.length === 0 ? (
              <View style={studentDash.placeholderCard}>
                <Text style={studentDash.placeholderText}>No payment records available yet.</Text>
              </View>
            ) : (
              paymentRows.map((row) => {
                const isSubmitting = submittingPaymentMonthKey === row.monthKey;
                const hasReceipt = Boolean(row.receipt?.dataUrl);

                return (
                  <View key={row.id} style={studentDash.receiptCard}>
                    <View style={studentDash.receiptDateBadge}>
                      <Text style={studentDash.receiptDateMonth}>{String(row.monthLabel).split(' ')[0].slice(0, 3).toUpperCase()}</Text>
                      <Text style={studentDash.receiptDateYear}>{String(row.monthLabel).split(' ')[1] || ''}</Text>
                    </View>

                    <View style={studentDash.receiptMain}>
                      <Text style={studentDash.receiptMonthTitle}>{row.monthLabel}</Text>
                      <Text style={studentDash.receiptAmount}>Amount: {formatLkr(row.amount)}</Text>
                      <View style={studentDash.receiptStatusRow}>
                        <StatusPill label={row.status} tone={getPaymentStatusTone(row.status)} />
                      </View>
                    </View>

                    <View style={studentDash.receiptActions}>
                      <TouchableOpacity
                        style={studentDash.receiptButton}
                        onPress={() => submitStudentPayment(row)}
                        disabled={isSubmitting}
                      >
                        <Text style={studentDash.receiptButtonText}>{isSubmitting ? 'Submitting...' : (hasReceipt ? 'Update Receipt' : 'Upload Receipt')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => viewStudentReceipt(row)} disabled={!hasReceipt}>
                        <Text style={[studentDash.receiptLink, !hasReceipt && studentDash.receiptLinkDisabled]}>
                          {hasReceipt ? 'View Uploaded Receipt' : 'No Receipt Yet'}
                        </Text>
                      </TouchableOpacity>
                      {hasReceipt && row.receipt?.fileName ? (
                        <Text style={studentDash.receiptHelper}>{row.receipt.fileName}</Text>
                      ) : null}
                      {row.isDraft ? (
                        <Text style={studentDash.receiptHelper}>This month is ready for payment submission.</Text>
                      ) : row.createdAt ? (
                        <Text style={studentDash.receiptHelper}>Submitted on {formatAppDate(row.createdAt)}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </>
        )}

      {!loading && tab === 'attendance' && (
        <>
          <StudentPageTitle
            title="Attendance"
            subtitle="Review your class attendance summary and full attendance history."
          />

          <View style={[studentDash.metricGrid, isWide && studentDash.metricGridWide]}>
            {attendanceSummaryCards.map((card) => (
              <View key={card.label} style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemWide]}>
                <StudentMetricCard label={card.label} value={card.value} detail={card.detail} />
              </View>
            ))}
          </View>

          <View style={[studentDash.splitGrid, isWide && studentDash.splitGridWide]}>
            <View style={[studentDash.attendanceColumn, isWide && studentDash.attendanceColumnWide]}>
              <View style={studentDash.panel}>
                <Text style={studentDash.panelTitle}>Attendance Overview</Text>
                <Text style={studentDash.panelSubtitle}>Track your current attendance trend with live date and class details.</Text>

                <View style={studentDash.attendanceLiveCard}>
                  <Text style={studentDash.attendanceLiveLabel}>{currentDateLabel}</Text>
                  <Text style={studentDash.attendanceLiveTime}>{formatLiveClockTime(liveNow)}</Text>
                  <Text style={studentDash.attendanceLiveSub}>Current local time</Text>
                </View>

                <View style={studentDash.attendanceOverviewGrid}>
                  <View style={studentDash.attendanceOverviewItem}>
                    <Text style={studentDash.attendanceOverviewLabel}>Present Days</Text>
                    <Text style={studentDash.attendanceOverviewValue}>{attendanceStats.presentDays}</Text>
                  </View>
                  <View style={studentDash.attendanceOverviewItem}>
                    <Text style={studentDash.attendanceOverviewLabel}>Absent Days</Text>
                    <Text style={studentDash.attendanceOverviewValue}>{attendanceStats.absentDays}</Text>
                  </View>
                  <View style={studentDash.attendanceOverviewItem}>
                    <Text style={studentDash.attendanceOverviewLabel}>Tracked Days</Text>
                    <Text style={studentDash.attendanceOverviewValue}>{attendanceStats.workingDays}</Text>
                  </View>
                  <View style={studentDash.attendanceOverviewItem}>
                    <Text style={studentDash.attendanceOverviewLabel}>Current Goal</Text>
                    <Text style={studentDash.attendanceOverviewValue}>90%</Text>
                  </View>
                </View>

                <View style={studentDash.attendanceNextClassCard}>
                  <Text style={studentDash.attendanceOverviewLabel}>Next Timetable Class</Text>
                  <Text style={studentDash.attendanceNextClassTitle}>
                    {nextClassToday
                      ? `${formatTimetableEntryTitle(nextClassToday, courseList)}`
                      : 'No more classes scheduled for today'}
                  </Text>
                  <Text style={studentDash.attendanceNextClassMeta}>
                    {nextClassToday
                      ? `${formatTimetableTime(nextClassToday.startTime)} - ${formatTimetableTime(nextClassToday.endTime)} • ${nextClassToday.room || 'Room not set'}`
                      : `Today: ${currentDayName}`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[studentDash.attendanceColumn, isWide && studentDash.attendanceColumnWide]}>
              <View style={studentDash.panel}>
                <View style={studentDash.calendarTop}>
                  <Text style={studentDash.calendarTitle}>{`${attendanceYear} Attendance Calendar`}</Text>
                  <Text style={studentDash.panelSubtitle}>Current month opens automatically. Choose any month in this year.</Text>
                </View>

                <View style={studentDash.monthSelectorGrid}>
                  {attendanceMonthOptions.map((option) => (
                    <TouchableOpacity
                      key={option.monthKey}
                      style={[
                        studentDash.monthSelectorChip,
                        selectedAttendanceMonthKey === option.monthKey && studentDash.monthSelectorChipActive,
                      ]}
                      onPress={() => setSelectedAttendanceMonthKey(option.monthKey)}
                    >
                      <Text
                        style={[
                          studentDash.monthSelectorChipText,
                          selectedAttendanceMonthKey === option.monthKey && studentDash.monthSelectorChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={studentDash.calendarLegendRow}>
                  <View style={studentDash.calendarLegendItem}>
                    <View style={[studentDash.calendarLegendDot, studentDash.calendarLegendPresent]} />
                    <Text style={studentDash.calendarLegendText}>Present</Text>
                  </View>
                  <View style={studentDash.calendarLegendItem}>
                    <View style={[studentDash.calendarLegendDot, studentDash.calendarLegendAbsent]} />
                    <Text style={studentDash.calendarLegendText}>Absent</Text>
                  </View>
                  <View style={studentDash.calendarLegendItem}>
                    <View style={[studentDash.calendarLegendDot, studentDash.calendarLegendMixed]} />
                    <Text style={studentDash.calendarLegendText}>Mixed</Text>
                  </View>
                  <View style={studentDash.calendarLegendItem}>
                    <View style={[studentDash.calendarLegendDot, studentDash.calendarLegendToday]} />
                    <Text style={studentDash.calendarLegendText}>Today</Text>
                  </View>
                </View>

                <View style={studentDash.calendarGrid}>
                  {STUDENT_WEEK_SHORT.map((day) => (
                    <Text key={day} style={studentDash.calendarDayLabel}>{day}</Text>
                  ))}
                  {attendanceCalendar.cells.map((dayCell) => (
                    <TouchableOpacity
                      key={dayCell.key}
                      style={[
                        studentDash.calendarCell,
                        dayCell.isFuture && studentDash.calendarCellFuture,
                        dayCell.status === 'present' && studentDash.calendarCellPresent,
                        dayCell.status === 'absent' && studentDash.calendarCellAbsent,
                        dayCell.status === 'mixed' && studentDash.calendarCellMixed,
                        dayCell.isToday && studentDash.calendarCellToday,
                        dayCell.dateKey === selectedAttendanceDateKey && !dayCell.isFuture && studentDash.calendarCellSelected,
                      ]}
                      disabled={!dayCell.day || dayCell.isFuture}
                      onPress={() => {
                        if (!dayCell.dateKey || dayCell.isFuture) return;
                        setSelectedAttendanceDateKey(dayCell.dateKey);
                      }}
                    >
                      {dayCell.day ? (
                        <Text
                          style={[
                            studentDash.calendarCellText,
                            dayCell.isFuture && studentDash.calendarCellTextFuture,
                            dayCell.isToday && studentDash.calendarCellTextToday,
                            dayCell.dateKey === selectedAttendanceDateKey && !dayCell.isFuture && studentDash.calendarCellTextSelected,
                          ]}
                        >
                          {dayCell.day}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={studentDash.monthPager}>
                  <Text style={studentDash.monthPagerText}>{attendanceCalendar.monthLabel}</Text>
                  <Text style={studentDash.calendarLegendText}>{`${attendanceStats.workingDays} tracked days`}</Text>
                </View>

                <View style={studentDash.attendanceDayPanel}>
                  <Text style={studentDash.attendanceDayPanelTitle}>Daily Class Attendance</Text>
                  <Text style={studentDash.attendanceDayPanelSubtitle}>{selectedAttendanceDateLabel}</Text>

                  {selectedAttendanceDateRecords.length === 0 ? (
                    <Text style={studentDash.attendanceDayEmpty}>
                      No class attendance was recorded for this date yet.
                    </Text>
                  ) : selectedAttendanceDateRecords.map((record) => (
                    <View key={record.id} style={studentDash.attendanceDayRow}>
                      <View style={studentDash.attendanceDayMeta}>
                        <Text style={studentDash.attendanceDaySubject}>{record.subject || 'Class'}</Text>
                        <Text style={studentDash.attendanceDayInfo}>
                          {`${formatTimetableTime(record.startTime)} - ${formatTimetableTime(record.endTime)}`}
                        </Text>
                        <Text style={studentDash.attendanceDayInfo}>
                          {`${record.grade || currentGrade} • ${record.room || 'Room not set'}`}
                        </Text>
                      </View>
                      <View
                        style={[
                          studentDash.attendanceDayStatusPill,
                          record.status === 'Present'
                            ? studentDash.attendanceDayStatusPresent
                            : studentDash.attendanceDayStatusAbsent,
                        ]}
                      >
                        <Text
                          style={[
                            studentDash.attendanceDayStatusText,
                            record.status === 'Present'
                              ? studentDash.attendanceDayStatusTextPresent
                              : studentDash.attendanceDayStatusTextAbsent,
                          ]}
                        >
                          {record.status}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={studentDash.attendanceStatGrid}>
                  <View style={[studentDash.attendanceStatCard, studentDash.presentCard]}>
                    <Text style={studentDash.attendanceStatHeading}>Present Classes</Text>
                    <Text style={studentDash.attendanceStatValue}>{attendanceStats.present}</Text>
                    <Text style={studentDash.attendanceStatSub}>classes</Text>
                  </View>
                  <View style={[studentDash.attendanceStatCard, studentDash.absentCard]}>
                    <Text style={studentDash.attendanceStatHeading}>Absent Classes</Text>
                    <Text style={studentDash.attendanceStatValue}>{attendanceStats.absent}</Text>
                    <Text style={studentDash.attendanceStatSub}>classes</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </>
        )}

      {!loading && tab === 'results' && (
        <>
          <StudentPageTitle
            title="Exams & Results"
            subtitle="Review your exam performance and average mark in one place."
          />

          <View style={[studentDash.metricGrid, isWide && studentDash.metricGridWide]}>
            <View style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemWide]}>
              <StudentMetricCard label="Average Mark" value={formatAverageLabel(studentExamAverage)} />
            </View>
            <View style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemWide]}>
              <StudentMetricCard label="Total Marks" value={String(studentExamTotal)} />
            </View>
            <View style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemWide]}>
              <StudentMetricCard
                label="Rank"
                value={studentExamRank > 0 ? `#${studentExamRank}` : '-'}
                detail={studentExamTotalStudents > 0 ? `Out of ${studentExamTotalStudents} students` : ''}
              />
            </View>
          </View>

          <View style={studentDash.panel}>
            <Text style={studentDash.panelTitle}>Exam Results</Text>
            <View style={studentDash.termButtonRow}>
              {STUDENT_RESULT_TERMS.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={[
                    studentDash.termButton,
                    selectedTerm === term && studentDash.termButtonActive,
                  ]}
                  onPress={() => setSelectedTerm(term)}
                >
                  <Text
                    style={[
                      studentDash.termButtonText,
                      selectedTerm === term && studentDash.termButtonTextActive,
                    ]}
                  >
                    {term}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={studentDash.panelSubtitle}>
              {studentExamResults?.exam
                ? `${studentExamResults.exam.title} â€¢ ${formatLongAppDate(studentExamResults.exam.examDate)}`
                : 'No exam result is available for this term yet.'}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={studentDash.tableWrap}>
                <View style={[studentDash.tableRow, studentDash.tableHeader]}>
                  <Text style={[studentDash.tableCellWide, studentDash.tableHead]}>Subject</Text>
                  <Text style={[studentDash.tableCell, studentDash.tableHead]}>Marks Obtained</Text>
                  <Text style={[studentDash.tableCell, studentDash.tableHead]}>Highest Marks</Text>
                </View>
                {resultSubjects.length === 0 ? (
                  <View style={studentDash.tableRow}>
                    <Text style={studentDash.tableCellWide}>No marks available for this term yet.</Text>
                  </View>
                ) : resultSubjects.map((subjectRow) => (
                  <View key={`${selectedTerm}-${subjectRow.subject}`} style={studentDash.tableRow}>
                    <Text style={studentDash.tableCellWide}>{subjectRow.subject}</Text>
                    <Text style={studentDash.tableCell}>{subjectRow.score ?? '-'}</Text>
                    <Text style={studentDash.tableCell}>{subjectRow.highestScore ?? 0}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
        )}

      {!loading && tab === 'timetable' && (
        <>
          <StudentPageTitle
            title="Timetable"
            subtitle="Review your weekly class schedule with subject, tutor, and time slot details."
          />

          <View style={[studentDash.metricGrid, isWide && studentDash.metricGridWide]}>
            <View style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemHalf]}>
              <StudentMetricCard label="Current Grade" value={currentGrade} />
            </View>
            <View style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemHalf]}>
              <StudentMetricCard label="Timetable Status" value={timetableStatus} detail={`Live time: ${lastUpdated}`} />
            </View>
          </View>

          <View style={studentDash.panel}>
            <Text style={studentDash.panelTitle}>Weekly Timetable</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={studentDash.timetableWrap}>
                <View style={[studentDash.timetableRow, studentDash.tableHeader]}>
                  <View style={studentDash.timeCellWrap}>
                    <Text style={[studentDash.timeCell, studentDash.tableHead]}>Time</Text>
                  </View>
                  {TIMETABLE_DAYS.map((day) => (
                    <View
                      key={day}
                      style={[
                        studentDash.scheduleColumn,
                        day === currentDayName && studentDash.currentDayHeader,
                      ]}
                    >
                      <Text style={[studentDash.scheduleCell, studentDash.tableHead]}>{day}</Text>
                    </View>
                  ))}
                </View>

                {timetableRows.map((row) => (
                  <View key={row.slot} style={studentDash.timetableRow}>
                    <View style={studentDash.timeCellWrap}>
                      <Text style={[studentDash.timeCell, row.key === activeTimetableSlotKey && studentDash.currentTimeCell]}>{row.slot}</Text>
                    </View>
                    {row.cells.map(({ day, entry }) => {
                      const isAccessible = isAdminTimetableSlotAccessible(day, row.startTime, row.endTime);
                      const isCurrentSlot = day === currentDayName && row.key === activeTimetableSlotKey;
                      return (
                        <View
                          key={`${row.slot}-${day}`}
                          style={studentDash.scheduleColumn}
                        >
                          <View
                            style={[
                              studentDash.scheduleBox,
                              entry
                                ? studentDash.scheduleBoxFilled
                                : isAccessible
                                  ? studentDash.scheduleBoxEmpty
                                  : studentDash.scheduleBoxUnavailable,
                              isCurrentSlot && studentDash.scheduleBoxCurrent,
                            ]}
                          >
                          {entry ? (
                            <>
                              <Text style={studentDash.scheduleTitle} numberOfLines={2}>{formatTimetableEntryTitle(entry, courseList)}</Text>
                              <Text style={studentDash.scheduleSub} numberOfLines={2}>
                                {[entry.subject, entry.room].filter(Boolean).join(' â€¢ ')}
                              </Text>
                              </>
                            ) : (
                              <Text style={isAccessible ? studentDash.scheduleEmptyText : studentDash.scheduleUnavailableText}>
                                {isAccessible ? 'No class' : 'Not available'}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
        )}

      {!loading && tab === 'mySuggestion' && (
        <>
          <StudentPageTitle
            title="My Suggestion"
            subtitle="Review the suggestions and complaints you have submitted."
          />

          <View style={studentDash.panel}>
            <Text style={studentDash.panelTitle}>My Suggestion</Text>
            {suggestionList.length === 0 ? (
              <View style={studentDash.placeholderCard}>
                <Text style={studentDash.placeholderText}>You have not submitted any suggestions yet.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={studentDash.tableWrap}>
                  <View style={[studentDash.tableRow, studentDash.tableHeader]}>
                    <Text style={[studentDash.tableCell, studentDash.tableHead]}>Type</Text>
                    <Text style={[studentDash.tableCell, studentDash.tableHead]}>Status</Text>
                    <Text style={[studentDash.tableCell, studentDash.tableHead]}>Submitted On</Text>
                    <Text style={[studentDash.tableCellWide, studentDash.tableHead]}>Message</Text>
                  </View>
                  {suggestionList.map((item) => (
                    <View key={item._id} style={studentDash.tableRow}>
                      <Text style={studentDash.tableCell}>{item.type}</Text>
                      <View style={studentDash.tableCell}>
                        <View style={studentDash.pendingPill}>
                          <Text style={studentDash.pendingPillText}>{item.status}</Text>
                        </View>
                      </View>
                      <Text style={studentDash.tableCell}>{formatAppDate(item.createdAt)}</Text>
                      <Text style={studentDash.tableCellWide}>{item.message}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </>
        )}

      {!loading && tab === 'newSuggestion' && (
        <>
          <StudentPageTitle
            title="New Suggestion/Complaints"
            subtitle="Create a new suggestion or complaint for review."
          />

          <View style={studentDash.panel}>
            <Text style={studentDash.panelTitle}>New Suggestion</Text>
            <View style={studentDash.toggleRow}>
              {['Suggestion', 'Complaint'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    studentDash.toggleButton,
                    suggestionType === type && studentDash.toggleButtonActive,
                  ]}
                  onPress={() => setSuggestionType(type)}
                >
                  <Text
                    style={[
                      studentDash.toggleButtonText,
                      suggestionType === type && studentDash.toggleButtonTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[
                studentDash.textInput,
                studentDash.textArea,
                isSuggestionOverLimit && studentDash.textInputError,
              ]}
              placeholder="Write your message here"
              value={suggestionText}
              onChangeText={setSuggestionText}
              multiline
              placeholderTextColor="#8ca0c3"
              textAlignVertical="top"
            />
            <Text style={[studentDash.helperText, isSuggestionOverLimit && studentDash.helperTextError]}>
              {suggestionWordCount}/{SUGGESTION_MESSAGE_WORD_LIMIT} words
              {isSuggestionOverLimit ? ' - Please shorten your message before submitting.' : ''}
            </Text>

            <TouchableOpacity
              style={[
                studentDash.primaryButton,
                (submittingSuggestion || isSuggestionOverLimit) && studentDash.primaryButtonDisabled,
              ]}
              onPress={submitSuggestion}
              disabled={submittingSuggestion || isSuggestionOverLimit}
            >
              <Text style={studentDash.primaryButtonText}>{submittingSuggestion ? 'Submitting...' : 'Submit Message'}</Text>
            </TouchableOpacity>
          </View>
        </>
        )}

      {!loading && tab === 'profile' && (
        <>
          <StudentPageTitle
            title="Student Profile"
            subtitle="Review and update your account details."
          />

          <View style={[studentDash.profileCard, studentDash.profileCardDark]}>
            <View style={studentDash.profileAvatar}>
              <Text style={studentDash.profileAvatarText}>
                {(user.name || 'S').split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <Text style={studentDash.profileRole}>STUDENT ACCOUNT</Text>

            <TextInput
              style={[studentDash.profileInput, studentDash.profileInputDark]}
              placeholder="Full name"
              value={profileName}
              onChangeText={setProfileName}
              showSoftInputOnFocus
              placeholderTextColor="#8ca0c3"
            />

            <TextInput
              style={[studentDash.profileInput, studentDash.profileInputDark]}
              placeholder="Email"
              value={profileEmail}
              onChangeText={setProfileEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              showSoftInputOnFocus
              placeholderTextColor="#8ca0c3"
            />

            <TextInput
              style={[studentDash.profileInput, studentDash.profileInputDark]}
              placeholder="Grade"
              value={currentGrade || '-'}
              editable={false}
              placeholderTextColor="#8ca0c3"
            />

            <View style={[studentDash.profileInfoBox, studentDash.profileInfoBoxDark]}>
              <Text style={[studentDash.profileInfoLabel, studentDash.profileInfoLabelDark]}>Role</Text>
              <Text style={[studentDash.profileInfoValue, studentDash.profileInfoValueDark]}>Student</Text>
              <Text style={[studentDash.profileInfoLabel, studentDash.profileInfoLabelDark]}>Status</Text>
              <Text style={[studentDash.profileInfoValue, studentDash.profileInfoValueDark]}>{user.approvalStatus || 'approved'}</Text>
            </View>

            <TouchableOpacity
              style={[studentDash.primaryButton, profileSaving && studentDash.primaryButtonDisabled]}
              onPress={updateStudentProfile}
              disabled={profileSaving}
            >
              <Text style={studentDash.primaryButtonText}>{profileSaving ? 'Saving...' : 'Update Profile'}</Text>
            </TouchableOpacity>
          </View>
        </>
        )}
    </StudentDashboardShell>
  );
};

const studentShell = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#dfeafc' },
  header: {
    backgroundColor: '#27498f',
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuToggle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    transform: [{ rotate: '90deg' }],
  },
  titleBlock: { flex: 1 },
  pageTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  brandName: { color: '#f7f9ff', fontSize: 15, fontWeight: '900', marginTop: 4, lineHeight: 18 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileGlyph: { alignItems: 'center', justifyContent: 'center' },
  profileGlyphHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1f2937',
  },
  profileGlyphBody: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#1f2937',
    marginTop: 2,
  },
  profileText: { color: '#1f2937', fontSize: 12, fontWeight: '800' },
  logoutButton: {
    backgroundColor: '#ef3b36',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  body: { flex: 1 },
  bodyDesktop: { flexDirection: 'row' },
  bodyMobile: { flexDirection: 'column' },
  contentArea: { flex: 1 },
  contentScroll: { padding: 16, paddingBottom: 40 },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 22,
    shadowColor: '#7e8fb1',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#dce6f7',
  },
});

const studentDash = StyleSheet.create({
  pageTitleWrap: { marginBottom: 20 },
  pageTitle: { color: '#102a4f', fontSize: 26, fontWeight: '900' },
  pageSubtitle: { color: '#74839e', fontSize: 14, lineHeight: 20, marginTop: 8 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { color: '#74839e', fontSize: 14, fontWeight: '700', marginTop: 12 },
  metricGrid: { gap: 14, marginBottom: 20 },
  metricGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  metricGridItem: { width: '100%' },
  metricGridItemWide: { width: '23%' },
  metricGridItemHalf: { width: '48%' },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#c5d1e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  metricLabel: {
    color: '#7f8a99',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricValue: { color: '#101827', fontSize: 24, fontWeight: '900', marginTop: 12 },
  metricDetail: { color: '#74839e', fontSize: 13, fontWeight: '700', marginTop: 8 },
  splitGrid: { gap: 16 },
  splitGridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  splitPanel: { flex: 1 },
  panel: {
    backgroundColor: '#fdfefe',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e6edf7',
    padding: 16,
    marginBottom: 16,
  },
  panelTitle: { color: '#1b2941', fontSize: 16, fontWeight: '900', marginBottom: 14 },
  panelSubtitle: { color: '#74839e', fontSize: 13, fontWeight: '700', marginBottom: 14 },
  placeholderCard: {
    borderWidth: 1,
    borderColor: '#dce5f2',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 76,
  },
  placeholderText: { color: '#7a869c', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  classRow: { width: '100%', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ecf1f7' },
  classTitle: { color: '#1e293b', fontSize: 14, fontWeight: '800' },
  classMeta: { color: '#7a869c', fontSize: 13, marginTop: 4 },
  tableWrap: {
    minWidth: 820,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f8',
  },
  tableHeader: { backgroundColor: '#dfe7f4' },
  tableHead: { color: '#334155', fontSize: 13, fontWeight: '900' },
  tableCell: {
    width: 170,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
    justifyContent: 'center',
  },
  tableCellWide: {
    width: 320,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
    justifyContent: 'center',
  },
  receiptButton: {
    borderWidth: 1,
    borderColor: '#73a4ea',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    minWidth: 150,
    backgroundColor: '#f8fbff',
  },
  receiptButtonText: { color: '#2f60d3', fontSize: 14, fontWeight: '800' },
  receiptLink: { color: '#2f60d3', fontSize: 14, fontWeight: '800', marginTop: 10 },
  receiptLinkDisabled: { color: '#94a3b8' },
  receiptCard: {
    borderWidth: 1,
    borderColor: '#e3ebf6',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
    backgroundColor: '#fff',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  receiptDateBadge: {
    width: 72,
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: '#eef4ff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  receiptDateMonth: { color: '#4b67a1', fontSize: 12, fontWeight: '900' },
  receiptDateYear: { color: '#4b67a1', fontSize: 12, fontWeight: '800', marginTop: 4 },
  receiptMain: { flex: 1, minWidth: 190 },
  receiptMonthTitle: { color: '#13243f', fontSize: 18, fontWeight: '900' },
  receiptAmount: { color: '#5e718f', fontSize: 14, fontWeight: '700', marginTop: 8 },
  receiptStatusRow: { marginTop: 12 },
  receiptActions: { minWidth: 220, flex: 1, alignItems: 'flex-start' },
  receiptHelper: { color: '#7a869c', fontSize: 12, fontWeight: '700', marginTop: 10, lineHeight: 18 },
  pendingPill: {
    backgroundColor: '#fde9a9',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  pendingPillText: { color: '#9e6a05', fontSize: 12, fontWeight: '900' },
  profileCard: {
    backgroundColor: '#fdfefe',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    padding: 20,
  },
  profileCardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  profileAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  profileAvatarText: { color: '#1d4ed8', fontSize: 28, fontWeight: '900' },
  profileRole: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  profileInput: {
    backgroundColor: '#f6f9ff',
    borderWidth: 1,
    borderColor: '#dce6f7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#1f2937',
    fontSize: 14,
    marginBottom: 12,
  },
  profileInputDark: {
    backgroundColor: '#111c34',
    borderColor: '#334155',
    color: '#e2e8f0',
  },
  profileInfoBox: {
    backgroundColor: '#f6f9ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dce6f7',
    padding: 14,
    marginBottom: 16,
  },
  profileInfoBoxDark: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
  },
  profileInfoLabel: { color: '#74839e', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  profileInfoValue: { color: '#1f2937', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  profileInfoLabelDark: { color: '#94a3b8' },
  profileInfoValueDark: { color: '#f8fafc' },
  attendanceColumn: { width: '100%' },
  attendanceColumnWide: { flex: 1 },
  attendanceLiveCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe7fb',
    backgroundColor: '#eef5ff',
    padding: 18,
    marginTop: 18,
  },
  attendanceLiveLabel: { color: '#37507b', fontSize: 14, fontWeight: '800' },
  attendanceLiveTime: { color: '#16315f', fontSize: 32, fontWeight: '900', marginTop: 8 },
  attendanceLiveSub: { color: '#6b7b93', fontSize: 12, fontWeight: '700', marginTop: 8 },
  attendanceOverviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  attendanceOverviewItem: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    backgroundColor: '#fff',
    padding: 14,
  },
  attendanceOverviewLabel: {
    color: '#74839e',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  attendanceOverviewValue: { color: '#1f2937', fontSize: 24, fontWeight: '900', marginTop: 10 },
  attendanceNextClassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dce6f7',
    backgroundColor: '#f8fbff',
    padding: 16,
    marginTop: 18,
  },
  attendanceNextClassTitle: { color: '#1f2937', fontSize: 16, fontWeight: '900', marginTop: 8 },
  attendanceNextClassMeta: { color: '#64748b', fontSize: 13, fontWeight: '700', marginTop: 8 },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeCardTitle: { color: '#243a63', fontSize: 16, fontWeight: '900' },
  welcomeCardName: { color: '#2b3951', fontSize: 13, fontWeight: '800', marginTop: 6 },
  studentBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#39aaf6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4aa4f3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 4,
  },
  studentBadgeText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  dateStrip: {
    backgroundColor: '#f4f8ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  dateStripText: { color: '#34445f', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  gaugeCard: {
    backgroundColor: '#f7fbff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  gaugeArcBase: {
    position: 'absolute',
    width: 210,
    height: 110,
    borderTopLeftRadius: 110,
    borderTopRightRadius: 110,
    borderTopWidth: 18,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderColor: '#d9e3f1',
    top: 72,
  },
  gaugeArcFill: {
    position: 'absolute',
    width: 170,
    height: 104,
    left: 66,
    top: 78,
    borderTopLeftRadius: 104,
    borderTopRightRadius: 104,
    borderTopWidth: 18,
    borderLeftWidth: 18,
    borderColor: '#3aaaf6',
  },
  gaugeCenter: { alignItems: 'center', paddingTop: 32 },
  gaugeTime: { color: '#101827', fontSize: 18, fontWeight: '900' },
  gaugeToday: { color: '#1e293b', fontSize: 14, fontWeight: '800', marginTop: 8 },
  gaugePercent: { color: '#4b5563', fontSize: 15, fontWeight: '800', marginTop: 14 },
  attendanceNavRow: { flexDirection: 'row', gap: 10 },
  attendanceNavButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    paddingVertical: 18,
    alignItems: 'center',
  },
  attendanceNavButtonActive: { backgroundColor: '#39aaf6' },
  attendanceNavLabel: { color: '#718096', fontSize: 13, fontWeight: '800' },
  attendanceNavLabelActive: { color: '#fff', fontSize: 18 },
  calendarTop: {
    borderWidth: 1,
    borderColor: '#e3ebf6',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: { color: '#1f2d44', fontSize: 16, fontWeight: '900' },
  monthSelectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  monthSelectorChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe7fb',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthSelectorChipActive: { borderColor: '#3267df', backgroundColor: '#eff4ff' },
  monthSelectorChipText: { color: '#50607c', fontSize: 12, fontWeight: '800' },
  monthSelectorChipTextActive: { color: '#2954c8' },
  calendarLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 14 },
  calendarLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calendarLegendDot: { width: 9, height: 9, borderRadius: 999 },
  calendarLegendPresent: { backgroundColor: '#22c55e' },
  calendarLegendAbsent: { backgroundColor: '#ef4444' },
  calendarLegendMixed: { backgroundColor: '#f59e0b' },
  calendarLegendToday: { backgroundColor: '#2563eb' },
  calendarLegendText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  calendarDayLabel: {
    width: '13%',
    color: '#8a98ac',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  calendarCell: {
    width: '13%',
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  calendarCellPresent: { backgroundColor: '#ecfdf3', borderColor: '#86efac' },
  calendarCellAbsent: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  calendarCellMixed: { backgroundColor: '#fff7ed', borderColor: '#fdba74' },
  calendarCellFuture: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.38,
  },
  calendarCellToday: {
    backgroundColor: '#f5fbff',
    borderWidth: 1,
    borderColor: '#5aa9eb',
  },
  calendarCellSelected: {
    borderWidth: 2,
    borderColor: '#2f60d3',
    shadowColor: '#2f60d3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  calendarCellText: { color: '#4b5563', fontSize: 13, fontWeight: '700' },
  calendarCellTextFuture: { color: '#9aa7b8' },
  calendarCellTextToday: { color: '#2f60d3', fontWeight: '900' },
  calendarCellTextSelected: { color: '#1d4ed8', fontWeight: '900' },
  monthPager: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthPagerArrow: { color: '#5b6b84', fontSize: 18, fontWeight: '900' },
  monthPagerText: { color: '#34445f', fontSize: 15, fontWeight: '900' },
  workingDaysCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  workingDaysLabel: { color: '#3a485e', fontSize: 16, fontWeight: '900' },
  dayCountPill: {
    backgroundColor: '#38aaf6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dayCountText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  attendanceDayPanel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
    gap: 12,
  },
  attendanceDayPanelTitle: {
    color: '#1f2d3d',
    fontSize: 16,
    fontWeight: '900',
  },
  attendanceDayPanelSubtitle: {
    color: '#6b7a90',
    fontSize: 13,
    fontWeight: '700',
  },
  attendanceDayEmpty: {
    color: '#7c8ba1',
    fontSize: 13,
    fontWeight: '700',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d8e2f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 18,
    textAlign: 'center',
  },
  attendanceDayRow: {
    borderWidth: 1,
    borderColor: '#e5edf8',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  attendanceDayMeta: { flex: 1, gap: 4 },
  attendanceDaySubject: {
    color: '#1f2d3d',
    fontSize: 15,
    fontWeight: '900',
  },
  attendanceDayInfo: {
    color: '#6b7a90',
    fontSize: 12,
    fontWeight: '700',
  },
  attendanceDayStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    minWidth: 88,
    alignItems: 'center',
  },
  attendanceDayStatusPresent: {
    backgroundColor: '#ecfdf3',
    borderColor: '#86efac',
  },
  attendanceDayStatusAbsent: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  attendanceDayStatusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  attendanceDayStatusTextPresent: { color: '#15803d' },
  attendanceDayStatusTextAbsent: { color: '#dc2626' },
  attendanceStatGrid: { flexDirection: 'row', gap: 12 },
  attendanceStatCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    minHeight: 150,
  },
  absentCard: { backgroundColor: '#ff4ca0' },
  presentCard: { backgroundColor: '#2da4f7' },
  attendanceStatHeading: { color: '#fff', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  attendanceStatValue: { color: '#fff', fontSize: 48, fontWeight: '900', marginTop: 18 },
  attendanceStatSub: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  termButtonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  termButton: {
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d5dfec',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  termButtonActive: { backgroundColor: '#3267df', borderColor: '#3267df' },
  termButtonText: { color: '#29354b', fontSize: 14, fontWeight: '800' },
  termButtonTextActive: { color: '#fff' },
  timetableWrap: {
    minWidth: 1080,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  timetableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f8',
  },
  timeCellWrap: {
    width: 160,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#edf2f8',
    backgroundColor: '#fff',
  },
  timeCell: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    color: '#1e3a5f',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 28,
    backgroundColor: '#fff',
    textAlign: 'left',
    textAlignVertical: 'center',
  },
  scheduleColumn: {
    width: 164,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#edf2f8',
  },
  scheduleCell: {
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 12,
    color: '#334155',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  scheduleBox: {
    width: '100%',
    minHeight: 132,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  scheduleBoxUnavailable: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  scheduleBoxEmpty: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  scheduleBoxFilled: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc', paddingHorizontal: 10 },
  scheduleBoxCurrent: { borderColor: '#2563eb', borderWidth: 2, shadowColor: '#2563eb', shadowOpacity: 0.18, shadowRadius: 10, elevation: 3 },
  scheduleTitle: { color: '#0f172a', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  scheduleSub: { color: '#475569', fontSize: 12, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  scheduleUnavailableText: { color: '#dc2626', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  scheduleEmptyText: { color: '#98a5b8', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  currentDayHeader: { backgroundColor: '#eff6ff' },
  currentTimeCell: { color: '#2563eb' },
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  toggleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cfd8e6',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  toggleButtonActive: { backgroundColor: '#355594', borderColor: '#355594' },
  toggleButtonText: { color: '#223049', fontSize: 14, fontWeight: '800' },
  toggleButtonTextActive: { color: '#fff' },
  textInput: {
    backgroundColor: '#f6f9ff',
    borderWidth: 1,
    borderColor: '#dce6f7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#1f2937',
    fontSize: 14,
  },
  textInputError: { borderColor: '#dc2626' },
  textArea: { minHeight: 140, marginBottom: 16 },
  helperText: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: -8, marginBottom: 16 },
  helperTextError: { color: '#dc2626' },
  primaryButton: {
    backgroundColor: '#355594',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});

// CHANGE PASSWORD SCREEN
// Shown after login if mustChangePassword = true.
// Forces the user to set a new password before accessing their dashboard.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ChangePasswordScreen = ({ token, user, onPasswordChanged, onLogout }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError('New password must include letters, numbers, and at least one special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current password.');
      return;
    }

    setLoading(true);
    try {
      // Call the change-password API endpoint
      const data = await request('/api/auth/change-password', {
        method: 'PUT',
        token,
        body: { currentPassword, newPassword },
      });
      // Pass the fresh token and updated user back to the parent
      onPasswordChanged(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={chpw.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={chpw.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={chpw.header}>
            <View style={chpw.iconWrap}>
              <Text style={chpw.icon}>ðŸ”</Text>
            </View>
            <Text style={chpw.title}>Change Your Password</Text>
            <Text style={chpw.subtitle}>
              Welcome, {user.name.split(' ')[0]}! For security, you must set a
              new password before accessing your account.
            </Text>
          </View>

          {/* Form card */}
          <View style={chpw.card}>
            <WebForm onSubmit={handleSubmit}>
            {/* Error message */}
            {error ? (
              <View style={chpw.errorBox}>
                <Text style={chpw.errorText}>âš ï¸  {error}</Text>
              </View>
            ) : null}

            <View style={chpw.inputWrap}>
              <Text style={chpw.label}>Current Password</Text>
              <TextInput
                style={chpw.input}
                placeholder="Your current / default password"
                placeholderTextColor="#94a3b8"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                showSoftInputOnFocus
              />
            </View>

            <View style={chpw.inputWrap}>
              <Text style={chpw.label}>New Password</Text>
              <TextInput
                style={chpw.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#94a3b8"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                showSoftInputOnFocus
              />
            </View>

            <View style={chpw.inputWrap}>
              <Text style={chpw.label}>Confirm New Password</Text>
              <TextInput
                style={chpw.input}
                placeholder="Re-enter your new password"
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onSubmitEditing={handleSubmit}
                secureTextEntry
                showSoftInputOnFocus
              />
            </View>

            <TouchableOpacity style={chpw.btn} onPress={handleSubmit} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={chpw.btnText}>Update Password â†’</Text>
              }
            </TouchableOpacity>

            {/* Allow user to logout and go back to login screen */}
            <TouchableOpacity style={chpw.logoutLink} onPress={onLogout}>
              <Text style={chpw.logoutLinkText}>â† Back to Login</Text>
            </TouchableOpacity>
            </WebForm>
          </View>

          <Text style={chpw.note}>
            ðŸ”’ Your password is encrypted and never stored in plain text.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const chpw = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 28 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#f59e0b',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#991b1b',
    marginBottom: 14,
  },
  errorText: { color: '#fca5a5', fontSize: 13, lineHeight: 18 },
  inputWrap: { marginBottom: 14 },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 14,
  },
  btn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  btnText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  logoutLink: { alignItems: 'center', marginTop: 16 },
  logoutLinkText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  note: { color: '#334155', fontSize: 11, textAlign: 'center', marginTop: 20 },
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN APP
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SplashHomeScreen = ({
  onComplete,
  autoNavigate = false,
  duration = 2500,
  showActions = false,
  onLoginPress,
  onGetStartedPress,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: SHOULD_USE_NATIVE_DRIVER,
    }).start();

    if (!autoNavigate || typeof onComplete !== 'function') {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setIsTransitioning(true);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: SHOULD_USE_NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (finished) {
          onComplete();
        } else {
          setIsTransitioning(false);
        }
      });
    }, duration);

    return () => clearTimeout(timeout);
  }, [autoNavigate, duration, fadeAnim, onComplete]);

  const handleManualContinue = () => {
    if (isTransitioning) {
      return;
    }

    setIsTransitioning(true);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 900,
      useNativeDriver: SHOULD_USE_NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished) {
        (onGetStartedPress || onLoginPress || onComplete)?.();
      } else {
        setIsTransitioning(false);
      }
    });
  };

  return (
    <LinearGradient
      colors={['#1FA2A6', '#1E6FD9', '#0F1C3F']}
      locations={[0, 0.48, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={splashHome.container}
    >
      <SafeAreaView style={splashHome.safeArea}>
        <View style={splashHome.gradientGlowTop} />
        <View style={splashHome.gradientGlowBottom} />
        <View style={splashHome.content}>
          <Animated.View style={[splashHome.brandWrap, { opacity: fadeAnim }]}>
            <View style={splashHome.logoShell}>
              {!logoLoadFailed ? (
                <Image
                  source={require('./assets/logo.jpeg')}
                  style={splashHome.image}
                  resizeMode="cover"
                  onError={() => setLogoLoadFailed(true)}
                />
              ) : (
                <View style={splashHome.logoFallback}>
                  <Text style={splashHome.logoFallbackText}>NKEC</Text>
                </View>
              )}
            </View>
            <Text style={splashHome.brandTitle}>NEW KRISHNA EDUCATION CENTER</Text>
            <Text style={splashHome.brandSubtitle}>Smart Tuition Management Platform</Text>
          </Animated.View>
          {showActions ? (
            <Animated.View style={[splashHome.actionWrap, { opacity: fadeAnim }]}>
              <TouchableOpacity
                style={[splashHome.primaryButton, isTransitioning && splashHome.primaryButtonDisabled]}
                onPress={handleManualContinue}
                disabled={isTransitioning}
              >
                <Text style={splashHome.primaryButtonText}>Get Started</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <ActivityIndicator size="small" color="#ffffff" style={splashHome.loader} />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const splashHome = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  gradientGlowTop: {
    position: 'absolute',
    top: -70,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(167, 243, 208, 0.16)',
  },
  gradientGlowBottom: {
    position: 'absolute',
    bottom: -90,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(153, 246, 228, 0.12)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoShell: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 10,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  logoFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  logoFallbackText: {
    color: '#1d4ed8',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandTitle: {
    marginTop: 22,
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  brandSubtitle: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  loader: { marginTop: 18 },
  actionWrap: {
    width: '100%',
    maxWidth: 320,
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  primaryButtonDisabled: {
    opacity: 0.72,
  },
});

export default function App() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [showAuthScreen, setShowAuthScreen] = useState(true);

  const loadProfile = async (activeToken) => {
    const data = await request('/api/auth/me', { token: activeToken });
    return data.user || null;
  };

  useEffect(() => {
    const splashStartedAt = Date.now();
    let cancelled = false;
    let timeoutId;

    const bootstrap = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (savedToken) {
          setToken(savedToken);
          const profile = await loadProfile(savedToken);
          setUser(profile);
        }
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        const elapsed = Date.now() - splashStartedAt;
        const remaining = Math.max(3000 - elapsed, 0);
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            setBootLoading(false);
          }
        }, remaining);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  /**
   * Called by AuthScreen after a successful login.
   * Saves the token and sets the user in state.
   */
  const handleAuthenticated = async (newToken, userData) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setShowAuthScreen(false);
    if (userData) {
      setUser(userData);
    } else {
      const profile = await loadProfile(newToken);
      setUser(profile);
    }
  };

  /**
   * Called by ChangePasswordScreen after the password is changed.
   * The backend returns a fresh token â€” we update storage and state.
   */
  const handlePasswordChanged = async (newToken, updatedUser) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(updatedUser);
  };

  const handleUserUpdated = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to remove auth token from storage:', error);
    } finally {
      setToken('');
      setUser(null);
      setShowAuthScreen(false);
    }
  };

  const deleteCourse = async (course) => {
    setDeletingCourseId(course._id);
    try {
      await request(`/api/courses/${course._id}`, {
        method: 'DELETE',
        token,
      });
      if (editingCourseId === course._id) {
        cancelCourseFeeEdit();
      }
      await loadAll();
      showPopupMessage('Deleted', 'Course removed successfully.');
    } catch (e) {
      showPopupMessage('Error', e.message);
    } finally {
      setDeletingCourseId('');
    }
  };

  // â”€â”€ Boot splash screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (bootLoading) {
    return <SplashHomeScreen />;
  }

  // â”€â”€ Not logged in â†’ show Auth screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!token || !user) {
    if (!showAuthScreen) {
      return (
        <SplashHomeScreen
          showActions
          onComplete={() => setShowAuthScreen(true)}
          onLoginPress={() => setShowAuthScreen(true)}
          onGetStartedPress={() => setShowAuthScreen(true)}
        />
      );
    }

    return (
      <AuthScreen
        onAuthenticated={handleAuthenticated}
        onGoHome={() => setShowAuthScreen(false)}
      />
    );
  }

  // â”€â”€ Forced password change â†’ show Change Password screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // This intercepts the flow if the backend flagged mustChangePassword = true
  // (e.g., admin seeded with a default password, or tutor-created account)
  if (user.mustChangePassword) {
    return (
      <ChangePasswordScreen
        token={token}
        user={user}
        onPasswordChanged={handlePasswordChanged}
        onLogout={handleLogout}
      />
    );
  }

  // â”€â”€ Role-based dashboard routing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (user.role === 'admin') {
    return <AdminDashboard token={token} user={user} onUserUpdated={handleUserUpdated} onLogout={handleLogout} />;
  }

  if (user.role === 'teacher') {
    return (
      <TutorDashboard
        token={token}
        user={user}
        onUserUpdated={handleUserUpdated}
        onLogout={handleLogout}
      />
    );
  }

  // Default: student
  return (
    <ScreenErrorBoundary label="Student dashboard">
      <StudentDashboard
        token={token}
        user={user}
        onUserUpdated={handleUserUpdated}
        onLogout={handleLogout}
      />
    </ScreenErrorBoundary>
  );
}

class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(`Screen error in ${this.props.label || 'screen'}:`, error);
  }

  handleReset() {
    this.setState({ error: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#1e293b', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#334155' }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Unable to load this screen</Text>
          <Text style={{ color: '#cbd5e1', fontSize: 14, marginTop: 10 }}>
            {this.props.label || 'This screen'} hit an error while rendering.
          </Text>
          <Text style={{ color: '#fca5a5', fontSize: 13, marginTop: 12 }}>
            {String(this.state.error?.message || this.state.error)}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 18, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            onPress={this.handleReset}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}
