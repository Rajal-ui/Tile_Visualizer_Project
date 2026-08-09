import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getTile } from "@/features/catalogue/data/tiles.js";
import { getRoom, rooms } from "@/features/rooms/data/rooms.jsx";

const WorkspaceContext = createContext(null);

const PREFS_KEY = "tv_prefs";

function loadPrefs() {
  const defaults = {
    roomId: "living-room",
    surface: "Floor",
    applied: {},
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

  const room = useMemo(() => {
    return rooms.find((x) => x.id === prefs.roomId) || rooms[0];
  }, [prefs.roomId]);

  const surfaces = ["Floor", "Wall", "Accent Wall"];

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
      map[key] = getTile(prefs.applied[key]);
    }
    return map;
  }, [prefs.applied]);

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
