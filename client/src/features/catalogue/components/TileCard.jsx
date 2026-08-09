import { IndianRupee, Layers, ZoomIn } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import { textureUrl } from "@/lib/textures.js";

export default function TileCard({ tile, dark, onSelect, onApply }) {
  const { surface } = useWorkspace();
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition hover:shadow-card-hover ${
        dark
          ? "border-slate-700 bg-slate-800 hover:border-slate-500"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <button onClick={onSelect} className="block w-full text-left">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url(${textureUrl(tile.texture)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              dark ? "bg-slate-900/80 text-slate-200" : "bg-white/85 text-slate-700"
            }`}
          >
            {tile.category}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`absolute right-2 top-2 rounded-full p-1.5 transition ${
              dark
                ? "bg-slate-900/70 text-slate-200 hover:bg-slate-900"
                : "bg-white/85 text-slate-600 hover:bg-white"
            }`}
            title="View details"
          >
            <ZoomIn size={13} />
          </button>
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                {tile.name}
              </p>
              <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                {tile.size} · {tile.finish}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600">
              <IndianRupee size={11} />
              {tile.price}/m²
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApply();
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <Layers size={12} /> Apply
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                dark
                  ? "border-slate-600 text-slate-200 hover:bg-slate-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Details
            </button>
          </div>
          <p className={`mt-1.5 truncate text-[10px] ${dark ? "text-slate-500" : "text-slate-400"}`}>
            Applies to {surface}
          </p>
        </div>
      </button>
    </div>
  );
}
