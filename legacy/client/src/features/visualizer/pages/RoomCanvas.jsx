import { useRef, useEffect, useState } from "react";
import { compositeAllZones } from "@/features/visualizer/lib/canvas-compositor.js";
import { textureUrl } from "@/lib/textures.js";

export default function RoomCanvas({ baseImage, zones }) {
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImage) return;

    let cancelled = false;

    (async () => {
      setRendering(true);
      try {
        const compositorZones = zones
          .filter((z) => z.maskSrc && z.tile)
          .map((z) => ({
            maskSrc: z.maskSrc,
            materialSrc: textureUrl(z.tile.texture),
            corners: z.corners,
            lightMultiply: z.lightMultiply,
          }));

        await compositeAllZones(baseImage, compositorZones, canvas);
      } catch (err) {
        console.error("Canvas composite failed:", err);
      }
      if (!cancelled) setRendering(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [baseImage, zones]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <canvas
        ref={canvasRef}
        className="block max-h-full max-w-full object-contain"
      />
      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <span className="text-xs font-semibold text-slate-505">Rendering perspective…</span>
        </div>
      )}
    </div>
  );
}
