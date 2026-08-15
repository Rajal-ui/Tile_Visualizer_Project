import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import { useRooms } from "@/features/rooms/hooks/useRooms.js";
import { useCategories } from "@/features/rooms/hooks/useCategories.js";
import { rooms as staticRooms } from "@/features/rooms/data/rooms.jsx";
import { normalizeRoom, roomIdsFromCategories } from "@/features/rooms/lib/room-adapter.js";

const SKELETON_COUNT = 6;

/**
 * Room category tabs shown in the Select Room modal. Room ids are mirrored
 * from the static room templates; the "all" tab keeps backend-created rooms
 * (with no category mapping yet) reachable.
 */
const ROOM_CATEGORIES = [
  { id: "all", label: "All Rooms", roomIds: null },
  { id: "living", label: "Living Room", roomIds: ["living-room"] },
  { id: "kitchen", label: "Kitchen", roomIds: ["kitchen"] },
  { id: "bathroom", label: "Bathroom", roomIds: ["bathroom"] },
  { id: "outdoor", label: "Outdoor", roomIds: ["facade"] },
  { id: "bedroom", label: "Bedroom", roomIds: ["bedroom"] },
  { id: "staircase", label: "Staircase", roomIds: ["staircase"] },
];

/** Fallback thumbnail for photo-layout rooms that don't ship a `bg` asset. */
function thumbnailFor(room) {
  if (room.bg) return room.bg;
  if (room.id === "kitchen") return "/assets/rooms/kitchen/background.png";
  return null;
}

function RoomCard({ room, active, onSelect }) {
  const [imgFailed, setImgFailed] = useState(false);
  const Icon = room.icon;
  const thumbnail = thumbnailFor(room);

  return (
    <button
      onClick={() => onSelect(room.id)}
      className={`group overflow-hidden rounded-xl border bg-white text-left shadow-sm transition ${
        active
          ? "border-[#0b4d4b] ring-2 ring-[#0b4d4b]/25"
          : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {thumbnail && !imgFailed ? (
          <img
            src={thumbnail}
            alt={room.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${room.accent}22, ${room.accent}55)`,
            }}
          >
            <Icon size={36} style={{ color: room.accent }} />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
        {active && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#0b4d4b] text-white shadow">
            <Check size={13} strokeWidth={3} />
          </span>
        )}
        <span className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[11px] font-bold text-white drop-shadow">
          <Icon size={13} />
          {room.name}
        </span>
      </div>
    </button>
  );
}

function RoomSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-slate-200" />
      <div className="h-8 bg-white" />
    </div>
  );
}

export default function RoomSelectModal({ onClose }) {
  const { roomId, setRoom } = useWorkspace();
  const {
    data: roomsData,
    isLoading: roomsLoading,
    isSuccess: roomsSuccess,
    isError: roomsError,
  } = useRooms();
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    isSuccess: categoriesSuccess,
  } = useCategories();

  const [activeCategory, setActiveCategory] = useState(() => {
    const match = ROOM_CATEGORIES.find(
      (cat) => cat.roomIds && cat.roomIds.includes(roomId)
    );
    return match ? match.id : "all";
  });

  // Same resolution chain as RoomSelector: backend rooms win, then rooms
  // derived from category templates, then the static seed as a last resort.
  const rooms = useMemo(() => {
    if (roomsSuccess) return roomsData || [];

    if (categoriesSuccess) {
      return roomIdsFromCategories(categoriesData).map((id) => normalizeRoom({ id }));
    }

    return staticRooms;
  }, [roomsData, roomsSuccess, categoriesData, categoriesSuccess]);

  const waiting = roomsLoading || (roomsError && categoriesLoading);

  const visibleRooms = useMemo(() => {
    const category = ROOM_CATEGORIES.find((c) => c.id === activeCategory);
    if (!category?.roomIds) return rooms;
    return rooms.filter((r) => category.roomIds.includes(r.id));
  }, [rooms, activeCategory]);

  const handleSelect = (id) => {
    setRoom(id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-modal-in flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <header className="relative shrink-0 bg-[#0b4d4b] px-5 pb-5 pt-4">
          <button
            onClick={onClose}
            aria-label="Close room selector"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X size={17} />
          </button>
          <div className="flex flex-col items-center">
            <div className="grid grid-cols-2 gap-0.5 rounded-md bg-white/15 p-1">
              <div className="h-2.5 w-2.5 rounded-[3px] bg-brand-400" />
              <div className="h-2.5 w-2.5 rounded-[3px] bg-white/40" />
              <div className="h-2.5 w-2.5 rounded-[3px] bg-white/40" />
              <div className="h-2.5 w-2.5 rounded-[3px] bg-brand-500" />
            </div>
            <h2 className="mt-2 text-xs font-extrabold uppercase tracking-[0.25em] text-white">
              Select Room
            </h2>
          </div>
        </header>

        {/* Category tabs */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 pt-3">
          <div className="tile-scrollbar flex items-center gap-1 overflow-x-auto pb-3">
            {ROOM_CATEGORIES.map((category) => {
              const active = category.id === activeCategory;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                    active
                      ? "bg-[#0b4d4b] text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Thumbnail grid */}
        <div className="tile-scrollbar min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
          {waiting ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                <RoomSkeleton key={i} />
              ))}
            </div>
          ) : visibleRooms.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visibleRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  active={room.id === roomId}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-xs font-medium text-slate-400">
              No rooms available in this category.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}