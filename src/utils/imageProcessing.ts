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
    lightnessThreshold: 172,
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
    lightnessThreshold: 165,
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
    lightnessThreshold: 175,
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
    lightnessThreshold: 145,
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
 * High-precision Document Watermark Removal Engine.
 * 
 * CRITICAL DESIGN RULE:
 * Must strictly preserve all color photos, illustrations (e.g. biology cells, food, diagrams),
 * colored circular badges (01, 02, 03, 04), colored question boxes (yellow/pink), and dark text.
 * Only targets faint gray / translucent watermarks (or phone numbers on empty margins).
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
    lightnessThreshold = 172,
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

  // Selected regions if in 'selected_regions_only' mode
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

  const sensFactor = colorSensitivity / 100;
  const grayThreshold = Math.max(135, Math.min(245, lightnessThreshold));

  for (let y = 0; y < h; y++) {
    const isMarginY = y < marginYTop || y > marginYBottom;

    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      // If restricted to specific bounding boxes
      if (pixelRegions && pixelRegions.length > 0) {
        const inRegion = pixelRegions.some(
          (r) => y >= r.ymin && y <= r.ymax && x >= r.xmin && x <= r.xmax
        );
        if (!inRegion) continue;
      }

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 15) continue; // Transparent pixel

      // Already pure white background
      if (r >= 252 && g >= 252 && b >= 252) {
        continue;
      }

      // Relative luminance (Rec. 709)
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      const isMarginX = x < marginXLeft || x > marginXRight;
      const isMarginPixel = isMarginX || isMarginY;

      // Chromaticity & color differences
      const maxRGB = Math.max(r, g, b);
      const minRGB = Math.min(r, g, b);
      const chroma = maxRGB - minRGB;

      const diffRed = r - Math.max(g, b);
      const diffBlue = b - Math.max(r, g);
      const diffGreen = g - Math.max(r, b);

      // ==========================================
      // 1. STRICT COLOR & PHOTO PROTECTION GUARDS
      // ==========================================

      // A. Solid Dark Body Text & Lines (black, dark navy, deep gray)
      const isSolidDarkText = preserveTextSharpness && luminance < 125 && chroma < 35;
      if (isSolidDarkText) {
        if (enhanceContrast && luminance < 95) {
          data[idx] = Math.max(0, r - 25);
          data[idx + 1] = Math.max(0, g - 25);
          data[idx + 2] = Math.max(0, b - 25);
        }
        continue;
      }

      // B. Red question headers (e.g. "(1) إلام تشير... ", "أجب", red question markers)
      const isRedQuestionHeader =
        preserveRedQuestions &&
        diffRed > 40 &&
        r > 120 &&
        g < 110 &&
        b < 110 &&
        luminance < 160;
      if (isRedQuestionHeader) {
        continue;
      }

      // C. Photos, Illustrations & Colored Diagrams (Food pictures, cells, badges 01/02/03/04, colored curves)
      // Any pixel with noticeable color saturation (chroma >= 22) belongs to an illustration/photo/diagram!
      if (preserveAllColorsAndPhotos) {
        // Colored badge / photo / graphic pixel
        if (chroma >= 20) {
          // If this is a genuine colored graphic (blue badge 01, green badge 02, purple badge 03, pink badge 04,
          // yellow question container background, green salad, brown meat, red cells, etc.)
          // NEVER TOUCH IT!
          continue;
        }

        // Colored box background tint (like light yellow question boxes: r~250, g~248, b~200, chroma>15)
        if (!removeBackgroundTint && chroma >= 12 && (r > 200 || g > 200)) {
          continue;
        }
      }

      // ==========================================
      // 2. TARGETED WATERMARK ELIMINATION RULES
      // ==========================================

      let shouldErase = false;

      // MODE 1: Margin Sweep Only (Cleans phone numbers like 0114... on the white margins)
      if (targetColorMode === 'margin_sweep_only') {
        if (cleanMargins && isMarginPixel && luminance >= grayThreshold && chroma < 25) {
          shouldErase = true;
        }
      }

      // MODE 2: Faint Gray Overlays (The most common school/exam watermark: light gray diagonal text, phone numbers)
      else if (targetColorMode === 'faint_gray_only') {
        // A watermark has high/medium luminance (faint text) and NEUTRAL color (low chroma < 18)
        const isFaintNeutralWatermark =
          luminance >= grayThreshold &&
          luminance < 252 &&
          chroma < 18;

        // Margin numbers (can be slightly darker on the blank side margin)
        const isMarginDigit =
          cleanMargins &&
          isMarginPixel &&
          luminance >= 135 &&
          luminance < 252 &&
          chroma < 25;

        if (isFaintNeutralWatermark || isMarginDigit) {
          shouldErase = true;
        }
      }

      // MODE 3: All Faint Overlays (Including translucent colored stamps)
      else if (targetColorMode === 'all_faint_overlays') {
        const isFaintAnyWatermark =
          luminance >= grayThreshold &&
          luminance < 252 &&
          (chroma < 35 || diffBlue > 20 || diffRed > 20);

        const isMarginDigit =
          cleanMargins &&
          isMarginPixel &&
          luminance >= 130 &&
          luminance < 252;

        if (isFaintAnyWatermark || isMarginDigit) {
          shouldErase = true;
        }
      }

      // Optional: Background Wash Removal (only if user explicitly enables it)
      if (removeBackgroundTint && luminance >= 210 && luminance < 252) {
        shouldErase = true;
      }

      // Apply Erase to pure background
      if (shouldErase) {
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
 * Applies manual brush mask inpainting
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

  // Wherever mask has alpha > 20, inpaint with white background
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
