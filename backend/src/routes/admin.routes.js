const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { uploadAvatar } = require('../middleware/upload.middleware');

const router = express.Router();

router.use(requireAuth);
router.get('/dashboard', adminController.dashboard);
router.get('/system-health', adminController.systemHealth);
router.put('/profile', uploadAvatar.single('avatar'), adminController.updateProfile);

module.exports = router;
