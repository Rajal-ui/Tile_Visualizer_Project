const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const visualizationSchema = new mongoose.Schema(
  {
    shareId: { type: String, unique: true, default: uuidv4, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    layout: { type: mongoose.Schema.Types.ObjectId, ref: 'Layout', required: true },
    appliedTiles: {
      floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Tile', default: null },
      wall: { type: mongoose.Schema.Types.ObjectId, ref: 'Tile', default: null },
      ceiling: { type: mongoose.Schema.Types.ObjectId, ref: 'Tile', default: null },
    },
    resultImage: {
      // optional server-rendered/composited snapshot, if generated
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    title: { type: String, default: 'Untitled Visualization' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

visualizationSchema.index({ admin: 1, createdAt: -1 });

module.exports = mongoose.model('Visualization', visualizationSchema);
