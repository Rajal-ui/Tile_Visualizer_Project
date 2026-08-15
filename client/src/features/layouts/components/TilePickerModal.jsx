import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { fetchTiles } from "@/services/tiles.api.js";

/**
 * Tile multi-select modal for the Zone Properties panel. Fetches the catalogue,
 * lets the admin pick tiles and returns the selected tile ids via `onConfirm`.
 *
 * Props:
 *  - `value`: currently assigned tile ids.
 *  - `onConfirm(ids)`: called with the merged selection.
 *  - `onClose()`.
 */
export default function TilePickerModal({ value = [], onConfirm, onClose }) {
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(value));

  useEffect(() => {
    let cancelled = false;
    fetchTiles({ limit: 100 })
      .then(({ data }) => {
        if (!cancelled) setTiles(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tiles;
    return tiles.filter((t) =>
      [t.title, t.material, t.finish, t.size]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [tiles, query]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-modal-in flex h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E7E9EE] px-5 py-3.5">
          <div>
            <h3 className="font-heading text-sm font-semibold text-[#14161A]">Add Allowed Tiles</h3>
            <p className="text-[11px] text-[#6B7280]">Pick tiles this zone may use.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6B7280] transition hover:bg-[#F7F8FA] hover:text-[#14161A]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="relative shrink-0 border-b border-[#E7E9EE] px-5 py-3">
          <Search size={14} className="absolute left-8 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            className="input-field w-full pl-9"
            placeholder="Search tiles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="tile-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-[#6B7280]">
              <Loader2 size={14} className="animate-spin" /> Loading catalogue…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-xs text-[#6B7280]">No tiles found.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((tile) => {
                const active = selected.has(String(tile._id));
                return (
                  <button
                    key={tile._id}
                    onClick={() => toggle(String(tile._id))}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? "border-[#6D5EF5] bg-[#6D5EF5]/8"
                        : "border-transparent hover:bg-[#F7F8FA]"
                    }`}
                    style={active ? { backgroundColor: "rgb(109 94 245 / 0.08)" } : undefined}
                  >
                    {tile.tileImage ? (
                      <img
                        src={tile.tileImage}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg border border-[#E7E9EE] object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F7F8FA] text-[#6B7280]/40">
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#14161A]">{tile.title}</p>
                      <p className="truncate text-[10px] text-[#6B7280]">
                        {[tile.material, tile.finish, tile.size].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                        active
                          ? "border-[#6D5EF5] bg-[#6D5EF5] text-white"
                          : "border-[#E7E9EE] bg-white text-transparent"
                      }`}
                    >
                      <Check size={11} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#E7E9EE] px-5 py-3.5">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#E7E9EE] bg-white px-4 py-2 text-xs font-semibold text-[#14161A] transition hover:bg-[#F7F8FA]"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm([...selected])}
            disabled={selected.size === 0}
            className="rounded-lg bg-[#6D5EF5] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5a4ad6] disabled:opacity-50"
          >
            Add {selected.size > 0 ? `${selected.size} ` : ""}tile{selected.size === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
