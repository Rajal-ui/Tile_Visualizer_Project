import { Router } from "express";
import { Room } from "../models/index.js";

const router = Router();

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

export default router;
