const { body, param, query } = require('express-validator');

const CATEGORY = ['Wall', 'Floor', 'Ceiling', 'Decor'];
const MATERIAL = ['Ceramic', 'Vitrified', 'Porcelain', 'Marble', 'Granite', 'Mosaic', 'Wood', 'Stone'];
const FINISH = ['Glossy', 'Matte', 'Satin', 'Rustic', 'Textured', 'Polished'];
const APPLICATION = ['floor', 'wall', 'ceiling'];

const create = [
  body('title').notEmpty().withMessage('Title is required'),
  body('category').isIn(CATEGORY).withMessage(`category must be one of: ${CATEGORY.join(', ')}`),
  body('material').isIn(MATERIAL).withMessage(`material must be one of: ${MATERIAL.join(', ')}`),
  body('finish').isIn(FINISH).withMessage(`finish must be one of: ${FINISH.join(', ')}`),
  body('application')
    .custom((value) => {
      const arr = Array.isArray(value) ? value : String(value).split(',');
      return arr.every((v) => APPLICATION.includes(v.trim()));
    })
    .withMessage(`application must contain only: ${APPLICATION.join(', ')}`),
  body('size.length').optional().isFloat({ min: 0 }),
  body('size.width').optional().isFloat({ min: 0 }),
  body('length').optional().isFloat({ min: 0 }),
  body('width').optional().isFloat({ min: 0 }),
];

const update = [param('id').isMongoId()];

const idParam = [param('id').isMongoId().withMessage('Invalid tile id')];

const searchQuery = [
  query('q').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = { create, update, idParam, searchQuery, CATEGORY, MATERIAL, FINISH, APPLICATION };
