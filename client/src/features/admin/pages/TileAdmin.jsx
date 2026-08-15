import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2, TriangleAlert, Upload, X } from "lucide-react";
import { COMPATIBLE_ZONES } from "@shared/schemas/index.js";
import {
  createTile,
  deleteTile,
  fetchCategories,
  fetchTiles,
  updateTile,
  uploadImage,
} from "@/services/tiles.api.js";
import CategoryFilterPills from "@/components/CategoryFilterPills.jsx";

const ROOM_IDS = ["living-room", "kitchen", "bathroom", "bedroom", "staircase", "exterior"];

const ROOM_LABELS = {
  "living-room": "Living Room",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  bedroom: "Bedroom",
  staircase: "Staircase",
  exterior: "Exterior",
  facade: "Exterior",
};

const MATERIALS = ["Porcelain", "Ceramic", "Vitrified", "Natural Stone"];
const FINISHES = ["Matt", "Glossy", "Satin", "Textured"];

/** Parse a tile size string like "600x600mm" into { w, h }. */
function parseSize(size) {
  const m = typeof size === "string" ? size.match(/(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)/) : null;
  return m ? { sizeW: m[1], sizeH: m[2] } : { sizeW: "", sizeH: "" };
}

const EMPTY_FORM = {
  title: "",
  material: "Porcelain",
  finish: "Matt",
  sizeW: "",
  sizeH: "",
  price: "",
  rooms: [],
  compatibleZones: [],
  description: "",
  tileImage: "",
  category: "",
};

function TileForm({ initial, categories, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    title: initial?.title || "",
    material: initial?.material || "Porcelain",
    finish: initial?.finish || "Matt",
    ...parseSize(initial?.size),
    price: initial?.price != null ? String(initial.price) : "",
    rooms: initial?.rooms || [],
    compatibleZones: initial?.compatibleZones || [],
    description: initial?.description || "",
    tileImage: initial?.tileImage || "",
    category: initial?.category || "",
  }));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleIn = (field, value) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v) => v !== value)
        : [...f[field], value],
    }));

  const handleFile = async (file) => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadImage(file);
      set("tileImage", result.url);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const submit = async () => {
    if (!form.title.trim()) {
      setError("Tile name is required.");
      return;
    }
    if (!form.rooms.length) {
      setError("Select at least one room category.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let category = form.category;
      if (!category) {
        const primaryRoom = form.rooms[0];
        const floorCat = categories.find((c) => c.room === primaryRoom && c.type === "floor");
        category = floorCat?._id;
      }
      if (!category) {
        setError("Could not resolve a category template — reseed the database.");
        setSaving(false);
        return;
      }
      const payload = {
        title: form.title.trim(),
        category,
        material: form.material,
        finish: form.finish,
        size: form.sizeW && form.sizeH ? `${form.sizeW}x${form.sizeH}mm` : undefined,
        price: form.price === "" ? undefined : Number(form.price),
        rooms: form.rooms,
        compatibleZones: form.compatibleZones,
        description: form.description.trim() || undefined,
        tileImage: form.tileImage || undefined,
      };
      const saved = initial?._id ? await updateTile(initial._id, payload) : await createTile(payload);
      onSaved(saved);
    } catch (err) {
      setError(err.message || "Failed to save tile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="tile-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-[#fee2e2]/70 px-3 py-2 text-[11px] font-semibold text-[#DC2626]">
            <TriangleAlert size={13} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload dropzone */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#14161A]">Tile image</label>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
              form.tileImage
                ? "border-[#16A34A]/40 bg-[#16A34A]/5"
                : "border-[#E7E9EE] bg-[#F7F8FA] hover:border-[#6D5EF5]/50 hover:bg-[#6D5EF5]/5"
            }`}
          >
            {form.tileImage ? (
              <img
                src={form.tileImage}
                alt="Tile preview"
                className="h-20 w-20 rounded-xl border border-[#E7E9EE] object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#6D5EF5] shadow-sm">
                {uploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
              </span>
            )}
            <p className="text-sm font-semibold text-[#6D5EF5]">
              {uploading ? "Uploading…" : form.tileImage ? "Replace image" : "Click to upload or drag & drop"}
            </p>
            <p className="text-xs text-[#6B7280]">PNG, JPG or WEBP — square image recommended</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Tile name */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#14161A]">Tile Name</label>
          <input
            className="input-field w-full"
            placeholder="e.g. Iridium Aruba Armani"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>

        {/* Material | Finish */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#14161A]">Material</label>
            <select
              className="input-field w-full"
              value={form.material}
              onChange={(e) => set("material", e.target.value)}
            >
              {MATERIALS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#14161A]">Finish</label>
            <select
              className="input-field w-full"
              value={form.finish}
              onChange={(e) => set("finish", e.target.value)}
            >
              {FINISHES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Size W×H | Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#14161A]">Size (mm)</label>
            <div className="flex items-center gap-2">
              <input
                className="input-field w-full"
                inputMode="decimal"
                placeholder="600"
                value={form.sizeW}
                onChange={(e) => set("sizeW", e.target.value)}
              />
              <span className="text-sm font-semibold text-[#6B7280]">×</span>
              <input
                className="input-field w-full"
                inputMode="decimal"
                placeholder="600"
                value={form.sizeH}
                onChange={(e) => set("sizeH", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#14161A]">Price (₹/sq m)</label>
            <input
              type="number"
              min="0"
              className="input-field w-full"
              placeholder="1800"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </div>
        </div>

        {/* Room categories */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#14161A]">Room Categories</label>
          <div className="flex flex-wrap gap-2">
            {ROOM_IDS.map((room) => {
              const active = form.rooms.includes(room);
              return (
                <button
                  key={room}
                  type="button"
                  onClick={() => toggleIn("rooms", room)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-[#6D5EF5] bg-[#6D5EF5]/8 text-[#6D5EF5]"
                      : "border-[#E7E9EE] bg-white text-[#6B7280] hover:border-[#6D5EF5]/40 hover:text-[#6D5EF5]"
                  }`}
                  style={active ? { backgroundColor: "rgb(109 94 245 / 0.08)" } : undefined}
                >
                  {ROOM_LABELS[room] || room}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compatible zones */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#14161A]">
            Compatible zones
          </label>
          <div className="flex flex-wrap gap-2">
            {COMPATIBLE_ZONES.map((zone) => {
              const active = form.compatibleZones.includes(zone);
              return (
                <button
                  key={zone}
                  type="button"
                  onClick={() => toggleIn("compatibleZones", zone)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                    active
                      ? "border-[#6D5EF5] bg-[#6D5EF5]/8 text-[#6D5EF5]"
                      : "border-[#E7E9EE] bg-white text-[#6B7280] hover:border-[#6D5EF5]/40 hover:text-[#6D5EF5]"
                  }`}
                  style={active ? { backgroundColor: "rgb(109 94 245 / 0.08)" } : undefined}
                >
                  {zone}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#14161A]">Description</label>
          <textarea
            className="input-field w-full resize-none"
            rows={3}
            placeholder="Short description of the tile, finish and best-fit spaces."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#E7E9EE] px-6 py-4">
        <button
          onClick={onCancel}
          className="rounded-lg border border-[#E7E9EE] bg-white px-4 py-2.5 text-sm font-semibold text-[#14161A] transition hover:bg-[#F7F8FA]"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-[#6D5EF5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a4ad6] disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {saving ? "Saving…" : "Save Tile"}
        </button>
      </div>
    </div>
  );
}

export default function TileAdmin() {
  const [tiles, setTiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [activeRoom, setActiveRoom] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modal, setModal] = useState(null); // { mode: "create" | "edit", tile }
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [{ data }, cats] = await Promise.all([fetchTiles({ limit: 100 }), fetchCategories()]);
      setTiles(data);
      setCategories(cats);
    } catch (e) {
      console.error("load tiles:", e);
      setLoadError(e.message || "Could not load tiles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const catRoomMap = useMemo(() => {
    const m = {};
    categories.forEach((c) => {
      m[String(c._id)] = c.room;
    });
    return m;
  }, [categories]);

  const roomPills = useMemo(() => {
    const counts = {};
    tiles.forEach((t) => {
      const room = catRoomMap[String(t.category)];
      if (room) counts[room] = (counts[room] || 0) + 1;
    });
    // Show every room category that exists in the category templates (even
    // ones with no tiles yet), ordered to match the fixed ROOM_IDS list.
    const rooms = [...new Set(categories.map((c) => c.room).filter(Boolean))];
    rooms.sort((a, b) => {
      const ia = ROOM_IDS.indexOf(a);
      const ib = ROOM_IDS.indexOf(b);
      return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
    });
    const pills = [{ id: "all", label: "All", count: tiles.length }];
    rooms.forEach((room) => {
      pills.push({ id: room, label: ROOM_LABELS[room] || room, count: counts[room] || 0 });
    });
    return pills;
  }, [tiles, catRoomMap, categories]);

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tiles.filter((t) => {
      if (activeRoom !== "all" && catRoomMap[String(t.category)] !== activeRoom) return false;
      if (!q) return true;
      return [t.title, t.material, t.finish, t.size, t.sku, t.colorTag]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [tiles, query, activeRoom, catRoomMap]);

  const handleDelete = async (tile) => {
    if (!window.confirm(`Delete "${tile.title}"?`)) return;
    setBusyId(tile._id);
    try {
      await deleteTile(tile._id);
      setTiles((prev) => prev.filter((t) => t._id !== tile._id));
    } catch (e) {
      console.error("delete tile:", e);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[#14161A]">Tile Catalog</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {displayed.length} of {tiles.length} tiles · Manage the catalogue shown in the visualizer.
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "create", tile: null })}
          className="flex items-center gap-1.5 rounded-lg bg-[#6D5EF5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a4ad6]"
        >
          <Plus size={15} /> New Tile
        </button>
      </div>

      {/* Category pills */}
      <div className="mb-4">
        <CategoryFilterPills categories={roomPills} activeId={activeRoom} onChange={setActiveRoom} />
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-lg">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
        <input
          className="input-field w-full pl-10"
          placeholder="Search tiles by name, material, finish…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      {loadError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#fee2e2] bg-[#fee2e2]/60 px-4 py-2.5 text-xs font-semibold text-[#DC2626]">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-white/70" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E7E9EE] bg-white px-6 py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6D5EF5]/10 text-[#6D5EF5]">
            <Search size={24} />
          </div>
          <h2 className="font-heading text-lg font-semibold text-[#14161A]">No tiles found</h2>
          <p className="mt-1 max-w-sm text-sm text-[#6B7280]">
            {tiles.length === 0
              ? "Add your first tile to start building the catalogue."
              : "Try adjusting the search or room filter."}
          </p>
          {tiles.length === 0 && (
            <button
              onClick={() => setModal({ mode: "create", tile: null })}
              className="mt-5 flex items-center gap-1.5 rounded-lg bg-[#6D5EF5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a4ad6]"
            >
              <Plus size={15} /> New Tile
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayed.map((tile) => (
            <div
              key={tile._id}
              className="group relative overflow-hidden rounded-xl border border-[#E7E9EE] bg-white shadow-[0_4px_16px_rgba(20,22,26,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(20,22,26,0.12)]"
            >
              <button
                onClick={() => setModal({ mode: "edit", tile })}
                className="block w-full text-left"
                title="Edit tile"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-[#F7F8FA]">
                  {tile.tileImage ? (
                    <img
                      src={tile.tileImage}
                      alt={tile.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#F7F8FA] text-[#6B7280]/30">
                      <span className="font-heading text-3xl font-semibold">—</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                </div>
                <div className="px-4 pb-4 pt-3">
                  <h3 className="truncate font-heading text-sm font-semibold text-[#14161A]">
                    {tile.title}
                  </h3>
                  <p className="mt-0.5 truncate text-[11px] text-[#6B7280]">
                    {[tile.material, tile.finish, tile.size].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1">
                    {tile.price != null ? (
                      <>
                        <span className="text-sm font-bold text-[#6D5EF5]">₹{tile.price}</span>
                        <span className="text-[11px] text-[#6B7280]">/sq m</span>
                      </>
                    ) : (
                      <span className="text-[11px] text-[#6B7280]">Price on request</span>
                    )}
                  </div>
                </div>
              </button>

              {/* Floating actions */}
              <div className="absolute right-2 top-2 flex flex-col gap-1.5">
                <button
                  onClick={() => setModal({ mode: "edit", tile })}
                  title="Edit"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#6B7280] shadow-[0_2px_8px_rgba(20,22,26,0.15)] transition hover:bg-[#6D5EF5] hover:text-white"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(tile)}
                  disabled={busyId === tile._id}
                  title="Delete"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#DC2626] shadow-[0_2px_8px_rgba(20,22,26,0.15)] transition hover:bg-[#DC2626] hover:text-white disabled:opacity-50"
                >
                  {busyId === tile._id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="animate-modal-in flex h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#E7E9EE] px-6 py-4">
              <div>
                <h2 className="font-heading text-base font-semibold text-[#14161A]">
                  {modal.mode === "edit" ? "Edit Tile" : "Create New Tile"}
                </h2>
                <p className="text-xs text-[#6B7280]">
                  {modal.mode === "edit"
                    ? "Update the tile details shown in the catalogue."
                    : "Add a new tile to the catalogue."}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded-lg p-1.5 text-[#6B7280] transition hover:bg-[#F7F8FA] hover:text-[#14161A]"
              >
                <X size={17} />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <TileForm
                initial={modal.tile}
                categories={categories}
                onCancel={() => setModal(null)}
                onSaved={(saved) => {
                  setTiles((prev) => {
                    const next = prev.filter((t) => t._id !== saved._id);
                    return [saved, ...next];
                  });
                  setModal(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
