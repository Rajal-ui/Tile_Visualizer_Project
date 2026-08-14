import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getTile } from "@/features/catalogue/data/tiles.js";
import { useTiles } from "@/features/catalogue/hooks/useTiles.js";
import { getRoom, rooms } from "@/features/rooms/data/rooms.jsx";
import { useLayout } from "@/features/rooms/hooks/useLayout.js";

const WorkspaceContext = createContext(null);

const PREFS_KEY = "tv_prefs";

const defaults = {
  roomId: "living-room",
  surface: "Floor",
  applied: {},
};

export function WorkspaceProvider({ children }) {
  const [prefs, setPrefs] = useState(defaults);

  const { tiles: catalogueTiles } = useTiles();

  const room = useMemo(() => {
    return rooms.find((x) => x.id === prefs.roomId) || rooms[0];
  }, [prefs.roomId]);

  const layout = useLayout(room?.layout || null);

  // Photo-based rooms expose their zone labels (Floor/Wall/Counter...) as the
  // tileable surfaces; CSS rooms keep the default set.
  const surfaces = useMemo(() => {
    if (layout?.zones?.length) {
      return layout.zones.map((z) => z.label);
    }
    return ["Floor", "Wall", "Accent Wall"];
  }, [layout]);

  const setRoom = (roomId) => {
    setPrefs((p) => ({ ...p, roomId, surface: "Floor" }));
  };

  const setSurface = (surface) => setPrefs((p) => ({ ...p, surface }));

  const applyTile = (tileId, surface) =>
    setPrefs((p) => ({
      ...p,
      applied: { ...p.applied, [surface]: tileId },
    }));

  const removeTile = (surface) =>
    setPrefs((p) => {
      const applied = { ...p.applied };
      delete applied[surface];
      return { ...p, applied };
    });

  const resetAll = () =>
    setPrefs({ roomId: "living-room", surface: "Floor", applied: {} });

  const appliedTiles = useMemo(() => {
    const map = {};
    for (const key of Object.keys(prefs.applied)) {
      map[key] =
        catalogueTiles.find((t) => t.id === prefs.applied[key]) || getTile(prefs.applied[key]);
    }
    return map;
  }, [prefs.applied, catalogueTiles]);

  const activeTile = appliedTiles[prefs.surface] || null;

  const value = {
    rooms,
    room,
    roomId: prefs.roomId,
    setRoom,
    surfaces,
    surface: prefs.surface,
    setSurface,
    appliedTiles,
    activeTile,
    applyTile,
    removeTile,
    resetAll,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
