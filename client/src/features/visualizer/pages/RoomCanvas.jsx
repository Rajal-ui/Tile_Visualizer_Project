import { useMemo, useRef, useEffect, useState } from "react";
import { compositeAllZones } from "@/features/visualizer/lib/canvas-compositor.js";

/**
 * Canvas renderer for photo-based (2-layer) room layouts.
 *
 * Draws background -> warped+masked tile per zone -> foreground on top, then
 * presents one tab per zone (label derived dynamically from layout.zones).
 */
export default function RoomCanvas({ layout, appliedTiles }) {
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(false);
  const [compositeError, setCompositeError] = useState(null);

  const zones = useMemo(() => layout?.zones || [], [layout]);

  const hasPlanes = useMemo(
    () => zones.some((z) => (z.planes || []).some((p) => (p.polygon || []).length >= 3)),
    [zones]
  );

  const hasAnyTile = useMemo(
    () =>
      zones.some((z) => {
        if (!appliedTiles) return false;
        return !!(appliedTiles[z.label] || appliedTiles[z.id]);
      }),
    [zones, appliedTiles]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout?.background) return;

    let cancelled = false;

    (async () => {
      setRendering(true);
      setCompositeError(null);
      try {
        await compositeAllZones({
          background: layout.background,
          foreground: layout.foreground,
          zones,
          appliedTiles,
          canvas,
        });
      } catch (err) {
        console.error("Canvas composite failed:", err);
        setCompositeError(err.message);
      }
      if (!cancelled) setRendering(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [layout, zones, appliedTiles]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Composite area */}
      <div className="relative min-h-0 flex-1 items-center justify-center overflow-hidden rounded-b-2xl bg-slate-50">
        <canvas
          ref={canvasRef}
          className="block h-full w-full object-contain"
        />
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <span className="text-xs font-semibold text-slate-500">Rendering perspective…</span>
          </div>
        )}
        {!hasPlanes && !rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <div className="rounded-xl bg-slate-900/90 px-4 py-3 text-center text-[11px] font-semibold text-slate-100 shadow-xl">
              This layout has no zone polygons yet.
              <div className="mt-1 font-normal text-slate-400">
                Open the Editor (Dashboard → Editor) to draw floor/wall/counter masks, then publish.
              </div>
            </div>
          </div>
        )}
        {hasPlanes && !hasAnyTile && !rendering && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="rounded-lg bg-slate-900/90 px-3 py-2 text-[11px] font-semibold text-slate-100 shadow-xl">
              Apply a tile to a surface (Floor / Wall / Counter) to preview it here.
            </div>
          </div>
        )}
        {compositeError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50/80">
            <span className="text-xs font-semibold text-red-600">
              Tile rendering failed: {compositeError}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
