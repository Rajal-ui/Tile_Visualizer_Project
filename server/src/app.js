import express from "express";
import healthRouter from "./routes/health.js";
import adminRouter from "./routes/admin.js";

const app = express();

app.use(express.json());

// Mount feature routers
app.use("/api/admin", adminRouter);

app.get("/", (req, res) => {
  res.json({ name: "Tile Visualizer API", status: "ok" });
});

app.use("/health", healthRouter);

export default app;
