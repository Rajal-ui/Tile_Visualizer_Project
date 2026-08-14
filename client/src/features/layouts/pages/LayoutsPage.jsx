import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, LayoutGrid, Plus, Settings, TriangleAlert, X } from "lucide-react";
import { fetchLayouts, saveLayout } from "@/services/layouts.api.js";
import { createRoom, createZone } from "@shared/schemas/layout.js";
import LayoutEditor from "@/features/layouts/pages/LayoutEditor.jsx";
import TileAdmin from "@/features/admin/pages/TileAdmin.jsx";
import AdminSettings from "@/components/AdminSettings.jsx";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Layouts — the admin page that wraps the Layout Editor section.
 *
 * The editor lives only inside this page. The header hosts the layout
 * selector (switch between any layout), "+ New Layout" creation, and the
 * settings option, so this page is the admin/layouts entry point opened by
 * the top-right ball-shaped FAB.
 */
export default function LayoutsPage({ onClose }) {
  const [tab, setTab] = useState("layouts"); // "layouts" | "tiles"
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLayouts()
      .then((list) => {
        if (cancelled) return;
        const items = Array.isArray(list) ? list : [];
        setLayouts(items);
        setSelectedId((prev) => prev ?? items[0]?.id ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        setNotice({ type: "error", text: `Could not load layouts: ${e.message}` });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => layouts.find((l) => l.id === selectedId) || null,
    [layouts, selectedId]
  );

  const createLayout = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const id = slugify(name) || `layout-${Date.now()}`;
      const config = createRoom({
        id,
        name,
        zones: [
          createZone({ id: "floor", label: "Floor" }),
          createZone({ id: "wall", label: "Wall" }),
          createZone({ id: "counter", label: "Counter" }),
        ],
      });
      const result = await saveLayout(id, config);
      const created = result?.layout || config;
      setLayouts((prev) => {
        const next = prev.filter((l) => l.id !== created.id);
        return [...next, created];
      });
      setSelectedId(created.id);
      setNewName("");
      setShowNew(false);
      setNotice({ type: "success", text: `Layout "${created.name}" created as draft.` });
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Failed to create layout." });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* Page header */}
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-2">
          <div className="grid grid-cols-2 gap-0.5 rounded-md bg-slate-800 p-1">
            <div className="h-2.5 w-2.5 rounded-sm bg-brand-400" />
            <div className="h-2.5 w-2.5 rounded-sm bg-white/25" />
            <div className="h-2.5 w-2.5 rounded-sm bg-white/25" />
            <div className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
          </div>
          <h1 className="text-sm font-extrabold tracking-tight text-white">Studio</h1>
        </div>

        {/* Admin tabs */}
        <nav className="flex items-center gap-1 rounded-lg bg-slate-800/60 p-1">
          <button
            onClick={() => setTab("layouts")}
            className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
              tab === "layouts" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Layouts
          </button>
          <button
            onClick={() => setTab("tiles")}
            className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
              tab === "tiles" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Tiles
          </button>
        </nav>

        {/* Layout selector */}
        {tab === "layouts" && (
          <div className="relative ml-auto">
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="appearance-none rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
              disabled={loading}
            >
              {loading && <option value="">Loading layouts…</option>}
              {!loading && layouts.length === 0 && (
                <option value="">No layouts yet</option>
              )}
              {layouts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.status === "published" ? " (published)" : " (draft)"}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        )}

        <button
          onClick={() => setShowSettings(true)}
          title="Admin settings"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <Settings size={14} />
        </button>

        {tab === "layouts" && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            <Plus size={14} /> New Layout
          </button>
        )}
      </header>

      {notice && (
        <div
          className={`flex shrink-0 items-start gap-2 px-4 py-2 text-[11px] font-semibold ${
            notice.type === "error" ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {notice.type === "error" ? (
            <TriangleAlert size={13} className="mt-0.5 shrink-0" />
          ) : (
            <span className="mt-0.5 shrink-0 text-emerald-300">✓</span>
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Editor section — the Layout Editor lives only here */}
      <div className="min-h-0 flex-1">
        {tab === "tiles" ? (
          <TileAdmin />
        ) : selectedId ? (
          <LayoutEditor key={selectedId} layoutId={selectedId} embedded onClose={onClose} />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <div className="text-center">
              <LayoutGrid size={28} className="mx-auto mb-2 text-slate-600" />
              <p className="text-xs font-semibold">
                {loading ? "Loading layouts…" : "No layouts found. Create one to start."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Layout modal */}
      {showNew && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setShowNew(false)}
        >
          <div
            className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">New Layout</h2>
              <button
                onClick={() => setShowNew(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            </div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Layout name
            </label>
            <input
              autoFocus
              className="input-field w-full text-xs"
              placeholder="e.g. Kitchen IRIDIUM"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createLayout();
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowNew(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={createLayout}
                disabled={!newName.trim() || creating}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                <Plus size={13} /> {creating ? "Creating…" : "Create draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && <AdminSettings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
