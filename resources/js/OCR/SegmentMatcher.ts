/**
 * ============================================================
 * OCR/SegmentMatcher.ts
 * ============================================================
 * Deterministic 7-segment display digit recogniser.
 *
 * HOW IT WORKS:
 *   Instead of using ML/OCR to guess what a digit looks like,
 *   this engine directly samples the 7 physical segments of
 *   each digit and determines which ones are ON vs OFF.
 *   Then it maps the ON/OFF pattern to a digit using a
 *   simple lookup table.
 *
 * WHY THIS IS BETTER THAN TESSERACT FOR 7-SEGMENT:
 *   - Perfectly distinguishes "0" from "8" (middle segment)
 *   - 100% deterministic — no ML uncertainty
 *   - Fast — just pixel sampling, no neural network
 *   - Works at any display size/color after proper inversion
 *
 * INPUT:
 *   A canvas that has been:
 *   1. Converted to grayscale (or max-grayscale for colored LEDs)
 *   2. Inverted (so digits are DARK on WHITE background)
 *   3. Thresholded (binary: pure black digits, pure white background)
 *
 * OUTPUT:
 *   The recognised digit string (e.g. "940") and confidence.
 * ============================================================
 */

// ---------------------------------------------------------------------------
// 7-Segment Lookup Table
// ---------------------------------------------------------------------------
//
// Standard 7-segment layout:
//
//    ─── a ───
//   |         |
//   f         b
//   |         |
//    ─── g ───
//   |         |
//   e         c
//   |         |
//    ─── d ───
//
// Segments indexed as: [a, b, c, d, e, f, g]
//                       top, top-right, bot-right, bottom, bot-left, top-left, middle

interface SegmentPattern {
  digit: string;
  segments: [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
}

const SEGMENT_PATTERNS: SegmentPattern[] = [
  { digit: '0', segments: [true,  true,  true,  true,  true,  true,  false] },
  { digit: '1', segments: [false, true,  true,  false, false, false, false] },
  { digit: '2', segments: [true,  true,  false, true,  true,  false, true]  },
  { digit: '3', segments: [true,  true,  true,  true,  false, false, true]  },
  { digit: '4', segments: [false, true,  true,  false, false, true,  true]  },
  { digit: '5', segments: [true,  false, true,  true,  false, true,  true]  },
  { digit: '6', segments: [true,  false, true,  true,  true,  true,  true]  }, // 6 with top bar
  { digit: '6', segments: [false, false, true,  true,  true,  true,  true]  }, // 6 without top bar
  { digit: '7', segments: [true,  true,  true,  false, false, false, false] }, // 7 standard
  { digit: '7', segments: [true,  true,  true,  false, false, true,  false] }, // 7 with top-left segment
  { digit: '7', segments: [true,  true,  true,  true,  false, false, false] }, // 7 with bottom hook
  { digit: '8', segments: [true,  true,  true,  true,  true,  true,  true]  },
  { digit: '9', segments: [true,  true,  true,  true,  false, true,  true]  }, // 9 with bottom bar
  { digit: '9', segments: [true,  true,  true,  false, false, true,  true]  }, // 9 without bottom bar
];

// ---------------------------------------------------------------------------
// Pixel helpers
// ---------------------------------------------------------------------------

/**
 * Get the luminance (0=black, 255=white) of a pixel at (x, y).
 * For a thresholded image, this will be either 0 or 255.
 */
function getLuminance(imageData: ImageData, x: number, y: number): number {
  const idx = (y * imageData.width + x) * 4;
  return imageData.data[idx]; // R channel (grayscale, so R=G=B)
}

/**
 * Count the ratio of DARK pixels in a rectangular region.
 * Returns a value 0.0 (all white) to 1.0 (all black).
 *
 * Dark = luminance < 128 (for thresholded images, this means pixel = 0)
 */
function darkRatio(
  imageData: ImageData,
  x: number, y: number, w: number, h: number,
): number {
  // Clamp to image bounds
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(imageData.width - 1, Math.round(x + w));
  const y1 = Math.min(imageData.height - 1, Math.round(y + h));

  let darkCount = 0;
  let totalCount = 0;

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      totalCount++;
      if (getLuminance(imageData, px, py) < 128) {
        darkCount++;
      }
    }
  }

  return totalCount === 0 ? 0 : darkCount / totalCount;
}

// ---------------------------------------------------------------------------
// Digit segmentation — find character boundaries
// ---------------------------------------------------------------------------

interface DigitBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Find individual digit bounding boxes using 2D Connected Component Grouping.
 *
 * Algorithm:
 *  1. Extract all black connected components (stroke pixels).
 *  2. Filter out noise (< 15% image height).
 *  3. Group components by horizontal overlap / proximity (gap <= 4% width).
 *  4. Return exact 2D bounding boxes for each digit.
 */
function findDigitBounds(imageData: ImageData): DigitBounds[] {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const getIdx = (x: number, y: number) => y * width + x;

  interface Component {
    minX: number; maxX: number;
    minY: number; maxY: number;
    pixelCount: number;
  }

  const components: Component[] = [];

  // Pass 1: Extract all black connected components
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = getIdx(x, y);
      if (visited[idx] === 1 || data[idx * 4] >= 128) continue;

      const queue: Array<[number, number]> = [[x, y]];
      visited[idx] = 1;
      let minX = x, maxX = x, minY = y, maxY = y;
      let count = 0;

      let head = 0;
      while (head < queue.length) {
        const [cx, cy] = queue[head++];
        count++;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors: Array<[number, number]> = [
          [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = getIdx(nx, ny);
            if (visited[nIdx] === 0 && data[nIdx * 4] < 128) {
              visited[nIdx] = 1;
              queue.push([nx, ny]);
            }
          }
        }
      }

      const compHeight = maxY - minY + 1;
      const compWidth = maxX - minX + 1;
      const isGiantContainer = compWidth > width * 0.45 && compHeight > height * 0.45;

      // Ignore noise specks, giant container components, and edge border artifacts
      if (compHeight >= height * 0.15 && compWidth >= 3 && count >= 10 && !isGiantContainer) {
        components.push({ minX, maxX, minY, maxY, pixelCount: count });
      }
    }
  }

  if (components.length === 0) return [];

  // Sort components left-to-right
  components.sort((a, b) => a.minX - b.minX);

  // Pass 2: Group components that overlap horizontally or are within a 4% width gap
  const maxGap = Math.max(4, width * 0.04);
  const groups: Array<{ minX: number; maxX: number; minY: number; maxY: number }> = [];

  for (const comp of components) {
    if (groups.length === 0) {
      groups.push({ minX: comp.minX, maxX: comp.maxX, minY: comp.minY, maxY: comp.maxY });
    } else {
      const last = groups[groups.length - 1];
      if (comp.minX <= last.maxX + maxGap) {
        last.maxX = Math.max(last.maxX, comp.maxX);
        last.minY = Math.min(last.minY, comp.minY);
        last.maxY = Math.max(last.maxY, comp.maxY);
      } else {
        groups.push({ minX: comp.minX, maxX: comp.maxX, minY: comp.minY, maxY: comp.maxY });
      }
    }
  }

  // Pass 3: Convert groups to DigitBounds and validate aspect ratios
  const bounds: DigitBounds[] = [];
  for (const g of groups) {
    const boxWidth = g.maxX - g.minX + 1;
    const boxHeight = g.maxY - g.minY + 1;
    const aspectRatio = boxHeight / boxWidth;

    if (boxHeight >= height * 0.20 && aspectRatio >= 0.5 && aspectRatio <= 4.5) {
      bounds.push({
        x: g.minX,
        y: g.minY,
        width: boxWidth,
        height: boxHeight,
      });
    }
  }

  return bounds;
}

// ---------------------------------------------------------------------------
// Segment sampling — test which segments are ON
// ---------------------------------------------------------------------------

interface SegmentSample {
  segmentStates: [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
  fillRatios: number[];
}

/**
 * Sample the 7 segments of a digit within its bounding box.
 *
 * Segment regions are defined as fractions of the bounding box:
 *
 *    ─── a ───         a: top horizontal
 *   |         |        b: top-right vertical
 *   f         b        c: bot-right vertical
 *   |         |        d: bottom horizontal
 *    ─── g ───         e: bot-left vertical
 *   |         |        f: top-left vertical
 *   e         c        g: middle horizontal
 *   |         |
 *    ─── d ───
 */
function sampleSegments(
  imageData: ImageData,
  bounds: DigitBounds,
): SegmentSample {
  const { x, y, width: w, height: h } = bounds;

  // Segment sampling regions as fractions of the digit bounding box.
  // [xFrac, yFrac, wFrac, hFrac]
  // These are tuned for typical 7-segment proportions.
  const segmentRegions: Array<[number, number, number, number]> = [
    // a: Top horizontal
    [0.20, 0.00, 0.60, 0.15],
    // b: Top-right vertical
    [0.70, 0.05, 0.30, 0.40],
    // c: Bot-right vertical
    [0.70, 0.55, 0.30, 0.40],
    // d: Bottom horizontal
    [0.20, 0.85, 0.60, 0.15],
    // e: Bot-left vertical
    [0.00, 0.55, 0.30, 0.40],
    // f: Top-left vertical
    [0.00, 0.05, 0.30, 0.40],
    // g: Middle horizontal
    [0.20, 0.42, 0.60, 0.16],
  ];

  const fillRatios: number[] = [];

  for (const [xf, yf, wf, hf] of segmentRegions) {
    const rx = x + xf * w;
    const ry = y + yf * h;
    const rw = wf * w;
    const rh = hf * h;

    const ratio = darkRatio(imageData, rx, ry, rw, rh);
    fillRatios.push(ratio);
  }

  // Adaptive ON/OFF threshold:
  // Instead of a fixed 0.25 threshold, calculate relative to the maximum fill ratio
  // in this digit. This dynamically adapts to thin LEDs, dim displays, or slanted fonts.
  const maxFill = Math.max(...fillRatios);
  const ON_THRESHOLD = Math.max(0.18, maxFill * 0.38);

  const segmentStates = fillRatios.map(r => r >= ON_THRESHOLD);

  return {
    segmentStates: segmentStates as [boolean, boolean, boolean, boolean, boolean, boolean, boolean],
    fillRatios,
  };
}

// ---------------------------------------------------------------------------
// Pattern matching — map segment states to a digit
// ---------------------------------------------------------------------------

interface DigitMatch {
  digit: string;
  confidence: number; // 0-100
  hammingDistance: number;
}

/**
 * Find the best matching digit for a given segment state.
 * Uses Hamming distance (number of differing segments).
 * Returns the best match and its confidence.
 */
function matchDigit(sample: SegmentSample): DigitMatch {
  let bestMatch: SegmentPattern = SEGMENT_PATTERNS[0];
  let bestDistance = 7; // worst case: all 7 segments differ

  for (const pattern of SEGMENT_PATTERNS) {
    let distance = 0;
    for (let i = 0; i < 7; i++) {
      if (sample.segmentStates[i] !== pattern.segments[i]) {
        distance++;
      }
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = pattern;
    }
  }

  // Confidence: 0 mismatch = 100%, 1 mismatch = 85%, 2 = 70%, etc.
  const confidence = Math.max(0, 100 - bestDistance * 15);

  return {
    digit: bestMatch.digit,
    confidence,
    hammingDistance: bestDistance,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SegmentMatchResult {
  /** Recognised digit string (e.g. "940") */
  text: string;
  /** Average confidence across all digits (0-100) */
  confidence: number;
  /** Number of digits detected */
  digitCount: number;
  /** Per-digit details for debugging */
  details: Array<{
    digit: string;
    confidence: number;
    bounds: DigitBounds;
    fillRatios: number[];
    segmentStates: boolean[];
  }>;
}

interface ComponentInfo {
  pixels: number[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  compWidth: number;
  compHeight: number;
  centerX: number;
  centerY: number;
}

/**
 * Remove outer border boxes / display frames that wrap around the screen.
 *
 * Uses two-pass Connected Component Analysis:
 *  - Pass 1: Extract all black connected components and their bounding boxes.
 *  - Pass 2: Erase any component that ENCLOSES other components (outer frame box),
 *            or spans >50% of the image, or touches outer margins, or is small noise.
 */
function removeBorderArtifacts(imageData: ImageData): void {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const getIdx = (x: number, y: number) => y * width + x;

  const components: ComponentInfo[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = getIdx(x, y);
      if (visited[idx] === 1 || data[idx * 4] >= 128) continue;

      const pixels: number[] = [];
      const queue: Array<[number, number]> = [[x, y]];
      visited[idx] = 1;

      let minX = x, maxX = x, minY = y, maxY = y;

      let head = 0;
      while (head < queue.length) {
        const [cx, cy] = queue[head++];
        const pixelIndex = getIdx(cx, cy);
        pixels.push(pixelIndex);

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors: Array<[number, number]> = [
          [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = getIdx(nx, ny);
            if (visited[nIdx] === 0 && data[nIdx * 4] < 128) {
              visited[nIdx] = 1;
              queue.push([nx, ny]);
            }
          }
        }
      }

      components.push({
        pixels,
        minX, maxX, minY, maxY,
        compWidth: maxX - minX + 1,
        compHeight: maxY - minY + 1,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      });
    }
  }

  // Determine which components are outer frames / border artifacts / noise
  const toErase = new Set<ComponentInfo>();

  for (const comp of components) {
    const touchesMargin = (comp.minX <= 8 || comp.maxX >= width - 9 || comp.minY <= 8 || comp.maxY >= height - 9);

    // Check if comp encloses any OTHER component's center
    const enclosesOther = components.some(other =>
      other !== comp &&
      other.pixels.length >= 10 &&
      other.centerX > comp.minX + 3 && other.centerX < comp.maxX - 3 &&
      other.centerY > comp.minY + 3 && other.centerY < comp.maxY - 3
    );

    const isLargeFrame = (comp.compWidth > width * 0.50 && comp.compHeight > height * 0.50);
    const isEdgeLine = touchesMargin && (comp.compWidth > width * 0.35 || comp.compHeight > height * 0.35);
    const isNoise = comp.pixels.length < 10;

    if (enclosesOther || isLargeFrame || isEdgeLine || isNoise) {
      toErase.add(comp);
    }
  }

  // Erase frame components to pure white
  for (const comp of toErase) {
    for (const pIdx of comp.pixels) {
      data[pIdx * 4] = 255;
      data[pIdx * 4 + 1] = 255;
      data[pIdx * 4 + 2] = 255;
    }
  }
}

/**
 * Recognise 7-segment digits from a preprocessed canvas.
 *
 * The canvas MUST be:
 *   - Inverted (dark digits on white background)
 *   - Thresholded (binary black/white)
 *
 * Returns null if no digits are found.
 */
export function recogniseSegments(canvas: HTMLCanvasElement): SegmentMatchResult | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Clean outer bezel frame / border boxes
  removeBorderArtifacts(imageData);
  ctx.putImageData(imageData, 0, 0);

  // Find digit boundaries
  const digitBounds = findDigitBounds(imageData);

  if (digitBounds.length === 0) {
    return null;
  }

  // Sort digits left-to-right
  digitBounds.sort((a, b) => a.x - b.x);

  // Sample and match each digit
  const details: SegmentMatchResult['details'] = [];
  let totalConfidence = 0;

  for (const bounds of digitBounds) {
    const sample = sampleSegments(imageData, bounds);
    const match = matchDigit(sample);

    details.push({
      digit: match.digit,
      confidence: match.confidence,
      bounds,
      fillRatios: sample.fillRatios,
      segmentStates: [...sample.segmentStates],
    });

    totalConfidence += match.confidence;
  }

  const text = details.map(d => d.digit).join('');
  const avgConfidence = totalConfidence / details.length;

  return {
    text,
    confidence: Math.round(avgConfidence * 10) / 10,
    digitCount: details.length,
    details,
  };
}
