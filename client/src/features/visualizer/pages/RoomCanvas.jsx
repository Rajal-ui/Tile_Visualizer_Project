import { useMemo, useRef, useEffect, useState } from "react";
import { compositeAllZones } from "@/features/visualizer/lib/canvas-compositor.js";

/**
 * Canvas renderer for photo-based (2-layer) room layouts.
 *
 * Draws background -> warped+masked tile per zone -> foreground on top, then
 * presents one tab per zone (label derived dynamically from layout.zones).
 */
export default function RoomCanvas({ layout, appliedTiles, activeZone, onZoneChange }) {
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(false);
  const [compositeFailed, setCompositeFailed] = useState(false);

  const zones = useMemo(
    () =>
      (layout?.zones || []).map((zone) => ({
        ...zone,
        opacity: zone.opacity ?? 1,
        lightMultiply: zone.lightMultiply ?? 0.55,
        materialScale: zone.materialScale ?? 1,
      })),
    [layout]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout?.background) return;

    let cancelled = false;

    (async () => {
      setRendering(true);
      setCompositeFailed(false);
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
        setCompositeFailed(true);
      }
      if (!cancelled) setRendering(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [layout, zones, appliedTiles]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Dynamic zone tabs */}
      <div className="flex shrink-0 border-b border-slate-200 bg-white">
        {zones.map((zone) => {
          const active = activeZone === zone.label;
          return (
            <button
              key={zone.id}
              onClick={() => onZoneChange?.(zone.label)}
              className={`relative flex-1 px-3 py-2 text-[10px] font-bold tracking-widest transition ${
                active ? "text-amber-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {zone.label.toUpperCase()}
              {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500" />}
            </button>
          );
        })}
      </div>

      {/* Composite area */}
      <div className="relative min-h-0 flex-1 items-center justify-center overflow-hidden rounded-b-2xl bg-slate-50">
        <canvas
          ref={canvasRef}
          className="block max-h-full max-w-full object-contain"
        />
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <span className="text-xs font-semibold text-slate-500">Rendering perspective…</span>
          </div>
        )}
        {compositeFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="text-xs font-semibold text-slate-500">
              Room assets not ready — add background/foreground to the layout.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
