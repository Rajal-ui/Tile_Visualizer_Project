export const DEFAULT_GROUT = "#c6cbd3";

/** Catalogue surface tabs (zone compatibility filter). */
export const CATALOGUE_ZONE_TABS = [
  { key: "all", label: "All" },
  { key: "floor", label: "Floor" },
  { key: "wall", label: "Wall" },
  { key: "counter", label: "Counter" },
];

export function normalizeTile(raw) {
  return {
    id: raw._id ?? raw.id,
    name: raw.title,
    sku: raw.sku,
    colorTag: raw.colorTag,
    // ES `_source` carries the category id + name separately.
    category: raw.category?.name || raw.categoryName || "Tile",
    material: raw.material,
    finish: raw.finish,
    size: raw.size,
    format: raw.format,
    pattern: raw.pattern || "grid",
    grout: raw.grout || DEFAULT_GROUT,
    price: raw.price ?? 0,
    rooms: raw.rooms || [],
    compatibleZones: raw.compatibleZones || [],
    colors: Array.isArray(raw.colors) ? raw.colors : [],
    texture: { kind: "image", src: raw.tileImage },
    thumbnailUrl: raw.thumbnailUrl,
    _raw: raw,
  };
}

export function isTileCompatibleWithSurface(tile, surface) {
  const zones = tile.compatibleZones || [];
  if (!zones.length) return true;
  const label = String(surface).toLowerCase();
  return zones.some((z) => label.includes(z));
}
