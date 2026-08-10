const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { isProd } = require('../config/env');

const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    let message = error.message || 'Internal Server Error';

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      statusCode = StatusCodes.BAD_REQUEST;
      message = Object.values(error.errors)
        .map((e) => e.message)
        .join(', ');
    }
    // Mongoose duplicate key error
    if (error.code === 11000) {
      statusCode = StatusCodes.CONFLICT;
      const field = Object.keys(error.keyValue || {})[0];
      message = `Duplicate value for field: ${field}`;
    }
    // Mongoose invalid ObjectId
    if (error.name === 'CastError') {
      statusCode = StatusCodes.BAD_REQUEST;
      message = `Invalid ${error.path}: ${error.value}`;
    }
    // Multer file upload errors
    if (error.name === 'MulterError') {
      statusCode = StatusCodes.BAD_REQUEST;
      message = `File upload error: ${error.message}`;
    }

    error = new ApiError(statusCode, message, [], err.stack);
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors?.length ? error.errors : undefined,
    ...(isProd ? {} : { stack: error.stack }),
  };

  if (error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${error.message}`, { stack: error.stack });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${error.message}`);
  }

  res.status(error.statusCode || 500).json(response);
};

module.exports = { notFoundHandler, errorHandler };
