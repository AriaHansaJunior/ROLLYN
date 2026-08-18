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
  { digit: '6', segments: [true,  false, true,  true,  true,  true,  true]  },
  { digit: '6', segments: [false, false, true,  true,  true,  true,  true]  },
  { digit: '7', segments: [true,  true,  true,  false, false, false, false] },
  { digit: '7', segments: [true,  true,  true,  false, false, true,  false] },
  { digit: '7', segments: [true,  true,  true,  true,  false, false, false] },
  { digit: '8', segments: [true,  true,  true,  true,  true,  true,  true]  },
  { digit: '9', segments: [true,  true,  true,  true,  false, true,  true]  },
  { digit: '9', segments: [true,  true,  true,  false, false, true,  true]  },
];

function getLuminance(imageData: ImageData, x: number, y: number): number {
  const idx = (y * imageData.width + x) * 4;
  return imageData.data[idx];
}

function darkRatio(
  imageData: ImageData,
  x: number, y: number, w: number, h: number,
): number {

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

interface DigitBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

      if (compHeight >= height * 0.15 && compWidth >= 3 && count >= 10 && !isGiantContainer) {
        components.push({ minX, maxX, minY, maxY, pixelCount: count });
      }
    }
  }

  if (components.length === 0) return [];

  components.sort((a, b) => a.minX - b.minX);

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

interface SegmentSample {
  segmentStates: [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
  fillRatios: number[];
}

function sampleSegments(
  imageData: ImageData,
  bounds: DigitBounds,
): SegmentSample {
  const { x, y, width: w, height: h } = bounds;

  const segmentRegions: Array<[number, number, number, number]> = [

    [0.20, 0.00, 0.60, 0.15],

    [0.70, 0.05, 0.30, 0.40],

    [0.70, 0.55, 0.30, 0.40],

    [0.20, 0.85, 0.60, 0.15],

    [0.00, 0.55, 0.30, 0.40],

    [0.00, 0.05, 0.30, 0.40],

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

  const maxFill = Math.max(...fillRatios);
  const ON_THRESHOLD = Math.max(0.18, maxFill * 0.38);

  const segmentStates = fillRatios.map(r => r >= ON_THRESHOLD);

  return {
    segmentStates: segmentStates as [boolean, boolean, boolean, boolean, boolean, boolean, boolean],
    fillRatios,
  };
}

interface DigitMatch {
  digit: string;
  confidence: number;
  hammingDistance: number;
}

function matchDigit(sample: SegmentSample): DigitMatch {
  let bestMatch: SegmentPattern = SEGMENT_PATTERNS[0];
  let bestDistance = 7;

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

  const confidence = Math.max(0, 100 - bestDistance * 15);

  return {
    digit: bestMatch.digit,
    confidence,
    hammingDistance: bestDistance,
  };
}

export interface SegmentMatchResult {

  text: string;

  confidence: number;

  digitCount: number;

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

  const toErase = new Set<ComponentInfo>();

  for (const comp of components) {
    const touchesMargin = (comp.minX <= 8 || comp.maxX >= width - 9 || comp.minY <= 8 || comp.maxY >= height - 9);

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

  for (const comp of toErase) {
    for (const pIdx of comp.pixels) {
      data[pIdx * 4] = 255;
      data[pIdx * 4 + 1] = 255;
      data[pIdx * 4 + 2] = 255;
    }
  }
}

export function recogniseSegments(canvas: HTMLCanvasElement): SegmentMatchResult | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  removeBorderArtifacts(imageData);
  ctx.putImageData(imageData, 0, 0);

  const digitBounds = findDigitBounds(imageData);

  if (digitBounds.length === 0) {
    return null;
  }

  digitBounds.sort((a, b) => a.x - b.x);

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
