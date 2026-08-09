export const tiles = [
  {
    id: "tile-iridium-aruba-armani",
    name: "Iridium Aruba Armani",
    category: "Floor",
    material: "Porcelain",
    finish: "Matt",
    size: "600x600mm",
    format: "600x600",
    pattern: "grid",
    grout: "#c6cbd3",
    price: 1800,
    rooms: ["kitchen", "living-room", "bathroom"],
    colors: ["#b8c4c8", "#8fa4aa"],
    texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/Iridium Aruba Armani.png" },
  },
  {
    id: "tile-iridium-belgium-rossata",
    name: "Iridium Belgium Rossata",
    category: "Floor",
    material: "Porcelain",
    finish: "Matt",
    size: "600x600mm",
    format: "600x600",
    pattern: "grid",
    grout: "#b0a89e",
    price: 1900,
    rooms: ["kitchen", "living-room"],
    colors: ["#c4b8a8", "#a89888"],
    texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/Iridium Belgium rossata.png" },
  },
  {
    id: "tile-iridium-dubbo-beige",
    name: "Iridium Dubbo Beige",
    category: "Floor",
    material: "Porcelain",
    finish: "Matt",
    size: "600x600mm",
    format: "600x600",
    pattern: "grid",
    grout: "#c9bfb0",
    price: 1750,
    rooms: ["kitchen", "living-room", "bedroom"],
    colors: ["#d4c8b4", "#b8a890"],
    texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/Iridium Dubbo beige.png" },
  },
  {
    id: "tile-iridium-friesland-silk",
    name: "Iridium Friesland Silk",
    category: "Floor",
    material: "Porcelain",
    finish: "Glossy",
    size: "600x600mm",
    format: "600x600",
    pattern: "grid",
    grout: "#d0d4d8",
    price: 2000,
    rooms: ["kitchen", "bathroom", "living-room"],
    colors: ["#e0e4e8", "#c8ccd0"],
    texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/Iridium Friesland silk.png" },
  },
  {
    id: "tile-iridium-kamplay-ivory",
    name: "Iridium Kamplay Ivory",
    category: "Floor",
    material: "Porcelain",
    finish: "Matt",
    size: "600x600mm",
    format: "600x600",
    pattern: "grid",
    grout: "#d4ccc0",
    price: 1850,
    rooms: ["kitchen", "living-room", "bedroom"],
    colors: ["#e8dcc8", "#ccc0a8"],
    texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/Iridium kamplay Ivory.png" },
  },
  {
    id: "tile-iridium-thorn-white",
    name: "Iridium Thorn White",
    category: "Floor",
    material: "Porcelain",
    finish: "Glossy",
    size: "600x600mm",
    format: "600x600",
    pattern: "grid",
    grout: "#d8dce0",
    price: 2100,
    rooms: ["kitchen", "bathroom", "living-room"],
    colors: ["#f0f2f4", "#d8dce0"],
    texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/Iridium Thorn White.png" },
  },
];

export const categories = [
  { id: "all", label: "All" },
  { id: "Floor", label: "Floor" },
];

export const finishes = ["All Finishes", "Matt", "Glossy"];

export const materials = [
  "All Materials",
  "Porcelain",
];

export function getTile(id) {
  return tiles.find((t) => t.id === id) || null;
}

export function tilesForRoom(roomId) {
  return tiles.filter((t) => t.rooms.includes(roomId));
}
