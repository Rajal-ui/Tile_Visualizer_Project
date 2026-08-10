const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs an array of express-validator chains, then throws a formatted
 * ApiError if any validation failed. Usage:
 *   router.post('/tiles', validate(tileValidators.create), controller.create)
 */
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));

  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const formatted = errors.array().map((e) => ({ field: e.path, message: e.msg }));
  next(ApiError.badRequest('Validation failed', formatted));
};

module.exports = validate;
