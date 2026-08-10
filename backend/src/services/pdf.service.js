const https = require('https');
const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve(null);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          return resolve(null);
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', (err) => {
        logger.warn(`Failed to fetch image for PDF: ${err.message}`);
        resolve(null);
      });
  });
}

/**
 * Streams a branded PDF catalogue of tiles directly into the given
 * writable response stream. Two tiles per row, image + specs.
 */
async function generateCataloguePdf(tiles, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  doc
    .fontSize(22)
    .fillColor('#111827')
    .text('Tile Showroom Catalogue', { align: 'center' });
  doc
    .fontSize(10)
    .fillColor('#6b7280')
    .text(`Generated on ${new Date().toLocaleDateString()} • ${tiles.length} tiles`, {
      align: 'center',
    });
  doc.moveDown(1.5);

  const colWidth = 250;
  const imgSize = 120;
  let x = doc.page.margins.left;
  let y = doc.y;
  let col = 0;

  for (const tile of tiles) {
    if (y + imgSize + 90 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      x = doc.page.margins.left;
      y = doc.page.margins.top;
      col = 0;
    }

    // eslint-disable-next-line no-await-in-loop
    const imgBuffer = await fetchImageBuffer(tile.image?.url);
    const cardX = x + col * (colWidth + 20);

    doc.rect(cardX, y, colWidth, imgSize + 85).stroke('#e5e7eb');

    if (imgBuffer) {
      try {
        doc.image(imgBuffer, cardX + 10, y + 10, { width: imgSize, height: imgSize, fit: [imgSize, imgSize] });
      } catch {
        // corrupt/unsupported image - skip silently
      }
    }

    const textX = cardX + 10;
    let textY = y + imgSize + 20;

    doc.fontSize(11).fillColor('#111827').text(tile.title, textX, textY, { width: colWidth - 20 });
    textY += 16;
    doc
      .fontSize(9)
      .fillColor('#4b5563')
      .text(`${tile.material} • ${tile.finish}`, textX, textY, { width: colWidth - 20 });
    textY += 13;
    doc.text(
      `${tile.size?.length}x${tile.size?.width}${tile.size?.unit || 'mm'}${
        tile.thickness ? ` • ${tile.thickness}mm thick` : ''
      }`,
      textX,
      textY,
      { width: colWidth - 20 }
    );
    textY += 13;
    if (tile.price?.value) {
      doc.text(`₹${tile.price.value} ${tile.price.unit || ''}`, textX, textY, { width: colWidth - 20 });
    }

    col += 1;
    if (col >= 2) {
      col = 0;
      y += imgSize + 105;
    }
  }

  doc.end();
}

module.exports = { generateCataloguePdf };
