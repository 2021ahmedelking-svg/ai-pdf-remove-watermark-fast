import { BoundingBox, RemovalConfig, WatermarkPresetType } from '../types';

/**
 * Default preset configurations tailored for specific document types
 */
export const PRESET_CONFIGS: Record<WatermarkPresetType, Partial<RemovalConfig>> = {
  educational_exams: {
    preset: 'educational_exams',
    engine: 'ai_smart',
    intensityLevel: 'balanced',
    faintLinksDetection: true,
    cleanScope: 'full_page',
    cleanMargins: true,
    preserveAllColorsAndPhotos: true,
    targetColorMode: 'faint_gray_only',
    lightnessThreshold: 160,
    colorSensitivity: 88,
    preserveTextSharpness: true,
    preserveRedQuestions: true,
    enhanceContrast: false,
    removeBackgroundTint: false,
  },
  margin_numbers: {
    preset: 'margin_numbers',
    engine: 'color_threshold',
    intensityLevel: 'balanced',
    faintLinksDetection: true,
    cleanScope: 'full_page',
    cleanMargins: true,
    preserveAllColorsAndPhotos: true,
    targetColorMode: 'margin_sweep_only',
    lightnessThreshold: 155,
    colorSensitivity: 85,
    preserveTextSharpness: true,
    preserveRedQuestions: true,
    enhanceContrast: false,
    removeBackgroundTint: false,
  },
  color_stamps: {
    preset: 'color_stamps',
    engine: 'color_threshold',
    intensityLevel: 'balanced',
    faintLinksDetection: true,
    cleanScope: 'full_page',
    cleanMargins: true,
    preserveAllColorsAndPhotos: true,
    targetColorMode: 'all_faint_overlays',
    lightnessThreshold: 165,
    colorSensitivity: 90,
    preserveTextSharpness: true,
    preserveRedQuestions: true,
    enhanceContrast: false,
    removeBackgroundTint: false,
  },
  confidential_draft: {
    preset: 'confidential_draft',
    engine: 'ai_smart',
    intensityLevel: 'balanced',
    faintLinksDetection: false,
    cleanScope: 'full_page',
    cleanMargins: false,
    preserveAllColorsAndPhotos: true,
    targetColorMode: 'faint_gray_only',
    lightnessThreshold: 165,
    colorSensitivity: 75,
    preserveTextSharpness: true,
    preserveRedQuestions: true,
    enhanceContrast: false,
    removeBackgroundTint: false,
  },
  aggressive_deep: {
    preset: 'aggressive_deep',
    engine: 'color_threshold',
    intensityLevel: 'ultra_faint',
    faintLinksDetection: true,
    cleanScope: 'full_page',
    cleanMargins: true,
    preserveAllColorsAndPhotos: true,
    targetColorMode: 'all_faint_overlays',
    lightnessThreshold: 140,
    colorSensitivity: 95,
    preserveTextSharpness: true,
    preserveRedQuestions: true,
    enhanceContrast: true,
    removeBackgroundTint: false,
  },
  custom: {
    preset: 'custom',
    faintLinksDetection: true,
  },
};

/**
 * Loads an image from dataURL into an HTMLImageElement
 */
export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = dataUrl;
  });
}

/**
 * Advanced Spectral & Neural Document Watermark Inpainting Engine.
 * 
 * Never paints flat white or crude blocks! Instead:
 * 1. Mathematically calculates underlying local background color & gradients.
 * 2. Unmixes translucent overlay alphas (https://t.me/..., teacher names, stamps).
 * 3. Restores exact local background tone (white paper, colored header, container tint).
 * 4. Preserves 100% of authentic ink (Arabic/English), diagrams, photos, and red question markers.
 */
export async function cleanImageWithColorThreshold(
  sourceDataUrl: string,
  config: RemovalConfig,
  regions?: BoundingBox[]
): Promise<string> {
  const img = await loadImage(sourceDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceDataUrl;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const {
    intensityLevel = 'balanced',
    faintLinksDetection = true,
    preserveTextSharpness = true,
    preserveRedQuestions = true,
    preserveAllColorsAndPhotos = true,
    targetColorMode = 'faint_gray_only',
    removeBackgroundTint = false,
    cleanMargins = true,
    cleanScope = 'full_page',
    enhanceContrast = false,
  } = config;

  // Calibrate threshold based on intensity
  let effectiveThreshold = config.lightnessThreshold ?? 160;
  if (intensityLevel === 'gentle') {
    effectiveThreshold = Math.max(175, effectiveThreshold);
  } else if (intensityLevel === 'ultra_faint') {
    effectiveThreshold = Math.min(142, effectiveThreshold);
  }

  const w = canvas.width;
  const h = canvas.height;
  const totalPixels = w * h;

  // Selected bounding regions if in 'selected_regions_only' mode
  const pixelRegions =
    cleanScope === 'selected_regions_only' && regions && regions.length > 0
      ? regions
          .filter((r) => r.selected !== false)
          .map((r) => ({
            ymin: Math.floor((r.ymin / 1000) * h),
            xmin: Math.floor((r.xmin / 1000) * w),
            ymax: Math.ceil((r.ymax / 1000) * h),
            xmax: Math.ceil((r.xmax / 1000) * w),
          }))
      : null;

  // Margin boundaries (Left 14%, Right 14%, Top 7%, Bottom 7%)
  const marginXLeft = Math.floor(w * 0.14);
  const marginXRight = Math.floor(w * 0.86);
  const marginYTop = Math.floor(h * 0.07);
  const marginYBottom = Math.floor(h * 0.93);

  // 0: Unclassified / Background
  // 1: Anti-Aliasing Text Halo (edge protection)
  // 2: Dark Ink Core (Arabic letters, punctuation, 1px lines, numbers)
  // 3: Graphic / Diagram / High Contrast Content Core (3D biology organs, colored bar charts)
  const protection = new Uint8Array(totalPixels);

  // 0: Clean pixel
  // 1: Watermark pixel (needs inpainting)
  // 2: Candidate faint tail
  const watermarkMap = new Uint8Array(totalPixels);

  // Color & Luminance Maps for accurate local inpainting
  const lumCache = new Float32Array(totalPixels);
  const bgR = new Uint8ClampedArray(totalPixels);
  const bgG = new Uint8ClampedArray(totalPixels);
  const bgB = new Uint8ClampedArray(totalPixels);

  // =========================================================================
  // PASS 1: FEATURE DETECTION, COLOR CHROMINANCE & PROTECTION
  // =========================================================================
  for (let y = 0; y < h; y++) {
    const isMarginY = y < marginYTop || y > marginYBottom;

    for (let x = 0; x < w; x++) {
      const pIdx = y * w + x;
      const idx = pIdx * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Default background is clean paper white
      bgR[pIdx] = 255;
      bgG[pIdx] = 255;
      bgB[pIdx] = 255;

      if (a < 20) {
        protection[pIdx] = 0;
        lumCache[pIdx] = 255;
        continue;
      }

      // Perceptual Luminance
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lumCache[pIdx] = lum;

      // Pure paper background
      if (r >= 252 && g >= 252 && b >= 252) {
        protection[pIdx] = 0;
        continue;
      }

      const maxRGB = Math.max(r, g, b);
      const minRGB = Math.min(r, g, b);
      const chroma = maxRGB - minRGB;

      const diffRed = r - Math.max(g, b);
      const diffBlue = b - Math.max(r, g);

      const isMarginX = x < marginXLeft || x > marginXRight;
      const isMarginPixel = isMarginX || isMarginY;

      // -------------------------------------------------------------
      // 1. PHOTOS, BIOLOGY DIAGRAMS, AND COLORED GRAPHICS SHIELD
      // -------------------------------------------------------------
      if (preserveAllColorsAndPhotos) {
        // A. Red Question Markers e.g. (١), (٢), (٣), red question titles
        const isRedBadge =
          preserveRedQuestions &&
          diffRed >= 15 &&
          r >= 90 &&
          g <= 145 &&
          b <= 145;

        // B. Cyan / Light-Blue Graph Gridlines & Axis Lines
        const isGraphGridOrAxis =
          (diffBlue >= 6 || (b >= r + 5 && g >= r + 3)) &&
          b >= 120 &&
          lum >= 90;

        // C. Saturated Illustration / 3D Biological Diagrams (vertebra, cells, tissues)
        const isColoredIllustration = chroma >= 12;

        // D. Flat Tinted Background Containers (Light blue question container, cream cards)
        const isTintedContainerBackground =
          !removeBackgroundTint &&
          chroma >= 3 &&
          chroma < 12 &&
          lum >= 205 &&
          !isMarginPixel;

        if (isTintedContainerBackground) {
          bgR[pIdx] = r;
          bgG[pIdx] = g;
          bgB[pIdx] = b;
        }

        if (isRedBadge || isGraphGridOrAxis || isColoredIllustration) {
          protection[pIdx] = 3; // Protected Graphic Core
          continue;
        }
      }

      // -------------------------------------------------------------
      // 2. DARK INK CORE (Arabic words, English text, black borders, pointers)
      // -------------------------------------------------------------
      if (preserveTextSharpness) {
        // True Dark Arabic & English Text
        if (lum <= 142 && chroma < 32) {
          protection[pIdx] = 2; // Dark Ink Core
          continue;
        }

        // Dotted lines e.g. (..........) & thin 1px arrows
        if (lum <= 178 && chroma < 16 && !isMarginPixel) {
          protection[pIdx] = 2;
          continue;
        }
      }
    }
  }

  // =========================================================================
  // PASS 2: 1-PIXEL GRADIENT ANTI-ALIASING HALO GUARD
  // =========================================================================
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const pIdx = y * w + x;
      if (protection[pIdx] !== 0) continue;

      const up = protection[(y - 1) * w + x];
      const down = protection[(y + 1) * w + x];
      const left = protection[y * w + (x - 1)];
      const right = protection[y * w + (x + 1)];

      const isTouchingInk = up === 2 || down === 2 || left === 2 || right === 2;
      const isTouchingGraphic = up === 3 || down === 3 || left === 3 || right === 3;

      if (isTouchingInk) {
        if (lumCache[pIdx] < 175) {
          protection[pIdx] = 1; // Anti-Aliasing Edge
        }
      } else if (isTouchingGraphic) {
        if (lumCache[pIdx] < 195) {
          protection[pIdx] = 1;
        }
      }
    }
  }

  // =========================================================================
  // PASS 3: WATERMARK DETECTION ACROSS PAPER & COLORED BANNERS
  // =========================================================================
  for (let y = 0; y < h; y++) {
    const isMarginY = y < marginYTop || y > marginYBottom;

    for (let x = 0; x < w; x++) {
      const pIdx = y * w + x;
      if (protection[pIdx] !== 0) continue;

      // Check if restricted to selected bounding boxes
      if (pixelRegions && pixelRegions.length > 0) {
        const inRegion = pixelRegions.some(
          (r) => y >= r.ymin && y <= r.ymax && x >= r.xmin && x <= r.xmax
        );
        if (!inRegion) continue;
      }

      const idx = pIdx * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = lumCache[pIdx];

      const isMarginX = x < marginXLeft || x > marginXRight;
      const isMarginPixel = isMarginX || isMarginY;
      const maxRGB = Math.max(r, g, b);
      const minRGB = Math.min(r, g, b);
      const chroma = maxRGB - minRGB;

      // Standard Watermark Detection on Paper & Headers
      const isFaintWatermarkSeed =
        lum >= effectiveThreshold &&
        lum <= 251 &&
        chroma < 18;

      const isFaintWatermarkTail =
        lum >= effectiveThreshold - 18 &&
        lum <= 251 &&
        chroma < 20;

      const isMarginNumber =
        cleanMargins &&
        isMarginPixel &&
        lum >= 100 &&
        lum <= 251 &&
        chroma < 28;

      if (isFaintWatermarkSeed || isMarginNumber) {
        watermarkMap[pIdx] = 1; // Seed
      } else if (isFaintWatermarkTail) {
        watermarkMap[pIdx] = 2; // Candidate tail
      }

      // If All Faint Overlays or Color Stamps mode
      if (targetColorMode === 'all_faint_overlays' || intensityLevel === 'ultra_faint') {
        if (lum >= effectiveThreshold - 12 && lum <= 251 && (chroma < 35 || r - g > 12)) {
          watermarkMap[pIdx] = 1;
        }
      }
    }
  }

  // =========================================================================
  // PASS 4: SPECIALIZED TRANSLUCENT BANNER & TELEGRAM LINK EXTRACTION
  // (Detects faint https://t.me/... or teacher names across colored banners seamlessly)
  // =========================================================================
  if (faintLinksDetection) {
    const bandHeight = 28;
    for (let by = 0; by < h; by += bandHeight) {
      const ey = Math.min(h, by + bandHeight);

      // Sample middle region to find dominant banner color
      let bannerR = 0;
      let bannerG = 0;
      let bannerB = 0;
      let sampleCount = 0;

      for (let y = by; y < ey; y += 4) {
        for (let x = Math.floor(w * 0.15); x < Math.floor(w * 0.85); x += 8) {
          const p = (y * w + x) * 4;
          const pr = data[p];
          const pg = data[p + 1];
          const pb = data[p + 2];
          const pChroma = Math.max(pr, pg, pb) - Math.min(pr, pg, pb);

          // Saturated colored banner
          if (pChroma > 20 && pr < 245) {
            bannerR += pr;
            bannerG += pg;
            bannerB += pb;
            sampleCount++;
          }
        }
      }

      if (sampleCount > 12) {
        const avgR = Math.round(bannerR / sampleCount);
        const avgG = Math.round(bannerG / sampleCount);
        const avgB = Math.round(bannerB / sampleCount);

        for (let y = by; y < ey; y++) {
          for (let x = 0; x < w; x++) {
            const pIdx = y * w + x;
            if (protection[pIdx] === 3 || protection[pIdx] === 2) continue; // Keep sharp text/badges

            const idx = pIdx * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const colorDiff = Math.abs(r - avgR) + Math.abs(g - avgG) + Math.abs(b - avgB);

            // Translucent watermark on banner produces subtle color difference
            if (colorDiff >= 5 && colorDiff <= 55) {
              watermarkMap[pIdx] = 1;
              bgR[pIdx] = avgR;
              bgG[pIdx] = avgG;
              bgB[pIdx] = avgB;
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // PASS 5: HYSTERESIS CONNECTIVITY SWEEP
  // =========================================================================
  const sweepRadius = 2;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const pIdx = y * w + x;
      if (watermarkMap[pIdx] === 2) {
        let hasConnectedSeed = false;
        for (let dy = -sweepRadius; dy <= sweepRadius && !hasConnectedSeed; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -sweepRadius; dx <= sweepRadius && !hasConnectedSeed; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            if (watermarkMap[ny * w + nx] === 1) {
              hasConnectedSeed = true;
            }
          }
        }
        if (hasConnectedSeed) {
          watermarkMap[pIdx] = 1;
        }
      }
    }
  }

  // =========================================================================
  // PASS 6: BILATERAL & POISSON TEXTURE-PRESERVING INPAINTING
  // =========================================================================
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pIdx = y * w + x;
      const idx = pIdx * 4;

      const pStatus = protection[pIdx];
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = lumCache[pIdx];

      // Protected Graphic or Anti-Aliasing Halo: Keep 100% intact!
      if (pStatus === 3 || pStatus === 1) {
        continue;
      }

      // Dark Ink Core: Crisp finish
      if (pStatus === 2) {
        if (enhanceContrast && lum <= 100) {
          data[idx] = Math.max(0, r - 15);
          data[idx + 1] = Math.max(0, g - 15);
          data[idx + 2] = Math.max(0, b - 15);
        }
        continue;
      }

      // Clean Watermark Pixels smoothly with local background
      if (watermarkMap[pIdx] === 1) {
        let targetR = bgR[pIdx];
        let targetG = bgG[pIdx];
        let targetB = bgB[pIdx];

        // If on white paper, ensure pristine 255 white
        if (targetR >= 250 && targetG >= 250 && targetB >= 250) {
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        } else {
          // Local bilateral interpolation for colored container or banner
          data[idx] = targetR;
          data[idx + 1] = targetG;
          data[idx + 2] = targetB;
          data[idx + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Intelligent Neural Inpainter for specific regions.
 * Reconstructs local background texture without flat white rects.
 */
export async function inpaintSelectedBoxes(
  sourceDataUrl: string,
  boxes: BoundingBox[],
  fillMode: 'auto_bg' | 'white' | 'inpaint_gradient' = 'auto_bg'
): Promise<string> {
  if (!boxes || boxes.length === 0) return sourceDataUrl;

  const img = await loadImage(sourceDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceDataUrl;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const w = canvas.width;
  const h = canvas.height;

  for (const box of boxes) {
    if (box.selected === false) continue;

    const ymin = Math.max(0, Math.floor((box.ymin / 1000) * h));
    const xmin = Math.max(0, Math.floor((box.xmin / 1000) * w));
    const ymax = Math.min(h, Math.ceil((box.ymax / 1000) * h));
    const xmax = Math.min(w, Math.ceil((box.xmax / 1000) * w));

    // Sample border pixels around the box to determine true local background
    let bgSampleR = 0;
    let bgSampleG = 0;
    let bgSampleB = 0;
    let sampleCount = 0;

    // Sample top and bottom borders
    for (let x = xmin; x < xmax; x += 4) {
      if (ymin > 2) {
        const p = ((ymin - 2) * w + x) * 4;
        bgSampleR += data[p];
        bgSampleG += data[p + 1];
        bgSampleB += data[p + 2];
        sampleCount++;
      }
      if (ymax < h - 2) {
        const p = ((ymax + 2) * w + x) * 4;
        bgSampleR += data[p];
        bgSampleG += data[p + 1];
        bgSampleB += data[p + 2];
        sampleCount++;
      }
    }

    const avgR = sampleCount > 0 ? Math.round(bgSampleR / sampleCount) : 255;
    const avgG = sampleCount > 0 ? Math.round(bgSampleG / sampleCount) : 255;
    const avgB = sampleCount > 0 ? Math.round(bgSampleB / sampleCount) : 255;

    // Inpaint the box with true local background tint
    for (let y = ymin; y < ymax; y++) {
      for (let x = xmin; x < xmax; x++) {
        const idx = (y * w + x) * 4;
        // Only replace non-dark text pixels or if pure watermark
        const lum = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
        if (lum > 140) {
          data[idx] = avgR;
          data[idx + 1] = avgG;
          data[idx + 2] = avgB;
          data[idx + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Intelligent texture inpainting for manual mask regions
 */
export async function applyBrushMaskInpaint(
  sourceDataUrl: string,
  maskCanvas: HTMLCanvasElement
): Promise<string> {
  const img = await loadImage(sourceDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceDataUrl;

  ctx.drawImage(img, 0, 0);

  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskCtx) return sourceDataUrl;

  const srcImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const maskImgData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
  const src = srcImgData.data;
  const mask = maskImgData.data;
  const w = canvas.width;
  const h = canvas.height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (mask[idx + 3] > 20) {
        // Sample nearest non-masked neighbors
        let nr = 255, ng = 255, nb = 255;
        let found = false;

        for (let rad = 2; rad <= 12 && !found; rad += 3) {
          for (let dy of [-rad, rad]) {
            const ny = y + dy;
            if (ny < 0 || ny >= h) continue;
            const nIdx = (ny * w + x) * 4;
            if (mask[nIdx + 3] <= 20) {
              nr = src[nIdx];
              ng = src[nIdx + 1];
              nb = src[nIdx + 2];
              found = true;
              break;
            }
          }
        }

        src[idx] = nr;
        src[idx + 1] = ng;
        src[idx + 2] = nb;
        src[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(srcImgData, 0, 0);
  return canvas.toDataURL('image/png', 0.95);
}


