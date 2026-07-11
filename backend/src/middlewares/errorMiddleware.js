const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle PostgreSQL unique violations cleanly
  if (err.code === '23505') {
    statusCode = 400;
    message = 'Resource already exists.';
    if (err.detail && err.detail.includes('email')) {
      message = 'This email address is already registered. Please log in.';
    }
  }

  logger.error('API Error Response:', {
    message,
    status: statusCode,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    errors: err.errors || null,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

module.exports = errorHandler;
