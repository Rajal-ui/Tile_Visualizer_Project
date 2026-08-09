import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getTile } from "@/features/catalogue/data/tiles.js";
import { getRoom } from "@/features/rooms/data/rooms.jsx";
import { surfaces } from "@/features/layouts/data/surfaces.js";

const WorkspaceContext = createContext(null);

const PREFS_KEY = "tv_prefs";

function loadPrefs() {
  const defaults = {
    roomId: "living-room",
    surface: "Floor",
    applied: {},
    catalogueDark: false,
  };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return { ...defaults, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return defaults;
  }
}

export function WorkspaceProvider({ children }) {
  const [prefs, setPrefs] = useState(loadPrefs);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setRoom = (roomId) =>
    setPrefs((p) => ({ ...p, roomId, surface: surfaces[0] }));

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

  const toggleCatalogueDark = () =>
    setPrefs((p) => ({ ...p, catalogueDark: !p.catalogueDark }));

  const resetAll = () =>
    setPrefs({ roomId: "living-room", surface: "Floor", applied: {}, catalogueDark: false });

  const room = useMemo(() => getRoom(prefs.roomId), [prefs.roomId]);

  const appliedTiles = useMemo(() => {
    const map = {};
    for (const key of Object.keys(prefs.applied)) {
      map[key] = getTile(prefs.applied[key]);
    }
    return map;
  }, [prefs.applied]);

  const activeTile = appliedTiles[prefs.surface] || null;

  const value = {
    room,
    roomId: prefs.roomId,
    setRoom,
    surface: prefs.surface,
    setSurface,
    appliedTiles,
    activeTile,
    applyTile,
    removeTile,
    catalogueDark: prefs.catalogueDark,
    toggleCatalogueDark,
    resetAll,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
