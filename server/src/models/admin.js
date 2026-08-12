import mongoose from "mongoose";
import { ADMIN_ROLES } from "@tile-visualizer/shared/schemas/index.js";

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
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

export async function migrateAdminUsernames() {
  const missing = await Admin.find({ username: { $exists: false } });
  for (const admin of missing) {
    const fallback = admin.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    let proposed = fallback;
    let i = 1;
    while (await Admin.findOne({ username: proposed })) {
      proposed = `${fallback}${i++}`;
    }
    await Admin.updateOne({ _id: admin._id }, { $set: { username: proposed } });
  }
}
