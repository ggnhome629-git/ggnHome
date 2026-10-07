/**
 * Joi Validation Middleware
 * Validates request body, query params, or params against schemas
 * Collects all errors (abortEarly: false) for better UX
 */

const { ValidationError, formatJoiErrors } = require("../utils/errors");
const { sendError } = require("../utils/response");

/**
 * Factory function to create validation middleware
 * Usage: validate(schema, 'body')
 *        validate(schema, 'query')
 *        validate(schema, 'params')
 */
const validate = (schema, target = "body") => {
  return async (req, res, next) => {
    try {
      const data = target === "body" ? req.body : target === "query" ? req.query : req.params;

      // Validate against schema
      const { error, value } = schema.validate(data, {
        abortEarly: false, // Collect all errors
        stripUnknown: true, // Remove unknown keys
        convert: true, // Type conversion
      });

      if (error) {
        const details = formatJoiErrors(error);
        const err = new ValidationError("Validation failed", details);
        return sendError(res, err, 400);
      }

      // Replace with validated value (with type conversions applied)
      if (target === "body") req.body = value;
      else if (target === "query") req.query = value;
      else req.params = value;

      next();
    } catch (err) {
      const validationErr = new ValidationError("Validation middleware error");
      sendError(res, validationErr, 400);
    }
  };
};

/**
 * Validate multiple targets at once
 * Usage: validateMulti({
 *   body: bodySchema,
 *   query: querySchema,
 *   params: paramsSchema
 * })
 */
const validateMulti = (schemas) => {
  return async (req, res, next) => {
    const allErrors = [];

    for (const [target, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      const data = target === "body" ? req.body : target === "query" ? req.query : req.params;

      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const details = formatJoiErrors(error).map((d) => ({
          ...d,
          target,
        }));
        allErrors.push(...details);
      } else {
        // Replace with validated value
        if (target === "body") req.body = value;
        else if (target === "query") req.query = value;
        else req.params = value;
      }
    }

    if (allErrors.length > 0) {
      const err = new ValidationError("Validation failed", allErrors);
      return sendError(res, err, 400);
    }

    next();
  };
};

module.exports = {
  validate,
  validateMulti,
};
