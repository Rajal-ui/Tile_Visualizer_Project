import { warpTextureToQuad } from "./homography.js";
import { textureUrl } from "@/lib/textures.js";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Avoid CORS issues
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

/**
 * Best-effort image load. Returns null (and warns) instead of rejecting so a
 * missing asset never breaks the whole composite.
 */
async function loadImageOptional(src, label) {
  if (!src) return null;
  try {
    return await loadImage(src);
  } catch (e) {
    console.warn(`Failed to load ${label || src}:`, e);
    return null;
  }
}

/**
 * Resolve the tile texture source for a zone from the applied-tiles map.
 * Zones are matched by label first (e.g. "Floor"), then by zone id.
 */
function resolveMaterialSrc(zone, appliedTiles) {
  if (!appliedTiles) return null;
  const tile = appliedTiles[zone.label] || appliedTiles[zone.id];
  if (!tile || !tile.texture) return null;
  return textureUrl(tile.texture);
}

/**
 * Convert a mask image to an alpha mask with 2px Gaussian blur feathering.
 * Bright pixels = zone area. Black pixels = excluded.
 */
function maskToAlpha(maskImg, w, h) {
  const cvs = document.createElement("canvas");
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext("2d");

  ctx.drawImage(maskImg, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // Convert luminance to alpha channel
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i + 3] = lum > 128 ? 255 : 0;
    d[i] = 255;
    d[i + 1] = 255;
    d[i + 2] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Apply a 2px Gaussian blur to feather the mask edges
  const blurCvs = document.createElement("canvas");
  blurCvs.width = w;
  blurCvs.height = h;
  const bCtx = blurCvs.getContext("2d");
  bCtx.filter = "blur(2px)";
  bCtx.drawImage(cvs, 0, 0);

  return blurCvs;
}

/**
 * Extract a grayscale shading layer from the background photo so the tile
 * picks up the room's real lighting through a multiply blend.
 */
function buildShadingLayer(baseImg, w, h) {
  const shadingCvs = document.createElement("canvas");
  shadingCvs.width = w;
  shadingCvs.height = h;
  const sCtx = shadingCvs.getContext("2d");
  sCtx.drawImage(baseImg, 0, 0, w, h);

  const imgData = sCtx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = lum;
    d[i + 1] = lum;
    d[i + 2] = lum;
  }
  sCtx.putImageData(imgData, 0, 0);

  return shadingCvs;
}

/**
 * Render one zone's tile (flat or perspective-warped), clip it to the zone mask,
 * draw it, then multiply the room's shading over it so lighting matches the photo.
 */
function applyZoneTile(ctx, zone, { baseImg, maskImg, materialImg, W, H }) {
  const opacity = zone.opacity ?? 1;
  const lightMultiply = zone.lightMultiply ?? 0.55;
  const materialScale = zone.materialScale ?? 1;

  // Render tile pattern (perspective warp or flat repeat fallback)
  const tileCvs = document.createElement("canvas");
  tileCvs.width = W;
  tileCvs.height = H;
  const tCtx = tileCvs.getContext("2d");

  if (zone.corners && zone.corners.length === 4) {
    warpTextureToQuad(materialImg, zone.corners, tileCvs);
  } else {
    const tw = materialImg.naturalWidth * materialScale;
    const th = materialImg.naturalHeight * materialScale;
    for (let y = 0; y < H; y += th) {
      for (let x = 0; x < W; x += tw) {
        tCtx.drawImage(materialImg, x, y, tw, th);
      }
    }
  }

  // Clip the tile canvas to the zone mask
  const alphaMask = maskToAlpha(maskImg, W, H);
  tCtx.globalCompositeOperation = "destination-in";
  tCtx.drawImage(alphaMask, 0, 0);

  // Draw clipped tile onto the scene
  ctx.globalAlpha = opacity;
  ctx.drawImage(tileCvs, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // Clip shading to the masked region and multiply it on top
  const shadingCvs = buildShadingLayer(baseImg, W, H);
  const sCtx = shadingCvs.getContext("2d");
  sCtx.globalCompositeOperation = "destination-in";
  sCtx.drawImage(alphaMask, 0, 0);

  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = lightMultiply;
  ctx.drawImage(shadingCvs, 0, 0);

  // Reset context states
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

/**
 * Composite a photo-based room layout on the 2-layer model.
 *
 * @param {string}       background    background.png (inpainted, furniture removed)
 * @param {string}       foreground    foreground.png (furniture/objects, drawn last)
 * @param {Array<Object>} zones        [{ id, label, maskSrc, corners }]
 * @param {Object}       appliedTiles  { [zoneLabel]: tile } — resolved per zone at render
 * @param {HTMLCanvasElement} canvas   target canvas
 *
 * Draw order:
 *   1. background — bare room photo (furniture/objects removed)
 *   2. warped + masked tile per zone — floor/wall/counter boundaries
 *   3. foreground — furniture/objects drawn on top, unconditionally
 *
 * Masks are boundary-only (no furniture holes); foreground.png owns occlusion.
 */
export async function compositeAllZones({ background, foreground, zones, appliedTiles, canvas }) {
  const baseImg = await loadImageOptional(background, "background");
  if (!baseImg) return;

  const fgImg = await loadImageOptional(foreground, "foreground");

  const W = baseImg.naturalWidth;
  const H = baseImg.naturalHeight;

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Layer 1: bare room photo
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(baseImg, 0, 0, W, H);

  // Layer 2: warped + masked tile per zone
  for (const zone of zones) {
    const materialSrc = resolveMaterialSrc(zone, appliedTiles);
    if (!zone.maskSrc || !materialSrc) continue;

    let maskImg, materialImg;
    try {
      [maskImg, materialImg] = await Promise.all([
        loadImage(zone.maskSrc),
        loadImage(materialSrc),
      ]);
    } catch (e) {
      console.warn("Failed to load assets for zone, skipping:", zone.label, e);
      continue;
    }

    applyZoneTile(ctx, zone, { baseImg, maskImg, materialImg, W, H });
  }

  // Layer 3: furniture/objects on top, unconditionally
  if (fgImg) {
    ctx.drawImage(fgImg, 0, 0, W, H);
  }
}
