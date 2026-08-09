import { Sofa, BedDouble, CookingPot, Bath, MoveVertical, Building2 } from "lucide-react";

/**
 * Room definitions for the 3-layer CSS perspective visualizer.
 *
 * Each room needs two image assets:
 *   bg: full room photo (JPG)
 *   fg: same photo with floor area cut to transparent (PNG with alpha)
 *
 * The `floor` object controls how the tile texture is projected onto the floor:
 *   perspective  — camera distance in px (higher = flatter)
 *   rotateX      — tilt in degrees (higher = more top-down view)
 *   scaleX       — horizontal stretch to fill floor width
 *   scaleY       — depth stretch
 *   translateY   — vertical shift to align tile with floor edge in photo
 *   tileSize     — texture repeat size in px (controls tile scale)
 *
 * Tuning: Open app → select room → tweak values below until tile aligns.
 */

export const rooms = [
  {
    id: "living-room",
    name: "Living Room",
    tagline: "Relaxed & social spaces",
    icon: Sofa,
    accent: "#1d6ef0",
    bg: "/assets/rooms/living-room/bg.jpg",
    fg: "/assets/rooms/living-room/fg.png",
    floor: {
      perspective: 800,
      rotateX: 52,
      scaleX: 1.8,
      scaleY: 1.4,
      translateY: 80,
      originY: "100%",
      tileSize: 130,
    },
  },
  {
    id: "bedroom",
    name: "Bedroom",
    tagline: "Calm & restful retreats",
    icon: BedDouble,
    accent: "#8b5cf6",
    bg: "/assets/rooms/bedroom/bg.jpg",
    fg: "/assets/rooms/bedroom/fg.png",
    floor: {
      perspective: 800,
      rotateX: 52,
      scaleX: 1.8,
      scaleY: 1.4,
      translateY: 80,
      originY: "100%",
      tileSize: 130,
    },
  },
  {
    id: "kitchen",
    name: "Kitchen",
    tagline: "Functional & fresh workspaces",
    icon: CookingPot,
    accent: "#f59e0b",
    bg: encodeURI("/assets/room-layouts/IRIDIUM/Kitchen island, wall & Floor.png"),
    fg: "/assets/rooms/kitchen/fg.png",
    floor: {
      perspective: 900,
      rotateX: 48,
      scaleX: 1.6,
      scaleY: 1.3,
      translateY: 100,
      originY: "100%",
      tileSize: 120,
    },
  },
  {
    id: "bathroom",
    name: "Bathroom",
    tagline: "Clean & spa-like details",
    icon: Bath,
    accent: "#06b6d4",
    bg: "/assets/rooms/bathroom/bg.jpg",
    fg: "/assets/rooms/bathroom/fg.png",
    floor: {
      perspective: 800,
      rotateX: 52,
      scaleX: 1.8,
      scaleY: 1.4,
      translateY: 80,
      originY: "100%",
      tileSize: 100,
    },
  },
  {
    id: "staircase",
    name: "Staircase",
    tagline: "Statements that ascend",
    icon: MoveVertical,
    accent: "#10b981",
    bg: "/assets/rooms/staircase/bg.jpg",
    fg: "/assets/rooms/staircase/fg.png",
    floor: {
      perspective: 700,
      rotateX: 60,
      scaleX: 1.6,
      scaleY: 1.2,
      translateY: 60,
      originY: "100%",
      tileSize: 100,
    },
  },
  {
    id: "facade",
    name: "Exterior",
    tagline: "Facades & outdoor faces",
    icon: Building2,
    accent: "#0ea5e9",
    bg: "/assets/rooms/facade/bg.jpg",
    fg: "/assets/rooms/facade/fg.png",
    floor: {
      perspective: 900,
      rotateX: 45,
      scaleX: 2.0,
      scaleY: 1.5,
      translateY: 40,
      originY: "100%",
      tileSize: 150,
    },
  },
];

export function getRoom(id) {
  return rooms.find((r) => r.id === id) || rooms[0];
}
