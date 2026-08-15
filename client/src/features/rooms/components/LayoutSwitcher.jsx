import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Layers, Loader2 } from "lucide-react";

/**
 * Rep-facing layout switcher — a persistent dropdown next to the room pills so
 * a different published layout for the active room can be picked directly,
 * without re-opening the full layout picker flow.
 */
export default function LayoutSwitcher({ layouts, activeLayoutId, onSelect, isLoading, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const active =
    layouts.find((l) => l.id === activeLayoutId) ||
    (activeLayoutId ? { id: activeLayoutId, name: activeLayoutId } : null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const canOpen = !disabled && !isLoading && layouts.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!canOpen}
        title="Choose a layout for this room"
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-white text-slate-300"
            : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-800"
        }`}
      >
        <Layers size={14} className="shrink-0 text-brand-600" />
        <span className="max-w-[160px] truncate">
          {isLoading ? "Loading layouts…" : active ? active.name : "Select layout"}
        </span>
        {isLoading ? (
          <Loader2 size={13} className="shrink-0 animate-spin text-slate-400" />
        ) : (
          <ChevronDown size={13} className="shrink-0 text-slate-400" />
        )}
      </button>

      {open && canOpen && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-64 origin-top-left overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Published layouts
          </div>
          <div className="p-1">
            {layouts.map((layout) => {
              const isActive = layout.id === activeLayoutId;
              return (
                <button
                  key={layout.id}
                  role="menuitem"
                  onClick={() => {
                    onSelect?.(layout.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {layout.name}
                  </span>
                  {isActive && <Check size={14} className="shrink-0 text-brand-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
