import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { compositeAllZones } from "@/features/visualizer/lib/canvas-compositor.js";

/** Neutral sample material so drawn planes are visible in the preview. */
const PREVIEW_TILE = {
  id: "__preview__",
  name: "Preview tile",
  texture: { kind: "solid", name: "Preview", base: "#94a3b8" },
};

/**
 * Wizard Step 4 — live preview. Renders a draft layout's background, foreground
 * and zone polygons through the same canvas compositor the Rep-facing app uses,
 * so admins can catch mistakes before publishing.
 */
export default function LayoutPreview({ layout }) {
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);

  const hasPlanes = useMemo(
    () =>
      (layout?.zones || []).some((zone) =>
        (zone.planes || []).some((plane) => (plane.polygon || []).length >= 3)
      ),
    [layout]
  );

  // Sample tile on every zone that has a completed plane, so the compositor
  // shows the actual floor/wall/counter tiling.
  const appliedTiles = useMemo(() => {
    const map = {};
    for (const zone of layout?.zones || []) {
      if ((zone.planes || []).some((plane) => (plane.polygon || []).length >= 3)) {
        map[zone.label] = PREVIEW_TILE;
      }
    }
    return map;
  }, [layout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout?.background) return;

    let cancelled = false;
    (async () => {
      setRendering(true);
      setError(null);
      try {
        await compositeAllZones({
          background: layout.background,
          foreground: layout.foreground,
          zones: layout.zones || [],
          appliedTiles,
          canvas,
        });
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) setRendering(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [layout, appliedTiles]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <canvas ref={canvasRef} className="mx-auto block max-h-[52vh] max-w-full" />

      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 size={14} className="animate-spin" /> Rendering preview…
          </span>
        </div>
      )}

      {!hasPlanes && !rendering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
          <div className="rounded-xl bg-slate-900/90 px-4 py-3 text-center text-[11px] font-semibold text-slate-100 shadow-xl">
            No zone polygons yet — draw them in the Zone Editor, then preview.
            <div className="mt-1 font-normal text-slate-400">
              You can still publish, but tiles won&apos;t render until planes are drawn.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50/80">
          <span className="flex items-center gap-2 text-xs font-semibold text-red-600">
            <TriangleAlert size={13} /> Preview failed: {error}
          </span>
        </div>
      )}
    </div>
  );
}
