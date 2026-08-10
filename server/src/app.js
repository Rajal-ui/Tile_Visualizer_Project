import express from "express";
import healthRouter from "./routes/health.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ name: "Tile Visualizer API", status: "ok" });
});

app.use("/health", healthRouter);

export default app;
