const express = require('express');
const roomController = require('../controllers/room.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const roomValidator = require('../validators/room.validator');
const { uploadRoomImage } = require('../middleware/upload.middleware');

const router = express.Router();

// Public - browsing rooms doesn't require login per the frontend flow,
// but the whole app sits behind the single admin login at the client level.
router.get('/', roomController.listRooms);
router.get('/:id', validate(roomValidator.idParam), roomController.getRoom);

router.use(requireAuth);
router.post(
  '/',
  uploadRoomImage.single('coverImage'),
  validate(roomValidator.create),
  roomController.createRoom
);
router.put(
  '/:id',
  uploadRoomImage.single('coverImage'),
  validate(roomValidator.update),
  roomController.updateRoom
);
router.delete('/:id', validate(roomValidator.idParam), roomController.deleteRoom);

module.exports = router;
