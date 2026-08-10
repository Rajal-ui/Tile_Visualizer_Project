const mongoose = require('mongoose');

// Each zone defines a surface (floor / wall / ceiling) within the layout image
// where a tile texture can be visually applied on the frontend (canvas/WebGL).
// `maskUrl` is an optional alpha-mask image isolating that surface; `points`
// is an optional polygon (perspective quad) fallback for simple canvas warping.
const zoneSchema = new mongoose.Schema(
  {
    surface: {
      type: String,
      enum: ['floor', 'wall', 'ceiling'],
      required: true,
    },
    label: { type: String, default: '' }, // e.g. "Back Wall", "Left Wall"
    maskUrl: { type: String, default: null },
    maskPublicId: { type: String, default: null },
    points: {
      // 4-point perspective polygon [{x,y}, ...] normalized 0-1 against image size
      type: [{ x: Number, y: Number }],
      default: undefined,
    },
    defaultColor: { type: String, default: '#e5e5e5' },
  },
  { _id: true }
);

const layoutSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Layout 1"
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    previewImage: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    baseImage: {
      // full-resolution base render used for tile visualization compositing
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    zones: {
      type: [zoneSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'Layout must have at least one zone (floor/wall/ceiling)',
      },
    },
    tags: [{ type: String }],
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

layoutSchema.index({ room: 1, isActive: 1, displayOrder: 1 });

module.exports = mongoose.model('Layout', layoutSchema);
