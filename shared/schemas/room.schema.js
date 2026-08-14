import { z } from "zod";

/**
 * Room entity — an independent collection that photo layouts reference via
 * `layout.roomId`. Rooms are the top-level grouping for the Rep-facing preview
 * (Step 1: pick a room → Step 2: pick a published layout within that room).
 */
export const RoomSchema = z.object({
  id: z.string().min(1, "id is required"),
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});
