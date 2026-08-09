import app from "./app.js";
import { PORT, NODE_ENV } from "./config/env.js";

app.listen(PORT, () => {
  console.log(
    `[server] Tile Visualizer API listening on http://localhost:${PORT} (${NODE_ENV})`
  );
});
