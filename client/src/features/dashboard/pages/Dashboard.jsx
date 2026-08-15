import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MonitorPlay, X, RotateCcw } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import RoomSelector from "@/features/rooms/components/RoomSelector.jsx";
import LayoutPicker from "@/features/rooms/components/LayoutPicker.jsx";
import LayoutSwitcher from "@/features/rooms/components/LayoutSwitcher.jsx";
import { useLayoutsByRoom } from "@/features/rooms/hooks/useLayoutsByRoom.js";
import Visualizer from "@/features/visualizer/pages/Visualizer.jsx";
import TileSwapPanel from "@/features/catalogue/components/TileSwapPanel.jsx";
import TileCatalogue from "@/features/catalogue/pages/TileCatalogue.jsx";
import ProfileDropdown from "@/components/ProfileDropdown.jsx";

export default function Dashboard() {
  const { resetAll, layout, layoutId, room, setRoom, setLayout } = useWorkspace();
  const navigate = useNavigate();
  const [present, setPresent] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);

  // Step 2 (layout picker) — shared by the room pills, the Select Room modal,
  // and the always-visible layout switcher in the toolbar.
  const [pickerRoom, setPickerRoom] = useState(null);
  const {
    layouts: roomLayouts,
    isLoading: layoutsLoading,
    isError: layoutsError,
  } = useLayoutsByRoom(room?.id || null);

  const closePicker = () => setPickerRoom(null);

  const handleRoomSelect = (room) => {
    if (!room) return;
    setRoom(room.id);
    setPickerRoom(room);
  };

  // Auto-advance when a room has exactly one published layout; skip the picker
  // entirely if the layouts API fails (keeps the static seed fallback working).
  useEffect(() => {
    if (!pickerRoom) return;
    if (layoutsLoading) return;
    if (layoutsError) {
      closePicker();
      return;
    }
    if (roomLayouts.length === 1) {
      setLayout(roomLayouts[0].id);
      closePicker();
    }
  }, [pickerRoom, layoutsLoading, layoutsError, roomLayouts, setLayout]);

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
            </div>
          </div>

          <div className="flex items-center gap-2">
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
            <ProfileDropdown onOpenLayouts={() => navigate("/admin/layouts")} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 min-h-0 flex-col gap-2 px-4 py-2 overflow-hidden">
        {!present && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <RoomSelector onSelectRoom={handleRoomSelect} />
            <LayoutSwitcher
              layouts={roomLayouts}
              activeLayoutId={layout?.id}
              onSelect={(id) => setLayout(id)}
              isLoading={layoutsLoading}
              disabled={!!layoutsError}
            />
          </div>
        )}

        <div
          className={`grid flex-1 min-h-0 gap-4 overflow-hidden ${
            present
              ? "grid-cols-1"
              : "grid-cols-1 lg:grid-cols-[1fr_300px]"
          }`}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden">
              <Visualizer present={present} layoutId={layoutId} />
            </div>
          </div>

          {!present && (
            <div className="flex min-h-0 flex-col overflow-hidden">
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
      {pickerRoom && (
        <LayoutPicker
          room={pickerRoom}
          layouts={roomLayouts}
          isLoading={layoutsLoading}
          isError={layoutsError}
          onSelect={(layout) => {
            setLayout(layout.id);
            closePicker();
          }}
          onBack={closePicker}
        />
      )}
    </div>
  );
}
