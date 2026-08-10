const express = require('express');
const layoutController = require('../controllers/layout.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const layoutValidator = require('../validators/layout.validator');
const { uploadLayoutImages } = require('../middleware/upload.middleware');

const router = express.Router();

const layoutImageFields = uploadLayoutImages.fields([
  { name: 'previewImage', maxCount: 1 },
  { name: 'baseImage', maxCount: 1 },
]);

router.get('/', validate(layoutValidator.listQuery), layoutController.listLayouts);
router.get('/:id', validate(layoutValidator.idParam), layoutController.getLayout);

router.use(requireAuth);
router.post('/', layoutImageFields, validate(layoutValidator.create), layoutController.createLayout);
router.put('/:id', layoutImageFields, validate(layoutValidator.update), layoutController.updateLayout);
router.delete('/:id', validate(layoutValidator.idParam), layoutController.deleteLayout);

module.exports = router;
