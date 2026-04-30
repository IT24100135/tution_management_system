const express = require('express');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const {
  validateTimetableCreate,
  validateTimetableUpdate,
} = require('../middlewares/validationMiddleware');
const {
  createTimetableEntry,
  getTimetableEntries,
  getTimetableEntryById,
  updateTimetableEntry,
  deleteTimetableEntry,
} = require('../controllers/timetableController');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(authorizeRoles('admin'), validateTimetableCreate, createTimetableEntry)
  .get(authorizeRoles('admin', 'teacher', 'student'), getTimetableEntries);

router
  .route('/:id')
  .get(authorizeRoles('admin', 'teacher', 'student'), getTimetableEntryById)
  .put(authorizeRoles('admin'), validateTimetableUpdate, updateTimetableEntry)
  .delete(authorizeRoles('admin'), deleteTimetableEntry);

module.exports = router;
