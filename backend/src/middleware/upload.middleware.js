const multer = require('multer');
const { makeStorage } = require('../config/cloudinary');

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false);
};

const limits = { fileSize: 8 * 1024 * 1024 }; // 8MB per image

const uploadTileImage = multer({ storage: makeStorage('tiles'), fileFilter, limits });
const uploadTileTexture = multer({ storage: makeStorage('tile-textures'), fileFilter, limits });
const uploadLayoutImages = multer({ storage: makeStorage('layouts'), fileFilter, limits });
const uploadRoomImage = multer({ storage: makeStorage('rooms'), fileFilter, limits });
const uploadAvatar = multer({ storage: makeStorage('avatars'), fileFilter, limits });

module.exports = {
  uploadTileImage,
  uploadTileTexture,
  uploadLayoutImages,
  uploadRoomImage,
  uploadAvatar,
};
