import { useQuery } from "@tanstack/react-query";
import { fetchTiles } from "@/services/tiles.api.js";
import { normalizeTile } from "@/features/catalogue/lib/tile-adapter.js";
import { tiles as staticTiles } from "@/features/catalogue/data/tiles.js";

export const TILES_QUERY_KEY = ["catalogue", "tiles"];

export function useTiles() {
  const query = useQuery({
    queryKey: TILES_QUERY_KEY,
    queryFn: async () => {
      const res = await fetchTiles({ limit: 100 });
      return (res.data || []).map(normalizeTile);
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const apiTiles = query.isSuccess && Array.isArray(query.data) ? query.data : null;
  const tiles = apiTiles || staticTiles;

  return { ...query, tiles };
}
