import mongoose from "mongoose";

const tileSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryTemplate",
      required: true,
    },
    tileImage: { type: String },
    thumbnailUrl: { type: String },
    properties: {
      thickness: { type: String, default: "10mm" },
      tilesInBox: { type: Number, default: 4 },
      longevity: { type: String, default: "15+ years" },
      application: { type: String, default: "Floor" },
    },
    size: { type: String },
    material: { type: String },
    finish: { type: String },
    format: { type: String },
    pattern: { type: String },
    grout: { type: String },
    price: { type: Number },
    rooms: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    texture: {
      kind: { type: String, default: "image" },
      src: { type: String },
    },
  },
  { timestamps: true }
);

// MongoDB $text index backing GET /api/v1/tiles/search.
tileSchema.index({ title: "text", material: "text", finish: "text", size: "text" });

export const Tile = mongoose.models.Tile || mongoose.model("Tile", tileSchema);
