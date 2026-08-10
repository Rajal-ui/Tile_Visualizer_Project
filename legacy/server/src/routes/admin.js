import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Temporary directory for uploads
const tempDir = path.join(__dirname, "../../temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const upload = multer({ dest: tempDir });

// 1. Run segmentation on an uploaded image
router.post("/segment", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file uploaded" });
  }

  const imagePath = req.file.path;
  const scriptPath = path.join(__dirname, "../utils/segment.py");

  // Run the segmentation Python script
  exec(`python "${scriptPath}" "${imagePath}"`, (error, stdout, stderr) => {
    // Delete temp file after running
    try {
      fs.unlinkSync(imagePath);
    } catch (e) {
      console.warn("Failed to delete temp file:", e);
    }

    if (error) {
      console.error("Python script execution error:", error);
      return res.status(500).json({ error: "Segmentation failed", details: error.message });
    }

    try {
      const result = JSON.parse(stdout);
      if (result.status === "error") {
        return res.status(500).json({ error: result.message });
      }
      res.json(result);
    } catch (parseError) {
      console.error("Failed to parse Python output:", parseError, "\nStdout was:", stdout);
      res.status(500).json({ error: "Failed to parse segmentation response" });
    }
  });
});

// 2. Save layout masks and configuration
router.post("/save-layout", upload.single("image"), async (req, res) => {
  try {
    const { name, zonesJson } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Layout name is required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Base image file is required" });
    }

    const zones = JSON.parse(zonesJson || "[]");

    // Define target directory in client's public assets
    // Workspace path: d:\Projects\Tile_Visualizer_Project
    const targetDir = path.join(__dirname, "../../../client/public/assets/room-layouts", name);
    const masksDir = path.join(targetDir, "masks");

    if (!fs.existsSync(masksDir)) {
      fs.mkdirSync(masksDir, { recursive: true });
    }

    // Save base photo
    const photoFilename = "photo" + path.extname(req.file.originalname);
    const targetPhotoPath = path.join(targetDir, photoFilename);
    fs.renameSync(req.file.path, targetPhotoPath);

    const zonesConfig = [];

    // Save masks
    for (const zone of zones) {
      const { label, corners, maskDataUrl, lightMultiply } = zone;
      if (!maskDataUrl) continue;

      // Clean label for filename
      const cleanLabel = label.toLowerCase().replace(/\s+/g, "-");
      const maskFilename = `${cleanLabel}-mask.png`;
      const targetMaskPath = path.join(masksDir, maskFilename);

      // Decode base64 mask
      const base64Data = maskDataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Save mask PNG using sharp
      await sharp(buffer).png().toFile(targetMaskPath);

      zonesConfig.push({
        id: cleanLabel,
        label: label,
        maskSrc: `/assets/room-layouts/${name}/masks/${maskFilename}`,
        corners: corners || null,
        lightMultiply: Number(lightMultiply || 0.55),
      });
    }

    // Save config JSON
    const configPath = path.join(targetDir, "config.json");
    const layoutConfig = {
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name: name,
      backgroundImage: `/assets/room-layouts/${name}/${photoFilename}`,
      zones: zonesConfig,
    };

    fs.writeFileSync(configPath, JSON.stringify(layoutConfig, null, 2), "utf8");

    res.json({
      success: true,
      message: "Layout saved successfully",
      config: layoutConfig,
    });
  } catch (err) {
    console.error("Save layout error:", err);
    res.status(500).json({ error: "Failed to save layout", details: err.message });
  }
});

// 3. Get all dynamically loaded layouts
router.get("/layouts", (req, res) => {
  const layoutsDir = path.join(__dirname, "../../../client/public/assets/room-layouts");
  if (!fs.existsSync(layoutsDir)) {
    return res.json([]);
  }

  try {
    const folders = fs.readdirSync(layoutsDir);
    const configs = [];

    for (const folder of folders) {
      const configPath = path.join(layoutsDir, folder, "config.json");
      if (fs.existsSync(configPath)) {
        try {
          const configData = fs.readFileSync(configPath, "utf8");
          configs.push(JSON.parse(configData));
        } catch (e) {
          console.warn(`Failed to read config for layout folder ${folder}:`, e);
        }
      }
    }

    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve layouts", details: err.message });
  }
});

export default router;
