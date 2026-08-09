import express from "express";
import healthRouter from "./routes/health.js";

const app = express();

app.use(express.json());

// TODO(backend): mount feature routers here as they are implemented, e.g.
//   app.use("/api/auth", authRouter);
//   app.use("/api/tiles", tileRouter);
//   app.use("/api/layouts", layoutRouter);
//   app.use("/api/rooms", roomRouter);

app.get("/", (req, res) => {
  res.json({ name: "Tile Visualizer API", status: "ok" });
});

app.use("/health", healthRouter);

export default app;
