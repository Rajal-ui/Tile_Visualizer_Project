export const DEFAULT_GROUT = "#c6cbd3";

export function normalizeTile(raw) {
  return {
    id: raw._id,
    name: raw.title,
    sku: raw.sku,
    colorTag: raw.colorTag,
    category: raw.category?.name || "Tile",
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
