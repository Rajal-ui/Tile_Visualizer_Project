import { useMemo, useState } from "react";
import { Search, Grid3X3 } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import { useTiles } from "@/features/catalogue/hooks/useTiles.js";
import TileCard from "@/features/catalogue/components/TileCard.jsx";
import TileModal from "@/features/catalogue/components/TileModal.jsx";

export default function TileCatalogue() {
  const { surface, applyTile } = useWorkspace();
  const { tiles } = useTiles();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [finish, setFinish] = useState("All Finishes");
  const [material, setMaterial] = useState("All Materials");
  const [detail, setDetail] = useState(null);

  const { categories, finishes, materials } = useMemo(() => {
    const cats = [...new Set(tiles.map((t) => t.category))].sort();
    const fin = [...new Set(tiles.map((t) => t.finish))].sort();
    const mat = [...new Set(tiles.map((t) => t.material))].sort();
    return {
      categories: ["all", ...cats],
      finishes: ["All Finishes", ...fin],
      materials: ["All Materials", ...mat],
    };
  }, [tiles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tiles.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (finish !== "All Finishes" && t.finish !== finish) return false;
      if (material !== "All Materials" && t.material !== material) return false;
      if (q && !`${t.name} ${t.material} ${t.finish} ${t.size} ${t.category}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [tiles, query, category, finish, material]);

  const displayed = filtered;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-3 transition-colors">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            Tile Catalogue
          </h2>
          <p className="text-[10px] text-slate-500">
            {displayed.length} of {tiles.length} tiles
          </p>
        </div>
      </div>

      <div className="relative mb-2">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input-field pl-8 text-xs"
          placeholder="Search tiles, materials…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="tile-scrollbar -mx-1 mb-2 flex gap-1 overflow-x-auto px-1 pb-0.5">
        {categories.map((cat) => {
          const active = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                active
                  ? "bg-brand-600 text-white shadow-card"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          );
        })}
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        <select
          className="input-field w-auto text-[10px]"
          value={finish}
          onChange={(e) => setFinish(e.target.value)}
        >
          {finishes.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          className="input-field w-auto text-[10px]"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
        >
          {materials.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div
        className={`tile-scrollbar -mr-1 flex-1 space-y-2 overflow-y-auto pr-1 ${
          displayed.length === 0 ? "flex items-center justify-center" : ""
        }`}
      >
        {displayed.length === 0 && (
          <div className="text-center text-xs text-slate-400">No tiles match your filters.</div>
        )}
        {displayed.map((tile) => (
          <TileCard
            key={tile.id}
            tile={tile}
            onSelect={() => setDetail(tile)}
            onApply={() => applyTile(tile.id, surface)}
          />
        ))}
      </div>

      {detail && <TileModal tile={detail} onClose={() => setDetail(null)} />}
    </section>
  );
}
