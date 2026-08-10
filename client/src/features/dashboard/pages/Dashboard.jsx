import { useState } from "react";
import { LogOut, MonitorPlay, X, RotateCcw, MapPin } from "lucide-react";
import { useAuth } from "@/features/auth/auth.context.jsx";
import { useWorkspace } from "@/store/workspace.context.jsx";
import RoomViewer from "@/features/visualizer/components/RoomViewer.jsx";
import TileSwapPanel from "@/features/catalogue/components/TileSwapPanel.jsx";
import TileCatalogue from "@/features/catalogue/pages/TileCatalogue.jsx";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { rooms, roomId, setRoom, resetAll } = useWorkspace();
  const [present, setPresent] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
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

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-2 px-4 py-2">
        {!present && (
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:flex">
              <MapPin size={14} />
              Rooms
            </div>
            <div className="tile-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-1">
              {rooms.map((room) => {
                const Icon = room.icon;
                const active = room.id === roomId;
                return (
                  <button
                    key={room.id}
                    onClick={() => setRoom(room.id)}
                    aria-pressed={active}
                    className={`group flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                      active
                        ? "border-transparent text-white shadow-card"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    style={active ? { backgroundColor: room.accent } : undefined}
                  >
                    <Icon
                      size={15}
                      className={active ? "text-white" : "text-slate-400 group-hover:text-slate-600"}
                    />
                    {room.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div
          className={`grid flex-1 gap-3 lg:gap-4 ${
            present
              ? "grid-cols-1 grid-rows-1"
              : "grid-cols-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[1fr_300px] lg:grid-rows-1"
          }`}
        >
          <div className={`flex flex-col ${present ? "min-h-[calc(100vh-140px)]" : "min-h-0 flex-1"}`}>
            <div className="min-h-0 flex-1">
              <RoomViewer present={present} />
            </div>
          </div>

          {!present && (
            <div className="min-h-0 h-[45vh] lg:h-auto lg:max-h-[calc(100vh-120px)]">
              <TileSwapPanel onOpenCatalogue={() => setShowCatalogue(true)} />
            </div>
          )}
        </div>
      </main>

      {showCatalogue && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setShowCatalogue(false)}
        >
          <div
            className="animate-modal-in flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">Full Tile Catalogue</h2>
              <button
                onClick={() => setShowCatalogue(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <TileCatalogue />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
