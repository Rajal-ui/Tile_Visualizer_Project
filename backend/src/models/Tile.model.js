const mongoose = require('mongoose');

const tileSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    sku: { type: String, unique: true, sparse: true, trim: true },
    image: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    textureImage: {
      // seamless/tileable texture used for canvas visualization overlay
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    category: {
      type: String,
      enum: ['Wall', 'Floor', 'Ceiling', 'Decor'],
      required: true,
      index: true,
    },
    application: {
      // where this tile can be applied in a layout
      type: [String],
      enum: ['floor', 'wall', 'ceiling'],
      required: true,
    },
    material: {
      type: String,
      enum: ['Ceramic', 'Vitrified', 'Porcelain', 'Marble', 'Granite', 'Mosaic', 'Wood', 'Stone'],
      required: true,
      index: true,
    },
    finish: {
      type: String,
      enum: ['Glossy', 'Matte', 'Satin', 'Rustic', 'Textured', 'Polished'],
      required: true,
      index: true,
    },
    size: {
      length: { type: Number, required: true }, // in mm
      width: { type: Number, required: true },
      unit: { type: String, default: 'mm' },
    },
    thickness: { type: Number, default: null }, // mm
    color: { type: String, default: null },
    tilesInBox: { type: Number, default: null },
    coverageAreaPerBox: { type: Number, default: null }, // sq. ft.
    longevity: { type: String, default: null }, // e.g. "15+ years"
    price: {
      value: { type: Number, default: null },
      unit: { type: String, default: 'per sq.ft' },
    },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

tileSchema.index({ title: 'text', description: 'text', material: 'text' });
tileSchema.index({ isActive: 1, category: 1, material: 1, finish: 1 });

// Shape used for Elasticsearch indexing - keep in sync with es mapping
tileSchema.methods.toSearchDocument = function toSearchDocument() {
  return {
    id: this._id.toString(),
    title: this.title,
    sku: this.sku,
    imageUrl: this.image?.url,
    category: this.category,
    application: this.application,
    material: this.material,
    finish: this.finish,
    size: `${this.size?.length}x${this.size?.width}${this.size?.unit}`,
    length: this.size?.length,
    width: this.size?.width,
    thickness: this.thickness,
    color: this.color,
    longevity: this.longevity,
    price: this.price?.value,
    description: this.description,
    isActive: this.isActive,
    isFeatured: this.isFeatured,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('Tile', tileSchema);
