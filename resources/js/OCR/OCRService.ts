/**
 * ============================================================
 * OCR/OCRService.ts
 * ============================================================
 * Tesseract.js wrapper for weighing-scale numeric recognition.
 *
 * KEY DESIGN DECISIONS:
 *  - All Tesseract resources (worker, WASM, lang-data) are loaded
 *    from /tesseract/ — the project's own public directory.
 *    No CDN. No external download. Works fully OFFLINE.
 *  - Character whitelist: 0–9, . and , only.
 *  - Page-segmentation mode 7 (single text line).
 *  - Multiple preprocessing variants are tested; best result wins.
 *  - Weight normalisation is strict: 1.900 → 1900, never 1.9.
 *  - Error diagnosis is derived from image-quality signals only.
 *
 * PORTABILITY:
 *   This file has ZERO dependency on IncomingRoll business logic.
 *   Copy the OCR/ folder to any other project; adjust variable names.
 * ============================================================
 */

// tesseract.js uses `export = Tesseract` so we must use this import style:
import Tesseract = require('tesseract.js');
import type { ImageQualityReport } from './ImageProcessor';
import type { PreprocessedVariant } from './ImageProcessor';

// ---------------------------------------------------------------------------
// Tesseract local resource paths (served from public/tesseract/)
// ---------------------------------------------------------------------------

/** Build an absolute URL relative to the current origin. */
function localAsset(path: string): string {
  return `${window.location.origin}/tesseract/${path}`;
}

/**
 * Tesseract.js worker configuration pointing entirely to local assets.
 *
 * HOW THIS WORKS:
 *   public/tesseract/worker.min.js          → workerPath
 *   public/tesseract/                       → corePath  (picks simd/wasm automatically)
 *   public/tesseract/lang-data/             → langPath
 *
 * The browser never contacts an external server.
 */
function buildLocalOptions(): Partial<Tesseract.WorkerOptions> {
  return {
    workerPath: localAsset('worker.min.js'),
    corePath:   localAsset(''),
    langPath:   localAsset('lang-data'),
    logger: () => {},   // suppress verbose Tesseract console output
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OcrStatus = 'idle' | 'processing' | 'success' | 'error';

export interface OcrResult {
  /** The normalised numeric weight value (e.g. 1900) */
  weight: number;
  /** Display-formatted weight string (e.g. "1,900") */
  weightDisplay: string;
  /** OCR confidence 0–100 */
  confidence: number;
  /** Which preprocessing variant produced this result */
  variantLabel: string;
  /** Raw OCR text before normalisation */
  rawText: string;
}

export interface OcrError {
  /** Short title for the UI */
  title: string;
  /** Detailed, system-generated human-readable message */
  message: string;
}

// ---------------------------------------------------------------------------
// Internal — weight normalisation
// ---------------------------------------------------------------------------

/**
 * Determine if a separator (. or ,) in a raw OCR string is a thousands
 * separator rather than a decimal point.
 *
 * RULE (deterministic):
 *   A separator is a THOUSANDS separator when:
 *     - Exactly 3 digits follow it  AND
 *     - The part before it is 1–4 digits (i.e. in the range 1–9999)
 *
 * This correctly handles:
 *   1.900   → 1900   (thousands sep — 3 digits after)
 *   1,900   → 1900   (thousands sep — 3 digits after)
 *   1.9     → 1.9    (decimal       — fewer than 3 digits after)
 *   10.500  → 10500  (thousands sep)
 *   1000    → 1000   (no separator)
 */
function normaliseWeight(raw: string): number | null {
  // Strip everything that is not a digit, dot, or comma
  const cleaned = raw.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return null;

  // Split into alternating chunks of digits and separators
  const parts = cleaned.split(/([.,])/);

  let integerPart = '';
  let decimalPart = '';
  let foundDecimal = false;

  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i];
    if (!chunk) continue;

    if (chunk === '.' || chunk === ',') {
      // Look ahead: how many digits follow this separator?
      const nextDigits = parts[i + 1] ?? '';
      if (!foundDecimal && nextDigits.length === 3) {
        // Thousands separator — skip it
        continue;
      } else {
        // Decimal separator
        foundDecimal = true;
        continue;
      }
    } else {
      if (foundDecimal) {
        decimalPart += chunk;
      } else {
        integerPart += chunk;
      }
    }
  }

  if (!integerPart) return null;

  const numStr = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  const num = parseFloat(numStr);
  return isNaN(num) ? null : num;
}

/**
 * Format a numeric weight for display (e.g. 1900 → "1,900").
 */
function formatWeight(weight: number): string {
  return weight.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

// ---------------------------------------------------------------------------
// Internal — extract best numeric token from an OCR string
// ---------------------------------------------------------------------------

/**
 * Extract all plausible weight tokens from raw OCR text and return the
 * one that looks most like a weighing-scale reading.
 */
function extractWeightToken(text: string): string | null {
  // Remove obvious non-numeric noise but keep digits, dots, commas, spaces
  const sanitised = text.replace(/[^0-9.,\s]/g, ' ');

  // Match numeric tokens that look like weighing values
  const tokenRegex = /\d{1,4}([.,]\d{3})*([.,]\d{1,2})?/g;
  const matches = sanitised.match(tokenRegex);
  if (!matches || matches.length === 0) return null;

  // Pick the longest match (most specific)
  return matches.reduce((best, m) => (m.length >= best.length ? m : best), '');
}

// ---------------------------------------------------------------------------
// Internal — error diagnosis
// ---------------------------------------------------------------------------

function diagnoseError(quality: ImageQualityReport, rawOcrText: string): OcrError {
  const trimmedText = rawOcrText.trim();

  if (quality.tooDark) {
    return {
      title: 'Weighing Display Too Dark',
      message:
        'The weighing display is too dark to be recognized. ' +
        'Ensure the scale display is illuminated and try again.',
    };
  }

  if (quality.tooLight) {
    return {
      title: 'Weighing Display Overexposed',
      message:
        'The weighing display is overexposed and cannot be read clearly. ' +
        'Reduce ambient lighting or reposition the camera.',
    };
  }

  if (quality.likelyBlurry) {
    return {
      title: 'Captured Image Too Blurry',
      message:
        'The captured image appears too blurry to recognize the weighing display. ' +
        'Hold the camera steady and ensure the lens is clean.',
    };
  }

  if (trimmedText.length < 2 && quality.sharpnessScore > 5) {
    return {
      title: 'Weighing Display Too Small',
      message:
        'The weighing display is too small or distant in the captured image. ' +
        'Move the camera closer to the scale display.',
    };
  }

  return {
    title: 'No Number Detected',
    message:
      'No number was detected in the captured image. ' +
      'Ensure the weighing display is clearly visible and well-lit, then try again.',
  };
}

// ---------------------------------------------------------------------------
// OCR Worker Singleton
// ---------------------------------------------------------------------------

let workerInstance: Tesseract.Worker | null = null;
let workerInitialising = false;
let workerReady = false;

/**
 * Get (or create) the shared Tesseract.js worker.
 * Reused across captures — creating a new worker per capture is expensive.
 */
async function getWorker(): Promise<Tesseract.Worker> {
  if (workerReady && workerInstance) return workerInstance;

  if (workerInitialising) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (workerReady && workerInstance) {
          clearInterval(interval);
          resolve(workerInstance!);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Tesseract worker initialisation timed out.'));
      }, 30_000);
    });
  }

  workerInitialising = true;

  try {
    // Pass InitOptions (load_system_dawg etc.) as the 4th argument to createWorker
    // so they are applied during lang init — not via setParameters.
    const worker = await Tesseract.createWorker(
      'eng',
      Tesseract.OEM.LSTM_ONLY,
      buildLocalOptions(),
      {
        load_system_dawg: '0',
        load_freq_dawg: '0',
      } as Partial<Tesseract.InitOptions>,
    );

    // PSM.SINGLE_LINE = '7'
    // WorkerParams.tessedit_pageseg_mode expects PSM enum value
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
      tessedit_char_whitelist: '0123456789.,',
    });

    workerInstance = worker;
    workerReady = true;
    workerInitialising = false;
    return worker;
  } catch (err) {
    workerInitialising = false;
    throw err;
  }
}

/**
 * Pre-initialise the worker in the background.
 * Call this when the page loads so the worker is ready before first capture.
 */
export async function initOCRWorker(): Promise<void> {
  try {
    await getWorker();
  } catch (err) {
    console.warn('[OCR] Worker pre-init failed:', err);
  }
}

/**
 * Terminate the OCR worker and release all resources.
 * Call this when leaving the Incoming Roll page.
 */
export async function terminateOCRWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
    workerReady = false;
    workerInitialising = false;
  }
}

// ---------------------------------------------------------------------------
// Public API — run multi-pass OCR
// ---------------------------------------------------------------------------

/**
 * Run OCR against all preprocessing variants and return the best result.
 *
 * "Best" = highest confidence + valid numeric pattern.
 * If no variant produces a valid numeric result, returns an OcrError.
 */
export async function recogniseWeight(
  variants: PreprocessedVariant[],
  quality: ImageQualityReport,
): Promise<{ result: OcrResult } | { error: OcrError }> {

  let worker: Tesseract.Worker;
  try {
    worker = await getWorker();
  } catch {
    return {
      error: {
        title: 'OCR Engine Not Ready',
        message:
          'The local OCR engine could not be initialised. ' +
          'Please refresh the page and try again.',
      },
    };
  }

  interface Candidate {
    weight: number;
    confidence: number;
    rawText: string;
    variantLabel: string;
  }

  const candidates: Candidate[] = [];

  for (const variant of variants) {
    try {
      const { data } = await worker.recognize(variant.dataUrl);
      const rawText = data.text ?? '';
      const confidence = data.confidence ?? 0;

      const token = extractWeightToken(rawText);
      if (!token) continue;

      const weight = normaliseWeight(token);
      if (weight === null || weight <= 0) continue;

      // Sanity-check: weighing scale values expected in range 1 – 99999 kg
      if (weight < 1 || weight > 99_999) continue;

      candidates.push({ weight, confidence, rawText: rawText.trim(), variantLabel: variant.label });
    } catch {
      continue;
    }
  }

  if (candidates.length === 0) {
    return { error: diagnoseError(quality, '') };
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  // Prefer a candidate that appears more than once (consistency bonus)
  const weightCounts = new Map<number, number>();
  for (const c of candidates) {
    const key = Math.round(c.weight);
    weightCounts.set(key, (weightCounts.get(key) ?? 0) + 1);
  }
  const mostConsistent = candidates
    .slice()
    .sort((a, b) => {
      const countA = weightCounts.get(Math.round(a.weight)) ?? 0;
      const countB = weightCounts.get(Math.round(b.weight)) ?? 0;
      if (countB !== countA) return countB - countA;
      return b.confidence - a.confidence;
    })[0];

  return {
    result: {
      weight: mostConsistent.weight,
      weightDisplay: formatWeight(mostConsistent.weight),
      confidence: Math.round(mostConsistent.confidence * 10) / 10,
      variantLabel: mostConsistent.variantLabel,
      rawText: mostConsistent.rawText,
    },
  };
}
