/**
 * Small geometry helpers for the layout editor.
 *
 * Points are represented as `[x, y]` pairs in image pixel space.
 */

export function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/**
 * Distance from point `p` to the segment `a`–`b`.
 */
export function distToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, [a[0] + t * dx, a[1] + t * dy]);
}
