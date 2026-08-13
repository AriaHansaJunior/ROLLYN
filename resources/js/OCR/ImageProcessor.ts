/**
 * ============================================================
 * OCR/ImageProcessor.ts
 * ============================================================
 * Image preprocessing pipeline for weighing-scale digit recognition.
 *
 * PURPOSE:
 *   Prepare a captured camera frame for Tesseract.js OCR.
 *   Multiple preprocessing "variants" are produced so that
 *   OCRService can run several passes and pick the best result.
 *
 * PORTABILITY:
 *   This file has ZERO dependency on IncomingRoll or any
 *   business-domain logic.  Copy the entire OCR/ folder to
 *   any other project and replace only the variable names.
 *
 * OFFLINE:
 *   Uses only the browser Canvas API — no network calls.
 * ============================================================
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PreprocessedVariant {
  /** Human-readable label for debug / logging purposes */
  label: string;
  /** The preprocessed image as a data-URL (image/png) */
  dataUrl: string;
}

/**
 * Region-Of-Interest (ROI) expressed as fractions of the source image.
 * All values in the range [0, 1].
 *
 * Default: full image.
 *
 * HOW TO TUNE:
 *   If the camera is permanently pointed at the scale display,
 *   narrow the ROI to the display area only.  Example:
 *     { x: 0.1, y: 0.2, width: 0.8, height: 0.4 }
 *
 * Set via the `roi` parameter of `preprocessImage()`.
 */
export interface ROI {
  x: number;      // left edge as fraction of image width
  y: number;      // top edge as fraction of image height
  width: number;  // ROI width as fraction of image width
  height: number; // ROI height as fraction of image height
}

/** Default ROI — full frame. Adjust during field calibration. */
export const DEFAULT_ROI: ROI = { x: 0, y: 0, width: 1, height: 1 };

// ---------------------------------------------------------------------------
// Low-level canvas helpers
// ---------------------------------------------------------------------------

/** Create an off-screen canvas sized to `w × h`. */
function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

/** Load a data-URL into an HTMLImageElement (returns a Promise). */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Extract the ROI from an HTMLVideoElement and return a canvas. */
function cropROI(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  roi: ROI,
): HTMLCanvasElement {
  const srcW = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const srcH = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

  const sx = Math.floor(roi.x * srcW);
  const sy = Math.floor(roi.y * srcH);
  const sw = Math.floor(roi.width * srcW);
  const sh = Math.floor(roi.height * srcH);

  const [canvas, ctx] = makeCanvas(sw, sh);
  ctx.drawImage(source as CanvasImageSource, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
}

/** Upscale a canvas to `targetW` wide (maintaining aspect ratio). */
function upscale(src: HTMLCanvasElement, targetW: number): HTMLCanvasElement {
  const scale = targetW / src.width;
  const [canvas, ctx] = makeCanvas(targetW, Math.floor(src.height * scale));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Convert a canvas to grayscale (in-place). */
function toGrayscale(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Apply brightness and contrast adjustment.
 * brightness: [-1, 1] — negative darkens, positive brightens.
 * contrast:   [-1, 1] — negative reduces, positive increases.
 */
function adjustBrightnessContrast(
  canvas: HTMLCanvasElement,
  brightness: number,
  contrast: number,
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  const brightAdjust = brightness * 255;
  const contrastFactor = (contrast + 1) / (1 - contrast + 1e-9);

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = data[i + c];
      // brightness
      v += brightAdjust;
      // contrast
      v = contrastFactor * (v - 128) + 128;
      data[i + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Sharpen the image using a simple unsharp mask convolution.
 * `strength` — recommended range 0.2 – 1.0.
 */
function sharpen(canvas: HTMLCanvasElement, strength = 0.5): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.createImageData(width, height);
  const s = src.data;
  const d = dst.data;

  // Unsharp mask kernel (3×3):
  //  0  -1   0
  // -1  5+e -1
  //  0  -1   0
  const center = 1 + 4 * strength;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const v =
          center * s[i + c]
          - strength * s[i - width * 4 + c]
          - strength * s[i + width * 4 + c]
          - strength * s[i - 4 + c]
          - strength * s[i + 4 + c];
        d[i + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
  return canvas;
}

/**
 * Adaptive / global threshold binarization.
 * `threshold` in [0, 255]: pixels above become white, below become black.
 * If threshold is 0, auto (Otsu-like) is used.
 */
function threshold(canvas: HTMLCanvasElement, thresh = 128): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  // Compute auto threshold (mean of grayscale)
  if (thresh === 0) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += data[i]; // already grayscale
      count++;
    }
    thresh = count > 0 ? sum / count : 128;
  }

  for (let i = 0; i < data.length; i += 4) {
    const v = data[i] >= thresh ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Clone a canvas into a new independent canvas (so variants don't share data).
 */
function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  return canvas;
}

// ---------------------------------------------------------------------------
// Image quality diagnostics (used by OCRService for error diagnosis)
// ---------------------------------------------------------------------------

export interface ImageQualityReport {
  /** Average pixel brightness 0–255 */
  averageBrightness: number;
  /** Estimated sharpness (Laplacian variance; higher = sharper) */
  sharpnessScore: number;
  /** Fraction of pixels that are nearly-white (>240) */
  overexposedFraction: number;
  /** Is the image likely too dark? */
  tooDark: boolean;
  /** Is the image likely overexposed? */
  tooLight: boolean;
  /** Is the image likely blurry? */
  likelyBlurry: boolean;
}

/**
 * Analyse image quality of the captured frame (before preprocessing).
 * Returns a quality report that `OCRService` uses to generate diagnostics.
 */
export function analyseImageQuality(canvas: HTMLCanvasElement): ImageQualityReport {
  const ctx = canvas.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const total = canvas.width * canvas.height;

  let brightnessSum = 0;
  let overexposedCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    brightnessSum += gray;
    if (gray > 240) overexposedCount++;
  }

  const averageBrightness = brightnessSum / total;
  const overexposedFraction = overexposedCount / total;

  // Laplacian-based sharpness
  let laplacianSum = 0;
  let laplacianCount = 0;
  const w = canvas.width;
  const h = canvas.height;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      const center = data[idx];
      const top = data[((y - 1) * w + x) * 4];
      const bottom = data[((y + 1) * w + x) * 4];
      const left = data[(y * w + x - 1) * 4];
      const right = data[(y * w + x + 1) * 4];
      const lap = Math.abs(4 * center - top - bottom - left - right);
      laplacianSum += lap;
      laplacianCount++;
    }
  }
  const sharpnessScore = laplacianCount > 0 ? laplacianSum / laplacianCount : 0;

  return {
    averageBrightness,
    sharpnessScore,
    overexposedFraction,
    tooDark: averageBrightness < 50,
    tooLight: overexposedFraction > 0.5,
    likelyBlurry: sharpnessScore < 2.5,
  };
}

// ---------------------------------------------------------------------------
// Public API — generate preprocessing variants
// ---------------------------------------------------------------------------

/**
 * Capture the current video frame and return multiple preprocessed variants
 * for multi-pass OCR.
 *
 * @param video   - Live HTMLVideoElement (camera feed)
 * @param roi     - Region of interest (fractional coordinates)
 * @returns       - Array of labeled preprocessed images as data-URLs
 *               - Plus `rawCanvas` (unprocessed ROI for quality analysis)
 */
export async function preprocessImage(
  video: HTMLVideoElement,
  roi: ROI = DEFAULT_ROI,
): Promise<{ variants: PreprocessedVariant[]; rawCanvas: HTMLCanvasElement }> {
  // --- Capture full frame from video ---
  const [fullCanvas, fullCtx] = makeCanvas(video.videoWidth || 640, video.videoHeight || 480);
  fullCtx.drawImage(video, 0, 0);

  // --- Crop to ROI ---
  const roiCanvas = cropROI(fullCanvas, roi);

  // --- Upscale to a consistent width for OCR (1200px wide) ---
  const TARGET_W = 1200;
  const baseCanvas = upscale(roiCanvas, TARGET_W);

  // We return the raw (colour, upscaled) canvas for quality analysis
  const rawCanvas = cloneCanvas(baseCanvas);

  // ---------------------------------------------------------------------------
  // Variant A: Grayscale + upscale only (baseline)
  // ---------------------------------------------------------------------------
  const varA = toGrayscale(cloneCanvas(baseCanvas));

  // ---------------------------------------------------------------------------
  // Variant B: Grayscale + enhanced contrast + sharpen
  // ---------------------------------------------------------------------------
  let varB = toGrayscale(cloneCanvas(baseCanvas));
  varB = adjustBrightnessContrast(varB, 0, 0.4);
  varB = sharpen(varB, 0.6);

  // ---------------------------------------------------------------------------
  // Variant C: Grayscale + binarization (global threshold 128)
  // ---------------------------------------------------------------------------
  let varC = toGrayscale(cloneCanvas(baseCanvas));
  varC = threshold(varC, 128);

  // ---------------------------------------------------------------------------
  // Variant D: Grayscale + brightness boost + binarization
  //           (helps dark displays)
  // ---------------------------------------------------------------------------
  let varD = toGrayscale(cloneCanvas(baseCanvas));
  varD = adjustBrightnessContrast(varD, 0.15, 0.3);
  varD = threshold(varD, 0); // auto threshold

  // ---------------------------------------------------------------------------
  // Variant E: Grayscale + contrast stretch + sharpen + binarization
  //           (helps faded/low-contrast displays)
  // ---------------------------------------------------------------------------
  let varE = toGrayscale(cloneCanvas(baseCanvas));
  varE = adjustBrightnessContrast(varE, 0, 0.6);
  varE = sharpen(varE, 0.4);
  varE = threshold(varE, 0); // auto threshold

  // ---------------------------------------------------------------------------
  // Variant F: Inverted grayscale + binarization
  //           (helps dark-on-light displays / LED negatives)
  // ---------------------------------------------------------------------------
  let varF = toGrayscale(cloneCanvas(baseCanvas));
  varF = adjustBrightnessContrast(varF, 0, 0.3);
  // Invert
  const fCtx = varF.getContext('2d')!;
  const fData = fCtx.getImageData(0, 0, varF.width, varF.height);
  for (let i = 0; i < fData.data.length; i += 4) {
    fData.data[i] = 255 - fData.data[i];
    fData.data[i + 1] = 255 - fData.data[i + 1];
    fData.data[i + 2] = 255 - fData.data[i + 2];
  }
  fCtx.putImageData(fData, 0, 0);
  varF = threshold(varF, 128);

  // ---------------------------------------------------------------------------
  // Variant G: Very high contrast + aggressive sharpen + binarization
  //           (for crisp LED displays with strong contrast)
  // ---------------------------------------------------------------------------
  let varG = toGrayscale(cloneCanvas(baseCanvas));
  varG = adjustBrightnessContrast(varG, 0, 0.8);
  varG = sharpen(varG, 1.0);
  varG = threshold(varG, 0);

  // ---------------------------------------------------------------------------
  // Variant H: Moderate brightness boost + moderate contrast + binarization
  //           (balanced approach for various lighting conditions)
  // ---------------------------------------------------------------------------
  let varH = toGrayscale(cloneCanvas(baseCanvas));
  varH = adjustBrightnessContrast(varH, 0.1, 0.5);
  varH = sharpen(varH, 0.3);
  varH = threshold(varH, 0);

  const variants: PreprocessedVariant[] = [
    { label: 'A: Grayscale baseline',           dataUrl: varA.toDataURL('image/png') },
    { label: 'B: Grayscale + contrast + sharpen', dataUrl: varB.toDataURL('image/png') },
    { label: 'C: Binarized (128)',               dataUrl: varC.toDataURL('image/png') },
    { label: 'D: Brightness + auto-threshold',  dataUrl: varD.toDataURL('image/png') },
    { label: 'E: Contrast + sharpen + auto-thr', dataUrl: varE.toDataURL('image/png') },
    { label: 'F: Inverted + binarized',         dataUrl: varF.toDataURL('image/png') },
    { label: 'G: High contrast + sharpen + thr', dataUrl: varG.toDataURL('image/png') },
    { label: 'H: Balanced bright + contrast',   dataUrl: varH.toDataURL('image/png') },
  ];

  return { variants, rawCanvas };
}
