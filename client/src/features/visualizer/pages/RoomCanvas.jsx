import { useMemo, useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { compositeAllZones } from "@/features/visualizer/lib/canvas-compositor.js";
import { pointInPolygon } from "@/features/visualizer/lib/polygon.js";

/**
 * Canvas renderer for photo-based (2-layer) room layouts.
 *
 * Draws background -> warped+masked tile per zone -> foreground on top. Clicking
 * a zone polygon reports the zone's label up through `onSelectZone` so the
 * active surface/catalogue tab can follow the rep's editing target.
 */
const RoomCanvas = forwardRef((props, ref) => {
  const { layout, appliedTiles, onSelectZone } = props;
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(false);
  const [compositeError, setCompositeError] = useState(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

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

  const handleCanvasClick = (e) => {
    if (!onSelectZone) return;
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width || !canvas.height) return;

    // Map the pointer to the canvas's internal image coordinates. The element
    // is letterboxed with object-contain, so undo the uniform scale + offset.
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const x = (e.clientX - rect.left - (rect.width - canvas.width * scale) / 2) / scale;
    const y = (e.clientY - rect.top - (rect.height - canvas.height * scale) / 2) / scale;

    // Top-most (drawn last) zone wins.
    for (let i = zones.length - 1; i >= 0; i--) {
      const zone = zones[i];
      const hit = (zone.planes || []).some(
        (p) => (p.polygon || []).length >= 3 && pointInPolygon([x, y], p.polygon)
      );
      if (hit) {
        onSelectZone(zone.label);
        return;
      }
    }
  };

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
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden">
      {/* Composite area */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-b-2xl bg-slate-50">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`block max-h-full max-w-full object-contain ${onSelectZone && hasPlanes ? "cursor-pointer" : ""}`}
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
});

RoomCanvas.displayName = "RoomCanvas";

export default RoomCanvas;
