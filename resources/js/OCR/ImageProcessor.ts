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
  /** True if this variant is optimised for 7-segment digital displays */
  digital: boolean;
  /** The preprocessed HTMLCanvasElement */
  canvas?: HTMLCanvasElement;
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
 * Convert a canvas to grayscale by taking the maximum of the RGB channels. 
 * Essential for Red LEDs, which appear very dark in standard grayscale.
 */
function toMaxGrayscale(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const maxVal = Math.max(data[i], data[i + 1], data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = maxVal;
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

/**
 * Add a solid white border around the canvas. 
 * Tesseract REQUIRES quiet zones (margins) to detect text baselines.
 * If text touches the edge, Tesseract will completely ignore it or hallucinate.
 */
function padCanvas(src: HTMLCanvasElement, padding = 40): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(src.width + padding * 2, src.height + padding * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, padding, padding);
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

  // --- Upscale to a consistent width for OCR (400px wide) ---
  // Note: Tesseract fails if characters are too large (stroke width too thick).
  // 400px ensures even full-screen digits have a normal font size for the engine.
  const TARGET_W = 400;
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
  // Variant F: Inverted + binarized (optimised for 7-segment LED/LCD)
  // ---------------------------------------------------------------------------
  let varF = toGrayscale(cloneCanvas(baseCanvas));
  varF = adjustBrightnessContrast(varF, 0.2, 0.6);
  const ctxF = varF.getContext('2d')!;
  const imgF = ctxF.getImageData(0, 0, varF.width, varF.height);
  for (let px = 0; px < imgF.data.length; px += 4) {
    imgF.data[px] = 255 - imgF.data[px];
    imgF.data[px + 1] = 255 - imgF.data[px + 1];
    imgF.data[px + 2] = 255 - imgF.data[px + 2];
  }
  ctxF.putImageData(imgF, 0, 0);
  varF = threshold(varF, 0);
  varF = cleanLedCanvas(varF);

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

  /**
   * Clean unwanted border bars, display frame edges, and noise from LED variants.
   * Erases horizontal/vertical border bars and enclosing frame boxes to pure white.
   */
  function cleanLedCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { width, height, data } = imageData;
    const visited = new Uint8Array(width * height);
    const getIdx = (x: number, y: number) => y * width + x;

    interface Comp {
      pixels: number[];
      minX: number; maxX: number; minY: number; maxY: number;
      w: number; h: number;
      centerX: number; centerY: number;
    }

    const comps: Comp[] = [];

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
          const pIdx = getIdx(cx, cy);
          pixels.push(pIdx);

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

        comps.push({
          pixels,
          minX, maxX, minY, maxY,
          w: maxX - minX + 1,
          h: maxY - minY + 1,
          centerX: (minX + maxX) / 2,
          centerY: (minY + maxY) / 2,
        });
      }
    }

    // Identify border bars, frame enclosures, and noise to erase
    for (const comp of comps) {
      const touchesTopOrBottom = (comp.minY <= 15 || comp.maxY >= height - 16);
      const touchesSide = (comp.minX <= 15 || comp.maxX >= width - 16);

      const isHorizontalBorderBar = touchesTopOrBottom && comp.w > width * 0.25;
      const isVerticalBorderBar = touchesSide && comp.h > height * 0.25;

      const enclosesOther = comps.some(other =>
        other !== comp && other.pixels.length >= 15 &&
        other.centerX > comp.minX + 4 && other.centerX < comp.maxX - 4 &&
        other.centerY > comp.minY + 4 && other.centerY < comp.maxY - 4
      );

      const isNoise = comp.pixels.length < 12;

      if (isHorizontalBorderBar || isVerticalBorderBar || enclosesOther || isNoise) {
        for (const pIdx of comp.pixels) {
          data[pIdx * 4] = 255;
          data[pIdx * 4 + 1] = 255;
          data[pIdx * 4 + 2] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // ---------------------------------------------------------------------------
  // Helper: create an inverted + blurred + thresholded variant for LED displays
  // Uses toMaxGrayscale to handle colored LEDs (red, green, etc.)
  // ---------------------------------------------------------------------------
  function makeLedVariant(blurPx: number, contrast: number): HTMLCanvasElement {
    const [bc, bctx] = makeCanvas(baseCanvas.width, baseCanvas.height);
    if (blurPx > 0) {
      bctx.filter = `blur(${blurPx}px)`;
    }
    bctx.drawImage(baseCanvas, 0, 0);
    bctx.filter = 'none';

    let c = toMaxGrayscale(bc);
    c = adjustBrightnessContrast(c, 0, contrast);

    // Bright LED Peak Thresholding:
    // Glowing LED segments are very bright (> 150 luminance). Unlit ghost segments and background
    // are dimmer (< 100). Isolate glowing LED pixels to eliminate ghost segments.
    const ctx2 = c.getContext('2d')!;
    const img = ctx2.getImageData(0, 0, c.width, c.height);
    const { width, height, data } = img;

    // Find peak luminance histogram
    let maxLum = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > maxLum) maxLum = data[i];
    }

    const cutoff = Math.max(100, Math.round(maxLum * 0.52));

    // Invert & threshold directly: Lit LED (>= cutoff) → BLACK (0), Background (< cutoff) → WHITE (255)
    for (let i = 0; i < data.length; i += 4) {
      const lum = data[i]; // R channel in maxGrayscale
      const isLit = lum >= cutoff;
      const pixelVal = isLit ? 0 : 255;
      data[i] = pixelVal;
      data[i + 1] = pixelVal;
      data[i + 2] = pixelVal;
    }

    ctx2.putImageData(img, 0, 0);

    // Clean top/side border bars and bezel artifacts from variant canvas
    c = cleanLedCanvas(c);
    return c;
  }

  // Variant I: LCD (dark on light) — light blur to bridge small gaps
  const [blurCanvas1, bCtx1] = makeCanvas(baseCanvas.width, baseCanvas.height);
  bCtx1.filter = 'blur(4px)';
  bCtx1.drawImage(baseCanvas, 0, 0);
  bCtx1.filter = 'none';
  let varI = toGrayscale(blurCanvas1);
  varI = adjustBrightnessContrast(varI, 0, 0.8);
  varI = threshold(varI, 0);

  // Variant J: LED Sharp — inverted, NO blur (for clean/close-up displays)
  const varJ = makeLedVariant(0, 0.6);

  // Variant K: LED Light Blur (3px) — preserves holes in 8, 0, 6, 9
  const varK = makeLedVariant(3, 0.6);

  // Variant L: LED Medium Blur (6px) — good balance for most digits
  const varL = makeLedVariant(6, 0.6);

  // Variant M: LED Heavy Blur (10px) — bridges wider gaps in 3, 5, 7
  const varM = makeLedVariant(10, 0.7);

  const variants: PreprocessedVariant[] = [
    { label: 'A: Grayscale baseline',           dataUrl: padCanvas(varA).toDataURL('image/png'), digital: false, canvas: padCanvas(varA) },
    { label: 'B: Grayscale + contrast + sharpen', dataUrl: padCanvas(varB).toDataURL('image/png'), digital: false, canvas: padCanvas(varB) },
    { label: 'C: Binarized (128)',               dataUrl: padCanvas(varC).toDataURL('image/png'), digital: false, canvas: padCanvas(varC) },
    { label: 'D: Brightness + auto-threshold',  dataUrl: padCanvas(varD).toDataURL('image/png'), digital: false, canvas: padCanvas(varD) },
    { label: 'E: Contrast + sharpen + auto-thr', dataUrl: padCanvas(varE).toDataURL('image/png'), digital: false, canvas: padCanvas(varE) },
    { label: 'F: Inverted + binarized',         dataUrl: padCanvas(varF).toDataURL('image/png'), digital: true,  canvas: padCanvas(varF) },
    { label: 'G: High contrast + sharpen + thr', dataUrl: padCanvas(varG).toDataURL('image/png'), digital: false, canvas: padCanvas(varG) },
    { label: 'H: Balanced bright + contrast',   dataUrl: padCanvas(varH).toDataURL('image/png'), digital: false, canvas: padCanvas(varH) },
    { label: 'I: LCD Light Blur (4px)',          dataUrl: padCanvas(varI).toDataURL('image/png'), digital: false, canvas: padCanvas(varI) },
    { label: 'J: LED Sharp (no blur)',           dataUrl: padCanvas(varJ).toDataURL('image/png'), digital: true,  canvas: padCanvas(varJ) },
    { label: 'K: LED Light Blur (3px)',          dataUrl: padCanvas(varK).toDataURL('image/png'), digital: true,  canvas: padCanvas(varK) },
    { label: 'L: LED Medium Blur (6px)',         dataUrl: padCanvas(varL).toDataURL('image/png'), digital: true,  canvas: padCanvas(varL) },
    { label: 'M: LED Heavy Blur (10px)',         dataUrl: padCanvas(varM).toDataURL('image/png'), digital: true,  canvas: padCanvas(varM) },
  ];

  return { variants, rawCanvas };
}
