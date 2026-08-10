import { useState } from "react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import { getLayout } from "@/features/rooms/data/layouts.js";
import RoomCanvas from "@/features/visualizer/pages/RoomCanvas.jsx";

/**
 * RoomViewer — 3-layer CSS perspective tile visualizer.
 *
 * Layer stack (bottom → top):
 *   1. bg.jpg        — full room photo background
 *   2. Tile layer    — CSS 3D perspective tiled texture (only when tile applied to Floor)
 *   3. fg.png        — same room photo with floor area cut transparent (occludes furniture)
 *
 * If a room has no bg/fg assets, falls back to the SVG scene diagram.
 */

function TileLayer({ tile, floor }) {
  if (!tile || !floor) return null;

  const src = tile.texture?.src;
  if (!src) return null;

  const {
    perspective = 800,
    rotateX = 55,
    scaleX = 1.6,
    scaleY = 1.2,
    translateY = 120,
    originY = "100%",
    tileSize = 120,
  } = floor;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        perspective: `${perspective}px`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "200%",
          height: "200%",
          backgroundImage: `url(${src})`,
          backgroundSize: `${tileSize}px ${tileSize}px`,
          backgroundRepeat: "repeat",
          transform: `rotateX(${rotateX}deg) scaleX(${scaleX}) scaleY(${scaleY}) translateY(${translateY}px)`,
          transformOrigin: `50% ${originY}`,
          imageRendering: "auto",
        }}
      />
    </div>
  );
}

function PhotoViewer({ room, floorTile }) {
  const [bgLoaded, setBgLoaded] = useState(false);
  const [bgError, setBgError] = useState(false);

  const showPlaceholder = !room.bg || bgError;

  if (showPlaceholder && !bgLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-slate-400">
            {room.icon && <room.icon size={24} />}
          </div>
          <p className="text-sm font-semibold text-slate-500">{room.name}</p>
          <p className="mt-1 text-xs text-slate-400">Room photo coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Layer 1: Background room photo */}
      <img
        src={room.bg}
        alt={room.name}
        onLoad={() => setBgLoaded(true)}
        onError={() => setBgError(true)}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          display: bgError ? "none" : "block",
        }}
        draggable={false}
      />

      {/* Placeholder shown behind until image loads or if error */}
      {(!bgLoaded || bgError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-slate-400">
              {room.icon && <room.icon size={24} />}
            </div>
            <p className="text-sm font-semibold text-slate-500">{room.name}</p>
            <p className="mt-1 text-xs text-slate-400">Room photo coming soon</p>
          </div>
        </div>
      )}

      {/* Layer 2: CSS perspective tile (Floor only) — only when bg loaded */}
      {bgLoaded && !bgError && <TileLayer tile={floorTile} floor={room.floor} />}

      {/* Layer 3: Foreground photo with floor transparent */}
      {bgLoaded && !bgError && room.fg && (
        <img
          src={room.fg}
          alt=""
          aria-hidden
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          draggable={false}
        />
      )}
    </div>
  );
}


export default function Visualizer({ present = false }) {
  const { room, appliedTiles, surface, setSurface } = useWorkspace();
  const layout = room.layout ? getLayout(room.layout) : null;
  const floorTile = appliedTiles["Floor"] || null;
  const activeTile = appliedTiles[surface] || null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">{room.name}</h2>
          <p className="text-xs text-slate-400">{room.tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          {layout && activeTile && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {surface}: {activeTile.name}
            </span>
          )}
          {!layout && floorTile && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Floor: {floorTile.name}
            </span>
          )}
        </div>
      </div>

      {/* Room viewer */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-100">
        {layout ? (
          <RoomCanvas
            layout={layout}
            appliedTiles={appliedTiles}
            activeZone={surface}
            onZoneChange={setSurface}
          />
        ) : (
          <PhotoViewer room={room} floorTile={floorTile} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-4 py-2.5 text-xs text-slate-500">
        <span
          className="inline-block h-3 w-3 rounded ring-1 ring-black/10"
          style={{ backgroundColor: activeTile ? activeTile.colors[0] : "#cbd5e1" }}
        />
        <span className="font-semibold text-slate-700">{layout ? surface : "Floor"}</span>
        <span className="text-slate-300">·</span>
        <span>{activeTile ? activeTile.name : "No tile applied — select one from the panel →"}</span>
      </div>
    </div>
  );
}
