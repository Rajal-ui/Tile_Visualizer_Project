const express = require('express');
const tileController = require('../controllers/tile.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const tileValidator = require('../validators/tile.validator');
const { uploadTileImage } = require('../middleware/upload.middleware');
const { searchLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

const tileImageFields = uploadTileImage.fields([
  { name: 'image', maxCount: 1 },
  { name: 'textureImage', maxCount: 1 },
]);

// Public browse/search - this is the "Tile Catalogue & Search/Filters" screen
router.get('/search', searchLimiter, validate(tileValidator.searchQuery), tileController.searchTiles);
router.get('/autocomplete', searchLimiter, tileController.autocomplete);
router.get('/catalogue/pdf', tileController.downloadCataloguePdf);
router.get('/:id', validate(tileValidator.idParam), tileController.getTile);

router.use(requireAuth);
router.post('/', tileImageFields, validate(tileValidator.create), tileController.createTile);
router.put('/:id', tileImageFields, validate(tileValidator.update), tileController.updateTile);
router.delete('/:id', validate(tileValidator.idParam), tileController.deleteTile);

module.exports = router;
