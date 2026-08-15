/**
 * Demo seed for the Rep-facing preview flow (Step 2 layout picker).
 *
 * Creates 2+ PUBLISHED layouts for the Kitchen room so the gallery picker,
 * auto-advance (single layout), and compositor-loaded-with-selected-layout
 * flows can be captured without manual polygon drawing in the admin Studio.
 *
 * The kitchen room photo only has one local asset set, so every demo layout
 * shares the same background/foreground; they differ by name and by which zone
 * planes (floor / wall / counter) are published. Layouts are upserted by id so
 * re-running is safe.
 *
 * Usage (from server/):
 *   npm run seed:demo-layouts
 *
 * Requires a reachable MongoDB (see MONGODB_URI in server/.env).
 */
import "dotenv/config";
import { connectDb, disconnectDb } from "../config/db.js";
import { layoutStorage } from "../services/layout-storage.js";
import { createRoom, createZone, createPlane, STATUS_PUBLISHED } from "@tile-visualizer/shared/schemas/layout.js";

const ROOM_ID = "kitchen";
const BACKGROUND = "/assets/rooms/kitchen/background.png";
const FOREGROUND = "/assets/rooms/kitchen/foreground.png";

const FLOOR_QUAD = { polygon: [[0, 560], [1728, 560], [1728, 910], [0, 910]] };
const WALL_QUAD = { polygon: [[0, 0], [1728, 0], [1728, 300], [0, 300]] };
const COUNTER_QUAD = { polygon: [[0, 420], [1728, 420], [1728, 540], [0, 540]] };

const DEMO_LAYOUTS = [
  {
    id: "kitchen-iridium",
    name: "Kitchen IRIDIUM",
    zones: [FLOOR_QUAD, WALL_QUAD, COUNTER_QUAD],
  },
  {
    id: "kitchen-onyx",
    name: "Kitchen ONYX",
    zones: [FLOOR_QUAD, WALL_QUAD],
  },
  {
    id: "kitchen-cloud",
    name: "Kitchen CLOUD",
    zones: [FLOOR_QUAD],
  },
];

async function main() {
  const connection = await connectDb();
  if (!connection) {
    console.error("❌ MONGODB_URI not set / database unreachable. Add it to server/.env and retry.");
    process.exit(1);
  }

  const created = [];
  for (const demo of DEMO_LAYOUTS) {
    const config = createRoom({
      id: demo.id,
      name: demo.name,
      roomId: ROOM_ID,
      background: BACKGROUND,
      foreground: FOREGROUND,
      status: STATUS_PUBLISHED,
      zones: demo.zones.map((quad, i) =>
        createZone({
          id: ["floor", "wall", "counter"][i],
          label: ["Floor", "Wall", "Counter"][i],
          planes: [createPlane(quad)],
        })
      ),
    });
    const saved = await layoutStorage.saveConfig(demo.id, config);
    created.push(saved);
    console.log(`✅ ${demo.name} (${saved.id}) — published, ${saved.zones?.length ?? 0} zones`);
  }

  console.log(
    `\nDemo seed complete: ${created.length} published layout(s) for the "${ROOM_ID}" room.`
  );
  console.log("Open the app → select the Kitchen room to see the Step 2 layout gallery.");
  await disconnectDb();
}

main().catch((err) => {
  console.error("❌ Demo layout seed failed:", err?.message || err);
  process.exit(1);
});