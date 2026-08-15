import { useEffect, useRef, useState } from "react";
import { LayoutGrid, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/auth.context.jsx";
import AdminSettings from "@/components/AdminSettings.jsx";

function initials(name) {
  return (name || "A")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MenuItem({ icon: Icon, label, description, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition ${
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          danger ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-500"
        }`}
      >
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold">{label}</span>
        {description && (
          <span className="block truncate text-[10px] text-slate-400">{description}</span>
        )}
      </span>
    </button>
  );
}

/**
 * Unified profile dropdown for the top navigation bar (Chrome profile style).
 *
 * The trigger is the avatar / user badge; the floating card exposes the user
 * header plus the Layouts, Admin Control (settings) and Logout actions. The
 * admin settings modal is owned here, mirroring the old LayoutsFab behaviour.
 */
export default function ProfileDropdown({ onOpenLayouts }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const rootRef = useRef(null);

  const username = user?.username || "Admin";

  // Click-outside + Escape to auto-close the floating card.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
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

  const handleLayouts = () => {
    setOpen(false);
    onOpenLayouts?.();
  };

  const handleSettings = () => {
    setOpen(false);
    setShowSettings(true);
  };

  return (
    <>
      <div className="relative" ref={rootRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          title={username}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
            open ? "ring-2 ring-brand-400 ring-offset-2" : "hover:scale-105"
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-extrabold text-white">
            {initials(username)}
          </span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right animate-modal-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card-hover"
          >
            {/* User profile header */}
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-extrabold text-white">
                {initials(username)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800">{username}</p>
              </div>
            </div>

            {/* Menu actions */}
            <div className="p-1.5">
              <MenuItem
                icon={LayoutGrid}
                label="Layouts"
                description="Open the layout editor"
                onClick={handleLayouts}
              />
              <MenuItem
                icon={ShieldCheck}
                label="Admin Control"
                description="Workspace & account settings"
                onClick={handleSettings}
              />
              <div className="my-1.5 h-px bg-slate-100" />
              <MenuItem icon={LogOut} label="Logout" danger onClick={logout} />
            </div>
          </div>
        )}
      </div>

      {showSettings && <AdminSettings onClose={() => setShowSettings(false)} />}
    </>
  );
}