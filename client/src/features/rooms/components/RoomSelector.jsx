import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import { useRooms } from "@/features/rooms/hooks/useRooms.js";
import { useCategories } from "@/features/rooms/hooks/useCategories.js";
import { useLayoutsByRoom } from "@/features/rooms/hooks/useLayoutsByRoom.js";
import LayoutPicker from "@/features/rooms/components/LayoutPicker.jsx";
import { rooms as staticRooms } from "@/features/rooms/data/rooms.jsx";
import { normalizeRoom, roomIdsFromCategories } from "@/features/rooms/lib/room-adapter.js";

const SKELETON_COUNT = 6;

function RoomsLabel() {
  return (
    <div className="hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:flex">
      <MapPin size={14} />
      Rooms
    </div>
  );
}

function RoomButtonSkeleton() {
  return <div className="h-9 w-32 shrink-0 animate-pulse rounded-xl bg-slate-200" />;
}

export default function RoomSelector() {
  const { roomId, setRoom, setLayout } = useWorkspace();
  const {
    data: roomsData,
    isLoading: roomsLoading,
    isSuccess: roomsSuccess,
    isError: roomsError,
    error: roomsErrorObj,
  } = useRooms();
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    isSuccess: categoriesSuccess,
  } = useCategories();

  // Resolve the room list:
  //   1. Backend rooms are the source of truth — trusted even when empty.
  //   2. When the rooms API is unavailable, derive rooms from the category
  //      templates (each template belongs to a room). Every referenced id is
  //      preserved via normalizeRoom({ id }) so backend-created rooms that have
  //      no static template yet still render, and an empty derived result is
  //      respected instead of being masked by the seed.
  //   3. The static seed is the last resort, used only when both sources
  //      errored, so offline previews keep working.
  const rooms = useMemo(() => {
    if (roomsSuccess) return roomsData || [];

    if (categoriesSuccess) {
      return roomIdsFromCategories(categoriesData).map((id) => normalizeRoom({ id }));
    }

    return staticRooms;
  }, [roomsData, roomsSuccess, categoriesData, categoriesSuccess]);

  useEffect(() => {
    if (roomsError) {
      console.warn(
        "[RoomSelector] Rooms API unavailable, using fallback rooms:",
        roomsErrorObj?.message || roomsErrorObj
      );
    }
  }, [roomsError, roomsErrorObj]);

  // Wait for the primary fetch, and for the category fallback whenever the
  // rooms API errored, before committing to a room list.
  const waiting = roomsLoading || (roomsError && categoriesLoading);

  // --- Step 2 (layout picker) flow -----------------------------------------
  // Selecting a room kicks off a published-layout fetch. Exactly one layout
  // auto-advances; zero shows the picker's empty state; two+ shows the gallery.
  // If the layouts API fails we fall back to the static seed behaviour (skip
  // the picker entirely) so offline previews keep working.
  const [pendingRoomId, setPendingRoomId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const pendingRoom = useMemo(
    () => rooms.find((r) => r.id === pendingRoomId) || null,
    [rooms, pendingRoomId]
  );

  const {
    layouts: roomLayouts,
    isLoading: layoutsLoading,
    isError: layoutsError,
  } = useLayoutsByRoom(pendingRoomId);

  const closePicker = () => {
    setPendingRoomId(null);
    setPickerOpen(false);
  };

  useEffect(() => {
    if (!pendingRoomId || !pickerOpen) return;
    if (layoutsLoading) return; // keep the picker in its skeleton state

    if (layoutsError) {
      // API unreachable → skip Step 2 and keep the static seed default.
      console.warn(
        "[RoomSelector] Layouts API unavailable, skipping layout picker:",
        layoutsError?.message || layoutsError
      );
      closePicker();
      return;
    }

    if (roomLayouts.length === 1) {
      setLayout(roomLayouts[0].id); // single published layout → auto-advance
      closePicker();
    }
    // 0 → empty state; >1 → gallery; both keep the picker open.
  }, [pendingRoomId, pickerOpen, layoutsLoading, layoutsError, roomLayouts, setLayout]);

  const handleSelectRoom = (roomIdToSelect) => {
    setRoom(roomIdToSelect);
    setPendingRoomId(roomIdToSelect);
    setPickerOpen(true);
  };

  if (waiting) {
    return (
      <div className="flex items-center gap-3">
        <RoomsLabel />
        <div className="tile-scrollbar flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <RoomButtonSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!rooms.length) {
    return (
      <div className="flex items-center gap-3">
        <RoomsLabel />
        <p className="text-xs font-medium text-slate-500">No rooms available</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <RoomsLabel />
        <div className="tile-scrollbar flex gap-2 overflow-x-auto pb-1">
          {rooms.map((room) => {
            const Icon = room.icon;
            const active = room.id === roomId;
            return (
              <button
                key={room.id}
                onClick={() => handleSelectRoom(room.id)}
                className={`group flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? "border-transparent bg-slate-900 text-white shadow-card"
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

      {pickerOpen && pendingRoom && (
        <LayoutPicker
          room={pendingRoom}
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
    </>
  );
}
