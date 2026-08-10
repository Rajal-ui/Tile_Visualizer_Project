const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const authValidator = require('../validators/auth.validator');
const { loginLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

router.post('/login', loginLimiter, validate(authValidator.login), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

router.use(requireAuth);
router.post('/logout-all', authController.logoutAll);
router.get('/me', authController.me);
router.put('/change-password', validate(authValidator.changePassword), authController.changePassword);

module.exports = router;
