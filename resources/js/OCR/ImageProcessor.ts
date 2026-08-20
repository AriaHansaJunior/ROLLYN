export interface PreprocessedVariant {

  label: string;

  dataUrl: string;

  digital: boolean;

  canvas?: HTMLCanvasElement;
}

export interface ROI {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_ROI: ROI = { x: 0, y: 0, width: 1, height: 1 };

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

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

function upscale(src: HTMLCanvasElement, targetW: number): HTMLCanvasElement {
  const scale = targetW / src.width;
  const [canvas, ctx] = makeCanvas(targetW, Math.floor(src.height * scale));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

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

      v += brightAdjust;

      v = contrastFactor * (v - 128) + 128;
      data[i + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function sharpen(canvas: HTMLCanvasElement, strength = 0.5): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.createImageData(width, height);
  const s = src.data;
  const d = dst.data;

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

function threshold(canvas: HTMLCanvasElement, thresh = 128): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  if (thresh === 0) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += data[i];
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

function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  return canvas;
}

function padCanvas(src: HTMLCanvasElement, padding = 40): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(src.width + padding * 2, src.height + padding * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, padding, padding);
  return canvas;
}

export interface ImageQualityReport {

  averageBrightness: number;

  sharpnessScore: number;

  overexposedFraction: number;

  tooDark: boolean;

  tooLight: boolean;

  likelyBlurry: boolean;
}

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

export async function preprocessImage(
  video: HTMLVideoElement,
  roi: ROI = DEFAULT_ROI,
): Promise<{ variants: PreprocessedVariant[]; rawCanvas: HTMLCanvasElement }> {

  const [fullCanvas, fullCtx] = makeCanvas(video.videoWidth || 640, video.videoHeight || 480);
  fullCtx.drawImage(video, 0, 0);

  const roiCanvas = cropROI(fullCanvas, roi);

  const TARGET_W = 400;
  const baseCanvas = upscale(roiCanvas, TARGET_W);

  const rawCanvas = cloneCanvas(baseCanvas);

  const varA = toGrayscale(cloneCanvas(baseCanvas));

  let varB = toGrayscale(cloneCanvas(baseCanvas));
  varB = adjustBrightnessContrast(varB, 0, 0.4);
  varB = sharpen(varB, 0.6);

  let varC = toGrayscale(cloneCanvas(baseCanvas));
  varC = threshold(varC, 128);

  let varD = toGrayscale(cloneCanvas(baseCanvas));
  varD = adjustBrightnessContrast(varD, 0.15, 0.3);
  varD = threshold(varD, 0);

  let varE = toGrayscale(cloneCanvas(baseCanvas));
  varE = adjustBrightnessContrast(varE, 0, 0.6);
  varE = sharpen(varE, 0.4);
  varE = threshold(varE, 0);

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

  let varG = toGrayscale(cloneCanvas(baseCanvas));
  varG = adjustBrightnessContrast(varG, 0, 0.8);
  varG = sharpen(varG, 1.0);
  varG = threshold(varG, 0);

  let varH = toGrayscale(cloneCanvas(baseCanvas));
  varH = adjustBrightnessContrast(varH, 0.1, 0.5);
  varH = sharpen(varH, 0.3);
  varH = threshold(varH, 0);

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

  // Adaptive local threshold (Sauvola-inspired) for varying illumination
  function adaptiveThresholdLocal(canvas: HTMLCanvasElement, blockSize = 15, k = 0.2): HTMLCanvasElement {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { width, height, data } = imageData;
    const output = ctx.createImageData(width, height);
    const half = Math.floor(blockSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0, sumSq = 0, count = 0;
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const v = data[(ny * width + nx) * 4];
              sum += v;
              sumSq += v * v;
              count++;
            }
          }
        }
        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);
        const stdDev = Math.sqrt(Math.max(0, variance));
        const thresh = mean * (1 + k * (stdDev / 128 - 1));
        const idx = (y * width + x) * 4;
        const v = data[idx] >= thresh ? 255 : 0;
        output.data[idx] = v;
        output.data[idx + 1] = v;
        output.data[idx + 2] = v;
        output.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(output, 0, 0);
    return canvas;
  }

  // Morphological noise reduction (erosion then dilation) to clean stray pixels
  function morphClean(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;

    function erodeOrDilate(src: ImageData, isDilate: boolean): ImageData {
      const out = ctx.createImageData(width, height);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const neighbors = [
            src.data[((y - 1) * width + x) * 4],
            src.data[((y + 1) * width + x) * 4],
            src.data[(y * width + x - 1) * 4],
            src.data[(y * width + x + 1) * 4],
            src.data[(y * width + x) * 4],
          ];
          const v = isDilate ? Math.min(...neighbors) : Math.max(...neighbors);
          const idx = (y * width + x) * 4;
          out.data[idx] = v;
          out.data[idx + 1] = v;
          out.data[idx + 2] = v;
          out.data[idx + 3] = 255;
        }
      }
      return out;
    }

    const src = ctx.getImageData(0, 0, width, height);
    // Erode (remove stray white noise in dark areas), then dilate (restore)
    const eroded = erodeOrDilate(src, false);
    const opened = erodeOrDilate(eroded, true);
    ctx.putImageData(opened, 0, 0);
    return canvas;
  }

  function makeLedVariant(blurPx: number, contrast: number): HTMLCanvasElement {
    const [bc, bctx] = makeCanvas(baseCanvas.width, baseCanvas.height);
    if (blurPx > 0) {
      bctx.filter = `blur(${blurPx}px)`;
    }
    bctx.drawImage(baseCanvas, 0, 0);
    bctx.filter = 'none';

    let c = toMaxGrayscale(bc);
    c = adjustBrightnessContrast(c, 0, contrast);

    const ctx2 = c.getContext('2d')!;
    const img = ctx2.getImageData(0, 0, c.width, c.height);
    const { width, height, data } = img;

    let maxLum = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > maxLum) maxLum = data[i];
    }

    const cutoff = Math.max(100, Math.round(maxLum * 0.52));

    for (let i = 0; i < data.length; i += 4) {
      const lum = data[i];
      const isLit = lum >= cutoff;
      const pixelVal = isLit ? 0 : 255;
      data[i] = pixelVal;
      data[i + 1] = pixelVal;
      data[i + 2] = pixelVal;
    }

    ctx2.putImageData(img, 0, 0);

    c = cleanLedCanvas(c);
    c = morphClean(c);  // Morphological noise reduction for LED digits
    return c;
  }

  const [blurCanvas1, bCtx1] = makeCanvas(baseCanvas.width, baseCanvas.height);
  bCtx1.filter = 'blur(4px)';
  bCtx1.drawImage(baseCanvas, 0, 0);
  bCtx1.filter = 'none';
  let varI = toGrayscale(blurCanvas1);
  varI = adjustBrightnessContrast(varI, 0, 0.8);
  varI = threshold(varI, 0);

  const varJ = makeLedVariant(0, 0.6);

  const varK = makeLedVariant(3, 0.6);

  const varL = makeLedVariant(6, 0.6);

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

  // Variant N: Adaptive local threshold (handles varying illumination)
  let varN = toGrayscale(cloneCanvas(baseCanvas));
  varN = adaptiveThresholdLocal(varN, 15, 0.2);
  variants.push({ label: 'N: Adaptive local threshold', dataUrl: padCanvas(varN).toDataURL('image/png'), digital: false, canvas: padCanvas(varN) });

  // Variant O: Morphological cleaned LED (clean stray pixels from LED display)
  let varO = makeLedVariant(2, 0.65);
  varO = morphClean(varO);
  variants.push({ label: 'O: LED morph-cleaned (2px)', dataUrl: padCanvas(varO).toDataURL('image/png'), digital: true, canvas: padCanvas(varO) });

  return { variants, rawCanvas };
}
