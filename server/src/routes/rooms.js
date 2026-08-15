import { Router } from "express";
import { Room } from "../models/index.js";
import { RoomSchema, validate } from "@tile-visualizer/shared/schemas/index.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

/** Write endpoints are reserved for authenticated admins. */
const adminOnly = [requireAuth, requireRole("admin")];

/** GET /api/v1/rooms — public list of active rooms. */
router.get("/", async (_req, res) => {
  try {
    const rooms = await Room.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json({ data: rooms });
  } catch (err) {
    console.error("list rooms error:", err.message);
    res.status(500).json({ error: "Failed to list rooms" });
  }
});

/** POST /api/v1/rooms — create a room (admin only). */
router.post("/", adminOnly, async (req, res) => {
  const check = validate(RoomSchema, req.body);
  if (!check.ok) {
    return res.status(400).json({ error: check.errors.join("; ") });
  }

  try {
    const room = await Room.create(check.data);
    res.status(201).json({ data: room });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: `Room with id "${check.data.id}" already exists` });
    }
    console.error("create room error:", err.message);
    res.status(500).json({ error: "Failed to create room" });
  }
});

export default router;
