const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (error, req, res, next) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = error.message || 'Internal Server Error';

  if (error.name === 'CastError') {
    message = 'Invalid resource ID format.';
  }

  if (error.code === 11000) {
    message = 'Duplicate value error.';
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
