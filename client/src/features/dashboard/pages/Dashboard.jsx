import { useEffect, useState } from "react";
import { DoorOpen, MonitorPlay, X, RotateCcw } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import RoomSelector from "@/features/rooms/components/RoomSelector.jsx";
import RoomSelectModal from "@/features/rooms/components/RoomSelectModal.jsx";
import LayoutPicker from "@/features/rooms/components/LayoutPicker.jsx";
import { useLayoutsByRoom } from "@/features/rooms/hooks/useLayoutsByRoom.js";
import Visualizer from "@/features/visualizer/pages/Visualizer.jsx";
import TileSwapPanel from "@/features/catalogue/components/TileSwapPanel.jsx";
import TileCatalogue from "@/features/catalogue/pages/TileCatalogue.jsx";
import ProfileDropdown from "@/components/ProfileDropdown.jsx";
import LayoutsPage from "@/features/layouts/pages/LayoutsPage.jsx";

export default function Dashboard() {
  const { resetAll, layoutId, setRoom, setLayout } = useWorkspace();
  const [present, setPresent] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [showLayouts, setShowLayouts] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);

  // Step 2 (layout picker) — shared by the room pills and the Select Room modal.
  const [pickerRoom, setPickerRoom] = useState(null);
  const {
    layouts: roomLayouts,
    isLoading: layoutsLoading,
    isError: layoutsError,
  } = useLayoutsByRoom(pickerRoom?.id || null);

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
            <ProfileDropdown onOpenLayouts={() => setShowLayouts(true)} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-2 px-4 py-2">
        {!present && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <RoomSelector onSelectRoom={handleRoomSelect} />
            <button
              onClick={() => setShowRoomModal(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-600"
            >
              <DoorOpen size={14} />
              Select Room
            </button>
          </div>
        )}

        <div
          className={`grid flex-1 gap-4 ${
            present
              ? "grid-cols-1"
              : "grid-cols-1 lg:grid-cols-[1fr_300px]"
          }`}
        >
          <div className={`flex flex-col ${present ? "min-h-[calc(100vh-140px)]" : "min-h-0 flex-1"}`}>
            <div className="min-h-0 flex-1">
              <Visualizer present={present} layoutId={layoutId} />
            </div>
          </div>

          {!present && (
            <div className="min-h-0 lg:max-h-[calc(100vh-120px)]">
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
      {showRoomModal && (
        <RoomSelectModal
          onClose={() => setShowRoomModal(false)}
          onSelectRoom={handleRoomSelect}
        />
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
      {showLayouts && <LayoutsPage onClose={() => setShowLayouts(false)} />}
    </div>
  );
}
