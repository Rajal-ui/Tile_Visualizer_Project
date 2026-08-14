import { PORT, NODE_ENV, CLOUDINARY_CLOUD_NAME } from "./config/env.js";
import app from "./app.js";
import { connectDb } from "./config/db.js";
import { Admin, migrateAdminUsernames } from "./models/admin.js";

// Optional MongoDB connection: skipped (with a warning) when MONGODB_URI is
// unset, so local dev keeps working on disk storage. Fails fast when a URI is
// configured but unreachable.
try {
  const connection = await connectDb();
  if (connection) {
    await migrateAdminUsernames();
    await Admin.init();
  }
  if (CLOUDINARY_CLOUD_NAME) {
    console.log(`[cloudinary] CDN configured (cloud: ${CLOUDINARY_CLOUD_NAME})`);
  }
} catch (err) {
  console.error("[server] Startup failed:", err.message);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(
    `[server] Tile Visualizer API listening on http://localhost:${PORT} (${NODE_ENV})`
  );
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[server] Port ${PORT} is already in use. Stop the other instance (e.g. a stale "npm run dev" or "node src/server.js") or set a different PORT in server/.env.`
    );
  } else {
    console.error(`[server] Server error:`, err);
  }
  process.exit(1);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
});
