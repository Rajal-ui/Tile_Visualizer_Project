import express from "express";
import healthRouter from "./routes/health.js";
import layoutsRouter from "./routes/layouts.js";
import authRouter from "./routes/auth.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ name: "Tile Visualizer API", status: "ok" });
});

app.use("/health", healthRouter);
app.use("/api/layouts", layoutsRouter);
app.use("/api/auth", authRouter);

export default app;
