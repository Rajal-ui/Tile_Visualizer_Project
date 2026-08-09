import { drawRuns } from "./rle.js";

/**
 * Generates a full-resolution feathered mask base64 PNG.
 * 
 * @param {Array} regions - All regions assigned to this zone
 * @param {number} segW - Width of the segmented canvas (usually 800)
 * @param {number} segH - Height of the segmented canvas (usually 600)
 * @param {number} origW - Full width of the original room image
 * @param {number} origH - Full height of the original room image
 * @param {number} blurRadius - Edge feathering blur in pixels (default 2)
 * @returns {string} - Base64 data URL of the PNG mask
 */
export function generateFeatheredMask(regions, segW, segH, origW, origH, blurRadius = 2) {
  const canvas = document.createElement("canvas");
  canvas.width = origW;
  canvas.height = origH;
  const ctx = canvas.getContext("2d");

  // Fill canvas with black (excluded pixels)
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, origW, origH);

  // Compute scale factors
  const scaleX = origW / segW;
  const scaleY = origH / segH;

  // Draw regions in white
  ctx.fillStyle = "#ffffff";
  regions.forEach((region) => {
    region.runs.forEach(([r, cStart, cEnd]) => {
      // Scale coordinates to full resolution
      const scaledY = Math.round(r * scaleY);
      const scaledH = Math.round((r + 1) * scaleY) - scaledY;
      const scaledX = Math.round(cStart * scaleX);
      const scaledW = Math.round((cEnd + 1) * scaleX) - scaledX;

      ctx.fillRect(scaledX, scaledY, scaledW, scaledH);
    });
  });

  // Apply edge feathering using offscreen canvas blur
  if (blurRadius > 0) {
    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = origW;
    blurCanvas.height = origH;
    const bCtx = blurCanvas.getContext("2d");
    
    // Draw feathered mask (white on black)
    bCtx.filter = `blur(${blurRadius}px)`;
    bCtx.drawImage(canvas, 0, 0);

    return blurCanvas.toDataURL("image/png");
  }

  return canvas.toDataURL("image/png");
}
