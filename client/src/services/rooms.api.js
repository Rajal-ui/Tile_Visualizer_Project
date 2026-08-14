import { apiClient } from "@/lib/api-client.js";

/** GET /api/v1/rooms — active rooms for the Rep-facing preview selector. */
export async function fetchRooms() {
  const data = await apiClient.get("/api/v1/rooms");
  return data?.data || [];
}
