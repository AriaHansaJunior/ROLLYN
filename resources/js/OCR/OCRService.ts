import { createWorker, OEM, PSM } from 'tesseract.js';
import type { ImageQualityReport } from './ImageProcessor';
import type { PreprocessedVariant } from './ImageProcessor';
import { recogniseSegments } from './SegmentMatcher';
import { classifyWithTemplates } from './TemplateClassifier';
import { calibrateDigitTemplate, normaliseDigitRegion } from './DigitTemplateStore';

function localAsset(path: string): string {
  return `${window.location.origin}/tesseract/${path}`;
}

function buildLocalOptions() {
  return {
    workerPath: localAsset('worker.min.js'),
    corePath:   localAsset(''),
    langPath:   localAsset('lang-data'),
    logger: () => {},

    gzip: false,

    load_system_dawg: '0',
    load_freq_dawg: '0',
  };
}

export type OcrStatus = 'idle' | 'processing' | 'success' | 'error';

export interface OcrResult {

  weight: number;

  weightDisplay: string;

  confidence: number;

  variantLabel: string;

  variantDataUrl: string;

  rawText: string;
}

export interface OcrError {

  title: string;

  message: string;
}

function normaliseWeight(raw: string): number | null {

  const cleaned = raw.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return null;

  const parts = cleaned.split(/([.,])/);

  let integerPart = '';
  let decimalPart = '';
  let foundDecimal = false;

  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i];
    if (!chunk) continue;

    if (chunk === '.' || chunk === ',') {

      const nextDigits = parts[i + 1] ?? '';
      if (!foundDecimal && nextDigits.length === 3) {

        continue;
      } else {

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

function formatWeight(weight: number): string {
  return weight.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function correctCommonMisreadings(text: string): string {
  const corrections: Record<string, string> = {
    'O': '0',
    'o': '0',
    'I': '1',
    'l': '1',
    'S': '5',
    'B': '8',
    'Z': '2',
  };

  let corrected = text;
  for (const [wrong, right] of Object.entries(corrections)) {
    corrected = corrected.replaceAll(wrong, right);
  }
  return corrected;
}

function extractWeightToken(text: string): string | null {

  const corrected = correctCommonMisreadings(text);

  const sanitised = corrected.replace(/[^0-9.,\s]/g, ' ');

  const tokenRegex = /\d{1,4}([.,]\d{3})*([.,]\d{1,2})?/g;
  const matches = sanitised.match(tokenRegex);
  if (!matches || matches.length === 0) return null;

  return matches.reduce((best, m) => (m.length >= best.length ? m : best), '');
}

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

interface WorkerState {
  instance: any;
  ready: boolean;
  initialising: boolean;
  failed: boolean;
}

const engWorker: WorkerState = { instance: null, ready: false, initialising: false, failed: false };
const digitalWorker: WorkerState = { instance: null, ready: false, initialising: false, failed: false };

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
      tessedit_char_whitelist: '0123456789.,',
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

export async function initOCRWorker(): Promise<void> {

  await Promise.allSettled([
    getEngWorker().catch(err => console.warn('[OCR] eng worker pre-init failed:', err)),
    getDigitalWorker().catch(err => console.warn('[OCR] digital worker pre-init failed:', err)),
  ]);
}

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

export async function recogniseWeight(
  variants: PreprocessedVariant[],
  quality: ImageQualityReport,
): Promise<{ result: OcrResult } | { error: OcrError }> {

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

  const standardVariants = variants.filter(v => !v.digital);
  try {
    const ew = await getEngWorker();
    if (standardVariants.length > 0) {
      workerTasks.push(runWorkerOnVariants(ew, standardVariants, 'ENG'));
    }
  } catch {
    console.warn('[OCR] eng worker not available');
  }

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

  const results = await Promise.all(workerTasks);
  const allCandidates = results.flatMap(r => r.candidates);
  const allAttempts = results.flatMap(r => r.attempts);

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

  console.debug('[OCR] All recognition attempts:', allAttempts);
  console.debug('[OCR] Valid candidates:', allCandidates);

  if (allCandidates.length === 0) {
    return { error: diagnoseError(quality, '') };
  }

  function digitCount(weight: number): number {
    return Math.floor(weight).toString().length;
  }

  const weightCounts = new Map<number, number>();
  for (const c of allCandidates) {
    const key = Math.round(c.weight);
    weightCounts.set(key, (weightCounts.get(key) ?? 0) + 1);
  }

  // Compute mode digit count across all candidates for consensus
  const digitCountMap = new Map<number, number>();
  for (const c of allCandidates) {
    const dc = digitCount(c.weight);
    digitCountMap.set(dc, (digitCountMap.get(dc) ?? 0) + 1);
  }
  let modeDigitCount = 0;
  let modeDigitFreq = 0;
  for (const [dc, freq] of digitCountMap) {
    if (freq > modeDigitFreq) {
      modeDigitCount = dc;
      modeDigitFreq = freq;
    }
  }

  const scored = allCandidates.map(c => {
    const digits = digitCount(c.weight);
    const isSegmentMatcher = (c.variantLabel.startsWith('[SEGMENT-MATCHER]') || c.variantLabel.startsWith('[TEMPLATE-CLASSIFIER]')) ? 1 : 0;
    const isDigital = (c.variantLabel.startsWith('[DIGITAL]') || isSegmentMatcher) ? 1 : 0;
    const consistency = weightCounts.get(Math.round(c.weight)) ?? 0;

    const segmentBonus = (isSegmentMatcher && c.confidence >= 80) ? 300 : 0;

    // Penalize candidates whose digit count differs from the mode (prevents false digit insertion like 123 → 1143)
    const digitCountPenalty = (digits !== modeDigitCount) ? -2000 : 0;

    const score =
      (digits * 1000) +
      (consistency * 1200) +  // Increased from 800 — consensus is more important than raw confidence
      (isDigital * 300) +
      segmentBonus +
      digitCountPenalty +
      c.confidence;

    return { ...c, score };
  });

  scored.sort((a, b) => b.score - a.score);

  console.debug('[OCR] Scored candidates:', scored.map(s => ({
    weight: s.weight,
    score: s.score,
    variant: s.variantLabel,
    confidence: s.confidence,
  })));

  const winner = scored[0];

  // Minimum consistency check: require at least 2 candidates to agree on the same weight
  // to prevent accepting a single spurious result
  const winnerConsistency = weightCounts.get(Math.round(winner.weight)) ?? 0;
  if (winnerConsistency < 2 && allCandidates.length >= 3) {
    console.warn('[OCR] No consensus reached among candidates — recognition unreliable');
    return {
      error: {
        title: 'Recognition Failed',
        message:
          'Multiple OCR passes returned inconsistent results. ' +
          'Ensure the weighing display is steady, clearly visible, and well-lit, then try again.',
      },
    };
  }

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
