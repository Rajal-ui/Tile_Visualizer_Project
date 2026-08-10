const { body, param } = require('express-validator');
const { ROOM_TYPES } = require('../models/Room.model');

const create = [
  body('name').isIn(ROOM_TYPES).withMessage(`name must be one of: ${ROOM_TYPES.join(', ')}`),
  body('description').optional().isString(),
  body('displayOrder').optional().isInt(),
];

const update = [
  param('id').isMongoId(),
  body('description').optional().isString(),
  body('displayOrder').optional().isInt(),
  body('isActive').optional().isBoolean(),
];

const idParam = [param('id').isMongoId().withMessage('Invalid room id')];

module.exports = { create, update, idParam };
