const mongoose = require('mongoose');
const slugify = require('slugify');

const ROOM_TYPES = ['Living Room', 'Kitchen', 'Bedroom', 'Balcony', 'Bathroom'];

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ROOM_TYPES,
      unique: true,
    },
    slug: { type: String, unique: true, index: true },
    icon: { type: String, default: null }, // icon key / url for frontend
    coverImage: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    description: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.pre('validate', function setSlug(next) {
  if (this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

roomSchema.index({ isActive: 1, displayOrder: 1 });

roomSchema.statics.ROOM_TYPES = ROOM_TYPES;

module.exports = mongoose.model('Room', roomSchema);
module.exports.ROOM_TYPES = ROOM_TYPES;
