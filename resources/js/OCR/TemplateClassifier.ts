import {
  loadDigitTemplates,
  normaliseDigitRegion,
  TEMPLATE_WIDTH,
  TEMPLATE_HEIGHT,
  StoredDigitTemplate,
} from './DigitTemplateStore';

export interface TemplateMatchDetails {
  digit: string;
  confidence: number;
  matchScore: number;
}

export interface TemplateMatchResult {
  text: string;
  confidence: number;
  digitCount: number;
  details: TemplateMatchDetails[];
}

function computeSimilarity(a: number[], b: number[]): number {
  let intersection = 0;
  let union = 0;
  let matches = 0;
  const total = a.length;

  for (let i = 0; i < total; i++) {
    const valA = a[i];
    const valB = b[i];

    if (valA === 1 && valB === 1) intersection++;
    if (valA === 1 || valB === 1) union++;
    if (valA === valB) matches++;
  }

  const iou = union === 0 ? 1 : intersection / union;
  const hamming = matches / total;

  return 0.7 * iou + 0.3 * hamming;
}

function classifyDigit(
  pixelData: number[],
  templates: Record<string, StoredDigitTemplate>,
): TemplateMatchDetails {
  let bestDigit = '0';
  let bestScore = -1;

  for (let i = 0; i <= 9; i++) {
    const digit = String(i);
    const tmpl = templates[digit];
    if (!tmpl) continue;

    const score = computeSimilarity(pixelData, tmpl.pixelData);

    const calibratedBonus = tmpl.sampleCount > 1 ? 0.05 : 0;
    const finalScore = score + calibratedBonus;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestDigit = digit;
    }
  }

  const confidence = Math.min(100, Math.max(0, Math.round(bestScore * 100)));

  return {
    digit: bestDigit,
    confidence,
    matchScore: bestScore,
  };
}

export function classifyWithTemplates(canvas: HTMLCanvasElement): TemplateMatchResult | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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

  if (components.length === 0) return null;

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

  const templates = loadDigitTemplates();
  const details: TemplateMatchDetails[] = [];
  let totalConfidence = 0;

  for (const g of groups) {
    const regWidth = g.maxX - g.minX + 1;
    const regHeight = g.maxY - g.minY + 1;
    const aspectRatio = regHeight / regWidth;

    if (regHeight < height * 0.18 || aspectRatio < 0.5 || aspectRatio > 4.5) {
      continue;
    }

    const pixelData = normaliseDigitRegion(imageData, g.minX, g.minY, regWidth, regHeight);
    const match = classifyDigit(pixelData, templates);
    details.push(match);
    totalConfidence += match.confidence;
  }

  if (details.length === 0) return null;

  const text = details.map(d => d.digit).join('');
  const avgConfidence = Math.round(totalConfidence / details.length);

  return {
    text,
    confidence: avgConfidence,
    digitCount: details.length,
    details,
  };
}
