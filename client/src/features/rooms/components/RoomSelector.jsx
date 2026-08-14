import { useEffect, useMemo } from "react";
import { MapPin } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import { useRooms } from "@/features/rooms/hooks/useRooms.js";
import { useCategories } from "@/features/rooms/hooks/useCategories.js";
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
  const { roomId, setRoom } = useWorkspace();
  const {
    data: apiRooms,
    isLoading: roomsLoading,
    isError: roomsError,
    error: roomsErrorObj,
  } = useRooms();
  const { data: apiCategories, isLoading: categoriesLoading } = useCategories();

  // Resolve the room list: prefer the backend rooms; derive from category
  // templates when the rooms endpoint is empty; otherwise fall back to the
  // static seed so offline previews keep working.
  const rooms = useMemo(() => {
    if (apiRooms?.length) return apiRooms;

    if (!categoriesLoading) {
      const derived = roomIdsFromCategories(apiCategories)
        .map((id) => staticRooms.find((r) => r.id === id))
        .filter(Boolean)
        .map(normalizeRoom);
      if (derived.length) return derived;
    }

    return staticRooms;
  }, [apiRooms, apiCategories, categoriesLoading]);

  useEffect(() => {
    if (roomsError) {
      console.warn(
        "[RoomSelector] Rooms API unavailable, using static fallback:",
        roomsErrorObj?.message || roomsErrorObj
      );
    }
  }, [roomsError, roomsErrorObj]);

  if (roomsLoading && !apiRooms?.length) {
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
    <div className="flex items-center gap-3">
      <RoomsLabel />
      <div className="tile-scrollbar flex gap-2 overflow-x-auto pb-1">
        {rooms.map((room) => {
          const Icon = room.icon;
          const active = room.id === roomId;
          return (
            <button
              key={room.id}
              onClick={() => setRoom(room.id)}
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
  );
}
