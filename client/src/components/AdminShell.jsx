import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, Grid3X3, Settings, ArrowLeft, LogOut, MonitorPlay } from "lucide-react";
import { useAuth } from "@/features/auth/auth.context.jsx";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: Home },
  { to: "/admin/layouts", label: "Tile Studio", icon: LayoutGrid },
  { to: "/admin/tiles", label: "Tiles", icon: Grid3X3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

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
        danger ? "text-[#DC2626] hover:bg-[#fee2e2]" : "text-[#14161A] hover:bg-[#F7F8FA]"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          danger ? "bg-[#fee2e2] text-[#DC2626]" : "bg-[#F7F8FA] text-[#6D5EF5]"
        }`}
      >
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold">{label}</span>
        {description && (
          <span className="block truncate text-[10px] text-[#6B7280]">{description}</span>
        )}
      </span>
    </button>
  );
}

function StudioTileLogo({ compact = false }) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "justify-center" : ""}`}>
      <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-[#14161A] p-1">
        <div className="h-3 w-3 rounded-sm bg-[#6D5EF5]" />
        <div className="h-3 w-3 rounded-sm bg-white/25" />
        <div className="h-3 w-3 rounded-sm bg-white/25" />
        <div className="h-3 w-3 rounded-sm bg-[#6D5EF5]" />
      </div>
      {!compact && (
        <span className="font-heading text-base font-bold tracking-tight text-[#14161A]">
          Studio<span className="text-[#6D5EF5]">Tile</span>
        </span>
      )}
    </div>
  );
}

/**
 * Admin shell — fixed 190px sidebar + routed main content.
 *
 * The sidebar hosts the StudioTile logo and the admin nav (Dashboard /
 * Tile Studio / Tiles / Settings). A shared top bar above the routed content
 * provides the "Back to workspace" link (left) and the signed-in user's profile
 * dropdown (right) on every admin screen. The dropdown holds the Admin Control
 * links (Settings, Tile Visualizer) plus Logout.
 */
export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const username = user?.username || "Admin";

  // Click-outside + Escape to auto-close the profile dropdown.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA]">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="flex w-[190px] shrink-0 flex-col border-r border-[#E7E9EE] bg-white">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#E7E9EE] px-4">
          <StudioTileLogo />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]/60">
            Admin
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[#6D5EF5] text-white shadow-[0_4px_12px_rgba(109,94,245,0.35)]"
                      : "text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#14161A]"
                  }`
                }
              >
                <Icon size={16} className="shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Shared top bar — exit link (left) + profile dropdown (right) */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#E7E9EE] bg-white px-6 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#6B7280] transition hover:bg-[#F7F8FA] hover:text-[#14161A]"
          >
            <ArrowLeft size={14} className="shrink-0" />
            Back to workspace
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 transition ${
                menuOpen
                  ? "border-[#6D5EF5]/40 bg-[#6D5EF5]/5"
                  : "border-[#E7E9EE] bg-white shadow-[0_4px_16px_rgba(20,22,26,0.06)] hover:border-[#6D5EF5]/30"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#14161A] text-xs font-extrabold text-white">
                {initials(username)}
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-xs font-bold text-[#14161A]">{username}</span>
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-[#E7E9EE] bg-white shadow-[0_12px_28px_rgba(20,22,26,0.12)]"
              >
                {/* User profile header */}
                <div className="flex items-center gap-3 border-b border-[#E7E9EE] bg-[#F7F8FA] px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#14161A] text-xs font-extrabold text-white">
                    {initials(username)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#14161A]">{username}</p>
                  </div>
                </div>

                {/* Admin Control + Logout */}
                <div className="p-1.5">
                  <MenuItem
                    icon={MonitorPlay}
                    label="Tile Visualizer"
                    description="Open the rep-facing dashboard"
                    onClick={() => go("/")}
                  />
                  <MenuItem
                    icon={Settings}
                    label="Settings"
                    description="Workspace preferences & account"
                    onClick={() => go("/admin/settings")}
                  />
                  <div className="my-1.5 h-px bg-[#E7E9EE]" />
                  <MenuItem icon={LogOut} label="Logout" danger onClick={logout} />
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
