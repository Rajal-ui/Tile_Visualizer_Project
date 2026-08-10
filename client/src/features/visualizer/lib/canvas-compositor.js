import { warpTextureToQuad } from "./homography.js";
import { rasterizePolygonMask } from "./polygon.js";
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
 * Render a repeating tile into a plane's canvas — perspective-warped when the
 * plane has a 4-corner quad (corners, or a 4-point polygon acting as corners),
 * flat repeat otherwise.
 */
function renderPlaneTiles(tCtx, plane, materialImg, W, H) {
  const corners =
    plane.corners && plane.corners.length === 4
      ? plane.corners
      : plane.polygon && plane.polygon.length === 4
        ? plane.polygon
        : null;

  if (corners) {
    warpTextureToQuad(materialImg, corners, tCtx.canvas);
    return;
  }

  const materialScale = plane.materialScale ?? 1;
  const tw = materialImg.naturalWidth * materialScale;
  const th = materialImg.naturalHeight * materialScale;
  for (let y = 0; y < H; y += th) {
    for (let x = 0; x < W; x += tw) {
      tCtx.drawImage(materialImg, x, y, tw, th);
    }
  }
}

/**
 * Render one plane's tile, clip it to the plane's feathered polygon mask, draw
 * it, then multiply the room's shading over it so lighting matches the photo.
 */
function applyPlane(ctx, plane, { baseImg, materialImg, W, H }) {
  const opacity = plane.opacity ?? 1;
  const lightMultiply = plane.lightMultiply ?? 0.55;
  const feather = plane.feather ?? 2;

  const tileCvs = document.createElement("canvas");
  tileCvs.width = W;
  tileCvs.height = H;
  const tCtx = tileCvs.getContext("2d");

  renderPlaneTiles(tCtx, plane, materialImg, W, H);

  // Clip the tile canvas to the plane's feathered polygon mask
  const alphaMask = rasterizePolygonMask(plane.polygon, W, H, feather);
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
 * @param {Array<Object>} zones        [{ id, label, planes: [{ polygon, corners }] }]
 * @param {Object}       appliedTiles  { [zoneLabel]: tile } — resolved per zone at render
 * @param {HTMLCanvasElement} canvas   target canvas
 *
 * Draw order:
 *   1. background — bare room photo (furniture/objects removed)
 *   2. warped + polygon-masked tile per plane — floor/wall/counter boundaries
 *   3. foreground — furniture/objects drawn on top, unconditionally
 *
 * Masks are rasterized from each plane's polygon at render time (source of
 * truth); foreground.png owns occlusion.
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

  // Layer 2: warped + masked tile per plane
  for (const zone of zones) {
    const materialSrc = resolveMaterialSrc(zone, appliedTiles);
    const planes = (zone.planes || []).filter((p) => (p.polygon || []).length >= 3);
    if (!materialSrc || planes.length === 0) {
      console.debug(
        `[composite] skip zone "${zone.label}" — material: ${materialSrc ? "ok" : "none"}, renderable planes: ${planes.length}`
      );
      continue;
    }

    let materialImg;
    try {
      materialImg = await loadImage(materialSrc);
    } catch (e) {
      console.warn("Failed to load material, skipping zone:", zone.label, e);
      continue;
    }

    for (const plane of planes) {
      try {
        applyPlane(ctx, plane, { baseImg, materialImg, W, H });
      } catch (e) {
        console.error(`[composite] plane render failed for zone "${zone.label}":`, e);
      }
    }
  }

  // Layer 3: furniture/objects on top, unconditionally
  if (fgImg) {
    ctx.drawImage(fgImg, 0, 0, W, H);
  }
}
