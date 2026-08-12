function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZE = 160;

function noiseFilter(seed, alpha = 0.18, freq = "0.8") {
  return `
    <filter id="n" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${alpha} 0 0 0 0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#n)"/>`;
}

function vignette(strength = 0.14) {
  return `
    <radialGradient id="vg" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="78%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${strength}"/>
    </radialGradient>
    <rect width="100%" height="100%" fill="url(#vg)"/>`;
}

function sheen() {
  return `
    <linearGradient id="sh" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32"/>
      <stop offset="32%" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="62%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.16"/>
    </linearGradient>
    <rect width="100%" height="100%" fill="url(#sh)"/>`;
}

function marble(t, seed) {
  const veins = t.veins || ["#cfc4b2", "#b3a894"];
  let paths = "";
  veins.forEach((v, i) => {
    paths += `
      <path d="M -20 ${130 - i * 40} C ${30 + i * 10} ${90 + i * 12}, ${70 + i * 8} ${150 - i * 20}, ${110 + i * 16} ${80 + i * 18} S ${170 - i * 10} ${50}, ${190} ${70}"
        stroke="${v}" stroke-width="${i === 0 ? 2.4 : 1.4}" fill="none" opacity="${i === 0 ? 0.4 : 0.28}"/>
      <path d="M -30 ${40 + i * 55} C ${40} ${20 + i * 18}, ${90} ${70 + i * 10}, ${150} ${30 + i * 22}"
        stroke="${v}" stroke-width="${i === 0 ? 1.8 : 1.1}" fill="none" opacity="${i === 0 ? 0.3 : 0.2}"/>`;
  });
  return `
    <rect width="${SIZE}" height="${SIZE}" fill="${t.base}"/>
    <path d="M -20 20 C 40 10, 80 60, 130 30 S 180 70, 200 40" stroke="${t.base}" stroke-width="8" fill="none" opacity="0.35"/>
    ${paths}
    ${noiseFilter(seed, 0.1, "0.9")}
    ${vignette(0.12)}
    ${t.glossy ? sheen() : ""}`;
}

function granite(t, seed) {
  const rand = mulberry32(seed);
  const specks = t.specks || ["#6b6f76", "#8a8e96", "#4c5057"];
  let dots = "";
  for (let i = 0; i < 34; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = 0.8 + rand() * 1.8;
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${specks[i % specks.length]}" opacity="${0.35 + rand() * 0.3}"/>`;
  }
  return `
    <rect width="${SIZE}" height="${SIZE}" fill="${t.base}"/>
    ${noiseFilter(seed, 0.55, "0.6")}
    ${dots}
    ${vignette(0.16)}
    ${t.glossy ? sheen() : ""}`;
}

function terrazzo(t, seed) {
  const rand = mulberry32(seed);
  const chips = t.chips || ["#c24e4e", "#4e78c2", "#7a4ec2", "#c2a24e", "#4ec27a", "#5a5f66"];
  let flecks = "";
  for (let i = 0; i < 26; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = 2 + rand() * 5;
    const rx = r * (0.6 + rand() * 0.6);
    const ry = r * (0.6 + rand() * 0.6);
    flecks += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${chips[i % chips.length]}" opacity="${0.55 + rand() * 0.4}"/>`;
  }
  return `
    <rect width="${SIZE}" height="${SIZE}" fill="${t.base}"/>
    ${flecks}
    ${noiseFilter(seed, 0.12, "0.9")}
    ${vignette(0.12)}
    ${t.glossy ? sheen() : ""}`;
}

function wood(t, seed) {
  const rand = mulberry32(seed);
  let grain = "";
  for (let i = 0; i < 7; i++) {
    const x = 12 + i * 22;
    grain += `<path d="M ${x} 0 C ${x + 8} ${40 + rand() * 20}, ${x - 10} ${90 + rand() * 20}, ${x + 4} ${SIZE}" stroke="${t.vein || "#8a6f52"}" stroke-width="${0.6 + rand() * 0.8}" fill="none" opacity="0.22"/>`;
  }
  const knotX = 60 + rand() * 50;
  return `
    <rect width="${SIZE}" height="${SIZE}" fill="${t.base}"/>
    <linearGradient id="gr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.12"/>
      <stop offset="50%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.14"/>
    </linearGradient>
    <rect width="100%" height="100%" fill="url(#gr)"/>
    ${grain}
    <ellipse cx="${knotX.toFixed(0)}" cy="${(80 + rand() * 40).toFixed(0)}" rx="4" ry="9" fill="${t.vein || "#8a6f52"}" opacity="0.28"/>
    ${noiseFilter(seed, 0.08, "0.8")}
    ${vignette(0.1)}`;
}

function concrete(t, seed) {
  return `
    <rect width="${SIZE}" height="${SIZE}" fill="${t.base}"/>
    ${noiseFilter(seed, 0.45, "0.7")}
    <rect x="0" y="40" width="100%" height="3" fill="#000000" opacity="0.05"/>
    <rect x="0" y="92" width="100%" height="4" fill="#ffffff" opacity="0.05"/>
    ${vignette(0.18)}
    ${t.glossy ? sheen() : ""}`;
}

function slate(t, seed) {
  return `
    <rect width="${SIZE}" height="${SIZE}" fill="${t.base}"/>
    ${noiseFilter(seed, 0.4, "0.65")}
    <path d="M 0 52 L 80 40 L 160 55" stroke="#000000" stroke-width="2" fill="none" opacity="0.12"/>
    <path d="M 0 104 L 70 112 L 160 100" stroke="#000000" stroke-width="2" fill="none" opacity="0.1"/>
    <path d="M 0 130 L 90 120 L 160 134" stroke="#ffffff" stroke-width="1.4" fill="none" opacity="0.06"/>
    ${vignette(0.16)}
    ${t.glossy ? sheen() : ""}`;
}

function solid(t, seed) {
  return `
    <rect width="${SIZE}" height="${SIZE}" fill="${t.base}"/>
    ${noiseFilter(seed, 0.08, "0.9")}
    ${vignette(0.12)}
    ${t.glossy ? sheen() : ""}`;
}

export function textureSvg(t) {
  if (t.kind === "image" && t.src) {
    if (t.src.startsWith("http://") || t.src.startsWith("https://")) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"><image width="${SIZE}" height="${SIZE}" href="${encodeURI(t.src)}" preserveAspectRatio="none"/></svg>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"><image width="${SIZE}" height="${SIZE}" href="${encodeURI(t.src)}" preserveAspectRatio="none"/></svg>`;
  }
  const seed = t.seed ?? hash(t.name ?? "tile");
  let inner;
  switch (t.kind) {
    case "marble":
      inner = marble(t, seed);
      break;
    case "granite":
      inner = granite(t, seed);
      break;
    case "terrazzo":
      inner = terrazzo(t, seed);
      break;
    case "wood":
      inner = wood(t, seed);
      break;
    case "concrete":
      inner = concrete(t, seed);
      break;
    case "slate":
      inner = slate(t, seed);
      break;
    default:
      inner = solid(t, seed);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${inner}</svg>`;
}

export function textureUrl(t) {
  if (t.kind === "image" && t.src) {
    if (t.src.startsWith("http://") || t.src.startsWith("https://")) {
      return t.src;
    }
    return encodeURI(t.src);
  }
  return "data:image/svg+xml," + encodeURIComponent(textureSvg(t));
}

export function textureThumbnailUrl(tile) {
  if (tile.thumbnailUrl) return tile.thumbnailUrl;
  return textureUrl(tile.texture);
}
