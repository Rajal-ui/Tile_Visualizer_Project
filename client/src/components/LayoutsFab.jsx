import { useState } from "react";
import { LayoutGrid, Settings } from "lucide-react";
import AdminSettings from "@/components/AdminSettings.jsx";

/**
 * Layouts FAB — the small ball-shaped icon fixed at the top-right of the app.
 *
 * The ball is the admin/settings entry point:
 *  - clicking the ball opens the Layouts page (which contains the Layout Editor)
 *  - hovering it reveals the settings option (gear), which opens Admin Settings
 */
export default function LayoutsFab({ onOpenLayouts }) {
  const [showSettings, setShowSettings] = useState(false);
  const [hovering, setHovering] = useState(false);

  return (
    <>
      <div
        className="fixed right-4 top-16 z-40 flex items-center gap-2"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {hovering && (
          <button
            onClick={() => setShowSettings(true)}
            title="Admin settings"
            className="animate-modal-in flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition hover:border-slate-300 hover:text-slate-700"
          >
            <Settings size={15} />
          </button>
        )}

        <button
          onClick={onOpenLayouts}
          title="Open Layouts"
          className="group flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xl transition hover:scale-105 hover:border-brand-300 hover:text-brand-600 active:scale-95"
        >
          <LayoutGrid size={18} />
          <span className="pointer-events-none absolute -top-1 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500" />
        </button>
      </div>

      {showSettings && <AdminSettings onClose={() => setShowSettings(false)} />}
    </>
  );
}
