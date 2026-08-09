import { MapPin } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";

export default function RoomSelector() {
  const { rooms, roomId, setRoom } = useWorkspace();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:flex">
        <MapPin size={14} />
        Rooms
      </div>
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
