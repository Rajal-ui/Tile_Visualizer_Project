import { useState } from "react";
import { LogOut, MonitorPlay, X, AppWindow, RotateCcw } from "lucide-react";
import { useAuth } from "@/features/auth/auth.context.jsx";
import { useWorkspace } from "@/store/workspace.context.jsx";
import RoomSelector from "@/features/rooms/components/RoomSelector.jsx";
import LayoutSelector from "@/features/layouts/components/LayoutSelector.jsx";
import Visualizer from "@/features/visualizer/pages/Visualizer.jsx";
import TileCatalogue from "@/features/catalogue/pages/TileCatalogue.jsx";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { resetAll } = useWorkspace();
  const [present, setPresent] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-slate-900 p-1">
              <div className="h-3 w-3 rounded-sm bg-brand-400" />
              <div className="h-3 w-3 rounded-sm bg-white/25" />
              <div className="h-3 w-3 rounded-sm bg-white/25" />
              <div className="h-3 w-3 rounded-sm bg-brand-500" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900">
                Tile<span className="text-brand-600">Visualizer</span>
              </h1>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                Admin Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {user.username}
            </span>
            {!present ? (
              <button
                onClick={() => setPresent(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <MonitorPlay size={14} />
                <span className="hidden md:inline">Present</span>
              </button>
            ) : (
              <button
                onClick={() => setPresent(false)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                <X size={14} />
                <span className="hidden md:inline">Exit Present</span>
              </button>
            )}
            <button
              onClick={resetAll}
              title="Reset workspace"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <RotateCcw size={14} />
              <span className="hidden md:inline">Reset</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
            >
              <LogOut size={14} />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-4">
        {!present && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <RoomSelector />
          </div>
        )}

        <div
          className={`grid flex-1 gap-4 ${
            present
              ? "grid-cols-1"
              : "grid-cols-1 lg:grid-cols-[1fr_380px]"
          }`}
        >
          <div className={`flex flex-col gap-4 ${present ? "min-h-[calc(100vh-140px)]" : "min-h-[520px]"}`}>
            {!present && <LayoutSelector />}
            <div className="min-h-0 flex-1">
              <Visualizer />
            </div>
          </div>

          {!present && (
            <div className="min-h-[420px] lg:min-h-0">
              <TileCatalogue />
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between pb-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <AppWindow size={12} />
            Digital Tile Catalogue &amp; Visualizer
          </span>
          <span>Internal use only</span>
        </footer>
      </main>
    </div>
  );
}
