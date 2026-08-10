const { body, param, query } = require('express-validator');

const create = [
  body('name').notEmpty().withMessage('Layout name is required'),
  body('room').isMongoId().withMessage('Valid room id is required'),
  body('zones').custom((value) => {
    let parsed = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        throw new Error('zones must be valid JSON');
      }
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('zones must be a non-empty array');
    }
    const validSurfaces = ['floor', 'wall', 'ceiling'];
    parsed.forEach((z) => {
      if (!validSurfaces.includes(z.surface)) {
        throw new Error(`Invalid zone surface: ${z.surface}`);
      }
    });
    return true;
  }),
];

const update = [param('id').isMongoId()];

const idParam = [param('id').isMongoId().withMessage('Invalid layout id')];

const listQuery = [query('room').optional().isMongoId()];

module.exports = { create, update, idParam, listQuery };
