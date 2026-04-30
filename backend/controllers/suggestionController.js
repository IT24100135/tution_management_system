const Suggestion = require('../models/Suggestion');

const SUGGESTION_POPULATE = 'name email role';

const buildSuggestionTitle = ({ title, message, type }) => {
  const normalizedTitle = String(title || '').trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }

  const normalizedMessage = String(message || '').trim().replace(/\s+/g, ' ');
  if (!normalizedMessage) {
    return String(type || 'Suggestion');
  }

  return normalizedMessage.length > 60
    ? `${normalizedMessage.slice(0, 57)}...`
    : normalizedMessage;
};

const createSuggestion = async (req, res, next) => {
  try {
    const { title, message, type } = req.body;

    const suggestion = await Suggestion.create({
      title: buildSuggestionTitle({ title, message, type }),
      message: String(message || '').trim(),
      type: type || 'Suggestion',
      createdBy: req.user._id,
    });

    const populatedSuggestion = await Suggestion.findById(suggestion._id)
      .populate('createdBy', SUGGESTION_POPULATE);

    return res.status(201).json({
      message: 'Suggestion submitted successfully.',
      suggestion: populatedSuggestion,
    });
  } catch (error) {
    return next(error);
  }
};

const getSuggestions = async (req, res, next) => {
  try {
    const { mine, status, type } = req.query;
    const query = {};
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isAdmin || mine === 'true') {
      query.createdBy = req.user._id;
    }

    if (status && ['Open', 'In Review', 'Resolved', 'Closed'].includes(status)) {
      query.status = status;
    }

    if (type && ['Suggestion', 'Complaint'].includes(type)) {
      query.type = type;
    }

    const suggestions = await Suggestion.find(query)
      .populate('createdBy', SUGGESTION_POPULATE)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: suggestions.length,
      suggestions,
    });
  } catch (error) {
    return next(error);
  }
};

const updateSuggestion = async (req, res, next) => {
  try {
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found.' });
    }

    const fieldsToUpdate = ['status', 'adminNote', 'reply'];
    fieldsToUpdate.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        suggestion[field] = req.body[field];
      }
    });

    await suggestion.save();

    const updatedSuggestion = await Suggestion.findById(suggestion._id)
      .populate('createdBy', SUGGESTION_POPULATE);

    return res.status(200).json({
      message: 'Suggestion updated successfully.',
      suggestion: updatedSuggestion,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createSuggestion,
  getSuggestions,
  updateSuggestion,
};
