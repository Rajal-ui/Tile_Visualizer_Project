/**
 * Wraps an async route handler / controller and forwards errors to Express's
 * centralized error middleware via next(err), instead of needing try/catch
 * in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
