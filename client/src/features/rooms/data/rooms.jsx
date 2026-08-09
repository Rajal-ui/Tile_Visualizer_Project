import { Sofa, BedDouble, CookingPot, Bath, MoveVertical, Building2 } from "lucide-react";

const sceneBase = {
  viewBox: "0 0 800 600",
  corner: { x: 400, y: 190 },
  floorD: "M400,190 L660,540 L140,540 Z",
  leftWallD: "M400,190 L140,88 L140,540 Z",
  rightWallD: "M400,190 L660,88 L660,540 Z",
};

export const rooms = [
  {
    id: "living-room",
    name: "Living Room",
    tagline: "Relaxed & social spaces",
    icon: Sofa,
    accent: "#1d6ef0",
    scene: {
      ...sceneBase,
      decor: (
        <g stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
          <rect x="238" y="452" width="150" height="64" rx="8" fill="#cbd5e1" stroke="none" opacity="0.5" />
          <path d="M238 452 l150 0 l0 12 l-150 0 Z" fill="#b6c2d0" stroke="none" opacity="0.6" />
          <circle cx="296" cy="474" r="5" fill="#94a3b8" stroke="none" />
          <circle cx="330" cy="474" r="5" fill="#94a3b8" stroke="none" />
          <circle cx="364" cy="474" r="5" fill="#94a3b8" stroke="none" />
          <rect x="446" y="470" width="110" height="46" rx="6" fill="#cbd5e1" stroke="none" opacity="0.5" />
          <rect x="472" y="420" width="12" height="50" />
          <rect x="516" y="420" width="12" height="50" />
          <path d="M436 516 L556 516" />
          <circle cx="580" cy="505" r="6" fill="#cbd5e1" stroke="none" opacity="0.6" />
          <path d="M588 500 L598 512" strokeWidth="3" opacity="0.5" />
          <path d="M152 500 C 168 470, 190 470, 206 500" strokeWidth="6" opacity="0.35" />
          <path d="M206 500 C 222 470, 244 470, 260 500" strokeWidth="6" opacity="0.35" />
          <path d="M152 522 C 168 500, 190 500, 206 522" strokeWidth="4" opacity="0.25" />
          <path d="M206 522 C 222 500, 244 500, 260 522" strokeWidth="4" opacity="0.25" />
        </g>
      ),
    },
  },
  {
    id: "bedroom",
    name: "Bedroom",
    tagline: "Calm & restful retreats",
    icon: BedDouble,
    accent: "#8b5cf6",
    scene: {
      ...sceneBase,
      decor: (
        <g stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.55">
          <rect x="420" y="448" width="128" height="68" rx="8" fill="#cbd5e1" stroke="none" opacity="0.45" />
          <rect x="420" y="448" width="128" height="26" rx="8" fill="#b6c2d0" stroke="none" opacity="0.5" />
          <rect x="508" y="472" width="16" height="44" rx="3" fill="#cbd5e1" stroke="none" />
          <rect x="440" y="420" width="14" height="28" fill="#cbd5e1" stroke="none" opacity="0.6" />
          <rect x="508" y="420" width="14" height="28" fill="#cbd5e1" stroke="none" opacity="0.6" />
          <rect x="440" y="416" width="34" height="8" rx="2" fill="#b6c2d0" stroke="none" opacity="0.6" />
          <rect x="494" y="416" width="34" height="8" rx="2" fill="#b6c2d0" stroke="none" opacity="0.6" />
          <rect x="178" y="452" width="52" height="22" rx="5" fill="#cbd5e1" stroke="none" opacity="0.5" />
          <rect x="176" y="444" width="56" height="12" rx="4" fill="#b6c2d0" stroke="none" opacity="0.6" />
          <rect x="168" y="414" width="14" height="30" />
          <rect x="226" y="414" width="14" height="30" />
          <rect x="164" y="406" width="80" height="10" rx="4" fill="#b6c2d0" stroke="none" opacity="0.5" />
        </g>
      ),
    },
  },
  {
    id: "kitchen",
    name: "Kitchen",
    tagline: "Functional & fresh workspaces",
    icon: CookingPot,
    accent: "#f59e0b",
    scene: {
      ...sceneBase,
      decor: (
        <g stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.55">
          <rect x="300" y="470" width="150" height="46" rx="6" fill="#cbd5e1" stroke="none" opacity="0.5" />
          <rect x="306" y="476" width="24" height="34" rx="3" fill="#94a3b8" stroke="none" opacity="0.45" />
          <rect x="338" y="476" width="24" height="34" rx="3" fill="#94a3b8" stroke="none" opacity="0.45" />
          <circle cx="316" cy="488" r="7" strokeWidth="1.6" />
          <circle cx="350" cy="488" r="7" strokeWidth="1.6" />
          <rect x="470" y="480" width="120" height="36" rx="6" fill="#cbd5e1" stroke="none" opacity="0.45" />
          <rect x="478" y="472" width="20" height="16" rx="2" fill="#94a3b8" stroke="none" opacity="0.4" />
          <rect x="504" y="472" width="20" height="16" rx="2" fill="#94a3b8" stroke="none" opacity="0.4" />
          <path d="M180 478 L262 478" />
          <path d="M180 496 L262 496" />
          <path d="M172 466 L272 466" strokeWidth="4" />
          <rect x="188" y="506" width="70" height="30" rx="4" fill="#cbd5e1" stroke="none" opacity="0.4" />
          <path d="M192 500 L246 500" strokeWidth="3" opacity="0.5" />
        </g>
      ),
    },
  },
  {
    id: "bathroom",
    name: "Bathroom",
    tagline: "Clean & spa-like details",
    icon: Bath,
    accent: "#06b6d4",
    scene: {
      ...sceneBase,
      decor: (
        <g stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.55">
          <path d="M300 452 Q300 416 340 416 L430 416 Q470 416 470 452 L470 470 L300 470 Z" fill="#cbd5e1" opacity="0.4" />
          <path d="M340 416 L340 452" opacity="0.6" />
          <rect x="496" y="430" width="52" height="40" rx="4" fill="#cbd5e1" stroke="none" opacity="0.45" />
          <rect x="506" y="436" width="32" height="28" rx="3" fill="#e2e8f0" stroke="none" opacity="0.7" />
          <rect x="494" y="424" width="56" height="8" rx="2" fill="#b6c2d0" stroke="none" opacity="0.6" />
          <rect x="170" y="452" width="60" height="34" rx="5" fill="#cbd5e1" stroke="none" opacity="0.4" />
          <rect x="178" y="444" width="44" height="10" rx="3" fill="#b6c2d0" stroke="none" opacity="0.5" />
          <circle cx="200" cy="480" r="9" strokeWidth="2" />
          <path d="M200 489 L200 496" />
        </g>
      ),
    },
  },
  {
    id: "staircase",
    name: "Staircase",
    tagline: "Statements that ascend",
    icon: MoveVertical,
    accent: "#10b981",
    scene: {
      viewBox: "0 0 800 600",
      corner: { x: 400, y: 190 },
      floorD: "M400,190 L660,540 L140,540 Z",
      leftWallD: "M400,190 L140,88 L140,540 Z",
      rightWallD: "M400,190 L660,88 L660,540 Z",
      decor: (
        <g stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
          <path d="M250 540 L250 330 L570 330" stroke="#b6c2d0" strokeWidth="4" />
          <path d="M270 540 L270 350 L570 350" opacity="0.6" />
          <path d="M270 350 L590 350 L590 330 L570 330" opacity="0.7" />
          <path d="M290 540 L290 370 L570 370" opacity="0.6" />
          <path d="M290 370 L590 370 L590 350 L570 350" opacity="0.7" />
          <path d="M310 540 L310 390 L570 390" opacity="0.6" />
          <path d="M310 390 L590 390 L590 370 L570 370" opacity="0.7" />
          <path d="M330 540 L330 410 L570 410" opacity="0.6" />
          <path d="M330 410 L590 410 L590 390 L570 390" opacity="0.7" />
          <path d="M350 540 L350 430 L570 430" opacity="0.6" />
          <path d="M350 430 L590 430 L590 410 L570 410" opacity="0.7" />
          <path d="M370 540 L370 450 L570 450" opacity="0.6" />
          <path d="M370 450 L590 450 L590 430 L570 430" opacity="0.7" />
          <path d="M390 540 L390 470 L570 470" opacity="0.6" />
          <path d="M390 470 L590 470 L590 450 L570 450" opacity="0.7" />
          <path d="M410 540 L410 490 L570 490" opacity="0.6" />
          <path d="M410 490 L590 490 L590 470 L570 470" opacity="0.7" />
          <path d="M430 540 L430 510 L570 510" opacity="0.6" />
          <path d="M430 510 L590 510 L590 490 L570 490" opacity="0.7" />
          <path d="M450 540 L450 530 L570 530" opacity="0.6" />
          <path d="M450 530 L590 530 L590 510 L570 510" opacity="0.7" />
        </g>
      ),
    },
  },
  {
    id: "facade",
    name: "Exterior",
    tagline: "Facades & outdoor faces",
    icon: Building2,
    accent: "#0ea5e9",
    scene: {
      viewBox: "0 0 800 600",
      corner: { x: 400, y: 150 },
      floorD: "M400,150 L680,560 L120,560 Z",
      leftWallD: "M400,150 L120,40 L120,560 Z",
      rightWallD: "M400,150 L680,40 L680,560 Z",
      decor: (
        <g stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
          <path d="M180 560 L180 300 Q300 260 460 300 L460 560" fill="#cbd5e1" opacity="0.35" />
          <path d="M240 560 L240 340 L420 340 L420 560" fill="#e2e8f0" stroke="none" opacity="0.5" />
          <circle cx="600" cy="180" r="34" fill="#fde68a" stroke="none" opacity="0.5" />
          <path d="M200 400 L200 440" strokeWidth="6" />
          <path d="M210 420 L240 420" strokeWidth="4" />
          <rect x="268" y="380" width="60" height="44" rx="3" fill="#b6c2d0" opacity="0.5" />
          <rect x="348" y="380" width="60" height="44" rx="3" fill="#b6c2d0" opacity="0.5" />
          <path d="M240 560 L240 480 Q260 470 280 480 L280 560" fill="#b6c2d0" stroke="none" opacity="0.45" />
          <path d="M520 560 L520 330 L600 330 L600 560" fill="#e2e8f0" stroke="none" opacity="0.45" />
          <path d="M400 150 L400 560" strokeWidth="3" opacity="0.3" />
        </g>
      ),
    },
  },
];

export function getRoom(id) {
  return rooms.find((r) => r.id === id) || rooms[0];
}
