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
  catalogueZone: "all",
  layoutId: null,
};

/** Zone keys the catalogue surface tabs can filter by. */
const KNOWN_ZONES = ["floor", "wall", "counter"];

export function WorkspaceProvider({ children }) {
  const [prefs, setPrefs] = useState(defaults);

  const { tiles: catalogueTiles } = useTiles();

  const room = useMemo(() => {
    return rooms.find((x) => x.id === prefs.roomId) || rooms[0];
  }, [prefs.roomId]);

  const layout = useLayout(prefs.layoutId || room?.layout || null);

  // Photo-based rooms expose their zone labels (Floor/Wall/Counter...) as the
  // tileable surfaces; CSS rooms keep the default set.
  const surfaces = useMemo(() => {
    if (layout?.zones?.length) {
      return layout.zones.map((z) => z.label);
    }
    return ["Floor", "Wall", "Accent Wall"];
  }, [layout]);

  const setRoom = (roomId) => {
    setPrefs((p) => ({ ...p, roomId, surface: "Floor", catalogueZone: "all" }));
  };

  // Changing the active surface (surface tabs or a canvas zone click) also
  // syncs the catalogue's zone tab when the surface maps to a known zone.
  const setSurface = (surface) =>
    setPrefs((p) => {
      const zone = String(surface).toLowerCase();
      return {
        ...p,
        surface,
        catalogueZone: KNOWN_ZONES.includes(zone) ? zone : p.catalogueZone,
      };
    });

  const setCatalogueZone = (zone) => setPrefs((p) => ({ ...p, catalogueZone: zone }));
    setPrefs((p) => ({ ...p, roomId, surface: "Floor", layoutId: null }));
  };

  const setLayout = (layoutId) => setPrefs((p) => ({ ...p, layoutId }));

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
    setPrefs({ roomId: "living-room", surface: "Floor", applied: {}, catalogueZone: "all" });
    setPrefs({ roomId: "living-room", surface: "Floor", applied: {}, layoutId: null });

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
    layoutId: prefs.layoutId,
    setLayout,
    surfaces,
    surface: prefs.surface,
    setSurface,
    catalogueZone: prefs.catalogueZone,
    setCatalogueZone,
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
