import { useQuery } from "@tanstack/react-query";
import { fetchPublishedLayoutsByRoom } from "@/services/layouts.api.js";

export const LAYOUTS_BY_ROOM_QUERY_KEY = (roomId) => ["layouts", "by-room", roomId];

/**
 * Fetch the published photo layouts available for a room, for the Rep-facing
 * preview flow's Step 2 (layout picker). The query is disabled until a room is
 * provided so the key stays cacheable across room switches.
 *
 * @param {string|null} roomId
 * @returns {{ layouts: Object[], isLoading: boolean, isError: boolean,
 *   error: Error|null, refetch: () => Promise } }
 */
export function useLayoutsByRoom(roomId) {
  const query = useQuery({
    queryKey: LAYOUTS_BY_ROOM_QUERY_KEY(roomId),
    queryFn: async () => {
      const res = await fetchPublishedLayoutsByRoom(roomId);
      return Array.isArray(res) ? res : [];
    },
    enabled: !!roomId,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  return {
    layouts: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}