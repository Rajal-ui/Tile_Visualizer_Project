import { useState, useRef, useEffect } from "react";
import { drawRuns, isPixelInRuns } from "../utils/rle.js";

export default function SegmentCanvas({
  imgElement,
  regions,
  mode, // "label" | "corners"
  selectedZone, // "Floor" | "Wall" | "Counter"
  assignedRegions, // { regionId: zoneLabel }
  corners, // { Floor: [[x,y],...], Wall: [...], Counter: [...] }
  onRegionClick,
  onCornersChange,
  width,
  height,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [activeCornerIdx, setActiveCornerIdx] = useState(null);

  // Mouse coords mapped to canvas coordinates
  function getCanvasCoords(e) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  // Handle hover detection in "label" mode
  const handleMouseMove = (e) => {
    if (mode !== "label" && mode !== "corners") return;
    const { x, y } = getCanvasCoords(e);

    if (mode === "label") {
      // Find region containing this pixel
      let found = null;
      for (const region of regions) {
        if (isPixelInRuns(Math.round(x), Math.round(y), region.runs)) {
          found = region;
          break;
        }
      }
      setHoveredRegion(found);
    } else if (mode === "corners" && activeCornerIdx !== null) {
      // Dragging active corner point
      const zoneCorners = [...(corners[selectedZone] || [])];
      zoneCorners[activeCornerIdx] = [Math.round(x), Math.round(y)];
      onCornersChange(selectedZone, zoneCorners);
    }
  };

  const handleMouseDown = (e) => {
    const { x, y } = getCanvasCoords(e);

    if (mode === "corners") {
      const zoneCorners = corners[selectedZone] || [];
      // Check if clicking near an existing corner dot (radius = 12px in canvas coords)
      let foundIdx = -1;
      for (let i = 0; i < zoneCorners.length; i++) {
        const [cx, cy] = zoneCorners[i];
        const dist = Math.hypot(x - cx, y - cy);
        if (dist < 16) {
          foundIdx = i;
          break;
        }
      }

      if (foundIdx !== -1) {
        setActiveCornerIdx(foundIdx);
      } else if (zoneCorners.length < 4) {
        // Place new corner point
        const newCorners = [...zoneCorners, [Math.round(x), Math.round(y)]];
        onCornersChange(selectedZone, newCorners);
      }
    }
  };

  const handleMouseUp = () => {
    setActiveCornerIdx(null);
  };

  const handleMouseClick = (e) => {
    if (mode === "label" && hoveredRegion) {
      onRegionClick(hoveredRegion, e);
    }
  };

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw main image
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    // Draw region overlays if in "label" mode
    if (mode === "label") {
      regions.forEach((region) => {
        const assignedZone = assignedRegions[region.id];
        let color = "rgba(255, 255, 255, 0.15)"; // Default unassigned color

        if (assignedZone === "Floor") color = "rgba(245, 158, 11, 0.35)"; // Amber
        else if (assignedZone === "Wall") color = "rgba(59, 130, 246, 0.35)"; // Blue
        else if (assignedZone === "Counter") color = "rgba(16, 185, 129, 0.35)"; // Emerald
        else if (assignedZone === "Ignore") color = "rgba(100, 116, 139, 0.25)"; // Slate

        // If hovered, give highlight
        if (hoveredRegion && hoveredRegion.id === region.id) {
          color = assignedZone ? "rgba(255, 255, 255, 0.6)" : "rgba(255, 255, 255, 0.4)";
        }

        drawRuns(region.runs, ctx, color);
      });
    }

    // Draw corners if in "corners" mode
    if (mode === "corners" && selectedZone) {
      // Draw quad lines
      const zoneCorners = corners[selectedZone] || [];
      if (zoneCorners.length > 0) {
        ctx.beginPath();
        ctx.moveTo(zoneCorners[0][0], zoneCorners[0][1]);
        for (let i = 1; i < zoneCorners.length; i++) {
          ctx.lineTo(zoneCorners[i][0], zoneCorners[i][1]);
        }
        if (zoneCorners.length === 4) {
          ctx.closePath();
        }
        ctx.strokeStyle = selectedZone === "Floor" ? "#f59e0b" : selectedZone === "Wall" ? "#3b82f6" : "#10b989";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw point dots
        zoneCorners.forEach(([cx, cy], idx) => {
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
          ctx.fillStyle = selectedZone === "Floor" ? "#f59e0b" : selectedZone === "Wall" ? "#3b82f6" : "#10b989";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Label index
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText((idx + 1).toString(), cx, cy);
        });
      }
    }
  }, [imgElement, regions, mode, selectedZone, assignedRegions, corners, hoveredRegion]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
      style={{ minHeight: "450px" }}
    >
      <canvas
        ref={canvasRef}
        width={width || 800}
        height={height || 600}
        className="max-h-[75vh] max-w-full cursor-crosshair object-contain shadow-2xl"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleMouseClick}
      />
    </div>
  );
}
