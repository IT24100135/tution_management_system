const express = require('express');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const {
  validateSuggestionCreate,
  validateSuggestionUpdate,
} = require('../middlewares/validationMiddleware');
const {
  createSuggestion,
  getSuggestions,
  updateSuggestion,
} = require('../controllers/suggestionController');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(authorizeRoles('admin', 'teacher', 'student'), validateSuggestionCreate, createSuggestion)
  .get(authorizeRoles('admin', 'teacher', 'student'), getSuggestions);

router
  .route('/:id')
  .patch(authorizeRoles('admin'), validateSuggestionUpdate, updateSuggestion);

module.exports = router;
