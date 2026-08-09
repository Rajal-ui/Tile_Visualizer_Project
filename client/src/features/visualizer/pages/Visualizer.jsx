import { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, MousePointerClick, Info } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import { patternFor, HATCH_ID } from "@/features/visualizer/lib/patterns.js";

const VGRID = "visual-grid";

const surfaceList = (scene) => [
  { key: "Floor", d: scene.floorD },
  { key: "Left Wall", d: scene.leftWallD },
  { key: "Accent Wall", d: scene.rightWallD },
];

const labelPos = {
  Floor: { x: 400, y: 452 },
  "Left Wall": { x: 258, y: 300 },
  "Accent Wall": { x: 542, y: 300 },
};

export default function Visualizer() {
  const { room, surface, setSurface, appliedTiles, activeTile } = useWorkspace();
  const [scale, setScale] = useState(1);
  const [hovered, setHovered] = useState(null);

  const scene = room.scene;
  const surfaces = surfaceList(scene);
  const cx = 400;
  const cy = 300;

  const zoom = (f) =>
    setScale((s) => Math.min(2.4, Math.max(0.7, Math.round((s + f) * 10) / 10)));

  const appliedKeys = Object.keys(appliedTiles).filter(
    (k) => appliedTiles[k] && surfaces.some((s) => s.key === k)
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">{room.name}</h2>
          <p className="text-xs text-slate-400">{room.tagline}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => zoom(0.1)}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            title="Zoom in"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => zoom(-0.1)}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            title="Zoom out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => setScale(1)}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            title="Reset view"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className="bg-grid relative flex-1 overflow-hidden bg-slate-50">
        <svg
          viewBox={scene.viewBox}
          className="h-full w-full"
          style={{ touchAction: "pan-y" }}
        >
          <defs>
            <pattern id={VGRID} width="28" height="28" patternUnits="userSpaceOnUse">
              <rect width="28" height="28" fill="#e9edf2" />
              <path d="M0 28 L28 0" stroke="#dde2e9" strokeWidth="1" />
            </pattern>
            <linearGradient id="sh-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.16" />
            </linearGradient>
            <linearGradient id="sh-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#000" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
            </linearGradient>
            <pattern
              id={HATCH_ID}
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="10" height="10" fill="#e2e8f0" />
              <rect width="5" height="10" fill="#d3dae3" />
            </pattern>
            {appliedKeys.map((key) => {
              const tile = appliedTiles[key];
              return (
                <g
                  key={key}
                  dangerouslySetInnerHTML={{
                    __html: patternFor(tile, `${tile.id}-${key.replace(/\s/g, "")}`),
                  }}
                />
              );
            })}
          </defs>

          <g
            transform={`translate(${cx * (1 - scale)}, ${cy * (1 - scale)}) scale(${scale})`}
          >
            {surfaces.map(({ key, d }) => {
              const tile = appliedTiles[key] || null;
              const active = surface === key;
              const isHover = hovered === key;
              const patternId = tile
                ? `url(#${tile.id}-${key.replace(/\s/g, "")})`
                : null;

              const fill = patternId
                ? patternId
                : active
                  ? `url(#${HATCH_ID})`
                  : `url(#${VGRID})`;

              return (
                <g
                  key={key}
                  onClick={() => setSurface(key)}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  className="cursor-pointer"
                >
                  <polygon
                    d={d}
                    fill={fill}
                    stroke={isHover ? "#1d6ef0" : "#94a3b8"}
                    strokeWidth={isHover ? 2.4 : 1.4}
                    opacity={active ? 1 : 0.92}
                  />
                  <polygon
                    d={d}
                    fill={key === "Floor" ? "url(#sh-floor)" : "url(#sh-wall)"}
                  />
                  {tile && (
                    <polygon
                      d={d}
                      fill="none"
                      stroke="#ffffff"
                      strokeOpacity="0.14"
                      strokeWidth="1"
                    />
                  )}
                  <SurfaceLabel
                    label={key}
                    pos={labelPos[key]}
                    active={active}
                    isHover={isHover}
                  />
                </g>
              );
            })}

            <g pointerEvents="none" opacity="0.85">
              {scene.decor}
            </g>
          </g>
        </svg>

        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-slate-900/75 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
          <MousePointerClick size={12} className="text-brand-300" />
          Click a surface to select
        </div>

        {!activeTile && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-card backdrop-blur">
              <Info size={13} className="text-brand-500" />
              Pick a tile from the catalogue to preview on the {surface}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span
            className="inline-block h-3 w-3 rounded ring-1 ring-black/10"
            style={{
              backgroundColor: activeTile ? activeTile.colors[0] : "#cbd5e1",
            }}
          />
          <span className="font-semibold text-slate-700">{surface}</span>
          <span className="text-slate-300">·</span>
          <span>{activeTile ? activeTile.name : "No tile applied"}</span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
}

function SurfaceLabel({ label, pos, active, isHover }) {
  const textW = label === "Accent Wall" ? 92 : label === "Left Wall" ? 78 : 48;
  return (
    <g pointerEvents="none">
      <rect
        x={pos.x - textW / 2}
        y={pos.y - 13}
        width={textW}
        height="22"
        rx="11"
        fill={active ? "#0f172a" : "#ffffff"}
        fillOpacity={active ? 0.82 : 0.72}
        stroke={active ? "#1d6ef0" : isHover ? "#1d6ef0" : "#cbd5e1"}
        strokeWidth="1"
      />
      <text
        x={pos.x}
        y={pos.y + 3.5}
        textAnchor="middle"
        fontSize="10.5"
        fontWeight="600"
        fill={active ? "#ffffff" : "#475569"}
      >
        {label}
      </text>
    </g>
  );
}
