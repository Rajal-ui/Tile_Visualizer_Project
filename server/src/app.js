import express from "express";
import healthRouter from "./routes/health.js";
import layoutsRouter from "./routes/layouts.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ name: "Tile Visualizer API", status: "ok" });
});

app.use("/health", healthRouter);
app.use("/api/layouts", layoutsRouter);

export default app;
