import { IndianRupee, Layers, ZoomIn } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import { textureUrl } from "@/lib/textures.js";

export default function TileCard({ tile, onSelect, onApply }) {
  const { surface } = useWorkspace();
  return (
    <div
      className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:shadow-card-hover hover:border-slate-300"
    >
      <button onClick={onSelect} className="block w-full text-left">
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-slate-100">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url(${textureUrl(tile.texture)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <span className="absolute left-1.5 top-1.5 rounded-full bg-white/85 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
            {tile.category}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="absolute right-1.5 top-1.5 rounded-full bg-white/85 p-1 text-slate-600 transition hover:bg-white"
            title="View details"
          >
            <ZoomIn size={12} />
          </button>
        </div>
        <div className="p-2">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">
                {tile.name}
              </p>
              <p className="text-[10px] text-slate-500">
                {tile.size} · {tile.finish}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-brand-600">
              <IndianRupee size={10} />
              {tile.price}/m²
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApply();
              }}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-800"
            >
              <Layers size={10} /> Apply
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Details
            </button>
          </div>
          <p className="mt-1 truncate text-[9px] text-slate-400">
            Applies to {surface}
          </p>
        </div>
      </button>
    </div>
  );
}
