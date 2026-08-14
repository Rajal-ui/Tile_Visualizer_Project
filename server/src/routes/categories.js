import { Router } from "express";
import { CategoryTemplate } from "../models/index.js";

const router = Router();

/** GET /api/v1/categories — public list of category templates. */
router.get("/", async (_req, res) => {
  try {
    const categories = await CategoryTemplate.find({ isActive: true })
      .sort({ room: 1, name: 1 })
      .lean();
    res.json({ data: categories });
  } catch (err) {
    console.error("list categories error:", err.message);
    res.status(500).json({ error: "Failed to list categories" });
  }
});

export default router;
