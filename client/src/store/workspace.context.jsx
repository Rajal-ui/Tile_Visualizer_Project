import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getTile } from "@/features/catalogue/data/tiles.js";
import { surfaceToZoneKey } from "@/features/catalogue/lib/tile-adapter.js";
import { useTiles } from "@/features/catalogue/hooks/useTiles.js";
import { getRoom, rooms } from "@/features/rooms/data/rooms.jsx";
import { useLayout } from "@/features/rooms/hooks/useLayout.js";

const WorkspaceContext = createContext(null);

const PREFS_KEY = "tv_workspace_prefs";

const defaults = {
  roomId: "living-room",
  surface: "Floor",
  applied: {},
  catalogueZone: "all",
  layoutId: null,
};

function loadStoredPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

/** Zone keys the catalogue surface tabs can filter by. */
const KNOWN_ZONES = ["floor", "wall", "counter"];

export function WorkspaceProvider({ children }) {
  const [prefs, setPrefs] = useState(loadStoredPrefs);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn("Failed to persist workspace prefs:", e);
    }
  }, [prefs]);

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
    setPrefs((p) => ({ ...p, roomId, surface: "Floor", layoutId: null, catalogueZone: "all" }));
  };

  // Changing the active surface (surface tabs or a canvas zone click) also
  // syncs the catalogue's zone tab so the gallery contextual-filters to tiles
  // compatible with the targeted surface.
  const setSurface = (surface) =>
    setPrefs((p) => {
      const zone = surfaceToZoneKey(surface);
      return {
        ...p,
        surface,
        catalogueZone: zone ?? p.catalogueZone,
      };
    });

  const setCatalogueZone = (zone) => setPrefs((p) => ({ ...p, catalogueZone: zone }));

  const setLayout = (layoutId) => setPrefs((p) => ({ ...p, layoutId }));

  // Applying a tile requires a selected layout — without one there is no
  // room geometry to preview against.
  const applyTile = (tileId, surface) =>
    setPrefs((p) => {
      if (!p.layoutId) return p;
      return {
        ...p,
        applied: { ...p.applied, [surface]: tileId },
      };
    });

  const removeTile = (surface) =>
    setPrefs((p) => {
      const applied = { ...p.applied };
      delete applied[surface];
      return { ...p, applied };
    });

  const resetAll = () => {
    try {
      localStorage.removeItem(PREFS_KEY);
    } catch {}
    setPrefs(defaults);
  };

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
    layout,
    layoutId: prefs.layoutId,
    setLayout,
    hasLayout: Boolean(prefs.layoutId),
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
