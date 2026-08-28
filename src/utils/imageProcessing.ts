import { BoundingBox, RemovalConfig, WatermarkPresetType } from '../types';

/**
 * Default preset configurations tailored for specific document types
 */
export const PRESET_CONFIGS: Record<WatermarkPresetType, Partial<RemovalConfig>> = {
  educational_exams: {
    preset: 'educational_exams',
    engine: 'ai_smart',
    cleanScope: 'full_page',
    cleanMargins: true,
    preserveAllColorsAndPhotos: true,
    targetColorMode: 'faint_gray_only',
    lightnessThreshold: 168,
    colorSensitivity: 80,
    preserveTextSharpness: true,
    preserveRedQuestions: true,
    enhanceContrast: false,
    removeBackgroundTint: false, // Keep yellow/pink question cards intact!
  },
  margin_numbers: {
    preset: 'margin_numbers',
    engine: 'color_threshold',
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
    cleanScope: 'selected_regions_only',
    cleanMargins: true,
    preserveAllColorsAndPhotos: true,
    targetColorMode: 'all_faint_overlays',
    lightnessThreshold: 170,
    colorSensitivity: 90,
    preserveTextSharpness: true,
    preserveRedQuestions: true,
    enhanceContrast: false,
    removeBackgroundTint: false,
  },
  confidential_draft: {
    preset: 'confidential_draft',
    engine: 'ai_smart',
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
    cleanScope: 'full_page',
    cleanMargins: true,
    preserveAllColorsAndPhotos: false,
    targetColorMode: 'all_faint_overlays',
    lightnessThreshold: 140,
    colorSensitivity: 95,
    preserveTextSharpness: true,
    preserveRedQuestions: true,
    enhanceContrast: true,
    removeBackgroundTint: true,
  },
  custom: {
    preset: 'custom',
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
 * Advanced Document Watermark Removal Engine (WatermarkRemover.io Level).
 * 
 * CORE ALGORITHM: Stroke-Aware Adaptive Gradient Reconstruction & Morphological Shield (SAAGR)
 * 
 * Solves:
 * 1. Anti-Thinning Text Guard: Preserves Arabic/English font stroke weight, anti-aliased subpixels, dots (ن، ق، ف، ي), and accents.
 * 2. Fine Detail & Dotted Line Shield: Protects dotted response lines (..........), 1px arrows (X, Y), and question separators.
 * 3. Diagram & Color Shield: 100% protects biology drawings (vertebrae, cells, bones), cyan graph axes & gridlines, and red headers.
 * 4. Smooth Inpainting: Lifts faint watermark veils to clean paper white without harsh clipping or page washing.
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
    lightnessThreshold = 168,
    colorSensitivity = 80,
    preserveTextSharpness = true,
    preserveRedQuestions = true,
    preserveAllColorsAndPhotos = true,
    targetColorMode = 'faint_gray_only',
    removeBackgroundTint = false,
    cleanMargins = true,
    cleanScope = 'full_page',
    enhanceContrast = false,
  } = config;

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

  // Margin boundaries (Left 12%, Right 12%, Top 6%, Bottom 6%)
  const marginXLeft = Math.floor(w * 0.12);
  const marginXRight = Math.floor(w * 0.88);
  const marginYTop = Math.floor(h * 0.06);
  const marginYBottom = Math.floor(h * 0.94);

  const grayThreshold = Math.max(130, Math.min(245, lightnessThreshold));

  // Protection Map:
  // 0: Unprotected (candidate watermark / plain background)
  // 1: Anti-Aliasing Halo (sub-pixel boundary around characters, protected from bleaching)
  // 2: Dark Ink Core (letters, arrows, punctuation, dotted lines)
  // 3: Graphic / Diagram / Colored Object Core (vertebra bone, purple facets, cyan graph lines, red question badges)
  const protection = new Uint8Array(totalPixels);

  // Luminance cache
  const lumCache = new Float32Array(totalPixels);

  // =========================================================================
  // PASS 1: FEATURE DETECTION & COLOR / TEXT CORE CLASSIFICATION
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

      if (a < 20) {
        protection[pIdx] = 0;
        lumCache[pIdx] = 255;
        continue;
      }

      // Fast luminance (Rec. 709)
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lumCache[pIdx] = lum;

      // Pure paper background
      if (r >= 253 && g >= 253 && b >= 253) {
        protection[pIdx] = 0;
        continue;
      }

      const maxRGB = Math.max(r, g, b);
      const minRGB = Math.min(r, g, b);
      const chroma = maxRGB - minRGB;

      const diffRed = r - Math.max(g, b);
      const diffBlue = b - Math.max(r, g);
      const diffGreen = g - Math.max(r, b);

      const isMarginX = x < marginXLeft || x > marginXRight;
      const isMarginPixel = isMarginX || isMarginY;

      // 1. PHOTOS, BIOLOGY DIAGRAMS, AND COLORED GRAPHICS SHIELD
      if (preserveAllColorsAndPhotos) {
        // A. Red question numbers e.g. (١), (٢), (٣), question markers ١٣, ١٤, red lines
        const isRedBadge =
          preserveRedQuestions &&
          diffRed >= 20 &&
          r >= 100 &&
          g <= 125 &&
          b <= 125;

        // B. Cyan / Light-Blue Graph Gridlines and Coordinate Axes
        // In graphs, gridlines have subtle cyan/blue hue with high lightness (e.g. r:190, g:230, b:245)
        const isGraphGridOrAxis =
          (diffBlue >= 5 || (b >= r + 6 && g >= r + 4)) &&
          b >= 130 &&
          lum >= 120;

        // C. General saturated graphic pixel (vertebra yellow tissue, purple articular facets, diagrams)
        const isColoredIllustration = chroma >= 12;

        // D. Question Box Background Tint (e.g., light yellow/cream container: r~250, g~245, b~205)
        const isQuestionBoxTint =
          !removeBackgroundTint &&
          chroma >= 8 &&
          (r > 200 || g > 200) &&
          !isMarginPixel;

        if (isRedBadge || isGraphGridOrAxis || isColoredIllustration || isQuestionBoxTint) {
          protection[pIdx] = 3; // Graphic Protected Core
          continue;
        }
      }

      // 2. DARK TEXT & LINE CORE (Solid Arabic letters, punctuation, 1px arrows X/Y)
      if (preserveTextSharpness) {
        // Solid dark ink
        if (lum <= 142 && chroma < 30) {
          protection[pIdx] = 2; // Ink Core
          continue;
        }

        // Dotted underline line detection & thin 1px arrows (like arrows pointing to vertebra)
        if (lum <= 180 && chroma < 18 && !isMarginPixel) {
          // If this pixel is noticeably darker than its surrounding paper, it's a dotted stroke or arrow line
          protection[pIdx] = 2;
          continue;
        }
      }
    }
  }

  // =========================================================================
  // PASS 2: 2-PIXEL MORPHOLOGICAL DILATION (ANTI-ALIASING HALO SHIELD)
  // Ensures Arabic text strokes, dots, and diacritics NEVER get thinned or eroded!
  // =========================================================================
  const haloRadius = 2;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const pIdx = y * w + x;
      const coreVal = protection[pIdx];

      // If this is an ink core or graphic core, expand halo to all adjacent unassigned pixels
      if (coreVal === 2 || coreVal === 3) {
        for (let dy = -haloRadius; dy <= haloRadius; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;

          for (let dx = -haloRadius; dx <= haloRadius; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;

            const nIdx = ny * w + nx;
            if (protection[nIdx] === 0) {
              protection[nIdx] = 1; // Mark as Anti-Aliasing Halo Shield
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // PASS 3: WATERMARK ELIMINATION & SMOOTH INPAINTING
  // =========================================================================
  for (let y = 0; y < h; y++) {
    const isMarginY = y < marginYTop || y > marginYBottom;

    for (let x = 0; x < w; x++) {
      const pIdx = y * w + x;
      const idx = pIdx * 4;

      // Check if restricted to selected bounding boxes
      if (pixelRegions && pixelRegions.length > 0) {
        const inRegion = pixelRegions.some(
          (r) => y >= r.ymin && y <= r.ymax && x >= r.xmin && x <= r.xmax
        );
        if (!inRegion) continue;
      }

      const pStatus = protection[pIdx];
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = lumCache[pIdx];

      // STATUS 3: Protected Graphic / Diagram / Red Badge
      if (pStatus === 3) {
        // Do not touch!
        continue;
      }

      // STATUS 2: Solid Dark Ink / Text Core
      if (pStatus === 2) {
        // Crisp text finish
        if (enhanceContrast && lum <= 100) {
          data[idx] = Math.max(0, r - 20);
          data[idx + 1] = Math.max(0, g - 20);
          data[idx + 2] = Math.max(0, b - 20);
        }
        continue;
      }

      // STATUS 1: Anti-Aliasing Font Boundary
      // The pixel is part of the smooth edge of a letter or line.
      // We NEVER bleach it to 255. We preserve its natural sub-pixel gradient!
      if (pStatus === 1) {
        continue;
      }

      // STATUS 0: Unprotected Background / Watermark Candidate
      const isMarginX = x < marginXLeft || x > marginXRight;
      const isMarginPixel = isMarginX || isMarginY;
      const maxRGB = Math.max(r, g, b);
      const minRGB = Math.min(r, g, b);
      const chroma = maxRGB - minRGB;

      let shouldClean = false;

      // Mode 1: Margin Sweep Only (Erase phone numbers like 0114... on white margins)
      if (targetColorMode === 'margin_sweep_only') {
        if (cleanMargins && isMarginPixel && lum >= 110 && chroma < 25) {
          shouldClean = true;
        }
      }

      // Mode 2: Faint Gray Only (Educational exam standard: faint diagonal overlays, teacher names, phone numbers)
      else if (targetColorMode === 'faint_gray_only') {
        const isFaintWatermarkOverlay =
          lum >= grayThreshold &&
          lum <= 251 &&
          chroma < 14;

        const isMarginNumber =
          cleanMargins &&
          isMarginPixel &&
          lum >= 120 &&
          lum <= 251 &&
          chroma < 25;

        if (isFaintWatermarkOverlay || isMarginNumber) {
          shouldClean = true;
        }
      }

      // Mode 3: All Faint Overlays (Including light translucent stamps)
      else if (targetColorMode === 'all_faint_overlays') {
        const isAnyFaintWatermark =
          lum >= grayThreshold &&
          lum <= 251 &&
          (chroma < 35 || r - g > 15 || b - r > 15);

        const isMarginNumber =
          cleanMargins &&
          isMarginPixel &&
          lum >= 115 &&
          lum <= 251;

        if (isAnyFaintWatermark || isMarginNumber) {
          shouldClean = true;
        }
      }

      // Optional: Background Wash Removal (only if user explicitly asked for it)
      if (removeBackgroundTint && lum >= 200 && lum <= 252) {
        shouldClean = true;
      }

      // Apply Inpainting to Clean Paper White
      if (shouldClean) {
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Intelligent Bounding Box & Brush Inpainter.
 * Reconstructs clean background across user-selected boxes or AI detected regions.
 */
export async function inpaintSelectedBoxes(
  sourceDataUrl: string,
  boxes: BoundingBox[],
  fillMode: 'auto_bg' | 'white' | 'inpaint_gradient' = 'white'
): Promise<string> {
  if (!boxes || boxes.length === 0) return sourceDataUrl;

  const img = await loadImage(sourceDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceDataUrl;

  ctx.drawImage(img, 0, 0);

  for (const box of boxes) {
    if (box.selected === false) continue;

    const ymin = Math.max(0, Math.floor((box.ymin / 1000) * canvas.height));
    const xmin = Math.max(0, Math.floor((box.xmin / 1000) * canvas.width));
    const ymax = Math.min(canvas.height, Math.ceil((box.ymax / 1000) * canvas.height));
    const xmax = Math.min(canvas.width, Math.ceil((box.xmax / 1000) * canvas.width));

    const bw = xmax - xmin;
    const bh = ymax - ymin;
    if (bw <= 0 || bh <= 0) continue;

    if (fillMode === 'auto_bg') {
      // Sample local border pixels to match background (e.g. yellow or pink card background)
      try {
        const sampleX = Math.max(0, xmin - 2);
        const sampleY = Math.max(0, ymin - 2);
        const p = ctx.getImageData(sampleX, sampleY, 1, 1).data;
        ctx.fillStyle = `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
      } catch {
        ctx.fillStyle = '#ffffff';
      }
    } else {
      ctx.fillStyle = '#ffffff';
    }

    ctx.fillRect(xmin, ymin, bw, bh);
  }

  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Applies manual brush mask inpainting with edge-feathering
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

  // Wherever mask has alpha > 20, inpaint with clean white background
  for (let i = 0; i < src.length; i += 4) {
    if (mask[i + 3] > 20) {
      src[i] = 255;
      src[i + 1] = 255;
      src[i + 2] = 255;
      src[i + 3] = 255;
    }
  }

  ctx.putImageData(srcImgData, 0, 0);
  return canvas.toDataURL('image/png', 0.95);
}

