import { apiClient } from "@/lib/api-client.js";

/** GET /api/v1/rooms — active rooms for the Rep-facing preview selector. */
export async function fetchRooms() {
  const data = await apiClient.get("/api/v1/rooms");
  return data?.data || [];
}

/** POST /api/v1/rooms — create a room (admin). */
export async function createRoom(payload) {
  const data = await apiClient.post("/api/v1/rooms", payload);
  return data?.data;
}
