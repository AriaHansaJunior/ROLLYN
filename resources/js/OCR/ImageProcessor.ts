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
  let sx, sy, sw, sh;

  if (source instanceof HTMLVideoElement) {
    const videoW = source.videoWidth;
    const videoH = source.videoHeight;
    const clientW = source.clientWidth;
    const clientH = source.clientHeight;

    if (clientW > 0 && clientH > 0) {
      const scale = Math.max(clientW / videoW, clientH / videoH);
      const scaledW = videoW * scale;
      const scaledH = videoH * scale;

      const offsetX = (clientW - scaledW) / 2;
      const offsetY = (clientH - scaledH) / 2;

      const uiX = roi.x * clientW;
      const uiY = roi.y * clientH;
      const uiW = roi.width * clientW;
      const uiH = roi.height * clientH;

      sx = (uiX - offsetX) / scale;
      sy = (uiY - offsetY) / scale;
      sw = uiW / scale;
      sh = uiH / scale;
    } else {
      sx = roi.x * videoW;
      sy = roi.y * videoH;
      sw = roi.width * videoW;
      sh = roi.height * videoH;
    }
  } else {
    sx = roi.x * source.width;
    sy = roi.y * source.height;
    sw = roi.width * source.width;
    sh = roi.height * source.height;
  }

  sx = Math.floor(Math.max(0, sx));
  sy = Math.floor(Math.max(0, sy));
  sw = Math.floor(sw);
  sh = Math.floor(sh);

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

function isDarkBackground(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  
  // Calculate average brightness of the entire image.
  // Because the background typically occupies >60% of the bounding box, 
  // the overall average is highly indicative of the background color,
  // preventing failures when the camera is zoomed in and digits touch the edges.
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  
  const avgBrightness = sum / (canvas.width * canvas.height);
  return avgBrightness < 100;
}

function invertCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Extract digit components, correct rotation, crop tight bounding box, and upscale
function extractAndStraightenDigits(srcCanvas: HTMLCanvasElement, targetW: number): { canvas: HTMLCanvasElement, expectedDigitCount: number } {
  // 1. Temporary binary image for component extraction
  let bin = toGrayscale(cloneCanvas(srcCanvas));
  bin = threshold(bin, 0); // Otsu threshold (dark text on light bg)
  
  const ctx = bin.getContext('2d')!;
  const { width, height, data } = ctx.getImageData(0, 0, bin.width, bin.height);
  const visited = new Uint8Array(width * height);
  
  interface Comp {
    minX: number; maxX: number; minY: number; maxY: number;
    w: number; h: number;
    centerX: number; centerY: number;
  }
  
  const comps: Comp[] = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      // Background is white (255), digits are dark (< 128)
      if (visited[idx] === 1 || data[idx * 4] >= 128) continue;
      
      const queue: Array<[number, number]> = [[x, y]];
      visited[idx] = 1;
      
      let minX = x, maxX = x, minY = y, maxY = y;
      let head = 0;
      
      while (head < queue.length) {
        const [cx, cy] = queue[head++];
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        
        const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (visited[nIdx] === 0 && data[nIdx * 4] < 128) {
              visited[nIdx] = 1;
              queue.push([nx, ny]);
            }
          }
        }
      }
      
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      comps.push({ minX, maxX, minY, maxY, w, h, centerX: minX + w/2, centerY: minY + h/2 });
    }
  }
  
  // 2. Filter valid digit components
  const validComps = comps.filter(c => {
    const aspectRatio = c.w / c.h;
    // Standard digits are taller than they are wide. "1" is very thin.
    return c.w >= 5 && c.h >= 20 && aspectRatio >= 0.1 && aspectRatio <= 1.5 && 
           c.minY > 5 && c.maxY < height - 5; // not touching top/bottom borders
  });
  
  if (validComps.length < 2) return { canvas: srcCanvas, expectedDigitCount: 0 }; // Not enough digits to form a line/crop
  
  // 3. Linear regression to find rotation angle
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const c of validComps) {
    sumX += c.centerX;
    sumY += c.centerY;
    sumXY += c.centerX * c.centerY;
    sumX2 += c.centerX * c.centerX;
  }
  const n = validComps.length;
  const denominator = (n * sumX2 - sumX * sumX);
  
  let angle = 0;
  if (denominator !== 0) {
    const slope = (n * sumXY - sumX * sumY) / denominator;
    angle = Math.atan(slope);
  }
  
  // Only rotate if angle is reasonable (-30 to 30 degrees)
  if (Math.abs(angle) > Math.PI / 6) angle = 0;
  
  // 4. Bounding box calculation based on valid digits
  let cropMinX = width, cropMaxX = 0, cropMinY = height, cropMaxY = 0;
  for (const c of validComps) {
    if (c.minX < cropMinX) cropMinX = c.minX;
    if (c.maxX > cropMaxX) cropMaxX = c.maxX;
    if (c.minY < cropMinY) cropMinY = c.minY;
    if (c.maxY > cropMaxY) cropMaxY = c.maxY;
  }
  
  // Add padding
  const paddingX = Math.floor(width * 0.05);
  const paddingY = Math.floor(height * 0.1);
  cropMinX = Math.max(0, cropMinX - paddingX);
  cropMaxX = Math.min(width, cropMaxX + paddingX);
  cropMinY = Math.max(0, cropMinY - paddingY);
  cropMaxY = Math.min(height, cropMaxY + paddingY);
  
  const cropW = cropMaxX - cropMinX;
  const cropH = cropMaxY - cropMinY;
  
  // 5. Apply rotation and cropping
  const [rotatedCanvas, rotCtx] = makeCanvas(cropW, cropH);
  
  // Fill white background
  rotCtx.fillStyle = '#FFFFFF';
  rotCtx.fillRect(0, 0, cropW, cropH);
  
  rotCtx.translate(cropW / 2, cropH / 2);
  rotCtx.rotate(-angle);
  rotCtx.translate(-cropW / 2, -cropH / 2);
  
  // Draw the specifically cropped region from the original srcCanvas
  rotCtx.drawImage(srcCanvas, cropMinX, cropMinY, cropW, cropH, 0, 0, cropW, cropH);
  
  // 6. Upscale the cropped region to TARGET_W so Tesseract sees it clearly
  return { 
    canvas: upscale(rotatedCanvas, targetW), 
    expectedDigitCount: validComps.length 
  };
}

export async function preprocessImage(
  video: HTMLVideoElement,
  roi: ROI = DEFAULT_ROI,
): Promise<{ variants: PreprocessedVariant[]; rawCanvas: HTMLCanvasElement; expectedDigitCount?: number }> {

  const [fullCanvas, fullCtx] = makeCanvas(video.videoWidth || 640, video.videoHeight || 480);
  fullCtx.drawImage(video, 0, 0);

  const roiCanvas = cropROI(fullCanvas, roi);

  const TARGET_W = 400;
  let baseCanvas = upscale(roiCanvas, TARGET_W);

  if (isDarkBackground(baseCanvas)) {
    console.debug('[OCR] Dedicated Dark Background Pipeline activated.');
    let invertedBase = invertCanvas(cloneCanvas(baseCanvas));
    
    // Auto-detect digit region, straighten, crop tightly, and upscale
    const extractionResult = extractAndStraightenDigits(invertedBase, TARGET_W);
    invertedBase = extractionResult.canvas;
    const expectedDigitCount = extractionResult.expectedDigitCount;
    
    
    const variants: PreprocessedVariant[] = [];
    
    // Var 1: Inverted Grayscale (Fastest, often works perfectly)
    const var1 = toGrayscale(cloneCanvas(invertedBase));
    variants.push({
      label: 'Dark-Var1 (Inverted Gray)',
      canvas: var1,
      dataUrl: padCanvas(var1).toDataURL('image/png'),
      digital: false
    });
    
    // Var 2: Local Adaptive Threshold (Saves dim segments like '7' stems)
    let var2 = adaptiveThresholdLocal(cloneCanvas(invertedBase), 25, 0.15);
    variants.push({
      label: 'Dark-Var2 (Adaptive Thresh)',
      canvas: var2,
      dataUrl: padCanvas(var2).toDataURL('image/png'),
      digital: false
    });
    
    // Var 3: Aggressive Sharpening (good for blurry/distant digits)
    let var3 = toGrayscale(cloneCanvas(invertedBase));
    var3 = sharpen(var3, 1.2);
    var3 = adjustBrightnessContrast(var3, 0.1, 0.5);
    variants.push({
      label: 'Dark-Var3 (Sharpen)',
      canvas: var3,
      dataUrl: padCanvas(var3).toDataURL('image/png'),
      digital: false
    });

    // Var 4: High-Brightness Segmentation (Morphological Close)
    let var4 = adaptiveThresholdLocal(cloneCanvas(invertedBase), 15, 0.2);
    // Simple 3x3 morphology close (dilate then erode on dark text)
    // Actually, we can just return this for Tesseract.
    variants.push({
      label: 'Dark-Var4 (Heavy Local Thresh)',
      canvas: var4,
      dataUrl: padCanvas(var4).toDataURL('image/png'),
      digital: false
    });
    
    return { variants, rawCanvas: invertedBase, expectedDigitCount };
  }

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
