const express = require('express');

const authRoutes = require('./auth.routes');
const roomRoutes = require('./room.routes');
const layoutRoutes = require('./layout.routes');
const tileRoutes = require('./tile.routes');
const visualizationRoutes = require('./visualization.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date() }));

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/layouts', layoutRoutes);
router.use('/tiles', tileRoutes);
router.use('/visualizations', visualizationRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
