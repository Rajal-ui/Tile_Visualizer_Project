import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Loader2, Pencil, Plus, Trash2, TriangleAlert, CheckCircle2 } from "lucide-react";
import { deleteLayout, fetchLayouts } from "@/services/layouts.api.js";
import { useRooms } from "@/features/rooms/hooks/useRooms.js";
import NewLayoutWizard from "@/features/layouts/components/NewLayoutWizard.jsx";
import CategoryFilterPills from "@/components/CategoryFilterPills.jsx";
import StatusBadge from "@/components/StatusBadge.jsx";

/**
 * Effective room for a layout. Backend summaries carry `roomId`, but the legacy
 * static seed (e.g. "Kitchen IRIDIUM") stores null — fall back to matching the
 * layout name against the known room names so the category pills stay useful.
 */
function effectiveRoom(layout, rooms) {
  if (layout.roomId) return layout.roomId;
  const match = rooms.find((r) => layout.name?.toLowerCase().includes(r.name.toLowerCase()));
  return match?.id || null;
}

/**
 * Tile Studio — the admin layout templates list.
 *
 * Shows a room-category filter pill row and a 3-column card grid of layout
 * templates. Clicking a card routes into the scoped Zone Editor
 * (`/admin/layouts/:layoutId`); "+ New Layout" opens the onboarding wizard.
 */
export default function LayoutsPage() {
  const navigate = useNavigate();
  const { rooms } = useRooms();
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState("all");
  const [showWizard, setShowWizard] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLayouts()
      .then((list) => {
        if (cancelled) return;
        setLayouts(Array.isArray(list) ? list : []);
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

  const roomPills = useMemo(() => {
    const counts = new Map();
    layouts.forEach((l) => {
      const rid = effectiveRoom(l, rooms);
      counts.set(rid, (counts.get(rid) || 0) + 1);
    });
    const pills = [{ id: "all", label: "All", count: layouts.length }];
    rooms.forEach((room) => {
      if (counts.has(room.id)) pills.push({ id: room.id, label: room.name, count: counts.get(room.id) });
    });
    for (const [rid, count] of counts) {
      if (rid && !rooms.some((r) => r.id === rid)) pills.push({ id: rid, label: rid, count });
    }
    return pills;
  }, [layouts, rooms]);

  const filtered = useMemo(
    () =>
      activeRoom === "all" ? layouts : layouts.filter((l) => effectiveRoom(l, rooms) === activeRoom),
    [layouts, activeRoom, rooms]
  );

  const roomName = (layout) => {
    const rid = effectiveRoom(layout, rooms);
    return rooms.find((r) => r.id === rid)?.name || null;
  };

  const handleWizardChange = async (layoutId, { published } = {}) => {
    void layoutId;
    setNotice({
      type: "success",
      text: published
        ? "Layout published — it now appears in the Rep-facing picker."
        : "Draft layout saved — draw zone polygons, then preview and publish.",
    });
    try {
      const list = await fetchLayouts();
      setLayouts(Array.isArray(list) ? list : []);
    } catch {
      // Draft is already persisted; refreshing the list is best-effort.
    }
  };

  const handleDelete = async (layout) => {
    if (!window.confirm(`Delete "${layout.name}"? This removes the layout and its zone/asset files.`)) {
      return;
    }
    setBusyId(layout.id);
    try {
      await deleteLayout(layout.id);
      setLayouts((prev) => prev.filter((l) => l.id !== layout.id));
      setNotice({ type: "success", text: `Deleted "${layout.name}".` });
    } catch (e) {
      setNotice({ type: "error", text: `Could not delete "${layout.name}": ${e.message}` });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[#14161A]">Tile Studio</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Create and manage photo layouts — draw zone polygons, then publish to the visualizer.
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#6D5EF5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a4ad6]"
        >
          <Plus size={15} /> New Layout
        </button>
      </div>

      {notice && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold ${
            notice.type === "error"
              ? "border-[#fee2e2] bg-[#fee2e2]/60 text-[#DC2626]"
              : "border-[#dcfce7] bg-[#dcfce7]/60 text-[#16A34A]"
          }`}
        >
          {notice.type === "error" ? (
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Category filter pills */}
      <div className="mb-6">
        <CategoryFilterPills categories={roomPills} activeId={activeRoom} onChange={setActiveRoom} />
      </div>

      {/* Grid / empty state */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-white/70" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E7E9EE] bg-white px-6 py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6D5EF5]/10 text-[#6D5EF5]">
            <LayoutGrid size={26} />
          </div>
          <h2 className="font-heading text-lg font-semibold text-[#14161A]">No layouts yet</h2>
          <p className="mt-1 max-w-sm text-sm text-[#6B7280]">
            {activeRoom === "all"
              ? "Create your first layout template to start mapping zones for the visualizer."
              : "No layouts in this room yet."}
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="mt-5 flex items-center gap-1.5 rounded-lg bg-[#6D5EF5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a4ad6]"
          >
            <Plus size={15} /> New Layout
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((layout) => (
            <div
              key={layout.id}
              className="group relative overflow-hidden rounded-xl border border-[#E7E9EE] bg-white shadow-[0_4px_16px_rgba(20,22,26,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(20,22,26,0.12)]"
            >
              <button
                onClick={() => navigate(`/admin/layouts/${layout.id}`)}
                className="block w-full text-left"
                title="Edit layout"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-[#F7F8FA]">
                  {layout.background ? (
                    <img
                      src={layout.background}
                      alt={layout.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#F7F8FA] text-[#6B7280]/40">
                      <LayoutGrid size={30} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  {roomName(layout) && (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#6D5EF5] backdrop-blur-sm">
                      {roomName(layout)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <h3 className="truncate font-heading text-sm font-semibold text-[#14161A]">
                      {layout.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-2 text-[11px] text-[#6B7280]">
                      <StatusBadge status={layout.status} />
                      {layout.zoneCount} zone{layout.zoneCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[#6D5EF5] transition group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </button>

              {/* Floating actions */}
              <div className="absolute right-3 top-3 flex flex-col gap-1.5">
                <button
                  onClick={() => navigate(`/admin/layouts/${layout.id}`)}
                  title="Edit"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#6B7280] shadow-[0_2px_8px_rgba(20,22,26,0.15)] transition hover:bg-[#6D5EF5] hover:text-white"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(layout)}
                  disabled={busyId === layout.id}
                  title="Delete"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#DC2626] shadow-[0_2px_8px_rgba(20,22,26,0.15)] transition hover:bg-[#DC2626] hover:text-white disabled:opacity-50"
                >
                  {busyId === layout.id ? (
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

      {showWizard && (
        <NewLayoutWizard onClose={() => setShowWizard(false)} onDone={handleWizardChange} />
      )}
    </div>
  );
}
