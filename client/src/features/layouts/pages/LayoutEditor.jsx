import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eraser,
  Eye,
  Grid3X3,
  MousePointer2,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";
import { fetchLayout, saveLayout } from "@/services/layouts.api.js";
import { getLayout } from "@/features/rooms/data/layouts.js";
import {
  validateLayout,
  STATUS_DRAFT,
  STATUS_PUBLISHED,
} from "@shared/schemas/layout.js";
import { dist, distToSegment } from "@/features/layouts/lib/geometry.js";

const HANDLE_HIT = 12;
const CLOSE_HIT = 14;

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
 * Fetch a client-static asset (e.g. the seeded kitchen background/foreground)
 * and turn it into a File so a first save uploads it into backend storage.
 * Returns null for backend-served URLs (/api/...) so they are never re-uploaded.
 */
function fileFromClientAsset(url) {
  if (!url || !url.startsWith("/assets/")) return null;
  return fetch(url)
    .then((r) => (r.ok ? r.blob() : null))
    .then((blob) => {
      if (!blob) return null;
      const isJpg = /\.jpe?g$/i.test(url);
      return new File([blob], isJpg ? "background.jpg" : "background.png", {
        type: isJpg ? "image/jpeg" : "image/png",
      });
    })
    .catch(() => null);
}

function drawPlane(ctx, plane, { active }) {
  const poly = plane.polygon || [];

  if (poly.length >= 3) {
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.fillStyle = active ? "rgba(251, 191, 36, 0.28)" : "rgba(15, 23, 42, 0.12)";
    ctx.fill();
    ctx.strokeStyle = active ? "#fbbf24" : "#94a3b8";
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.setLineDash([]);
    ctx.stroke();
  } else if (poly.length === 2) {
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    ctx.lineTo(poly[1][0], poly[1][1]);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawHandles(ctx, pts, color) {
  pts.forEach(([x, y], idx) => {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(idx + 1), x, y + 0.5);
  });
}

export default function LayoutEditor({ layoutId = "kitchen-iridium", onClose }) {
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [activeZoneId, setActiveZoneId] = useState(null);
  const [activePlaneIndex, setActivePlaneIndex] = useState(-1);
  const [mode, setMode] = useState("polygon"); // "move" | "polygon"
  const [showRef, setShowRef] = useState(false);
  const [hover, setHover] = useState(null);
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [apiDown, setApiDown] = useState(false);
  const [notice, setNotice] = useState(null);

  const canvasRef = useRef(null);
  const baseImgRef = useRef(null);
  const fgImgRef = useRef(null);
  const dragRef = useRef(null);

  const activeZone = layout?.zones?.find((z) => z.id === activeZoneId) || null;
  const activePlane = activeZone?.planes?.[activePlaneIndex] ?? null;

  const setActiveZone = (zoneId) => {
    setActiveZoneId(zoneId);
    const zone = layout?.zones?.find((z) => z.id === zoneId);
    setActivePlaneIndex(zone?.planes?.length ? 0 : -1);
  };

  const setPlane = (planeIndex, next) => {
    if (!activeZone) return;
    const zoneId = activeZone.id;
    setLayout((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.id === zoneId
          ? { ...z, planes: z.planes.map((p, i) => (i === planeIndex ? next : p)) }
          : z
      ),
    }));
  };

  // Load the layout config (backend first, then the static seed) + its images
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoaded(false);

    (async () => {
      let cfg = null;
      let apiUnreachable = false;
      try {
        cfg = await fetchLayout(layoutId);
      } catch (e) {
        apiUnreachable = !!e.network || e.status === 500;
        cfg = getLayout(layoutId);
      }
      if (cancelled || !cfg) {
        if (!cancelled) setLoading(false);
        return;
      }

      const [base, fg] = await Promise.all([
        loadImage(cfg.background),
        cfg.foreground ? loadImage(cfg.foreground) : Promise.resolve(null),
      ]);
      if (cancelled) return;

      setLayout(cfg);
      baseImgRef.current = base;
      fgImgRef.current = fg;
      setActiveZoneId(cfg.zones?.[0]?.id || null);
      setActivePlaneIndex(cfg.zones?.[0]?.planes?.length ? 0 : -1);
      setApiDown(apiUnreachable);
      setNotice(
        apiUnreachable
          ? {
              type: "error",
              text: "API server unreachable — showing local seed data. Start the backend (`npm run dev:server`) before saving.",
            }
          : null
      );

      setLoaded(!!base);
      setLoading(false);
      setVersion((v) => v + 1);
    })();

    return () => {
      cancelled = true;
    };
  }, [layoutId]);

  const getCanvasPoint = (e) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    };
  };

  const hitHandle = (p) => {
    if (!activePlane) return null;
    const poly = activePlane.polygon || [];
    for (let i = 0; i < poly.length; i++) {
      if (dist(p, poly[i]) <= HANDLE_HIT) return { index: i };
    }
    return null;
  };

  /** Return the edge index `i` (segment poly[i]–poly[i+1]) near point `p`. */
  const hitEdge = (p) => {
    if (!activePlane) return null;
    const poly = activePlane.polygon || [];
    if (poly.length < 2) return null;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      if (distToSegment(p, a, b) <= HANDLE_HIT) return i;
    }
    return null;
  };

  const addPolygonPoint = (x, y) => {
    const plane = activePlane;
    if (!plane) return;
    const poly = plane.polygon || [];

    if (poly.length >= 3 && dist([x, y], poly[0]) <= CLOSE_HIT) return;

    const edge = hitEdge([x, y]);
    if (edge != null && poly.length >= 3) {
      const next = [...poly];
      next.splice((edge + 1) % poly.length, 0, [Math.round(x), Math.round(y)]);
      setPlane(activePlaneIndex, { ...plane, polygon: next });
      return;
    }

    setPlane(activePlaneIndex, {
      ...plane,
      polygon: [...poly, [Math.round(x), Math.round(y)]],
    });
  };

  const handleMouseDown = (e) => {
    if (!loaded) return;
    if (e.button === 2) {
      undoLastPoint();
      return;
    }
    const p = getCanvasPoint(e);
    const hit = hitHandle(p);
    if (hit) {
      dragRef.current = hit;
      return;
    }
    if (mode === "polygon") addPolygonPoint(p.x, p.y);
  };

  const handleMouseMove = (e) => {
    if (!loaded) return;
    const p = getCanvasPoint(e);
    setHover(p);

    const drag = dragRef.current;
    if (!drag || !activePlane) return;

    const arr = (activePlane.polygon || []).map((pt, i) =>
      i === drag.index ? [Math.round(p.x), Math.round(p.y)] : pt
    );
    setPlane(activePlaneIndex, { ...activePlane, polygon: arr });
  };

  const handleMouseUp = () => {
    dragRef.current = null;
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  const undoLastPoint = () => {
    const plane = activePlane;
    if (!plane) return;
    const poly = plane.polygon || [];
    if (!poly.length) return;
    setPlane(activePlaneIndex, { ...plane, polygon: poly.slice(0, -1) });
  };

  const clearPlane = () => {
    const plane = activePlane;
    if (!plane) return;
    setPlane(activePlaneIndex, { ...plane, polygon: [] });
  };

  const addPlane = () => {
    if (!activeZone) return;
    const planes = activeZone.planes || [];
    setLayout((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.id === activeZone.id
          ? { ...z, planes: [...planes, { polygon: [], corners: null }] }
          : z
      ),
    }));
    setActivePlaneIndex(planes.length);
  };

  const deletePlane = () => {
    if (!activeZone || activePlaneIndex < 0) return;
    const planes = activeZone.planes || [];
    const next = planes.filter((_, i) => i !== activePlaneIndex);
    setLayout((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.id === activeZone.id ? { ...z, planes: next } : z
      ),
    }));
    setActivePlaneIndex(next.length ? Math.max(0, activePlaneIndex - 1) : -1);
  };

  const persist = async (status) => {
    if (!layout || saving) return;
    setSaving(true);
    setNotice({ type: "info", text: "Saving…" });
    try {
      const rawPlanes = (layout.zones || []).flatMap((z) => z.planes || []);
      const droppedPlanes = rawPlanes.filter((p) => (p.polygon || []).length < 3).length;

      const zones = (layout.zones || [])
        .map((zone) => ({
          ...zone,
          // Drop half-drawn planes; incomplete polygons can't be rendered.
          planes: (zone.planes || [])
            .filter((p) => (p.polygon || []).length >= 3)
            .map((p) => ({
              ...p,
              // A 4-point polygon IS the perspective quad — no manual corners.
              corners: (p.polygon || []).length === 4 ? p.polygon.map((pt) => [...pt]) : null,
            })),
        }))
        .filter((zone) => zone.planes.length > 0);

      const config = { ...layout, zones, status };

      if (status === STATUS_PUBLISHED) {
        const { ok, errors } = validateLayout(config);
        if (!ok) throw new Error(errors.join("\n"));
        if (!zones.length) {
          throw new Error("Publishing requires at least one completed plane (polygon with 3+ points).");
        }
      }

      const opts = {};
      const bg = await fileFromClientAsset(config.background);
      const fg = await fileFromClientAsset(config.foreground);
      if (bg) opts.background = bg;
      if (fg) opts.foreground = fg;

      const result = await saveLayout(layout.id, config, opts);
      setLayout(result.layout || config);

      const published = (result.layout || config).status === STATUS_PUBLISHED;
      const skipped = droppedPlanes ? ` (${droppedPlanes} incomplete plane${droppedPlanes > 1 ? "s" : ""} skipped)` : "";
      setNotice({
        type: "success",
        text: `${published ? "Layout published." : "Draft saved."}${skipped}`,
      });
      setVersion((v) => v + 1);
    } catch (e) {
      console.error("save layout:", e);
      setNotice({ type: "error", text: e.message || "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded || !baseImgRef.current) return;

    const W = baseImgRef.current.naturalWidth;
    const H = baseImgRef.current.naturalHeight;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(baseImgRef.current, 0, 0, W, H);

    if (showRef && fgImgRef.current) {
      ctx.globalAlpha = 0.55;
      ctx.drawImage(fgImgRef.current, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    (layout.zones || []).forEach((zone) => {
      (zone.planes || []).forEach((plane, pi) => {
        const isActive = zone.id === activeZoneId && pi === activePlaneIndex;
        drawPlane(ctx, plane, { active: isActive });
      });
    });

    if (activePlane) {
      const poly = activePlane.polygon || [];

      if (mode === "move" && poly.length) {
        drawHandles(ctx, poly, "#94a3b8");
      } else if (mode === "polygon") {
        if (poly.length) drawHandles(ctx, poly, "#fbbf24");
        if (hover && poly.length) {
          const last = poly[poly.length - 1];
          ctx.beginPath();
          ctx.moveTo(last[0], last[1]);
          ctx.lineTo(hover.x, hover.y);
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);
          if (poly.length >= 3 && dist([hover.x, hover.y], poly[0]) <= CLOSE_HIT) {
            ctx.beginPath();
            ctx.arc(poly[0][0], poly[0][1], 12, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(251, 191, 36, 0.9)";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }
    }
  }, [loaded, version, layout, activeZoneId, activePlaneIndex, mode, showRef, hover]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-slate-400">
        Loading layout…
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
        <p>Layout not found: {layoutId}</p>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    );
  }

  const planeCount = activeZone?.planes?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-5 py-3">
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
              Click to place polygon points per plane, then save a draft or publish. The polygon doubles as the perspective corner points.
            </p>
          </div>
        </div>

        {notice && (
          <div
            className={`flex max-w-[360px] items-start gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold ${
              notice.type === "success"
                ? "bg-emerald-500/10 text-emerald-300"
                : notice.type === "error"
                  ? "bg-red-500/10 text-red-300"
                  : "bg-slate-800 text-slate-300"
            }`}
          >
            {notice.type === "success" ? (
              <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
            ) : notice.type === "error" ? (
              <TriangleAlert size={13} className="mt-0.5 shrink-0" />
            ) : (
              <X size={13} className="mt-0.5 hidden" />
            )}
            <span className="whitespace-pre-line">{notice.text}</span>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => persist(STATUS_DRAFT)}
            disabled={saving}
            title={apiDown ? "Start the backend server to save." : undefined}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            onClick={() => persist(STATUS_PUBLISHED)}
            disabled={saving}
            title={apiDown ? "Start the backend server to publish." : undefined}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <CheckCircle2 size={14} /> {saving ? "Saving…" : "Publish"}
          </button>
        </div>
      </header>

      {/* Zone tabs */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/40 px-5 py-2">
        <div className="flex items-center gap-1">
          {layout.zones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => setActiveZone(zone.id)}
              className={`rounded-md px-3 py-1.5 text-[10px] font-bold tracking-widest transition ${
                activeZoneId === zone.id
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {zone.label.toUpperCase()}
              <span className="ml-1.5 rounded bg-slate-600/60 px-1 text-[9px] font-extrabold">
                {(zone.planes || []).length}
              </span>
            </button>
          ))}
        </div>

        {/* Planes of the active zone */}
        <div className="flex items-center gap-1">
          {activeZone?.planes?.map((plane, pi) => (
            <button
              key={pi}
              onClick={() => setActivePlaneIndex(pi)}
              className={`rounded-md px-2 py-1.5 text-[10px] font-bold transition ${
                pi === activePlaneIndex
                  ? "bg-amber-400 text-slate-950"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              Plane {pi + 1}
              <span className="ml-1 text-[9px] opacity-80">{(plane.polygon || []).length}pt</span>
            </button>
          ))}
          <button
            onClick={addPlane}
            className="flex items-center gap-1 rounded-md border border-dashed border-slate-600 px-2 py-1.5 text-[10px] font-bold text-slate-400 transition hover:border-slate-400 hover:text-slate-200"
          >
            <Plus size={12} /> Plane
          </button>
          {planeCount > 0 && (
            <button
              onClick={deletePlane}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold text-red-400 transition hover:bg-red-500/10"
            >
              <Trash2 size={12} /> Remove
            </button>
          )}
        </div>
      </div>

      {/* Tools */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/40 px-5 py-2">
        <div className="flex items-center gap-1">
          <ToolButton active={mode === "move"} onClick={() => setMode("move")} label="Move" icon={<MousePointer2 size={13} />} />
          <ToolButton active={mode === "polygon"} onClick={() => setMode("polygon")} label="Polygon" icon={<Grid3X3 size={13} />} />
        </div>

        <div className="mx-1 h-5 w-px bg-slate-700" />

        <button
          onClick={undoLastPoint}
          disabled={!activePlane}
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40"
          title="Undo last point (or right-click)"
        >
          <Undo2 size={13} /> Undo
        </button>
        <button
          onClick={clearPlane}
          disabled={!activePlane}
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40"
          title="Clear the polygon of the active plane"
        >
          <Eraser size={13} /> Clear
        </button>

        <div className="mx-1 h-5 w-px bg-slate-700" />

        <button
          onClick={() => setShowRef((s) => !s)}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${
            showRef ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
          title="Overlay furniture cutout as a reference"
        >
          <Eye size={13} /> Reference
        </button>

        <span className="ml-auto text-[10px] text-slate-500">
          {mode === "polygon"
            ? "Click to add points · click an edge to insert · click first point to close · right-click to undo"
            : "Drag polygon handles to adjust"}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative min-h-0 flex-1 overflow-auto bg-slate-950 p-4">
        <div className="mx-auto flex max-h-full items-center justify-center">
          <canvas
            ref={canvasRef}
            className="max-h-full max-w-full rounded-lg border border-slate-800 shadow-2xl"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={handleContextMenu}
          />
        </div>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            <span className="text-xs font-semibold">
              Room background missing — add one in onboarding.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({ active, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${
        active ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
