/**
 * Homography math for the 2-layer photo visualizer.
 *
 * Maps a repeating tile texture into a perspective quad (the 4 corner points
 * of a floor/wall/counter plane in the room photo).
 */

/**
 * Solves a system of linear equations Ax = B using Gaussian elimination.
 */
function solveLinearSystem(A, B) {
  const n = B.length;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) {
        maxRow = j;
      }
    }
    const tempA = A[i];
    A[i] = A[maxRow];
    A[maxRow] = tempA;
    const tempB = B[i];
    B[i] = B[maxRow];
    B[maxRow] = tempB;

    if (Math.abs(A[i][i]) < 1e-10) {
      return null; // Singular matrix
    }

    for (let j = i + 1; j < n; j++) {
      const factor = A[j][i] / A[i][i];
      B[j] -= factor * B[i];
      for (let k = i; k < n; k++) {
        A[j][k] -= factor * A[i][k];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = B[i];
    for (let j = i + 1; j < n; j++) {
      sum -= A[i][j] * x[j];
    }
    x[i] = sum / A[i][i];
  }
  return x;
}

/**
 * Computes the homography matrix H that maps source points to destination points.
 * Points are arrays of [x, y]. Order: top-left, top-right, bottom-right, bottom-left.
 */
export function getHomography(src, dst) {
  const A = [];
  const B = [];

  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    B.push(u);
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    B.push(v);
  }

  const h = solveLinearSystem(A, B);
  if (!h) return null;
  return [
    h[0], h[1], h[2],
    h[3], h[4], h[5],
    h[6], h[7], 1.0
  ];
}

/**
 * Multiplies a 2D point [x, y] by a 3x3 homography matrix.
 */
export function transformPoint(x, y, H) {
  const w = H[6] * x + H[7] * y + H[8];
  return [
    (H[0] * x + H[1] * y + H[2]) / w,
    (H[3] * x + H[4] * y + H[5]) / w
  ];
}

/**
 * Warps a repeating tile pattern into a target quad defined by four corners.
 * Sampling is done in reverse: for every pixel inside the target quad's bounding
 * box, we map it back to tile space with the inverse homography, sample the
 * color, and write it to the destination canvas context.
 */
export function warpTextureToQuad(tileImg, dstCorners, dstCanvas) {
  const W = dstCanvas.width;
  const H = dstCanvas.height;
  const ctx = dstCanvas.getContext("2d");

  const tw = tileImg.width || tileImg.naturalWidth;
  const th = tileImg.height || tileImg.naturalHeight;

  const srcCorners = [
    [0, 0],
    [tw, 0],
    [tw, th],
    [0, th]
  ];

  const invH = getHomography(dstCorners, srcCorners);
  if (!invH) return;

  const xs = dstCorners.map((p) => p[0]);
  const ys = dstCorners.map((p) => p[1]);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(...ys)));

  const tileCvs = document.createElement("canvas");
  tileCvs.width = tw;
  tileCvs.height = th;
  const tCtx = tileCvs.getContext("2d");
  tCtx.drawImage(tileImg, 0, 0);
  const tileData = tCtx.getImageData(0, 0, tw, th);
  const tD = tileData.data;

  const dstData = ctx.getImageData(minX, minY, maxX - minX + 1, maxY - minY + 1);
  const dD = dstData.data;
  const dW = dstData.width;

  function isPointInQuad(x, y, quad) {
    let inside = false;
    for (let i = 0, j = quad.length - 1; i < quad.length; j = i++) {
      const xi = quad[i][0], yi = quad[i][1];
      const xj = quad[j][0], yj = quad[j][1];
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!isPointInQuad(x, y, dstCorners)) continue;

      const [tx, ty] = transformPoint(x, y, invH);

      let sx = Math.floor(tx) % tw;
      let sy = Math.floor(ty) % th;
      if (sx < 0) sx += tw;
      if (sy < 0) sy += th;

      const sIdx = (sy * tw + sx) * 4;
      const dIdx = ((y - minY) * dW + (x - minX)) * 4;

      dD[dIdx] = tD[sIdx];
      dD[dIdx + 1] = tD[sIdx + 1];
      dD[dIdx + 2] = tD[sIdx + 2];
      dD[dIdx + 3] = tD[sIdx + 3];
    }
  }

  ctx.putImageData(dstData, minX, minY);
}
