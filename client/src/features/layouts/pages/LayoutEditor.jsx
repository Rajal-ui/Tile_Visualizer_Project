import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Brush, Eraser, MousePointer2, Save, Trash2, Eye } from "lucide-react";
import { getLayout } from "@/features/rooms/data/layouts.js";

const ZONE_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"];

const CORNER_ORDER = ["Top-Left", "Top-Right", "Bottom-Right", "Bottom-Left"];

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Convert a white-on-black mask into white-on-transparent (alpha = luminance).
 * Used when restoring previously saved masks so the editor's overlay tint
 * only colors painted strokes instead of the whole frame.
 */
function convertLumToAlpha(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = 255;
    d[i + 1] = 255;
    d[i + 2] = 255;
    d[i + 3] = lum > 128 ? 255 : 0;
  }
  ctx.putImageData(imgData, 0, 0);
}

export default function LayoutEditor({ layoutId = "kitchen-iridium", onClose }) {
  const [layout, setLayout] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [activeZoneId, setActiveZoneId] = useState(null);
  const [mode, setMode] = useState("paint"); // "paint" | "corners"
  const [tool, setTool] = useState("brush"); // "brush" | "erase"
  const [brushSize, setBrushSize] = useState(40);
  const [showRef, setShowRef] = useState(false);
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef(null);
  const baseImgRef = useRef(null);
  const fgImgRef = useRef(null);
  const maskCvsRef = useRef({});
  const cornersRef = useRef({});
  const paintingRef = useRef(false);
  const draggingCornerRef = useRef(null);
  const lastPaintRef = useRef(null);

  // Resolve the layout config
  useEffect(() => {
    const l = getLayout(layoutId);
    setLayout(l);
    if (l) {
      cornersRef.current = Object.fromEntries(
        l.zones.map((z) => [z.id, z.corners && z.corners.length === 4 ? z.corners.map((p) => [...p]) : []])
      );
      setActiveZoneId((cur) => cur || l.zones[0]?.id || null);
    }
  }, [layoutId]);

  // Load base + reference images and prepare mask canvases
  useEffect(() => {
    if (!layout) return;
    let cancelled = false;

    (async () => {
      const [base, fg] = await Promise.all([
        loadImage(layout.background),
        layout.foreground ? loadImage(layout.foreground) : Promise.resolve(null),
      ]);
      if (cancelled || !base) return;

      baseImgRef.current = base;
      fgImgRef.current = fg;

      const W = base.naturalWidth;
      const H = base.naturalHeight;

      // Prepare a transparent mask canvas per zone; restore existing masks if any
      maskCvsRef.current = {};
      for (const zone of layout.zones) {
        const cvs = document.createElement("canvas");
        cvs.width = W;
        cvs.height = H;
        const ctx = cvs.getContext("2d");
        maskCvsRef.current[zone.id] = cvs;

        const existing = await loadImage(zone.maskSrc);
        if (existing && existing.naturalWidth === W && existing.naturalHeight === H) {
          ctx.drawImage(existing, 0, 0);
          convertLumToAlpha(ctx, W, H);
        }
      }

      if (canvasRef.current) {
        canvasRef.current.width = W;
        canvasRef.current.height = H;
      }

      setLoaded(true);
      setVersion((v) => v + 1);
    })();

    return () => {
      cancelled = true;
    };
  }, [layout]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const bump = () => setVersion((v) => v + 1);

  const paintAt = (x, y) => {
    const mask = maskCvsRef.current[activeZoneId];
    if (!mask) return;
    const ctx = mask.getContext("2d");
    ctx.save();
    if (tool === "erase") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#ffffff";
    }
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, brushSize / 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    bump();
  };

  const paintLine = (x0, y0, x1, y1) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / (Math.max(2, brushSize) / 2)));
    for (let i = 0; i <= steps; i++) {
      paintAt(x0 + (dx * i) / steps, y0 + (dy * i) / steps);
    }
  };

  const handleMouseDown = (e) => {
    if (!loaded) return;
    const { x, y } = getCanvasCoords(e);

    if (mode === "corners") {
      const pts = cornersRef.current[activeZoneId] || [];
      let found = -1;
      for (let i = 0; i < pts.length; i++) {
        if (Math.hypot(x - pts[i][0], y - pts[i][1]) < 16) {
          found = i;
          break;
        }
      }
      if (found !== -1) {
        draggingCornerRef.current = found;
      } else if (pts.length < 4) {
        cornersRef.current[activeZoneId] = [...pts, [Math.round(x), Math.round(y)]];
        bump();
      }
      return;
    }

    paintingRef.current = true;
    paintAt(x, y);
    lastPaintRef.current = { x, y };
  };

  const handleMouseMove = (e) => {
    if (!loaded) return;
    const { x, y } = getCanvasCoords(e);

    if (mode === "corners" && draggingCornerRef.current !== null) {
      const pts = [...(cornersRef.current[activeZoneId] || [])];
      pts[draggingCornerRef.current] = [Math.round(x), Math.round(y)];
      cornersRef.current[activeZoneId] = pts;
      bump();
      return;
    }

    if (paintingRef.current) {
      const last = lastPaintRef.current || { x, y };
      paintLine(last.x, last.y, x, y);
      lastPaintRef.current = { x, y };
    }
  };

  const handleMouseUp = () => {
    paintingRef.current = false;
    draggingCornerRef.current = null;
  };

  const clearZone = () => {
    const mask = maskCvsRef.current[activeZoneId];
    if (!mask) return;
    const ctx = mask.getContext("2d");
    ctx.clearRect(0, 0, mask.width, mask.height);
    bump();
  };

  const save = () => {
    if (!layout || saving) return;
    setSaving(true);

    const zonesConfig = layout.zones.map((zone) => ({
      id: zone.id,
      label: zone.label,
      maskSrc: `/assets/rooms/kitchen/${zone.id}-mask.png`,
      corners: cornersRef.current[zone.id]?.length === 4 ? cornersRef.current[zone.id] : null,
    }));

    // Download each mask PNG
    for (const zone of layout.zones) {
      const mask = maskCvsRef.current[zone.id];
      if (!mask) continue;
      const a = document.createElement("a");
      a.href = mask.toDataURL("image/png");
      a.download = `${zone.id}-mask.png`;
      a.click();
    }

    // Download the layout config
    const config = {
      id: layout.id,
      name: layout.name,
      background: layout.background,
      foreground: layout.foreground,
      zones: zonesConfig,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${layout.id}.config.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    setSaving(false);
  };

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded || !baseImgRef.current) return;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Base image (clean background), optionally with foreground reference
    ctx.drawImage(baseImgRef.current, 0, 0, W, H);
    if (showRef && fgImgRef.current) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(fgImgRef.current, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Zone mask overlays
    layout.zones.forEach((zone, zi) => {
      const mask = maskCvsRef.current[zone.id];
      if (!mask) return;
      ctx.drawImage(mask, 0, 0, W, H);
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = ZONE_COLORS[zi % ZONE_COLORS.length];
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    });

    // Active zone corner quad
    if (activeZoneId) {
      const zi = layout.zones.findIndex((z) => z.id === activeZoneId);
      const color = ZONE_COLORS[zi % ZONE_COLORS.length];
      const pts = cornersRef.current[activeZoneId] || [];
      if (pts.length > 0) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        if (pts.length === 4) ctx.closePath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      pts.forEach(([cx, cy], idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(idx + 1), cx, cy);
      });
    }
  }, [loaded, version, activeZoneId, mode, tool, brushSize, showRef, layout]);

  if (!layout) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300">
        Layout not found: {layoutId}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-5 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{layout.name} — Zone Editor</h1>
            <p className="text-[10px] text-slate-400">
              Paint Floor / Wall / Counter masks, then click 4 corners per zone for perspective.
            </p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
        >
          <Save size={14} /> {saving ? "Saving…" : "Save & Download"}
        </button>
      </header>

      {/* Zone tabs + tools */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/40 px-5 py-2">
        <div className="flex overflow-hidden rounded-lg border border-slate-700">
          {layout.zones.map((zone, zi) => (
            <button
              key={zone.id}
              onClick={() => setActiveZoneId(zone.id)}
              className={`px-3 py-1.5 text-[10px] font-bold tracking-widest transition ${
                activeZoneId === zone.id ? "text-slate-950" : "text-slate-400 hover:text-slate-200"
              }`}
              style={activeZoneId === zone.id ? { backgroundColor: ZONE_COLORS[zi % ZONE_COLORS.length] } : undefined}
            >
              {zone.label.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => { setMode("paint"); setTool("brush"); }}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${mode === "paint" && tool === "brush" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Brush size={13} /> Paint
          </button>
          <button
            onClick={() => { setMode("paint"); setTool("erase"); }}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${mode === "paint" && tool === "erase" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Eraser size={13} /> Erase
          </button>
          <button
            onClick={() => setMode("corners")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${mode === "corners" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            <MousePointer2 size={13} /> Corners
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>Brush</span>
          <input
            type="range"
            min="8"
            max="120"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-28 accent-amber-400"
          />
          <span>{brushSize}px</span>
        </div>

        <button
          onClick={() => setShowRef((s) => !s)}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${showRef ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}
          title="Overlay furniture cutout as a reference"
        >
          <Eye size={13} /> Reference
        </button>

        <button
          onClick={clearZone}
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold text-red-400 transition hover:bg-red-500/10"
        >
          <Trash2 size={13} /> Clear zone
        </button>

        {mode === "corners" && (
          <span className="text-[10px] text-slate-400">
            Click in order: {CORNER_ORDER.map((c, i) => `${i + 1}. ${c}`).join(" · ")} — drag dots to adjust.
          </span>
        )}
      </div>

      {/* Canvas */}
      <div className="min-h-0 flex-1 overflow-auto bg-slate-950 p-4">
        <div className="mx-auto flex max-h-full items-center justify-center">
          <canvas
            ref={canvasRef}
            width={baseImgRef.current?.naturalWidth || 1728}
            height={baseImgRef.current?.naturalHeight || 910}
            className="max-h-full max-w-full rounded-lg border border-slate-800 shadow-2xl"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>
    </div>
  );
}
