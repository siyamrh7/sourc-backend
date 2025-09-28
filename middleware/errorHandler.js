const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ErrorResponse(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ErrorResponse(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ErrorResponse(message, 401);
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError') {
    const message = 'Database connection failed';
    error = new ErrorResponse(message, 503);
  }

  // Rate limit errors
  if (err.statusCode === 429) {
    const message = 'Too many requests, please try again later';
    error = new ErrorResponse(message, 429);
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = new ErrorResponse(message, 400);
  }

  // Express validator errors
  if (err.array && typeof err.array === 'function') {
    const message = err.array().map(error => error.msg).join(', ');
    error = new ErrorResponse(message, 400);
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server Error';

  // Additional error details for development
  const errorResponse = {
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  };

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler; 