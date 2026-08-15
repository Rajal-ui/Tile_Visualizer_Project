/**
 * Dependency-free PDF export for room configurations.
 *
 * A single-page, text-only PDF report (Title + body lines, Helvetica) is built
 * by hand so the feature has zero runtime dependencies and works offline. The
 * report lists the room, the selected layout, and every tile applied to each
 * surface, then triggers a browser download.
 */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

/** Escape a string for a PDF literal string (WinAnsi text). */
function pdfEscape(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7e]/g, "?");
}

/**
 * Build a minimal valid PDF containing one text page.
 *
 * @param {string[]} lines  body lines (ASCII-safe; non-ASCII becomes "?")
 * @param {{ title?: string }} [opts]
 * @returns {Uint8Array} raw PDF bytes
 */
export function buildPdf(lines = [], { title = "Tile Visualizer" } = {}) {
  const content = [
    "BT",
    "/F1 15 Tf",
    "16 TL",
    "50 770 Td",
    `(${pdfEscape(title)}) Tj T*`,
    "/F1 11 Tf",
    "13 TL",
    ...lines.map((line) => `(${pdfEscape(line)}) Tj T*`),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets[i] = pdf.length;
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 0; i < objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

/**
 * Build + download a PDF report for the current room configuration.
 *
 * @param {object} config
 * @param {object} [config.room]          selected room ({ id, name })
 * @param {object|null} [config.layout]   resolved layout config ({ name })
 * @param {Record<string, object>} [config.appliedTiles] surface -> tile
 * @param {string[]} [config.surfaces]    surface labels to report in order
 */
export function exportRoomConfigPdf({ room, layout, appliedTiles = {}, surfaces = [] }) {
  const lines = [];
  lines.push(`Room: ${room?.name || "Unnamed room"}`);
  lines.push(`Layout: ${layout?.name || (layout ? "Photo layout" : "CSS template")}`);
  lines.push("");
  lines.push("Applied tiles:");

  const surfaceOrder = surfaces.length ? surfaces : Object.keys(appliedTiles);
  if (!surfaceOrder.length) lines.push("  (none)");
  for (const surface of surfaceOrder) {
    const tile = appliedTiles[surface];
    if (tile) {
      lines.push(
        `  ${surface}: ${tile.name} (${tile.finish || "—"}, ${tile.size || "—"}, Rs ${tile.price ?? "—"})`
      );
    } else {
      lines.push(`  ${surface}: No tile applied`);
    }
  }

  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);

  const bytes = buildPdf(lines, { title: "Tile Visualizer - Room Configuration" });
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `tile-visualizer-${room?.id || "room"}-${stamp}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}