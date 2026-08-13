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

// Named imports from tesseract.js for Vite CJS/ESM interop compatibility
import { createWorker, OEM, PSM } from 'tesseract.js';
import type { ImageQualityReport } from './ImageProcessor';
import type { PreprocessedVariant } from './ImageProcessor';
import { recogniseSegments } from './SegmentMatcher';
import { classifyWithTemplates } from './TemplateClassifier';
import { calibrateDigitTemplate, normaliseDigitRegion } from './DigitTemplateStore';

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
function buildLocalOptions() {
  return {
    workerPath: localAsset('worker.min.js'),
    corePath:   localAsset(''),
    langPath:   localAsset('lang-data'),
    logger: () => {},   // suppress verbose Tesseract console output
    // Local language data in this repo is stored as plain `.traineddata` files.
    // Disable gzip so Tesseract requests `eng.traineddata` (not `.gz`).
    gzip: false,
    // Tesseract initialization options for digit-only recognition
    load_system_dawg: '0',
    load_freq_dawg: '0',
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
  /** The data-URL of the preprocessed image that won */
  variantDataUrl: string;
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
 * Correct common OCR misreadings specific to 7-segment digital displays.
 * Mapping of commonly confused characters to their likely correct digit.
 *
 * Examples:
 *   'O' (letter) is often '0' (digit)
 *   'I' (letter) is often '1' (digit)
 *   'l' (lowercase L) is often '1' (digit)
 *   'S' (letter) is often '5' (digit)
 */
function correctCommonMisreadings(text: string): string {
  const corrections: Record<string, string> = {
    'O': '0',  // letter O → digit 0
    'o': '0',  // lowercase o → digit 0
    'I': '1',  // capital I → digit 1
    'l': '1',  // lowercase L → digit 1
    'S': '5',  // letter S → digit 5
    'B': '8',  // letter B → digit 8
    'Z': '2',  // letter Z → digit 2
  };

  let corrected = text;
  for (const [wrong, right] of Object.entries(corrections)) {
    corrected = corrected.replaceAll(wrong, right);
  }
  return corrected;
}

/**
 * Extract all plausible weight tokens from raw OCR text and return the
 * one that looks most like a weighing-scale reading.
 */
function extractWeightToken(text: string): string | null {
  // Apply common character corrections first
  const corrected = correctCommonMisreadings(text);

  // Remove obvious non-numeric noise but keep digits, dots, commas, spaces
  const sanitised = corrected.replace(/[^0-9.,\s]/g, ' ');

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
// OCR Worker Management — Dual Engine Architecture
// ---------------------------------------------------------------------------
// 
// Worker 1: eng + LSTM — for printed text / labels / handwriting
// Worker 2: letsgodigital + Legacy — specifically trained on 7-segment displays
//
// Both workers process all variants in parallel. The best result wins.
// ---------------------------------------------------------------------------

interface WorkerState {
  instance: any;
  ready: boolean;
  initialising: boolean;
  failed: boolean;
}

const engWorker: WorkerState = { instance: null, ready: false, initialising: false, failed: false };
const digitalWorker: WorkerState = { instance: null, ready: false, initialising: false, failed: false };

/**
 * Create or retrieve the English LSTM worker.
 */
async function getEngWorker(): Promise<any> {
  if (engWorker.ready && engWorker.instance) return engWorker.instance;
  if (engWorker.failed) throw new Error('eng worker previously failed');

  if (engWorker.initialising) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (engWorker.ready && engWorker.instance) {
          clearInterval(interval);
          resolve(engWorker.instance);
        }
        if (engWorker.failed) {
          clearInterval(interval);
          reject(new Error('eng worker failed'));
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('eng worker timed out'));
      }, 30_000);
    });
  }

  engWorker.initialising = true;
  try {
    const worker = await createWorker('eng', OEM.LSTM_ONLY, buildLocalOptions());
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      tessedit_char_whitelist: '0123456789.,OoIlSBZ',
    });
    engWorker.instance = worker;
    engWorker.ready = true;
    engWorker.initialising = false;
    return worker;
  } catch (err) {
    engWorker.initialising = false;
    engWorker.failed = true;
    throw err;
  }
}

/**
 * Create or retrieve the letsgodigital Legacy worker.
 * This model was specifically trained on 7-segment digital display fonts.
 * It uses the LEGACY Tesseract engine (OEM.TESSERACT_ONLY), not LSTM.
 */
async function getDigitalWorker(): Promise<any> {
  if (digitalWorker.ready && digitalWorker.instance) return digitalWorker.instance;
  if (digitalWorker.failed) throw new Error('digital worker previously failed');

  if (digitalWorker.initialising) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (digitalWorker.ready && digitalWorker.instance) {
          clearInterval(interval);
          resolve(digitalWorker.instance);
        }
        if (digitalWorker.failed) {
          clearInterval(interval);
          reject(new Error('digital worker failed'));
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('digital worker timed out'));
      }, 30_000);
    });
  }

  digitalWorker.initialising = true;
  try {
    const worker = await createWorker(
      'letsgodigital',
      OEM.TESSERACT_ONLY,
      buildLocalOptions(),
    );
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      tessedit_char_whitelist: '0123456789.',
    });
    digitalWorker.instance = worker;
    digitalWorker.ready = true;
    digitalWorker.initialising = false;
    return worker;
  } catch (err) {
    console.warn('[OCR] letsgodigital worker failed to init (legacy engine may not be available):', err);
    digitalWorker.initialising = false;
    digitalWorker.failed = true;
    throw err;
  }
}

/**
 * Pre-initialise both workers in the background.
 * Call this when the page loads so the workers are ready before first capture.
 */
export async function initOCRWorker(): Promise<void> {
  // Init both in parallel — if digital fails, that's OK, we still have eng
  await Promise.allSettled([
    getEngWorker().catch(err => console.warn('[OCR] eng worker pre-init failed:', err)),
    getDigitalWorker().catch(err => console.warn('[OCR] digital worker pre-init failed:', err)),
  ]);
}

/**
 * Terminate all OCR workers and release all resources.
 * Call this when leaving the Incoming Roll page.
 */
export async function terminateOCRWorker(): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (engWorker.instance) {
    tasks.push(engWorker.instance.terminate());
    engWorker.instance = null;
    engWorker.ready = false;
    engWorker.initialising = false;
    engWorker.failed = false;
  }
  if (digitalWorker.instance) {
    tasks.push(digitalWorker.instance.terminate());
    digitalWorker.instance = null;
    digitalWorker.ready = false;
    digitalWorker.initialising = false;
    digitalWorker.failed = false;
  }
  await Promise.allSettled(tasks);
}

// ---------------------------------------------------------------------------
// Public API — run multi-pass OCR (dual engine)
// ---------------------------------------------------------------------------

/**
 * Run a single worker against a list of variants and collect candidates.
 */
async function runWorkerOnVariants(
  worker: any,
  variants: PreprocessedVariant[],
  engineLabel: string,
): Promise<{
  candidates: Array<{
    weight: number;
    confidence: number;
    rawText: string;
    variantLabel: string;
    variantDataUrl: string;
  }>;
  attempts: Array<{ label: string; text: string; confidence: number; engine: string }>;
}> {
  const candidates: Array<{
    weight: number;
    confidence: number;
    rawText: string;
    variantLabel: string;
    variantDataUrl: string;
  }> = [];
  const attempts: Array<{ label: string; text: string; confidence: number; engine: string }> = [];

  for (const variant of variants) {
    try {
      const { data } = await worker.recognize(variant.dataUrl);
      const rawText = data.text ?? '';
      const confidence = data.confidence ?? 0;

      attempts.push({ label: variant.label, text: rawText, confidence, engine: engineLabel });

      const token = extractWeightToken(rawText);
      if (!token) continue;

      const weight = normaliseWeight(token);
      if (weight === null || weight <= 0) continue;

      // Sanity-check: weighing scale values expected in range 1 – 99999 kg
      if (weight < 1 || weight > 99_999) continue;

      candidates.push({
        weight,
        confidence,
        rawText: rawText.trim(),
        variantLabel: `[${engineLabel}] ${variant.label}`,
        variantDataUrl: variant.dataUrl,
      });
    } catch {
      continue;
    }
  }

  return { candidates, attempts };
}

/**
 * Run OCR against all preprocessing variants using BOTH engines and return the best result.
 *
 * "Best" = highest confidence + consistency across variants.
 * If no variant produces a valid numeric result, returns an OcrError.
 */
export async function recogniseWeight(
  variants: PreprocessedVariant[],
  quality: ImageQualityReport,
): Promise<{ result: OcrResult } | { error: OcrError }> {

  // Collect available workers
  const workerTasks: Promise<{
    candidates: Array<{
      weight: number;
      confidence: number;
      rawText: string;
      variantLabel: string;
      variantDataUrl: string;
    }>;
    attempts: Array<{ label: string; text: string; confidence: number; engine: string }>;
  }>[] = [];

  // Try eng worker — only on standard (non-digital) variants
  const standardVariants = variants.filter(v => !v.digital);
  try {
    const ew = await getEngWorker();
    if (standardVariants.length > 0) {
      workerTasks.push(runWorkerOnVariants(ew, standardVariants, 'ENG'));
    }
  } catch {
    console.warn('[OCR] eng worker not available');
  }

  // Try digital worker — only on digital-optimised variants (F, I, J, K)
  const digitalVariants = variants.filter(v => v.digital);
  try {
    const dw = await getDigitalWorker();
    if (digitalVariants.length > 0) {
      workerTasks.push(runWorkerOnVariants(dw, digitalVariants, 'DIGITAL'));
    }
  } catch {
    console.warn('[OCR] digital worker not available, running with eng only');
  }

  if (workerTasks.length === 0) {
    return {
      error: {
        title: 'OCR Engine Not Ready',
        message:
          'No OCR engine could be initialised. ' +
          'Please refresh the page and try again.',
      },
    };
  }

  // Run all workers (sequentially since they share the WASM thread)
  const results = await Promise.all(workerTasks);
  const allCandidates = results.flatMap(r => r.candidates);
  const allAttempts = results.flatMap(r => r.attempts);

  // -------------------------------------------------------------------------
  // Deterministic 7-Segment Matcher Pass (Pure pixel sampling)
  // -------------------------------------------------------------------------
  for (const variant of digitalVariants) {
    if (!variant.canvas) continue;
    try {
      const match = recogniseSegments(variant.canvas);
      if (match && match.text) {
        const token = extractWeightToken(match.text);
        if (token) {
          const weight = normaliseWeight(token);
          if (weight !== null && weight >= 1 && weight <= 99_999) {
            allCandidates.push({
              weight,
              confidence: match.confidence,
              rawText: match.text,
              variantLabel: `[SEGMENT-MATCHER] ${variant.label}`,
              variantDataUrl: variant.dataUrl,
            });
            allAttempts.push({
              label: variant.label,
              text: match.text,
              confidence: match.confidence,
              engine: 'SEGMENT-MATCHER',
            });
          }
        }
      }
    } catch (err) {
      console.warn('[OCR] SegmentMatcher failed for variant:', variant.label, err);
    }
  }

  // -------------------------------------------------------------------------
  // Calibrated Template Classifier Pass (Structural IoU matching)
  // -------------------------------------------------------------------------
  for (const variant of digitalVariants) {
    if (!variant.canvas) continue;
    try {
      const match = classifyWithTemplates(variant.canvas);
      if (match && match.text) {
        const token = extractWeightToken(match.text);
        if (token) {
          const weight = normaliseWeight(token);
          if (weight !== null && weight >= 1 && weight <= 99_999) {
            allCandidates.push({
              weight,
              confidence: match.confidence,
              rawText: match.text,
              variantLabel: `[TEMPLATE-CLASSIFIER] ${variant.label}`,
              variantDataUrl: variant.dataUrl,
            });
            allAttempts.push({
              label: variant.label,
              text: match.text,
              confidence: match.confidence,
              engine: 'TEMPLATE-CLASSIFIER',
            });
          }
        }
      }
    } catch (err) {
      console.warn('[OCR] TemplateClassifier failed for variant:', variant.label, err);
    }
  }

  // Debug: log all attempts
  console.debug('[OCR] All recognition attempts:', allAttempts);
  console.debug('[OCR] Valid candidates:', allCandidates);

  if (allCandidates.length === 0) {
    return { error: diagnoseError(quality, '') };
  }

  // -------------------------------------------------------------------------
  // Smart candidate selection
  // -------------------------------------------------------------------------
  // Composite SCORE per candidate:
  //   score = (digitCount * 1000)          ← base points for digit count
  //         + (consistency * 800)         ← CONSENSUS BONUS: variants agreeing on same number win
  //         + (isDigital ? 300 : 0)       ← digital engine preference
  //         + (highConfidenceSegmentMatcher ? 300 : 0)
  //         + confidence                    ← tiebreaker (0-100)
  // -------------------------------------------------------------------------

  // Count how many digits each weight value has
  function digitCount(weight: number): number {
    return Math.floor(weight).toString().length;
  }

  // Count consistency (how many times the same weight appears across all passes)
  const weightCounts = new Map<number, number>();
  for (const c of allCandidates) {
    const key = Math.round(c.weight);
    weightCounts.set(key, (weightCounts.get(key) ?? 0) + 1);
  }

  // Score each candidate
  const scored = allCandidates.map(c => {
    const digits = digitCount(c.weight);
    const isSegmentMatcher = (c.variantLabel.startsWith('[SEGMENT-MATCHER]') || c.variantLabel.startsWith('[TEMPLATE-CLASSIFIER]')) ? 1 : 0;
    const isDigital = (c.variantLabel.startsWith('[DIGITAL]') || isSegmentMatcher) ? 1 : 0;
    const consistency = weightCounts.get(Math.round(c.weight)) ?? 0;

    // SegmentMatcher / TemplateClassifier bonus when confidence is high
    const segmentBonus = (isSegmentMatcher && c.confidence >= 80) ? 300 : 0;

    const score =
      (digits * 1000) +           // A 3-digit number gets 3000, a 1-digit gets 1000
      (consistency * 800) +       // Consensus: each variant that agrees adds +800
      (isDigital * 300) +         // Digital engine bonus
      segmentBonus +              // High-confidence Classifier bonus
      c.confidence;                // Confidence (0-100) as final tiebreaker

    return { ...c, score };
  });

  // Sort by score descending — highest score wins
  scored.sort((a, b) => b.score - a.score);

  console.debug('[OCR] Scored candidates:', scored.map(s => ({
    weight: s.weight,
    score: s.score,
    variant: s.variantLabel,
    confidence: s.confidence,
  })));

  const winner = scored[0];

  return {
    result: {
      weight: winner.weight,
      weightDisplay: formatWeight(winner.weight),
      confidence: winner.confidence,
      variantLabel: winner.variantLabel,
      variantDataUrl: winner.variantDataUrl,
      rawText: winner.rawText,
    },
  };
}

/**
 * Calibrate digit shapes for the scale font using user-confirmed true weight string.
 * Call this whenever a weight is confirmed or manually saved.
 */
export function calibrateScaleFont(canvas: HTMLCanvasElement, trueWeightText: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height } = imageData;

  const columnDark = new Array(width).fill(0);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (imageData.data[(y * width + x) * 4] < 128) columnDark[x]++;
    }
  }

  const minDark = Math.max(2, height * 0.03);
  const isActive = columnDark.map(c => c >= minDark);

  const regions: Array<{ start: number; end: number }> = [];
  let inRegion = false;
  let regionStart = 0;

  for (let x = 0; x < width; x++) {
    if (isActive[x] && !inRegion) {
      inRegion = true;
      regionStart = x;
    } else if (!isActive[x] && inRegion) {
      inRegion = false;
      regions.push({ start: regionStart, end: x - 1 });
    }
  }
  if (inRegion) regions.push({ start: regionStart, end: width - 1 });

  const valid = regions.filter(r => (r.end - r.start + 1) >= width * 0.03);
  const digitsOnly = trueWeightText.replace(/\D/g, '');

  if (valid.length !== digitsOnly.length) return;

  for (let i = 0; i < valid.length; i++) {
    const r = valid[i];
    const digitChar = digitsOnly[i];

    let topY = height, botY = 0;
    for (let x = r.start; x <= r.end; x++) {
      for (let y = 0; y < height; y++) {
        if (imageData.data[(y * width + x) * 4] < 128) {
          topY = Math.min(topY, y);
          botY = Math.max(botY, y);
        }
      }
    }

    const regWidth = r.end - r.start + 1;
    const regHeight = botY - topY + 1;

    const pixelData = normaliseDigitRegion(imageData, r.start, topY, regWidth, regHeight);
    calibrateDigitTemplate(digitChar, pixelData);
  }
  console.info('[OCR] Calibrated templates for digits:', digitsOnly);
}
