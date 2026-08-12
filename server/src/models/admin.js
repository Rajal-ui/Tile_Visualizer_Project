import mongoose from "mongoose";
import { ADMIN_ROLES } from "@tile-visualizer/shared/schemas/index.js";

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: "admin" },
    resetTokenHash: { type: String, select: false, default: null },
    resetTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

adminSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.resetTokenHash;
    delete ret.resetTokenExpiresAt;
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Admin =
  mongoose.models.Admin || mongoose.model("Admin", adminSchema);
