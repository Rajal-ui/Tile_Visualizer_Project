import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/services/tiles.api.js";

export const CATEGORIES_QUERY_KEY = ["catalogue", "categories"];

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: async () => fetchCategories(),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}
