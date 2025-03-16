import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { StatusCodes } from 'http-status-codes';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';

// Log error details
const logError = (err: Error) => {
  console.error({
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
};

// Handle MongoDB duplicate key errors
const handleDuplicateKeyError = (err: MongoServerError) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
  return new AppError(message, StatusCodes.CONFLICT);
};

// Handle Mongoose validation errors
const handleValidationError = (err: mongoose.Error.ValidationError) => {
  const errors: Record<string, string> = {};
  
  // Extract all validation error messages
  Object.keys(err.errors).forEach((key) => {
    errors[key] = err.errors[key].message;
  });
  
  return new AppError('Validation error', StatusCodes.BAD_REQUEST, errors);
};

// Handle JWT errors
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', StatusCodes.UNAUTHORIZED);
};

// Handle expired JWT
const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', StatusCodes.UNAUTHORIZED);
};

// Central error handling middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logError(err);
  
  // Default error response
  let error = err as AppError;
  if (!error.statusCode) {
    error = new AppError('Something went wrong', StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // Handle specific error types
  if (err.name === 'ValidationError' && err instanceof mongoose.Error.ValidationError) {
    error = handleValidationError(err);
  }
  
  if (err.name === 'MongoServerError' && (err as MongoServerError).code === 11000) {
    error = handleDuplicateKeyError(err as MongoServerError);
  }
  
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }
  
  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Format the response
  const responseBody: {
    status: string;
    message: string;
    errors?: Record<string, string>;
    stack?: string;
  } = {
    status: 'error',
    message: error.message || 'An unexpected error occurred'
  };

  // Include validation errors if available
  if ('errors' in error && error.errors) {
    responseBody.errors = error.errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    responseBody.stack = error.stack;
  }

  return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json(responseBody);
};