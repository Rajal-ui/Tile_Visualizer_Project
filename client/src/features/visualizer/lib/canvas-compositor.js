import { warpTextureToQuad } from "./homography.js";

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
 * Convert a mask image to an alpha mask with 2px Gaussian blur feathering.
 * Bright pixels = zone area. Black pixels = exclude.
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
 * Core compositing function for a single zone.
 */
export async function applyMaterialToZone({
  baseSrc,
  maskSrc,
  materialSrc,
  canvas,
  corners = null,
  opts = {},
}) {
  const {
    opacity = 1,
    lightMultiply = 0.55,
    materialScale = 1,
  } = opts;

  const [baseImg, maskImg, materialImg] = await Promise.all([
    loadImage(baseSrc),
    loadImage(maskSrc),
    loadImage(materialSrc),
  ]);

  const W = baseImg.naturalWidth;
  const H = baseImg.naturalHeight;

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Step 1: Draw base room photo
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(baseImg, 0, 0, W, H);

  // Step 2: Render tile pattern (flat or perspective warped)
  const tileCvs = document.createElement("canvas");
  tileCvs.width = W;
  tileCvs.height = H;
  const tCtx = tileCvs.getContext("2d");

  if (corners && corners.length === 4) {
    // Perspective warp using homography
    warpTextureToQuad(materialImg, corners, tileCvs);
  } else {
    // Flat background-repeat fallback
    const tw = materialImg.naturalWidth * materialScale;
    const th = materialImg.naturalHeight * materialScale;
    for (let y = 0; y < H; y += th) {
      for (let x = 0; x < W; x += tw) {
        tCtx.drawImage(materialImg, x, y, tw, th);
      }
    }
  }

  // Step 3: Convert mask to feathered alpha mask and clip the tile canvas
  const alphaMask = maskToAlpha(maskImg, W, H);
  tCtx.globalCompositeOperation = "destination-in";
  tCtx.drawImage(alphaMask, 0, 0);

  // Step 4: Draw clipped tile onto base room photo
  ctx.globalAlpha = opacity;
  ctx.drawImage(tileCvs, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // Step 5: Extract grayscale shading layer from original base image
  const shadingCvs = document.createElement("canvas");
  shadingCvs.width = W;
  shadingCvs.height = H;
  const sCtx = shadingCvs.getContext("2d");
  sCtx.drawImage(baseImg, 0, 0, W, H);

  const imgData = sCtx.getImageData(0, 0, W, H);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = lum;
    d[i + 1] = lum;
    d[i + 2] = lum;
  }
  sCtx.putImageData(imgData, 0, 0);

  // Clip the shading layer to the masked region
  sCtx.globalCompositeOperation = "destination-in";
  sCtx.drawImage(alphaMask, 0, 0);

  // Blend shading on top using multiply
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = lightMultiply;
  ctx.drawImage(shadingCvs, 0, 0);

  // Reset context states
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

/**
 * Batch-composite multiple zones onto one canvas.
 */
export async function compositeAllZones(baseSrc, zones, canvas) {
  const baseImg = await loadImage(baseSrc);
  const W = baseImg.naturalWidth;
  const H = baseImg.naturalHeight;

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Step 1: Draw base room photo
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(baseImg, 0, 0, W, H);

  for (const zone of zones) {
    if (!zone.maskSrc || !zone.materialSrc) continue;

    let maskImg, materialImg;
    try {
      [maskImg, materialImg] = await Promise.all([
        loadImage(zone.maskSrc),
        loadImage(zone.materialSrc),
      ]);
    } catch (e) {
      console.warn("Failed to load assets for zone, skipping:", zone.label, e);
      continue;
    }

    const opacity = zone.opacity ?? 1;
    const lightMultiply = zone.lightMultiply ?? 0.55;
    const materialScale = zone.materialScale ?? 1;

    // Step 2: Render tile pattern (flat or perspective warped)
    const tileCvs = document.createElement("canvas");
    tileCvs.width = W;
    tileCvs.height = H;
    const tCtx = tileCvs.getContext("2d");

    if (zone.corners && zone.corners.length === 4) {
      // Perspective warp using homography
      warpTextureToQuad(materialImg, zone.corners, tileCvs);
    } else {
      // Flat background-repeat fallback
      const tw = materialImg.naturalWidth * materialScale;
      const th = materialImg.naturalHeight * materialScale;
      for (let y = 0; y < H; y += th) {
        for (let x = 0; x < W; x += tw) {
          tCtx.drawImage(materialImg, x, y, tw, th);
        }
      }
    }

    // Step 3: Convert mask to feathered alpha mask and clip the tile canvas
    const alphaMask = maskToAlpha(maskImg, W, H);
    tCtx.globalCompositeOperation = "destination-in";
    tCtx.drawImage(alphaMask, 0, 0);

    // Step 4: Draw clipped tile onto base room photo
    ctx.globalAlpha = opacity;
    ctx.drawImage(tileCvs, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // Step 5: Extract grayscale shading layer from original base image
    const shadingCvs = document.createElement("canvas");
    shadingCvs.width = W;
    shadingCvs.height = H;
    const sCtx = shadingCvs.getContext("2d");
    sCtx.drawImage(baseImg, 0, 0, W, H);

    const imgData = sCtx.getImageData(0, 0, W, H);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = lum;
      d[i + 1] = lum;
      d[i + 2] = lum;
    }
    sCtx.putImageData(imgData, 0, 0);

    // Clip the shading layer to the masked region
    sCtx.globalCompositeOperation = "destination-in";
    sCtx.drawImage(alphaMask, 0, 0);

    // Blend shading on top using multiply
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = lightMultiply;
    ctx.drawImage(shadingCvs, 0, 0);

    // Reset context states
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
}
