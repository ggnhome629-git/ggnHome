/**
 * Custom Error Classes for consistent error handling
 * Use throughout the application for proper error cascading
 */

class BaseError extends Error {
  constructor(message, statusCode = 500, code = "ERROR", details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * 400 - Bad Request / Validation Error
 * Use for input validation failures
 */
class ValidationError extends BaseError {
  constructor(message = "Validation failed", details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

/**
 * 401 - Unauthorized
 * Use for missing/invalid authentication
 */
class AuthenticationError extends BaseError {
  constructor(message = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

/**
 * 403 - Forbidden
 * Use for insufficient permissions
 */
class AuthorizationError extends BaseError {
  constructor(message = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

/**
 * 404 - Not Found
 * Use when resource doesn't exist
 */
class NotFoundError extends BaseError {
  constructor(resource = "Resource", id = null) {
    const message = id ? `${resource} with ID "${id}" not found` : `${resource} not found`;
    super(message, 404, "NOT_FOUND");
  }
}

/**
 * 409 - Conflict
 * Use for duplicate entries or state conflicts
 */
class ConflictError extends BaseError {
  constructor(message = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

/**
 * 422 - Unprocessable Entity
 * Use for business logic violations
 */
class UnprocessableError extends BaseError {
  constructor(message = "Cannot process request", details = null) {
    super(message, 422, "UNPROCESSABLE", details);
  }
}

/**
 * 429 - Too Many Requests
 * Use when rate limit exceeded
 */
class RateLimitError extends BaseError {
  constructor(retryAfter = 60) {
    super("Too many requests. Please try again later.", 429, "RATE_LIMITED");
    this.retryAfter = retryAfter;
  }
}

/**
 * 500 - Internal Server Error
 * Use for unexpected errors
 */
class ServerError extends BaseError {
  constructor(message = "Internal server error", originalError = null) {
    super(message, 500, "SERVER_ERROR");
    this.originalError = originalError;
  }
}

/**
 * Database-specific errors
 */
class DatabaseError extends BaseError {
  constructor(message = "Database operation failed", code = "DB_ERROR", originalError = null) {
    super(message, 500, code);
    this.originalError = originalError;
  }
}

/**
 * External service errors (API calls, webhooks, etc)
 */
class ExternalServiceError extends BaseError {
  constructor(service, message = "External service error", statusCode = 500) {
    super(`${service}: ${message}`, statusCode, "EXTERNAL_SERVICE_ERROR");
    this.service = service;
  }
}

/**
 * Helper to convert Sequelize errors to custom errors
 */
function handleSequelizeError(error) {
  if (error.name === "SequelizeValidationError") {
    const details = error.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return new ValidationError("Validation failed", details);
  }

  if (error.name === "SequelizeUniqueConstraintError") {
    const field = error.fields?.[0] || "field";
    return new ConflictError(`${field} already exists`);
  }

  if (error.name === "SequelizeForeignKeyConstraintError") {
    return new UnprocessableError("Cannot delete: referenced by other records");
  }

  return new DatabaseError("Database operation failed", "DB_ERROR", error);
}

/**
 * Helper to convert Joi validation errors to details
 */
function formatJoiErrors(error) {
  return error.details.map((detail) => ({
    field: detail.path.join("."),
    message: detail.message,
    type: detail.type,
  }));
}

module.exports = {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  RateLimitError,
  ServerError,
  DatabaseError,
  ExternalServiceError,
  handleSequelizeError,
  formatJoiErrors,
};
