import { useState } from "react";
import { ArrowLeft, ImageIcon, LayoutGrid } from "lucide-react";

const SKELETON_COUNT = 6;

function LayoutCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-slate-200" />
      <div className="flex items-center justify-between p-3">
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

/**
 * Step 2 of the Rep-facing preview flow: pick a published layout for a room.
 *
 * Handles four states:
 *   - loading  → skeleton cards
 *   - empty    → graceful empty state with a back action
 *   - multiple → visual gallery grid with hover/active states + continue
 *
 * The single-layout case is handled by the caller (auto-advance), so this
 * component never renders the picker UI for it.
 */
export default function LayoutPicker({
  room,
  layouts,
  isLoading,
  isError,
  onSelect,
  onBack,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = layouts.find((l) => l.id === selectedId) || layouts[0] || null;

  // While an error is pending the caller auto-dismisses; render skeletons so
  // the empty state never flashes during the fallback.
  const busy = isLoading || (isError && layouts.length === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="animate-modal-in flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-slate-900 p-1">
              <div className="h-3 w-3 rounded-sm bg-brand-400" />
              <div className="h-3 w-3 rounded-sm bg-white/25" />
              <div className="h-3 w-3 rounded-sm bg-white/25" />
              <div className="h-3 w-3 rounded-sm bg-brand-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{room.name}</h2>
              <p className="text-xs text-slate-400">
                {busy
                  ? "Loading layouts…"
                  : layouts.length
                    ? "Choose a layout to preview"
                    : "No layouts to preview"}
              </p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Back to rooms</span>
          </button>
        </div>

        {/* Body */}
        {busy ? (
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <LayoutCardSkeleton key={i} />
            ))}
          </div>
        ) : layouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <LayoutGrid size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-600">
              No published layouts for {room.name}
            </p>
            <p className="max-w-xs text-xs leading-relaxed text-slate-400">
              This room doesn&apos;t have any published layouts yet. Go back and pick
              another room, or ask an admin to publish a layout.
            </p>
            <button
              onClick={onBack}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              <ArrowLeft size={13} /> Back to room selection
            </button>
          </div>
        ) : (
          <>
            <div className="tile-scrollbar grid max-h-[52vh] grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3">
              {layouts.map((layout) => {
                const active = layout.id === selected?.id;
                return (
                  <button
                    key={layout.id}
                    onClick={() => setSelectedId(layout.id)}
                    aria-pressed={active}
                    className={`group overflow-hidden rounded-xl border text-left transition ${
                      active
                        ? "border-brand-500 ring-2 ring-brand-500/25"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-card"
                    }`}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      {layout.background ? (
                        <img
                          src={layout.background}
                          alt={layout.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
                          <ImageIcon size={26} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <span
                        className={`truncate text-xs font-semibold ${
                          active ? "text-brand-700" : "text-slate-700"
                        }`}
                      >
                        {layout.name}
                      </span>
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full transition ${
                          active ? "bg-brand-500" : "border border-slate-300 bg-white"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                onClick={onBack}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => selected && onSelect(selected)}
                disabled={!selected}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to Compositor
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}