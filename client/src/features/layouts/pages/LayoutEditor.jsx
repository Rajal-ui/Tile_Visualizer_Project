import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eraser,
  Eye,
  Grid3X3,
  Loader2,
  MousePointer2,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";
import { fetchLayout, saveLayout } from "@/services/layouts.api.js";
import { fetchTiles } from "@/services/tiles.api.js";
import { getLayout } from "@/features/rooms/data/layouts.js";
import {
  validateLayout,
  STATUS_DRAFT,
  STATUS_PUBLISHED,
} from "@shared/schemas/layout.js";
import { dist, distToSegment } from "@/features/layouts/lib/geometry.js";
import TilePickerModal from "@/features/layouts/components/TilePickerModal.jsx";
import StatusBadge from "@/components/StatusBadge.jsx";

const HANDLE_HIT = 12;
const CLOSE_HIT = 14;

/** Bounding box (in px) of a zone's drawn plane polygons, or null when empty. */
function zoneBounds(zone) {
  const pts = (zone?.planes || []).flatMap((p) => p.polygon || []);
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { minX, minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

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

export default function LayoutEditor({
  layoutId = "kitchen-iridium",
  onClose,
  embedded = false,
  hidePublish = false,
}) {
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

  const [tileCatalog, setTileCatalog] = useState([]);
  const [tileLoading, setTileLoading] = useState(false);
  const [showTilePicker, setShowTilePicker] = useState(false);
  const [dims, setDims] = useState({ width: "", height: "" });

  const canvasRef = useRef(null);
  const baseImgRef = useRef(null);
  const fgImgRef = useRef(null);
  const dragRef = useRef(null);

  const activeZone = layout?.zones?.find((z) => z.id === activeZoneId) || null;
  const activePlane = activeZone?.planes?.[activePlaneIndex] ?? null;

  const tileById = useMemo(() => {
    const m = new Map();
    tileCatalog.forEach((t) => m.set(String(t._id), t));
    return m;
  }, [tileCatalog]);

  const bounds = useMemo(() => zoneBounds({ planes: activeZone?.planes || [] }), [activeZone?.planes]);
  const allowedTiles = activeZone?.allowedTiles || [];

  // Reset the dimension inputs whenever the active zone / its planes change.
  useEffect(() => {
    setDims(bounds ? { width: String(bounds.width), height: String(bounds.height) } : { width: "", height: "" });
  }, [activeZoneId, bounds]);

  // Load the tile catalogue once for the allowed-tiles picker.
  useEffect(() => {
    let cancelled = false;
    setTileLoading(true);
    fetchTiles({ limit: 100 })
      .then(({ data }) => {
        if (!cancelled) setTileCatalog(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  /** Patch fields (label, allowedTiles, …) on a zone in the working config. */
  const updateZone = (zoneId, patch) => {
    setLayout((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === zoneId ? { ...z, ...patch } : z)),
    }));
  };

  /** Scale every plane polygon in a zone so its bounding box matches `nextW`/`nextH`. */
  const scaleZone = (zoneId, nextW, nextH) => {
    const zone = layout?.zones?.find((z) => z.id === zoneId);
    const b = zoneBounds(zone);
    if (!b) return;
    const sx = b.width > 0 ? nextW / b.width : 1;
    const sy = b.height > 0 ? nextH / b.height : 1;
    if (!Number.isFinite(sx) || !Number.isFinite(sy) || (sx === 1 && sy === 1)) return;
    updateZone(zoneId, {
      planes: (zone.planes || []).map((p) => ({
        ...p,
        polygon: (p.polygon || []).map(([x, y]) => [
          Math.round(b.minX + (x - b.minX) * sx),
          Math.round(b.minY + (y - b.minY) * sy),
        ]),
      })),
    });
  };

  /** Commit the dimension inputs (scales the active zone's polygons). */
  const commitDims = () => {
    if (!activeZone || !bounds) return;
    const w = Number(dims.width);
    const h = Number(dims.height);
    const nextW = Number.isFinite(w) && w > 0 ? w : bounds.width;
    const nextH = Number.isFinite(h) && h > 0 ? h : bounds.height;
    scaleZone(activeZone.id, nextW, nextH);
  };

  const removeAllowedTile = (id) => {
    if (!activeZone) return;
    updateZone(activeZone.id, { allowedTiles: allowedTiles.filter((t) => t !== id) });
  };

  const handleAddTiles = (ids) => {
    if (!activeZone) return;
    const next = [...new Set([...allowedTiles, ...ids])];
    updateZone(activeZone.id, { allowedTiles: next });
    setShowTilePicker(false);
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
      <div className="flex h-full w-full items-center justify-center bg-white text-[#6B7280]">
        <span className="text-sm font-medium">Loading layout…</span>
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#F7F8FA] text-[#6B7280]">
        <p className="text-sm">Layout not found: {layoutId}</p>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg border border-[#E7E9EE] bg-white px-3 py-1.5 text-xs font-semibold text-[#14161A] transition hover:bg-[#F7F8FA]"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    );
  }

  const planeCount = activeZone?.planes?.length || 0;

  return (
    <div className="flex h-full w-full min-h-0 flex-col bg-[#F7F8FA] text-[#14161A]">

      {/* ── Row 1: Header ──────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#E7E9EE] bg-white px-5 py-3.5">
        <div className="flex items-center gap-3">
          {!embedded && (
            <>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[#6B7280] transition hover:bg-[#F7F8FA] hover:text-[#14161A]"
              >
                <ArrowLeft size={15} />
              </button>
              <div className="h-5 w-px bg-[#E7E9EE]" />
            </>
          )}
          <div>
            <div className="flex items-center gap-2">
              <input
                value={layout.name}
                onChange={(e) => setLayout((prev) => ({ ...prev, name: e.target.value }))}
                aria-label="Layout name"
                className="w-72 rounded-lg border border-transparent bg-transparent px-1 py-0.5 font-heading text-base font-semibold text-[#14161A] outline-none transition focus:border-[#6D5EF5]/40 focus:bg-white focus:ring-2 focus:ring-[#6D5EF5]/20"
              />
              <StatusBadge status={layout.status} />
            </div>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              {embedded ? "Creating new layout mapping" : "Active Zone Configuration Scoped Context"}
            </p>
          </div>
        </div>

        {/* Inline save notice */}
        {notice && (
          <div
            className={`hidden max-w-xs items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium md:flex ${
              notice.type === "success"
                ? "bg-[#dcfce7] text-[#16A34A]"
                : notice.type === "error"
                  ? "bg-[#fee2e2] text-[#DC2626]"
                  : "bg-[#F7F8FA] text-[#6B7280]"
            }`}
          >
            {notice.type === "success" ? (
              <CheckCircle2 size={12} className="shrink-0" />
            ) : notice.type === "error" ? (
              <TriangleAlert size={12} className="shrink-0" />
            ) : null}
            <span className="truncate">{notice.text}</span>
          </div>
        )}

        {/* Primary actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => persist(STATUS_DRAFT)}
            disabled={saving}
            title={apiDown ? "Start the backend server to save." : "Save as draft"}
            className="flex items-center gap-1.5 rounded-lg border border-[#E7E9EE] bg-white px-4 py-2 text-sm font-medium text-[#14161A] transition hover:bg-[#F7F8FA] disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save Draft"}
          </button>
          {!hidePublish && (
            <button
              onClick={() => persist(STATUS_PUBLISHED)}
              disabled={saving}
              title={apiDown ? "Start the backend server to publish." : "Publish layout"}
              className="flex items-center gap-1.5 rounded-lg bg-[#6D5EF5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5a4ad6] disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              {saving ? "Saving…" : "Publish Layout"}
            </button>
          )}
        </div>
      </header>

      {/* ── Row 2: Contextual toolbar ──────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1 border-b border-[#E7E9EE] bg-white px-5 py-2">

        {/* Zone tabs */}
        <div className="flex items-center gap-1">
          {layout.zones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => setActiveZone(zone.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeZoneId === zone.id
                  ? "bg-[#6D5EF5] text-white"
                  : "text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#14161A]"
              }`}
            >
              {zone.label}
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold ${
                  activeZoneId === zone.id
                    ? "bg-white/20 text-white"
                    : "bg-[#F7F8FA] text-[#6B7280]"
                }`}
              >
                {(zone.planes || []).length}
              </span>
            </button>
          ))}
        </div>

        <div className="mx-2 h-5 w-px shrink-0 bg-[#E7E9EE]" />

        {/* Tool palette */}
        <div className="flex items-center gap-1">
          <ToolButton active={mode === "move"} onClick={() => setMode("move")} label="Move" icon={<MousePointer2 size={13} />} />
          <ToolButton active={mode === "polygon"} onClick={() => setMode("polygon")} label="Polygon" icon={<Grid3X3 size={13} />} />
        </div>

        <div className="mx-2 h-5 w-px shrink-0 bg-[#E7E9EE]" />

        {/* Plane pills */}
        <div className="flex items-center gap-1">
          {activeZone?.planes?.map((plane, pi) => (
            <button
              key={pi}
              onClick={() => setActivePlaneIndex(pi)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                pi === activePlaneIndex
                  ? "bg-[#D97706]/15 text-[#D97706]"
                  : "bg-[#F7F8FA] text-[#6B7280] hover:text-[#14161A]"
              }`}
            >
              P{pi + 1}
              <span className="opacity-70">{(plane.polygon || []).length}pt</span>
            </button>
          ))}
          <button
            onClick={addPlane}
            title="Add plane"
            className="flex items-center gap-1 rounded-full border border-dashed border-[#E7E9EE] px-2.5 py-1 text-[11px] font-semibold text-[#6B7280] transition hover:border-[#6D5EF5] hover:text-[#6D5EF5]"
          >
            <Plus size={11} /> Plane
          </button>
          {planeCount > 0 && (
            <button
              onClick={deletePlane}
              title="Remove active plane"
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-[#DC2626]/60 transition hover:bg-[#fee2e2] hover:text-[#DC2626]"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={undoLastPoint}
            disabled={!activePlane}
            title="Undo last point (or right-click)"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#6B7280] transition hover:bg-[#F7F8FA] hover:text-[#14161A] disabled:opacity-30"
          >
            <Undo2 size={13} />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <button
            onClick={clearPlane}
            disabled={!activePlane}
            title="Clear the active plane"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#6B7280] transition hover:bg-[#F7F8FA] hover:text-[#14161A] disabled:opacity-30"
          >
            <Eraser size={13} />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <div className="mx-1 h-4 w-px bg-[#E7E9EE]" />
          <button
            onClick={() => setShowRef((s) => !s)}
            title="Toggle reference overlay"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
              showRef
                ? "bg-[#6D5EF5]/10 text-[#6D5EF5]"
                : "text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#14161A]"
            }`}
          >
            <Eye size={13} />
            <span className="hidden sm:inline">Ref</span>
          </button>
        </div>
      </div>

      {/* ── Main: canvas stage + zone properties panel ─────────────────── */}
      <div className="flex min-h-0 flex-1 gap-5 p-5">

        {/* Canvas stage */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#E7E9EE] bg-white shadow-[0_4px_16px_rgba(20,22,26,0.06)]">
          <div className="relative min-h-0 flex-1 overflow-auto">
            <div className="flex h-full min-h-[300px] items-center justify-center p-6">
              <canvas
                ref={canvasRef}
                className="max-h-full max-w-full rounded-lg"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
              />
            </div>
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-sm font-medium text-[#6B7280]">No room background set</span>
                  <span className="text-xs text-[#6B7280]/70">Add a background image in the upload step.</span>
                </div>
              </div>
            )}
          </div>

          {/* Hint strip */}
          <div className="shrink-0 border-t border-[#E7E9EE] bg-[#F7F8FA]/80 px-5 py-2 text-[11px] text-[#6B7280]">
            {mode === "polygon"
              ? "Click to add points · click an edge to insert · click first point to close · right-click to undo"
              : "Drag polygon handles to reposition vertices"}
          </div>
        </div>

        {/* Zone Properties panel */}
        <div className="hidden w-[280px] shrink-0 flex-col lg:flex">
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[#E7E9EE] bg-white shadow-[0_4px_16px_rgba(20,22,26,0.06)]">

            {/* Panel header */}
            <div className="shrink-0 border-b border-[#E7E9EE] px-4 py-3">
              <h3 className="font-heading text-sm font-semibold text-[#14161A]">
                Zone Properties
                {activeZone ? (
                  <span className="ml-1 font-normal text-[#6B7280]">({activeZone.label})</span>
                ) : null}
              </h3>
            </div>

            {/* Panel body */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">

              {/* Zone name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#14161A]">Zone Name</label>
                <input
                  className="w-full rounded-lg border border-[#E7E9EE] bg-white px-3 py-2.5 text-sm text-[#14161A] outline-none transition placeholder:text-[#6B7280]/60 focus:border-[#6D5EF5] focus:ring-2 focus:ring-[#6D5EF5]/25"
                  placeholder="Zone name"
                  value={activeZone?.label || ""}
                  disabled={!activeZone}
                  onChange={(e) => updateZone(activeZone.id, { label: e.target.value })}
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#14161A]">
                  Dimensions <span className="font-normal text-[#6B7280]">(px)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-lg border border-[#E7E9EE] bg-white px-3 py-2.5 text-sm text-[#14161A] outline-none transition placeholder:text-[#6B7280]/60 focus:border-[#6D5EF5] focus:ring-2 focus:ring-[#6D5EF5]/25 disabled:opacity-50"
                    inputMode="decimal"
                    placeholder="Width"
                    value={dims.width}
                    disabled={!bounds}
                    onChange={(e) => setDims((d) => ({ ...d, width: e.target.value }))}
                    onBlur={commitDims}
                    onKeyDown={(e) => e.key === "Enter" && commitDims()}
                  />
                  <span className="text-sm font-semibold text-[#6B7280]">×</span>
                  <input
                    className="w-full rounded-lg border border-[#E7E9EE] bg-white px-3 py-2.5 text-sm text-[#14161A] outline-none transition placeholder:text-[#6B7280]/60 focus:border-[#6D5EF5] focus:ring-2 focus:ring-[#6D5EF5]/25 disabled:opacity-50"
                    inputMode="decimal"
                    placeholder="Height"
                    value={dims.height}
                    disabled={!bounds}
                    onChange={(e) => setDims((d) => ({ ...d, height: e.target.value }))}
                    onBlur={commitDims}
                    onKeyDown={(e) => e.key === "Enter" && commitDims()}
                  />
                </div>
                <p className="mt-1 text-[10px] text-[#6B7280]">
                  Rescales the drawn polygons — commit on Enter or blur.
                </p>
              </div>

              {/* Allowed tiles */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#14161A]">
                    Allowed Tiles
                    <span className="ml-1.5 rounded-full bg-[#F7F8FA] px-1.5 py-0.5 text-[10px] font-bold text-[#6B7280]">
                      {allowedTiles.length}
                    </span>
                  </p>
                </div>
                {allowedTiles.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allowedTiles.map((id) => {
                      const tile = tileById.get(String(id));
                      return (
                        <span
                          key={id}
                          className="flex items-center gap-1.5 rounded-full border border-[#E7E9EE] bg-white py-1 pl-1 pr-2 text-[11px] font-medium text-[#14161A]"
                        >
                          {tile?.tileImage && (
                            <img src={tile.tileImage} alt="" className="h-4 w-4 rounded-full object-cover" />
                          )}
                          <span className="max-w-[110px] truncate">{tile?.title || id.slice(0, 8)}</span>
                          <button
                            onClick={() => removeAllowedTile(id)}
                            title="Remove tile"
                            className="text-[#6B7280] transition hover:text-[#DC2626]"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-[#E7E9EE] px-3 py-2.5 text-[11px] text-[#6B7280]">
                    No tiles assigned — any compatible tile can be applied.
                  </p>
                )}
                <button
                  onClick={() => setShowTilePicker(true)}
                  disabled={tileLoading || !activeZone}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#E7E9EE] px-3 py-2 text-xs font-semibold text-[#6D5EF5] transition hover:border-[#6D5EF5] hover:bg-[#6D5EF5]/5 disabled:opacity-50"
                >
                  {tileLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Plus size={12} />
                  )}
                  Add Allowed Tiles
                </button>
              </div>

              <p className="rounded-lg bg-[#F7F8FA] px-3 py-2 text-[10px] text-[#6B7280]">
                Zone name, dimensions &amp; tile assignments persist when you press Save Draft.
              </p>

              {/* Active zone dot indicator */}
              <div className="flex items-center gap-2 rounded-lg bg-[#F7F8FA] px-3 py-2.5">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    activeZone ? "bg-[#16A34A]" : "bg-[#E7E9EE]"
                  }`}
                />
                <span className="text-xs text-[#6B7280]">
                  {activeZone ? "Zone active — drawing enabled" : "No zone selected"}
                </span>
              </div>

              <div className="h-px bg-[#E7E9EE]" />

              {/* Planes list */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#14161A]">
                    Planes
                    <span className="ml-1.5 rounded-full bg-[#F7F8FA] px-1.5 py-0.5 text-[10px] font-bold text-[#6B7280]">
                      {activeZone?.planes?.length || 0}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {activeZone?.planes?.map((plane, pi) => {
                    const pts = (plane.polygon || []).length;
                    const complete = pts >= 4;
                    const inProgress = pts > 0 && pts < 4;
                    return (
                      <button
                        key={pi}
                        onClick={() => setActivePlaneIndex(pi)}
                        className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-xs transition ${
                          pi === activePlaneIndex
                            ? "border border-[#6D5EF5]/30 bg-[#6D5EF5]/8 text-[#14161A]"
                            : "border border-transparent text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#14161A]"
                        }`}
                        style={pi === activePlaneIndex ? { backgroundColor: "rgb(109 94 245 / 0.06)" } : undefined}
                      >
                        <span className="font-medium">Plane {pi + 1}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            complete
                              ? "bg-[#dcfce7] text-[#16A34A]"
                              : inProgress
                                ? "bg-[#fef3c7] text-[#D97706]"
                                : "bg-[#F7F8FA] text-[#6B7280]"
                          }`}
                        >
                          {pts}/4
                        </span>
                      </button>
                    );
                  })}
                  {!activeZone?.planes?.length && (
                    <p className="rounded-lg border border-dashed border-[#E7E9EE] px-3 py-4 text-center text-xs text-[#6B7280]">
                      No planes yet — click "+ Plane" to add one.
                    </p>
                  )}
                </div>
              </div>

              {/* Reference thumbnail */}
              {layout.background && (
                <>
                  <div className="h-px bg-[#E7E9EE]" />
                  <div>
                    <p className="mb-2 text-xs font-semibold text-[#14161A]">Reference Image</p>
                    <div className="overflow-hidden rounded-lg border border-[#E7E9EE]">
                      <img
                        src={layout.background}
                        alt="Room reference"
                        className="h-28 w-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => setShowRef((s) => !s)}
                      className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        showRef
                          ? "border-[#6D5EF5] bg-[#6D5EF5]/8 text-[#6D5EF5]"
                          : "border-[#E7E9EE] text-[#6B7280] hover:border-[#6D5EF5] hover:text-[#6D5EF5]"
                      }`}
                      style={showRef ? { backgroundColor: "rgb(109 94 245 / 0.06)" } : undefined}
                    >
                      <Eye size={12} />
                      {showRef ? "Overlay ON" : "Overlay OFF"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showTilePicker && (
        <TilePickerModal
          value={allowedTiles}
          onConfirm={handleAddTiles}
          onClose={() => setShowTilePicker(false)}
        />
      )}
    </div>
  );
}

function ToolButton({ active, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
        active
          ? "bg-[#6D5EF5]/10 text-[#6D5EF5]"
          : "text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#14161A]"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
