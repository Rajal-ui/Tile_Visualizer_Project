import mongoose from "mongoose";

const layoutSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: { type: String, default: "photo" },
    roomId: { type: String, default: null, index: true },
    status: { type: String, default: "draft" },
    background: { type: String, default: null },
    foreground: { type: String, default: null },
    zones: { type: Array, default: [] },
    assets: { type: Object, default: { masks: {} } },
  },
  { timestamps: true }
);

layoutSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    delete ret.createdAt;
    delete ret.updatedAt;
    return ret;
  },
});

export const Layout = mongoose.models.Layout || mongoose.model("Layout", layoutSchema);
