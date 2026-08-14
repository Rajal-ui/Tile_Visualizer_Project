import { useState } from "react";
import { Bell, LogOut, Palette, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/features/auth/auth.context.jsx";

function Toggle({ label, description, enabled, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <span>
        <span className="block text-xs font-semibold text-slate-700">{label}</span>
        {description && <span className="block text-[10px] text-slate-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={(e) => {
          e.preventDefault();
          onChange(!enabled);
        }}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          enabled ? "bg-brand-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            enabled ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export default function AdminSettings({ onClose }) {
  const { user, logout } = useAuth();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoPublish, setAutoPublish] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-modal-in flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Admin Settings</h2>
            <p className="text-[10px] text-slate-400">Workspace preferences & account</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="tile-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <section className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800">
                {user?.username || "Admin"}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                {user?.role || "admin"} account
              </p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
            >
              <LogOut size={13} />
              Logout
            </button>
          </section>

          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Bell size={12} /> Notifications
            </h3>
            <Toggle
              label="Email alerts"
              description="Notify me when a layout is published"
              enabled={emailAlerts}
              onChange={setEmailAlerts}
            />
          </section>

          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Palette size={12} /> Publishing
            </h3>
            <Toggle
              label="Auto-publish drafts"
              description="Publish layouts immediately on save"
              enabled={autoPublish}
              onChange={setAutoPublish}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
