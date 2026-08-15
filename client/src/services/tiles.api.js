import { apiClient } from "@/lib/api-client.js";

/** GET /api/v1/categories — category templates for the admin form dropdown. */
export async function fetchCategories() {
  const data = await apiClient.get("/api/v1/categories");
  return data?.data || [];
}

/** GET /api/v1/tiles — paginated list with optional filters. */
export async function fetchTiles({ search, category, page = 1, limit = 50 } = {}) {
  const params = { page, limit };
  if (search) params.q = search;
  if (category && category !== "all") params.category = category;
  const data = await apiClient.get("/api/v1/tiles", { params });
  return { data: data?.data || [], pagination: data?.pagination };
}

/**
 * GET /api/v1/tiles/search — text + zone search. `zone` filters by tile
 * `compatibleZones` (floor/wall/counter); routed through Elasticsearch when
 * configured, otherwise the Mongo $text/compatibleZones fallback.
 */
export async function searchTiles({ q, zone, category, page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (q) params.q = q;
  if (zone && zone !== "all") params.zone = zone;
  if (category && category !== "all") params.category = category;
  const data = await apiClient.get("/api/v1/tiles/search", { params });
  return { data: data?.data || [], pagination: data?.pagination };
}

/** POST /api/v1/tiles — create tile (admin). */
export async function createTile(payload) {
  const data = await apiClient.post("/api/v1/tiles", payload);
  return data?.data;
}

/** PATCH /api/v1/tiles/:id — partial update (admin). */
export async function updateTile(id, payload) {
  const data = await apiClient.patch(`/api/v1/tiles/${id}`, payload);
  return data?.data;
}

/** DELETE /api/v1/tiles/:id — remove tile (admin). */
export async function deleteTile(id) {
  await apiClient.delete(`/api/v1/tiles/${id}`);
}

/** POST /api/uploads — upload an image to Cloudinary. */
export async function uploadImage(file, folder) {
  const form = new FormData();
  form.append("image", file);
  if (folder) form.append("folder", folder);
  const data = await apiClient.post("/api/uploads", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { url, thumbnailUrl, publicId }
}
