export const TEMPLATE_WIDTH = 32;
export const TEMPLATE_HEIGHT = 48;

export interface StoredDigitTemplate {
  digit: string;
  pixelData: number[];
  sampleCount: number;
  updatedAt: string;
}

const STORAGE_KEY = 'rollyn_ocr_digit_templates_v1';

function generateDefaultTemplate(digit: string): number[] {
  const pixels = new Array(TEMPLATE_WIDTH * TEMPLATE_HEIGHT).fill(0);

  function drawHBar(yStart: number, height: number) {
    for (let y = yStart; y < yStart + height; y++) {
      for (let x = 6; x < TEMPLATE_WIDTH - 6; x++) {
        if (y >= 0 && y < TEMPLATE_HEIGHT) pixels[y * TEMPLATE_WIDTH + x] = 1;
      }
    }
  }

  function drawVBar(xStart: number, yStart: number, height: number) {
    for (let y = yStart; y < yStart + height; y++) {
      for (let x = xStart; x < xStart + 5; x++) {
        if (y >= 0 && y < TEMPLATE_HEIGHT && x >= 0 && x < TEMPLATE_WIDTH) {
          pixels[y * TEMPLATE_WIDTH + x] = 1;
        }
      }
    }
  }

  const a = ['0', '2', '3', '5', '6', '7', '8', '9'].includes(digit);
  const b = ['0', '1', '2', '3', '4', '7', '8', '9'].includes(digit);
  const c = ['0', '1', '3', '4', '5', '6', '7', '8', '9'].includes(digit);
  const d = ['0', '2', '3', '5', '6', '8', '9'].includes(digit);
  const e = ['0', '2', '6', '8'].includes(digit);
  const f = ['0', '4', '5', '6', '8', '9'].includes(digit);
  const g = ['2', '3', '4', '5', '6', '8', '9'].includes(digit);

  if (a) drawHBar(2, 5);
  if (b) drawVBar(TEMPLATE_WIDTH - 9, 5, 18);
  if (c) drawVBar(TEMPLATE_WIDTH - 9, 24, 19);
  if (d) drawHBar(TEMPLATE_HEIGHT - 7, 5);
  if (e) drawVBar(4, 24, 19);
  if (f) drawVBar(4, 5, 18);
  if (g) drawHBar(21, 5);

  return pixels;
}

function getDefaultTemplates(): Record<string, StoredDigitTemplate> {
  const store: Record<string, StoredDigitTemplate> = {};
  for (let i = 0; i <= 9; i++) {
    const digit = String(i);
    store[digit] = {
      digit,
      pixelData: generateDefaultTemplate(digit),
      sampleCount: 1,
      updatedAt: new Date().toISOString(),
    };
  }
  return store;
}

export function loadDigitTemplates(): Record<string, StoredDigitTemplate> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, StoredDigitTemplate>;

      const defaults = getDefaultTemplates();
      for (let i = 0; i <= 9; i++) {
        const d = String(i);
        if (!parsed[d] || !parsed[d].pixelData || parsed[d].pixelData.length !== TEMPLATE_WIDTH * TEMPLATE_HEIGHT) {
          parsed[d] = defaults[d];
        }
      }
      return parsed;
    }
  } catch (e) {
    console.warn('[DigitTemplateStore] Failed to load from localStorage:', e);
  }
  return getDefaultTemplates();
}

export function saveDigitTemplates(templates: Record<string, StoredDigitTemplate>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    console.debug('[DigitTemplateStore] Saved templates to localStorage');
  } catch (e) {
    console.warn('[DigitTemplateStore] Failed to save to localStorage:', e);
  }
}

export function resetDigitTemplates(): Record<string, StoredDigitTemplate> {
  localStorage.removeItem(STORAGE_KEY);
  return loadDigitTemplates();
}

export function normaliseDigitRegion(
  imageData: ImageData,
  x: number, y: number, w: number, h: number,
): number[] {
  const output = new Array(TEMPLATE_WIDTH * TEMPLATE_HEIGHT).fill(0);
  const srcWidth = imageData.width;

  for (let ty = 0; ty < TEMPLATE_HEIGHT; ty++) {
    for (let tx = 0; tx < TEMPLATE_WIDTH; tx++) {

      const sx = Math.floor(x + (tx / TEMPLATE_WIDTH) * w);
      const sy = Math.floor(y + (ty / TEMPLATE_HEIGHT) * h);

      if (sx >= 0 && sx < srcWidth && sy >= 0 && sy < imageData.height) {
        const idx = (sy * srcWidth + sx) * 4;
        const luminance = imageData.data[idx];

        if (luminance < 128) {
          output[ty * TEMPLATE_WIDTH + tx] = 1;
        }
      }
    }
  }

  return output;
}

export function calibrateDigitTemplate(digit: string, pixelData: number[]): void {
  if (pixelData.length !== TEMPLATE_WIDTH * TEMPLATE_HEIGHT) return;
  const templates = loadDigitTemplates();
  const existing = templates[digit];

  if (!existing || existing.sampleCount <= 1) {

    templates[digit] = {
      digit,
      pixelData: [...pixelData],
      sampleCount: (existing?.sampleCount ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
  } else {

    const blended = existing.pixelData.map((val, idx) => {
      const newVal = pixelData[idx];
      const averaged = (val * existing.sampleCount + newVal) / (existing.sampleCount + 1);
      return averaged >= 0.4 ? 1 : 0;
    });

    templates[digit] = {
      digit,
      pixelData: blended,
      sampleCount: existing.sampleCount + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  saveDigitTemplates(templates);
}
