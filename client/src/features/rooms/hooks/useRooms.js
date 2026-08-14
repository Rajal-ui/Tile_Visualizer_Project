import { useQuery } from "@tanstack/react-query";
import { fetchRooms } from "@/services/rooms.api.js";
import { normalizeRoom } from "@/features/rooms/lib/room-adapter.js";
import { rooms as staticRooms } from "@/features/rooms/data/rooms.jsx";

export const ROOMS_QUERY_KEY = ["rooms", "list"];

export function useRooms() {
  const query = useQuery({
    queryKey: ROOMS_QUERY_KEY,
    queryFn: async () => {
      const res = await fetchRooms();
      return (res || []).map(normalizeRoom);
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const apiRooms =
    query.isSuccess && Array.isArray(query.data) && query.data.length ? query.data : null;
  const rooms = apiRooms || staticRooms;

  return { ...query, rooms };
}
