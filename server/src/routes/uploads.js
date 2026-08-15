import { Router } from "express";
import multer from "multer";
import { cloudinaryService } from "../services/cloudinary.js";

const router = Router();

// Memory storage, 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "image/png" || file.mimetype === "image/jpeg" || file.mimetype === "image/webp") {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PNG, JPEG, and WebP are allowed."));
    }
  },
});

/**
 * POST /api/uploads — upload an image to Cloudinary.
 *
 * Body fields:
 *   image   — the file (multipart, "image" field).
 *   folder  — optional Cloudinary folder, e.g. "rooms/{roomId}/background",
 *             "rooms/{roomId}/foreground", "rooms/{roomId}/masks".
 *             Defaults to "tile-visualizer/tiles".
 */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const folder = typeof req.body.folder === "string" ? req.body.folder.trim() : undefined;

    const result = folder
      ? await cloudinaryService.uploadImage(req.file.buffer, req.file.originalname, { folder })
      : await cloudinaryService.uploadTileImage(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (e) {
    console.error("Upload error:", e);
    // Map multer error or custom error to 400, otherwise 500
    if (e.message.includes("Invalid file type") || e.message.includes("too large")) {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: "Internal server error during upload", details: e.message });
  }
});

// Express error handling middleware for multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 10 MB." });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;
