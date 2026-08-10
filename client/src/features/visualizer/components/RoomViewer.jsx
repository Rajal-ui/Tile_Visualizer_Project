import { useEffect, useState } from "react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import { textureUrl } from "@/lib/textures.js";

/**
 * RoomViewer — 3-layer CSS perspective tile visualizer.
 *
 * Layer stack (bottom → top):
 *   1. bg.jpg        — full room photo background
 *   2. Tile layer    — CSS 3D perspective tiled texture (when a Floor tile is applied)
 *   3. fg.png        — same room photo with floor area cut transparent (occludes furniture)
 */

function useImageDimensions(src) {
  const [dims, setDims] = useState(null);

  useEffect(() => {
    if (!src) {
      setDims(null);
      return undefined;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      if (!cancelled) setDims(null);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return dims;
}

function PhotoViewer({ room, tile }) {
  const [bgState, setBgState] = useState("loading");
  const [fgState, setFgState] = useState("loading");

  useEffect(() => {
    setBgState("loading");
    setFgState("loading");
  }, [room.id]);

  const floor = room.floor || {};
  const perspective = floor.perspective || 800;
  const rotateX = floor.rotateX || 55;
  const scaleX = floor.scaleX || 1.6;
  const scaleY = floor.scaleY || 1.2;
  const translateY = floor.translateY || 120;
  const originY = floor.originY || "100%";
  const tileSize = floor.tileSize || 120;

  const tileImageUrl = tile ? textureUrl(tile.texture) : null;
  const tileDims = useImageDimensions(tileImageUrl);
  const aspect = tileDims && tileDims.h ? tileDims.w / tileDims.h : 1;
  const tileW = Math.round(tileSize * aspect);

  const bgFailed = bgState === "error";
  const loading = bgState === "loading" || (bgState === "ready" && fgState === "loading");

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      {/* Layer 1: Background room photo */}
      <img
        src={room.bg}
        alt={room.name}
        draggable={false}
        onLoad={() => setBgState("ready")}
        onError={() => setBgState("error")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: bgState === "ready" ? "block" : "none",
        }}
      />

      {/* Layer 2: Tile texture with CSS perspective transform */}
      {bgState === "ready" && tileImageUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            perspective: perspective + "px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "200%",
              height: "200%",
              backgroundImage: `url(${tileImageUrl})`,
              backgroundSize: `${tileW}px ${tileSize}px`,
              backgroundRepeat: "repeat",
              transform: `rotateX(${rotateX}deg) scaleX(${scaleX}) scaleY(${scaleY}) translateY(${translateY}px)`,
              transformOrigin: `50% ${originY}`,
            }}
          />
        </div>
      )}

      {/* Layer 3: Foreground — room photo with floor cut transparent */}
      {bgState === "ready" && (
        <img
          src={room.fg}
          alt=""
          aria-hidden
          draggable={false}
          onLoad={() => setFgState("ready")}
          onError={() => setFgState("error")}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
            display: fgState === "ready" ? "block" : "none",
          }}
        />
      )}

      {/* Animated shimmer while images load */}
      {loading && (
        <div
          className="absolute inset-0 animate-shimmer"
          style={{
            background:
              "linear-gradient(100deg, rgb(241 245 249) 40%, rgb(226 232 240) 50%, rgb(241 245 249) 60%)",
            backgroundSize: "200% 100%",
          }}
        />
      )}

      {/* Fallback card when the room photo fails to load */}
      {bgFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="animate-fade-in mx-4 max-w-xs rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              {room.icon && <room.icon size={24} />}
            </div>
            <p className="text-sm font-semibold text-slate-700">Couldn&apos;t load room photo</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              The background image for {room.name} failed to load. Check your connection and try
              again.
            </p>
          </div>
        </div>
      )}

      {/* Subtle notice if the foreground overlay fails (room still usable) */}
      {bgState === "ready" && fgState === "error" && (
        <div className="absolute left-3 top-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
          Room overlay unavailable
        </div>
      )}
    </div>
  );
}

export default function RoomViewer({ present = false }) {
  const { room, appliedTiles } = useWorkspace();
  const floorTile = appliedTiles["Floor"] || null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {!present && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">{room.name}</h2>
            <p className="text-xs text-slate-400">{room.tagline}</p>
          </div>
          {floorTile && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Floor: {floorTile.name}
            </span>
          )}
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-100">
        <PhotoViewer room={room} tile={floorTile} />
      </div>

      {!present && (
        <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-4 py-2.5 text-xs text-slate-500">
          <span
            className="inline-block h-3 w-3 rounded ring-1 ring-black/10"
            style={{ backgroundColor: floorTile ? floorTile.colors[0] : "#cbd5e1" }}
          />
          <span className="font-semibold text-slate-700">Floor</span>
          <span className="text-slate-300">·</span>
          <span>{floorTile ? floorTile.name : "No tile applied — select one from the panel →"}</span>
        </div>
      )}
    </div>
  );
}
