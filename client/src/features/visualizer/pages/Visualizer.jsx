import { useState, useRef, forwardRef } from "react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import { useLayout } from "@/features/rooms/hooks/useLayout.js";
import RoomCanvas from "@/features/visualizer/pages/RoomCanvas.jsx";
import ExportModal from "@/features/visualizer/components/ExportModal.jsx";

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

const PhotoViewer = forwardRef(({ room, floorTile }, ref) => {
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
    <div ref={ref} className="photo-viewer-container" style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
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
});

PhotoViewer.displayName = "PhotoViewer";


export default function Visualizer({ present = false, layoutId = null }) {
  const { room, appliedTiles, setSurface, surfaces } = useWorkspace();
  const layout = useLayout(layoutId || room.layout || null);
  const floorTile = appliedTiles["Floor"] || null;
  const [exportOpen, setExportOpen] = useState(false);
  const viewerRef = useRef(null);

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {!present && (
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2.5 bg-slate-50 rounded-t-2xl">
          <h1 className="text-base font-semibold text-slate-900">
            {room?.name || layout?.name || "Visualizer"}
          </h1>
          <button
            onClick={() => setExportOpen(true)}
            disabled={!layout && !room}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export PDF
          </button>
        </div>
      )}
      {/* Room viewer */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-100">
        {layout ? (
          <RoomCanvas
            ref={viewerRef}
            layout={layout}
            appliedTiles={appliedTiles}
            onSelectZone={setSurface}
          />
        ) : (
          <PhotoViewer ref={viewerRef} room={room} floorTile={floorTile} />
        )}
      </div>

      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        room={room}
        layout={layout}
        appliedTiles={appliedTiles}
        surfaces={surfaces}
        viewerRef={viewerRef}
      />
    </div>
  );
}