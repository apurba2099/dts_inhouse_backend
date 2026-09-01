class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // marks this as a known/expected error, not a bug

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;