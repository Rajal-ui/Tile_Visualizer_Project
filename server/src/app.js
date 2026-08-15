import express from "express";
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

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ name: "Tile Visualizer API", status: "ok" });
});

app.use("/health", healthRouter);
app.use("/api/layouts", layoutsRouter);
app.use("/api/auth", authRouter);
app.use("/api/v1/tiles", tilesRouter);
app.use("/api/v1/categories", categoriesRouter);
app.use("/api/v1/rooms", roomsRouter);
app.use("/api/uploads", uploadsRouter);

export default app;
