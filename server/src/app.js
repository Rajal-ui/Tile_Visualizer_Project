import express from "express";
import cookieParser from "cookie-parser";
import healthRouter from "./routes/health.js";
import layoutsRouter from "./routes/layouts.js";
import authRouter from "./routes/auth.js";
import uploadsRouter from "./routes/uploads.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ name: "Tile Visualizer API", status: "ok" });
});

app.use("/health", healthRouter);
app.use("/api/layouts", layoutsRouter);
app.use("/api/auth", authRouter);
app.use("/api/uploads", uploadsRouter);

export default app;
