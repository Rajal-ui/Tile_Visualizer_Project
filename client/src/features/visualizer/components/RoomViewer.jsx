import { textureUrl } from "@/lib/textures.js";

export default function RoomViewer({ room, tile }) {
  const floor = room.floor || {};

  const perspective = floor.perspective || 800;
  const rotateX = floor.rotateX || 55;
  const scaleX = floor.scaleX || 1.6;
  const scaleY = floor.scaleY || 1.2;
  const translateY = floor.translateY || 120;
  const originY = floor.originY || "100%";

  const tileImageUrl = tile ? textureUrl(tile.texture) : null;
  const tileSize = tile?.format ? parseInt(tile.format.split("x")[0]) || 80 : 80;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius: "0.75rem",
        background: "#e2e8f0",
      }}
    >
      {/* Layer 1: Background room photo */}
      <img
        src={room.bg}
        alt={room.name}
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Layer 2: Tile texture with CSS perspective transform */}
      {tileImageUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            perspective: perspective + "px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "200%",
              height: "200%",
              backgroundImage: `url(${tileImageUrl})`,
              backgroundSize: `${tileSize}px ${tileSize}px`,
              backgroundRepeat: "repeat",
              transform: `rotateX(${rotateX}deg) scaleX(${scaleX}) scaleY(${scaleY}) translateY(${translateY}px)`,
              transformOrigin: `50% ${originY}`,
            }}
          />
        </div>
      )}

      {/* Layer 3: Foreground — room photo with floor cut transparent */}
      <img
        src={room.fg}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
