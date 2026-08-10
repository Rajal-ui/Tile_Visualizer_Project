const express = require('express');
const vizController = require('../controllers/visualization.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Public share link - no auth, so a link can be opened by anyone it's shared with
router.get('/share/:shareId', vizController.getSharedVisualization);

router.use(requireAuth);
router.post('/', vizController.saveVisualization);
router.get('/', vizController.listVisualizations);
router.get('/:id', vizController.getVisualization);
router.delete('/:id', vizController.deleteVisualization);

module.exports = router;
