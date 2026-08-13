/**
 * ============================================================
 * OCR/DigitTemplateStore.ts
 * ============================================================
 * Manages user-calibrated 7-segment digit reference templates.
 *
 * HOW IT WORKS:
 *   1. Normalises digit images to a standard 32x48 pixel grid.
 *   2. Stores binary pixel masks for digits '0' through '9' in localStorage.
 *   3. If the user calibrates their scale font by typing the true weight
 *      (e.g., "779"), the exact pixel shape of their scale's '7' and '9'
 *      is saved as the primary reference template.
 *   4. Template matching against the user's calibrated scale font
 *      yields near-100% accuracy because it matches their physical scale.
 *
 * PORTABILITY:
 *   Zero external dependencies. Fully offline.
 * ============================================================
 */

export const TEMPLATE_WIDTH = 32;
export const TEMPLATE_HEIGHT = 48;

export interface StoredDigitTemplate {
  digit: string;             // '0', '1', ..., '9'
  pixelData: number[];       // 32x48 binary array (1 = dark/ink, 0 = background)
  sampleCount: number;       // How many times this template was updated
  updatedAt: string;         // ISO timestamp
}

const STORAGE_KEY = 'rollyn_ocr_digit_templates_v1';

// ---------------------------------------------------------------------------
// Built-in Default 7-Segment Patterns (32x48 grid)
// ---------------------------------------------------------------------------

function generateDefaultTemplate(digit: string): number[] {
  const pixels = new Array(TEMPLATE_WIDTH * TEMPLATE_HEIGHT).fill(0);

  // Helper to draw horizontal bar
  function drawHBar(yStart: number, height: number) {
    for (let y = yStart; y < yStart + height; y++) {
      for (let x = 6; x < TEMPLATE_WIDTH - 6; x++) {
        if (y >= 0 && y < TEMPLATE_HEIGHT) pixels[y * TEMPLATE_WIDTH + x] = 1;
      }
    }
  }

  // Helper to draw vertical bar
  function drawVBar(xStart: number, yStart: number, height: number) {
    for (let y = yStart; y < yStart + height; y++) {
      for (let x = xStart; x < xStart + 5; x++) {
        if (y >= 0 && y < TEMPLATE_HEIGHT && x >= 0 && x < TEMPLATE_WIDTH) {
          pixels[y * TEMPLATE_WIDTH + x] = 1;
        }
      }
    }
  }

  // Standard 7 segments
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

/** Get default built-in templates for all digits 0-9 */
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

// ---------------------------------------------------------------------------
// Store Operations
// ---------------------------------------------------------------------------

/** Load all digit templates (from localStorage or defaults) */
export function loadDigitTemplates(): Record<string, StoredDigitTemplate> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, StoredDigitTemplate>;
      // Ensure all digits 0-9 are present
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

/** Save updated templates to localStorage */
export function saveDigitTemplates(templates: Record<string, StoredDigitTemplate>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    console.debug('[DigitTemplateStore] Saved templates to localStorage');
  } catch (e) {
    console.warn('[DigitTemplateStore] Failed to save to localStorage:', e);
  }
}

/** Reset templates back to default */
export function resetDigitTemplates(): Record<string, StoredDigitTemplate> {
  localStorage.removeItem(STORAGE_KEY);
  return loadDigitTemplates();
}

/**
 * Normalise a digit image region from a ImageData/Canvas to 32x48 binary array.
 */
export function normaliseDigitRegion(
  imageData: ImageData,
  x: number, y: number, w: number, h: number,
): number[] {
  const output = new Array(TEMPLATE_WIDTH * TEMPLATE_HEIGHT).fill(0);
  const srcWidth = imageData.width;

  for (let ty = 0; ty < TEMPLATE_HEIGHT; ty++) {
    for (let tx = 0; tx < TEMPLATE_WIDTH; tx++) {
      // Map template coordinate (tx, ty) back to source region (sx, sy)
      const sx = Math.floor(x + (tx / TEMPLATE_WIDTH) * w);
      const sy = Math.floor(y + (ty / TEMPLATE_HEIGHT) * h);

      if (sx >= 0 && sx < srcWidth && sy >= 0 && sy < imageData.height) {
        const idx = (sy * srcWidth + sx) * 4;
        const luminance = imageData.data[idx];
        // Dark pixel (< 128) is ink
        if (luminance < 128) {
          output[ty * TEMPLATE_WIDTH + tx] = 1;
        }
      }
    }
  }

  return output;
}

/**
 * Save a newly calibrated digit template from user input.
 */
export function calibrateDigitTemplate(digit: string, pixelData: number[]): void {
  if (pixelData.length !== TEMPLATE_WIDTH * TEMPLATE_HEIGHT) return;
  const templates = loadDigitTemplates();
  const existing = templates[digit];

  if (!existing || existing.sampleCount <= 1) {
    // Overwrite with exact user sample
    templates[digit] = {
      digit,
      pixelData: [...pixelData],
      sampleCount: (existing?.sampleCount ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
  } else {
    // Average blending with existing template
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
