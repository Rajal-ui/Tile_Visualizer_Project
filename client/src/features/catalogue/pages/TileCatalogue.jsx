import { useMemo, useState } from "react";
import { Search, Moon, Sun } from "lucide-react";
import { tiles, categories, finishes, materials } from "@/features/catalogue/data/tiles.js";
import { useWorkspace } from "@/store/workspace.context.jsx";
import TileCard from "@/features/catalogue/components/TileCard.jsx";
import TileModal from "@/features/catalogue/components/TileModal.jsx";

export default function TileCatalogue() {
  const { catalogueDark, toggleCatalogueDark, surface, applyTile } = useWorkspace();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [finish, setFinish] = useState("All Finishes");
  const [material, setMaterial] = useState("All Materials");
  const [detail, setDetail] = useState(null);

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
  }, [query, category, finish, material]);

  const dark = catalogueDark;

  return (
    <section
      className={`flex h-full flex-col rounded-2xl border p-4 transition-colors ${
        dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2
            className={`text-sm font-bold ${dark ? "text-slate-100" : "text-slate-800"}`}
          >
            Tile Catalogue
          </h2>
          <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {filtered.length} of {tiles.length} tiles
          </p>
        </div>
        <button
          onClick={toggleCatalogueDark}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
            dark
              ? "border-slate-700 bg-slate-800 text-amber-300 hover:bg-slate-700"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
          title="Toggle dark browsing mode"
        >
          {dark ? <Sun size={13} /> : <Moon size={13} />}
          <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
        </button>
      </div>

      <div className="relative mb-3">
        <Search
          size={15}
          className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-slate-500" : "text-slate-400"}`}
        />
        <input
          className={`input-field pl-9 ${dark ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500" : ""}`}
          placeholder="Search tiles, materials, finishes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="tile-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {categories.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-brand-600 text-white shadow-card"
                  : dark
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <select
          className={`input-field w-auto text-xs ${dark ? "border-slate-700 bg-slate-800 text-slate-200" : ""}`}
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
          className={`input-field w-auto text-xs ${dark ? "border-slate-700 bg-slate-800 text-slate-200" : ""}`}
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
        className={`tile-scrollbar -mr-1 flex-1 space-y-2.5 overflow-y-auto pr-1 ${
          filtered.length === 0 ? "flex items-center justify-center" : ""
        }`}
      >
        {filtered.length === 0 && (
          <div className="text-center text-sm text-slate-400">No tiles match your filters.</div>
        )}
        {filtered.map((tile) => (
          <TileCard
            key={tile.id}
            tile={tile}
            dark={dark}
            onSelect={() => setDetail(tile)}
            onApply={() => applyTile(tile.id, surface)}
          />
        ))}
      </div>

      {detail && <TileModal tile={detail} onClose={() => setDetail(null)} />}
    </section>
  );
}
