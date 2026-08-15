import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import healthRouter from "./routes/health.js";
import layoutsRouter from "./routes/layouts.js";
import authRouter from "./routes/auth.js";
import tilesRouter from "./routes/tiles.js";
import categoriesRouter from "./routes/categories.js";
import roomsRouter from "./routes/rooms.js";
import uploadsRouter from "./routes/uploads.js";

const app = express();

// Production: the built SPA (client/dist) is served from the same origin as the
// API. Paths resolve relative to this file (server/src -> repo root).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, "../../client/dist");
const DIST_INDEX = path.join(CLIENT_DIST, "index.html");
const servesSpa = process.env.NODE_ENV === "production" && fs.existsSync(DIST_INDEX);

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  if (servesSpa) {
    return res.sendFile(DIST_INDEX);
  }
  res.json({ name: "Tile Visualizer API", status: "ok" });
});

app.use("/health", healthRouter);
app.use("/api/layouts", layoutsRouter);
app.use("/api/auth", authRouter);
app.use("/api/v1/tiles", tilesRouter);
app.use("/api/v1/categories", categoriesRouter);
app.use("/api/v1/rooms", roomsRouter);
app.use("/api/uploads", uploadsRouter);

// SPA fallback for client-side routes (production only). Skipped in dev/test so
// the Vite dev server keeps owning the client.
if (servesSpa) {
  app.use(express.static(CLIENT_DIST));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/health") || req.path === "/") {
      return next();
    }
    res.sendFile(DIST_INDEX);
  });
}

export default app;
