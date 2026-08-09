/**
 * Client-side K-Means segmentation fallback.
 * Runs entirely in the browser — no backend required.
 * Returns regions in the same format as the Python backend.
 */

const K = 8; // number of color clusters
const MAX_ITER = 20;
const SAMPLE_STEP = 4; // sample every 4th pixel for speed

function randomCentroids(pixels, k) {
  const centroids = [];
  const used = new Set();
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (!used.has(idx)) {
      used.add(idx);
      centroids.push([...pixels[idx]]);
    }
  }
  return centroids;
}

function colorDist(a, b) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  );
}

function kMeans(pixels, k) {
  let centroids = randomCentroids(pixels, k);
  let assignments = new Int32Array(pixels.length);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let changed = false;

    // Assign
    for (let i = 0; i < pixels.length; i++) {
      let bestD = Infinity;
      let bestC = 0;
      for (let c = 0; c < k; c++) {
        const d = colorDist(pixels[i], centroids[c]);
        if (d < bestD) {
          bestD = d;
          bestC = c;
        }
      }
      if (assignments[i] !== bestC) {
        assignments[i] = bestC;
        changed = true;
      }
    }

    if (!changed) break;

    // Update centroids
    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Int32Array(k);
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      counts[c]++;
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centroids[c] = [
          sums[c][0] / counts[c],
          sums[c][1] / counts[c],
          sums[c][2] / counts[c],
        ];
      }
    }
  }

  return { assignments, centroids };
}

/**
 * Run K-Means segmentation on the image and return RLE-encoded regions
 * in the same format as the Python backend response.
 */
export async function segmentImageClientSide(imgElement) {
  const W = imgElement.naturalWidth;
  const H = imgElement.naturalHeight;

  // Draw to offscreen canvas to get pixel data
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imgElement, 0, 0);
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;

  // Sample pixels
  const sampledPixels = [];
  const sampledCoords = [];
  for (let y = 0; y < H; y += SAMPLE_STEP) {
    for (let x = 0; x < W; x += SAMPLE_STEP) {
      const i = (y * W + x) * 4;
      sampledPixels.push([data[i], data[i + 1], data[i + 2]]);
      sampledCoords.push([x, y]);
    }
  }

  const { assignments, centroids } = kMeans(sampledPixels, K);

  // Build full per-pixel cluster map (nearest centroid for un-sampled pixels)
  // For speed, expand from sampled grid
  const clusterMap = new Int32Array(W * H);
  for (let si = 0; si < sampledCoords.length; si++) {
    const [sx, sy] = sampledCoords[si];
    const c = assignments[si];
    for (let dy = 0; dy < SAMPLE_STEP && sy + dy < H; dy++) {
      for (let dx = 0; dx < SAMPLE_STEP && sx + dx < W; dx++) {
        clusterMap[(sy + dy) * W + (sx + dx)] = c;
      }
    }
  }

  // Convert cluster map to RLE runs per region
  const regions = centroids.map((centroid, id) => {
    const runs = [];
    for (let y = 0; y < H; y++) {
      let runStart = -1;
      for (let x = 0; x <= W; x++) {
        const inCluster = x < W && clusterMap[y * W + x] === id;
        if (inCluster && runStart === -1) {
          runStart = x;
        } else if (!inCluster && runStart !== -1) {
          runs.push([y, runStart, x - 1]);
          runStart = -1;
        }
      }
    }
    return {
      id: `region-${id}`,
      color: `rgb(${Math.round(centroid[0])},${Math.round(centroid[1])},${Math.round(centroid[2])})`,
      runs,
    };
  });

  return {
    regions,
    width: W,
    height: H,
  };
}
