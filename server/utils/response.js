/**
 * Response Formatter - Consistent response structure across all endpoints
 */

/**
 * Format success response
 */
const success = (data = null, message = "Success", meta = {}) => {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
};

/**
 * Format error response
 */
const error = (errorObj, meta = {}) => {
  const response = {
    success: false,
    error: {
      code: errorObj.code || "ERROR",
      message: errorObj.message || "An error occurred",
    },
  };

  // Add details if present
  if (errorObj.details && Array.isArray(errorObj.details)) {
    response.error.details = errorObj.details;
  } else if (errorObj.details && typeof errorObj.details === "object") {
    response.error.details = errorObj.details;
  }

  // Add retry info for rate limit errors
  if (errorObj.retryAfter) {
    response.meta = { retryAfter: errorObj.retryAfter };
  } else {
    response.meta = {};
  }

  // Merge in any provided meta
  response.meta = { ...response.meta, ...meta };

  return response;
};

/**
 * Send success response via Express res object
 */
const sendSuccess = (res, data = null, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json(success(data, message, { requestId: res.locals?.requestId }));
};

/**
 * Send error response via Express res object
 */
const sendError = (res, errorObj, statusCode = null) => {
  const code = statusCode || errorObj.statusCode || 500;
  const meta = { requestId: res.locals?.requestId };
  return res.status(code).json(error(errorObj, meta));
};

/**
 * Pagination helper
 */
const paginate = (data, page = 1, limit = 20, total = null) => {
  const skip = (page - 1) * limit;
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: total ? Math.ceil(total / limit) : null,
      hasNext: total ? page * limit < total : null,
      hasPrev: page > 1,
    },
  };
};

/**
 * List response with pagination
 */
const list = (data, pagination) => {
  return {
    success: true,
    message: "Retrieved successfully",
    data,
    meta: {
      pagination,
      timestamp: new Date().toISOString(),
    },
  };
};

module.exports = {
  success,
  error,
  sendSuccess,
  sendError,
  paginate,
  list,
};
