import { StatusCodes } from 'http-status-codes';

// Base application error that extends the built-in Error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: Record<string, string>;
  
  constructor(message: string, statusCode: number, errors?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Marks the error as an operational error that we're handling
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication related errors
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

// Authorization related errors
export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, StatusCodes.FORBIDDEN);
  }
}

// Resource not found errors
export class NotFoundError extends AppError {
  constructor(entity: string = 'Resource') {
    super(`${entity} not found`, StatusCodes.NOT_FOUND);
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', errors: Record<string, string> = {}) {
    super(message, StatusCodes.BAD_REQUEST, errors);
  }
}

// Bad request errors
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, StatusCodes.BAD_REQUEST);
  }
}

// Conflict errors (e.g., duplicate resources)
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, StatusCodes.CONFLICT);
  }
}

// Database errors
export class DatabaseError extends AppError {
  constructor(message: string = 'Database error occurred') {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}