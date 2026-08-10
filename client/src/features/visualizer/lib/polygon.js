/**
 * Polygon geometry helpers for the 2-layer photo visualizer.
 *
 * A plane's `polygon` ([[x,y], ...], >= 3 points) is the source of truth for
 * its boundary. At render time the compositor rasterizes each polygon into a
 * feathered alpha mask so tiles clip cleanly against the room photo.
 */

/**
 * Ray-casting point-in-polygon test. Points are [x, y] in image pixel space.
 */
export function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersects =
      yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Rasterize a polygon into a feathered alpha mask canvas the size of the room
 * image. White fills the polygon interior on a transparent background; the
 * optional `feather` (px) blurs the edge so tiles blend with the photo instead
 * of showing a hard boundary.
 *
 * @param {number[][]} poly  boundary points [[x,y], ...] (>= 3)
 * @param {number} width     room image width
 * @param {number} height    room image height
 * @param {number} [feather=2] edge feather in px (1–3 recommended)
 * @returns {HTMLCanvasElement}
 */
export function rasterizePolygonMask(poly, width, height, feather = 2) {
  const cvs = document.createElement("canvas");
  cvs.width = width;
  cvs.height = height;
  const ctx = cvs.getContext("2d");

  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  if (feather > 0) {
    const blurCvs = document.createElement("canvas");
    blurCvs.width = width;
    blurCvs.height = height;
    const bCtx = blurCvs.getContext("2d");
    bCtx.filter = `blur(${feather}px)`;
    bCtx.drawImage(cvs, 0, 0);
    return blurCvs;
  }
  return cvs;
}
