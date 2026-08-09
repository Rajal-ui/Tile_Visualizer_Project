import { Grid3x3, Wallpaper, Layers } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";

const surfaceIcons = {
  Floor: Grid3x3,
  Wall: Wallpaper,
  "Accent Wall": Layers,
  Counter: Layers,
};

export default function LayoutSelector() {
  const { surfaces, surface, setSurface, appliedTiles } = useWorkspace();

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 rounded-xl bg-slate-200/70 p-1">
        {surfaces.map((key) => {
          const Icon = surfaceIcons[key] || Layers;
          const active = surface === key;
          const applied = appliedTiles[key];
          return (
            <button
              key={key}
              onClick={() => setSurface(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                active
                  ? "bg-white text-slate-900 shadow-card"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} />
              <span className="hidden md:inline">{key}</span>
              {applied && (
                <span
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
                  title={`${applied.name} applied`}
                  style={{ backgroundColor: applied.colors[0] }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
