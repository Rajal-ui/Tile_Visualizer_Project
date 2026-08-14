import { Building2 } from "lucide-react";
import { rooms as staticRooms } from "@/features/rooms/data/rooms.jsx";

/** Accent colour for rooms with no static template (e.g. admin-created rooms). */
export const DEFAULT_ROOM_ACCENT = "#1d6ef0";

/** Icon shown for rooms with no static template. */
export const FALLBACK_ROOM_ICON = Building2;

/**
 * Map a backend Room document (or a static template) to the display shape the
 * RoomSelector UI expects — `{ id, name, icon, accent, … }`. Visual traits
 * (icon/accent/assets) are inherited from the static template for known rooms
 * and defaulted for admin-created rooms that have no client-side template yet.
 *
 * @param {{ id: string, name: string, description?: string }} raw
 * @returns {{ id: string, name: string, tagline: string, icon: Component,
 *   accent: string, bg?: string, fg?: string, floor?: object, layout?: string,
 *   isActive: boolean, _raw: object }}
 */
export function normalizeRoom(raw) {
  const template = staticRooms.find((r) => r.id === raw.id) || null;
  return {
    id: raw.id,
    name: raw.name || template?.name || raw.id,
    tagline: raw.description || template?.tagline || "",
    icon: template?.icon || FALLBACK_ROOM_ICON,
    accent: template?.accent || DEFAULT_ROOM_ACCENT,
    bg: template?.bg,
    fg: template?.fg,
    floor: template?.floor,
    layout: template?.layout,
    isActive: raw.isActive ?? true,
    _raw: raw,
  };
}

/**
 * Unique room ids referenced by active category templates, in first-seen
 * order. Used to derive the selector's room list when the rooms API is empty
 * (each category template belongs to a room).
 *
 * @param {Array<{ room?: string }>} categories
 * @returns {string[]}
 */
export function roomIdsFromCategories(categories) {
  const seen = new Set();
  const ids = [];
  for (const category of categories || []) {
    if (!category?.room || seen.has(category.room)) continue;
    seen.add(category.room);
    ids.push(category.room);
  }
  return ids;
}
