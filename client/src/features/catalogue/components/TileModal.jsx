import { X, Check, Layers, IndianRupee, Ruler, Palette, MapPin, Sparkles } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import { rooms } from "@/features/rooms/data/rooms.jsx";
import { patternLabels } from "@/features/catalogue/data/pattern-labels.js";
import { textureUrl } from "@/lib/textures.js";

export default function TileModal({ tile, onClose }) {
  const { surface, applyTile } = useWorkspace();
  const compatibleRooms = rooms.filter((r) => tile.rooms.includes(r.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-modal-in w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url(${textureUrl(tile.texture)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-slate-700">
            {tile.category} Tile
          </span>
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-white/85 p-2 text-slate-600 transition hover:bg-white"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{tile.name}</h3>
              <p className="text-sm text-slate-500">
                {tile.material} · {patternLabels[tile.pattern] || tile.pattern}
              </p>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1 text-lg font-bold text-brand-600">
                <IndianRupee size={15} />
                {tile.price}
                <span className="text-xs font-medium text-slate-400">/m²</span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Spec icon={Ruler} label="Size" value={tile.size} />
            <Spec icon={Layers} label="Pattern" value={patternLabels[tile.pattern] || tile.pattern} />
            <Spec icon={Palette} label="Finish" value={tile.finish} />
            <Spec icon={Sparkles} label="Material" value={tile.material} />
          </div>

          <div className="mt-4">
            <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <MapPin size={12} /> Suitable rooms
            </p>
            <div className="flex flex-wrap gap-1.5">
              {compatibleRooms.map((r) => (
                <span key={r.id} className="chip bg-slate-100 text-slate-600">
                  {r.name}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Check size={13} className="text-emerald-500" />
              {tile.colors.length} tone{tile.colors.length > 1 ? "s" : ""}:
            </span>
            <div className="flex gap-1">
              {tile.colors.map((c) => (
                <span key={c} className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => applyTile(tile.id, surface)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
            >
              <Layers size={15} /> Apply to {surface}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spec({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <Icon size={14} className="shrink-0 text-slate-400" />
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-xs font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
