import { useCallback, useEffect, useMemo, useState } from "react";
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

const EMPTY_FORM = {
  title: "",
  sku: "",
  colorTag: "",
  price: "",
  material: "Porcelain",
  finish: "Matt",
  size: "600x600mm",
  category: "",
  compatibleZones: [],
  tileImage: "",
};

function TileForm({ initial, categories, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...initial }));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleZone = (zone) =>
    setForm((f) => ({
      ...f,
      compatibleZones: f.compatibleZones.includes(zone)
        ? f.compatibleZones.filter((z) => z !== zone)
        : [...f.compatibleZones, zone],
    }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadImage(file);
      set("tileImage", result.url);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    if (!form.title.trim() || !form.category) {
      setError("Title and category are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        price: form.price === "" ? undefined : Number(form.price),
      };
      const saved = initial?._id
        ? await updateTile(initial._id, payload)
        : await createTile(payload);
      onSaved(saved);
    } catch (err) {
      setError(err.message || "Failed to save tile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="tile-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
            <TriangleAlert size={13} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tile image
          </label>
          <div className="flex items-center gap-3">
            {form.tileImage ? (
              <img
                src={form.tileImage}
                alt=""
                className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-300">
                <Upload size={16} />
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Uploading…" : "Upload"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Title">
            <input className="input-field w-full text-xs" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Iridium Aruba Armani" />
          </Field>
          <Field label="SKU">
            <input className="input-field w-full text-xs" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="IA-600-MAT" />
          </Field>
          <Field label="Category">
            <select className="input-field w-full text-xs" value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.room})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Color tag">
            <input className="input-field w-full text-xs" value={form.colorTag} onChange={(e) => set("colorTag", e.target.value)} placeholder="Warm beige" />
          </Field>
          <Field label="Price (₹)">
            <input type="number" className="input-field w-full text-xs" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="1800" />
          </Field>
          <Field label="Size">
            <input className="input-field w-full text-xs" value={form.size} onChange={(e) => set("size", e.target.value)} placeholder="600x600mm" />
          </Field>
          <Field label="Material">
            <select className="input-field w-full text-xs" value={form.material} onChange={(e) => set("material", e.target.value)}>
              {["Porcelain", "Ceramic", "Vitrified", "Natural Stone"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Finish">
            <select className="input-field w-full text-xs" value={form.finish} onChange={(e) => set("finish", e.target.value)}>
              {["Matt", "Glossy", "Satin", "Textured"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Compatible zones
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMPATIBLE_ZONES.map((zone) => {
              const active = form.compatibleZones.includes(zone);
              return (
                <button
                  key={zone}
                  type="button"
                  onClick={() => toggleZone(zone)}
                  className={`rounded-full px-3 py-1 text-[10px] font-bold capitalize transition ${
                    active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {zone}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {saving ? "Saving…" : initial?._id ? "Save changes" : "Create tile"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export default function TileAdmin() {
  const [tiles, setTiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode: "create" | "edit", tile }
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data, pagination }, cats] = await Promise.all([fetchTiles({ search: query }), fetchCategories()]);
      setTiles(data);
      void pagination;
      setCategories(cats);
    } catch (e) {
      console.error("load tiles:", e);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  const filtered = useMemo(() => tiles, [tiles]);

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
    <section className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Tile Management</h2>
          <p className="text-[10px] text-slate-400">{filtered.length} tiles in catalogue</p>
        </div>
        <button
          onClick={() => setModal({ mode: "create", tile: null })}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800"
        >
          <Plus size={13} /> New Tile
        </button>
      </div>

      <div className="relative border-b border-slate-200 px-4 py-2">
        <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input-field w-full pl-8 text-xs"
          placeholder="Search tiles by title, material, finish…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="tile-scrollbar min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-10 text-center text-xs text-slate-400">No tiles found.</div>
        )}
        {!loading &&
          filtered.map((tile) => (
            <div
              key={tile._id}
              className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 transition hover:bg-slate-50"
            >
              {tile.tileImage ? (
                <img src={tile.tileImage} alt="" className="h-12 w-12 rounded-lg border border-slate-200 object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                  —{/* tile image */}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800">{tile.title}</p>
                <p className="text-[10px] text-slate-400">
                  {tile.sku || "—"} · {tile.material} · {tile.finish} · {tile.size}
                  {tile.price != null && ` · ₹${tile.price}`}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(tile.compatibleZones || []).map((z) => (
                    <span key={z} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold capitalize text-slate-500">
                      {z}
                    </span>
                  ))}
                  {tile.colorTag && (
                    <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-semibold text-brand-600">
                      {tile.colorTag}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setModal({ mode: "edit", tile })}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(tile)}
                  disabled={busyId === tile._id}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                  title="Delete"
                >
                  {busyId === tile._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="animate-modal-in flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">
                {modal.mode === "edit" ? "Edit Tile" : "New Tile"}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
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
    </section>
  );
}
