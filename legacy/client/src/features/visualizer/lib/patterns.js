import { textureUrl } from "@/lib/textures.js";

function dimsFor(format) {
  if (!format || !format.includes("x")) return { pw: 48, ph: 48 };
  const [w, h] = format.split("x").map(Number);
  if (!w || !h) return { pw: 48, ph: 48 };
  const ratio = w / h;
  const area = 44 * 44;
  let ph = Math.sqrt(area / ratio);
  let pw = ratio * ph;
  const max = 170;
  if (pw > max) {
    pw = max;
    ph = pw / ratio;
  }
  if (ph > max) {
    ph = max;
    pw = ph * ratio;
  }
  return { pw: Math.round(pw), ph: Math.round(ph) };
}

function hexPoints(cx, cy, r) {
  const pts = [];
  for (let k = 0; k < 6; k++) {
    const ang = (Math.PI / 180) * (60 * k);
    pts.push(`${(cx + r * Math.sin(ang)).toFixed(1)},${(cy - r * Math.cos(ang)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function patternFor(tile, id) {
  const { pw, ph } = dimsFor(tile.format);
  const g = 4;
  const url = textureUrl(tile.texture);
  const grout = tile.grout || "#c4c9d0";
  const kind = tile.pattern || "grid";
  const tpId = `tp-${id}`;
  const tPat = `
    <pattern id="${tpId}" width="${pw}" height="${ph}" patternUnits="userSpaceOnUse" patternTransform="scale(0.9)">
      <image x="0" y="0" width="${pw}" height="${ph}" href="${url}" preserveAspectRatio="none"/>
    </pattern>`;

  switch (kind) {
    case "brick": {
      const w = 2 * (pw + g);
      const h = 2 * (ph + g);
      const off = Math.round((pw + g) / 2);
      return `${tPat}
        <pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">
          <rect width="${w}" height="${h}" fill="${grout}"/>
          <polygon points="${0},${0} ${pw},${0} ${pw},${ph} ${0},${ph}" fill="url(#${tpId})"/>
          <polygon points="${pw + g},${0} ${pw + g + pw},${0} ${pw + g + pw},${ph} ${pw + g},${ph}" fill="url(#${tpId})"/>
          <polygon points="${-off},${ph + g} ${-off + pw},${ph + g} ${-off + pw},${ph + g + ph} ${-off},${ph + g + ph}" fill="url(#${tpId})"/>
          <polygon points="${off},${ph + g} ${off + pw},${ph + g} ${off + pw},${ph + g + ph} ${off},${ph + g + ph}" fill="url(#${tpId})"/>
          <polygon points="${off + pw + g},${ph + g} ${off + pw + g + pw},${ph + g} ${off + pw + g + pw},${ph + g + ph} ${off + pw + g},${ph + g + ph}" fill="url(#${tpId})"/>
        </pattern>`;
    }
    case "diagonal": {
      const P = Math.round(pw * Math.SQRT2) + g * 2;
      const half = pw / 2;
      return `${tPat}
        <pattern id="${id}" width="${P}" height="${P}" patternUnits="userSpaceOnUse">
          <rect width="${P}" height="${P}" fill="${grout}"/>
          <g transform="rotate(45)">
            <polygon points="${-half},${-half} ${half},${-half} ${half},${half} ${-half},${half}" fill="url(#${tpId})"/>
          </g>
          <g transform="translate(${P / 2},${P / 2}) rotate(45)">
            <polygon points="${-half},${-half} ${half},${-half} ${half},${half} ${-half},${half}" fill="url(#${tpId})"/>
          </g>
        </pattern>`;
    }
    case "herringbone": {
      const L = Math.max(pw, ph);
      const W = Math.min(pw, ph);
      const M = Math.round((L + W) / Math.SQRT2) + g * 2;
      const L2 = L / 2;
      const W2 = W / 2;
      return `${tPat}
        <pattern id="${id}" width="${M}" height="${M}" patternUnits="userSpaceOnUse">
          <rect width="${M}" height="${M}" fill="${grout}"/>
          <g transform="rotate(45)">
            <polygon points="${-L2},${-W2} ${L2},${-W2} ${L2},${W2} ${-L2},${W2}" fill="url(#${tpId})"/>
          </g>
          <g transform="translate(${M / 2},${M / 2}) rotate(-45)">
            <polygon points="${-L2},${-W2} ${L2},${-W2} ${L2},${W2} ${-L2},${W2}" fill="url(#${tpId})"/>
          </g>
        </pattern>`;
    }
    case "hexagon": {
      const r = 40;
      const W = Math.round(r * Math.sqrt(3));
      const ROW = Math.round((W + g) / 2);
      const h = 3 * r;
      const w = 2 * (W + g);
      const centers = [
        [ROW, r],
        [ROW + W + g, r],
        [0, 2.5 * r],
        [W + g, 2.5 * r],
      ];
      const hexes = centers
        .map(
          ([cx, cy]) =>
            `<polygon points="${hexPoints(cx, cy, r - 1)}" fill="url(#${tpId})"/>`
        )
        .join("");
      return `${tPat}
        <pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">
          <rect width="${w}" height="${h}" fill="${grout}"/>
          ${hexes}
        </pattern>`;
    }
    case "large": {
      const w = pw + g * 2;
      const h = ph + g * 2;
      return `${tPat}
        <pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">
          <rect width="${w}" height="${h}" fill="${grout}"/>
          <polygon points="${g},${g} ${pw + g},${g} ${pw + g},${ph + g} ${g},${ph + g}" fill="url(#${tpId})"/>
        </pattern>`;
    }
    case "grid":
    default: {
      const w = pw + g;
      const h = ph + g;
      return `${tPat}
        <pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">
          <rect width="${w}" height="${h}" fill="${grout}"/>
          <polygon points="0,0 ${pw},0 ${pw},${ph} 0,${ph}" fill="url(#${tpId})"/>
        </pattern>`;
    }
  }
}

export const HATCH_ID = "hatch";
export function hatchPattern() {
  return `
    <pattern id="${HATCH_ID}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="10" height="10" fill="#e2e8f0"/>
      <rect width="5" height="10" fill="#d3dae3"/>
    </pattern>`;
}

export function patternTilesFor(tile, id) {
  return { pattern: patternFor(tile, id), textureId: `tp-${id}` };
}
