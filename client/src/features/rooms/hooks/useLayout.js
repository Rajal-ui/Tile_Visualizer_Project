import { useEffect, useState } from "react";
import { fetchLayout } from "@/services/layouts.api.js";
import { getLayout } from "@/features/rooms/data/layouts.js";

/**
 * Resolve a photo layout config for a room, preferring the backend-served
 * version (published polygons) and falling back to the static seed while the
 * API is unavailable or the layout hasn't been saved yet.
 *
 * @param {string|null} roomId  photo-layout room id, or null/undefined
 * @returns {Object|null}       canonical Room config (see shared/schemas/layout.js)
 */
export function useLayout(roomId) {
  const [layout, setLayout] = useState(() => (roomId ? getLayout(roomId) : null));

  useEffect(() => {
    if (!roomId) {
      setLayout(null);
      return;
    }
    let cancelled = false;
    setLayout(getLayout(roomId));
    fetchLayout(roomId)
      .then((cfg) => {
        if (!cancelled) {
          setLayout(cfg);
          console.debug(
            `[useLayout] ${roomId}: backend — zones ${cfg.zones?.length ?? 0}, planes ${cfg.zones?.flatMap((z) => z.planes || []).length ?? 0}`
          );
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLayout(getLayout(roomId));
          console.debug(`[useLayout] ${roomId}: backend unavailable, using seed (${e.message})`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  return layout;
}
