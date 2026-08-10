/**
 * Renders a list of runs (from our connected component segmenter) onto a canvas context.
 * A run is defined as [row, col_start, col_end].
 */
export function drawRuns(runs, ctx, color) {
  ctx.fillStyle = color;
  for (const [r, cStart, cEnd] of runs) {
    ctx.fillRect(cStart, r, cEnd - cStart + 1, 1);
  }
}

/**
 * Checks if a pixel (x, y) is inside any of the runs.
 */
export function isPixelInRuns(x, y, runs) {
  for (const [r, cStart, cEnd] of runs) {
    if (r === y && x >= cStart && x <= cEnd) {
      return true;
    }
  }
  return false;
}
