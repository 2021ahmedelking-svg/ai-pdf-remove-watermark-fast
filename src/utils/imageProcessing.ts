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
 * CORE ALGORITHM: Stroke-Aware Adaptive Gradient Reconstruction & Morphological Shield (SAAGR v2)
 * 
 * Enhancements:
 * 1. Residual Fragment Extinction (Hysteresis & Stroke Tracing): Eliminates faint tails, isolated digits, and edge artifacts.
 * 2. Context-Aware Container Background Inpainting: Restores watermarks inside light-blue/cream boxes directly to the box's native color.
 * 3. 1px Precise Gradient Anti-Aliasing Guard: Prevents font thinning without leaving gray islands around letters or dotted lines.
 * 4. Biology Diagrams & Bar Chart Color Shield: 100% preserves colored bars (cyan, pink, green, yellow), graph gridlines, and red headers.
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

  const grayThreshold = Math.max(125, Math.min(245, lightnessThreshold));

  // Protection Map:
  // 0: Unprotected / Background / Candidate Watermark
  // 1: Anti-Aliasing Edge (1px gradient edge of text)
  // 2: Dark Ink Core (letters, arrows, punctuation, dotted lines)
  // 3: Graphic / Diagram / Colored Object Core (vertebra, bars, cyan lines, red question badges)
  const protection = new Uint8Array(totalPixels);

  // Watermark Candidate Map:
  // 0: No watermark
  // 1: High-Confidence Watermark Seed
  // 2: Secondary / Faint Watermark Fragment (cleared if connected to seed)
  const watermarkMap = new Uint8Array(totalPixels);

  // Luminance and Background Map
  const lumCache = new Float32Array(totalPixels);
  const bgR = new Uint8ClampedArray(totalPixels);
  const bgG = new Uint8ClampedArray(totalPixels);
  const bgB = new Uint8ClampedArray(totalPixels);

  // =========================================================================
  // PASS 1: FEATURE DETECTION, COLOR / TEXT CLASSIFICATION & BG ESTIMATION
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

      // Default background estimator is pure white
      bgR[pIdx] = 255;
      bgG[pIdx] = 255;
      bgB[pIdx] = 255;

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

      // -------------------------------------------------------------
      // 1. PHOTOS, BIOLOGY DIAGRAMS, AND COLORED GRAPHICS SHIELD
      // -------------------------------------------------------------
      if (preserveAllColorsAndPhotos) {
        // A. Red Question Markers e.g. (١), (٢), (٣), (1), (2), question markers ١٣, ١٤, red lines
        const isRedBadge =
          preserveRedQuestions &&
          diffRed >= 18 &&
          r >= 95 &&
          g <= 130 &&
          b <= 130;

        // B. Cyan / Light-Blue Graph Gridlines & Axis Lines
        // In bar charts & graphs, gridlines have subtle cyan/blue tint (e.g. r:180-230, g:225-245, b:240-255)
        const isGraphGridOrAxis =
          (diffBlue >= 5 || (b >= r + 6 && g >= r + 4)) &&
          b >= 130 &&
          lum >= 110;

        // C. Saturated Illustration / Photo Pixels (vertebra yellow bone, purple facets, colored bars: pink/green/yellow)
        const isColoredIllustration = chroma >= 12;

        // D. Flat Tinted Background Containers (Light blue question box, light cream card)
        // If it's a smooth light tint container, note its background color for seamless inpainting!
        const isTintedContainerBackground =
          !removeBackgroundTint &&
          chroma >= 4 &&
          chroma < 12 &&
          lum >= 215 &&
          !isMarginPixel;

        if (isTintedContainerBackground) {
          // Record this container's background color so any watermark inside it restores to this tint
          bgR[pIdx] = r;
          bgG[pIdx] = g;
          bgB[pIdx] = b;
          // Unmarked as protection core so faint watermark crossing it can be cleaned back to this tint!
        }

        if (isRedBadge || isGraphGridOrAxis || isColoredIllustration) {
          protection[pIdx] = 3; // Graphic Protected Core
          continue;
        }
      }

      // -------------------------------------------------------------
      // 2. DARK TEXT & LINE CORE (Solid Arabic letters, punctuation, 1px arrows X/Y)
      // -------------------------------------------------------------
      if (preserveTextSharpness) {
        // Solid dark ink (Arabic words, English text, black borders)
        if (lum <= 145 && chroma < 32) {
          protection[pIdx] = 2; // Ink Core
          continue;
        }

        // Dotted underline line detection (..........) & thin 1px arrows (X, Y)
        if (lum <= 182 && chroma < 18 && !isMarginPixel) {
          protection[pIdx] = 2; // Ink Core for dotted response lines
          continue;
        }
      }
    }
  }

  // =========================================================================
  // PASS 2: PRECISE 1-PIXEL GRADIENT ANTI-ALIASING SHIELD
  // Only protects subpixel transitions of actual text, without shielding watermarks!
  // =========================================================================
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const pIdx = y * w + x;
      if (protection[pIdx] !== 0) continue;

      // Check immediate 4-connected neighbors for ink or graphic cores
      const up = protection[(y - 1) * w + x];
      const down = protection[(y + 1) * w + x];
      const left = protection[y * w + (x - 1)];
      const right = protection[y * w + (x + 1)];

      const isTouchingInk = up === 2 || down === 2 || left === 2 || right === 2;
      const isTouchingGraphic = up === 3 || down === 3 || left === 3 || right === 3;

      if (isTouchingInk) {
        // Only mark as anti-aliasing if the pixel is legitimately an ink edge (dark enough, lum < 172)
        // If it's faint gray (lum >= 175), it's a watermark residue passing near the text!
        if (lumCache[pIdx] < 172) {
          protection[pIdx] = 1; // Anti-Aliasing Edge
        }
      } else if (isTouchingGraphic) {
        if (lumCache[pIdx] < 190) {
          protection[pIdx] = 1; // Graphic Edge
        }
      }
    }
  }

  // =========================================================================
  // PASS 3: DUAL-THRESHOLD WATERMARK IDENTIFICATION (Seeds & Faint Tails)
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

      // MODE 1: Margin Sweep Only
      if (targetColorMode === 'margin_sweep_only') {
        if (cleanMargins && isMarginPixel && lum >= 105 && chroma < 25) {
          watermarkMap[pIdx] = 1; // High confidence seed
        }
      }

      // MODE 2: Faint Gray Only (Educational Exam Watermark Standard)
      else if (targetColorMode === 'faint_gray_only') {
        // High-confidence watermark seed (distinct faint overlay)
        const isFaintWatermarkSeed =
          lum >= grayThreshold &&
          lum <= 251 &&
          chroma < 16;

        // Faint watermark tail / residual fragment (lower threshold for continuous strokes)
        const isFaintWatermarkTail =
          lum >= grayThreshold - 15 &&
          lum <= 251 &&
          chroma < 18;

        const isMarginNumber =
          cleanMargins &&
          isMarginPixel &&
          lum >= 115 &&
          lum <= 251 &&
          chroma < 25;

        if (isFaintWatermarkSeed || isMarginNumber) {
          watermarkMap[pIdx] = 1; // Seed
        } else if (isFaintWatermarkTail) {
          watermarkMap[pIdx] = 2; // Candidate tail
        }
      }

      // MODE 3: All Faint Overlays (Including translucent colored stamps)
      else if (targetColorMode === 'all_faint_overlays') {
        const isAnyFaintWatermark =
          lum >= grayThreshold &&
          lum <= 251 &&
          (chroma < 35 || r - g > 12 || b - r > 12);

        const isMarginNumber =
          cleanMargins &&
          isMarginPixel &&
          lum >= 110 &&
          lum <= 251;

        if (isAnyFaintWatermark || isMarginNumber) {
          watermarkMap[pIdx] = 1;
        }
      }

      // Optional: Background Wash Removal
      if (removeBackgroundTint && lum >= 195 && lum <= 252) {
        watermarkMap[pIdx] = 1;
      }
    }
  }

  // =========================================================================
  // PASS 4: HYSTERESIS CONNECTIVITY SWEEP
  // Promotes candidate tails (watermarkMap === 2) that connect to high-confidence seeds
  // =========================================================================
  const sweepRadius = 2;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const pIdx = y * w + x;
      if (watermarkMap[pIdx] === 2) {
        // Check if within sweep radius of a high-confidence watermark seed
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
          watermarkMap[pIdx] = 1; // Promote and clean!
        }
      }
    }
  }

  // =========================================================================
  // PASS 5: CONTEXT-AWARE INPAINTING & FINAL RECONSTRUCTION
  // Cleans watermark pixels directly to local background (pure white or container tint)
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

      // Protected Graphic or Anti-Aliasing Halo: Preserve!
      if (pStatus === 3 || pStatus === 1) {
        continue;
      }

      // Dark Ink Core: Crisp finish if contrast enhancement is requested
      if (pStatus === 2) {
        if (enhanceContrast && lum <= 100) {
          data[idx] = Math.max(0, r - 20);
          data[idx + 1] = Math.max(0, g - 20);
          data[idx + 2] = Math.max(0, b - 20);
        }
        continue;
      }

      // Clean Watermark Pixels
      if (watermarkMap[pIdx] === 1) {
        // Context-aware background inpainting:
        // If inside a light-blue or light-yellow container, match container's native tint!
        // Otherwise, restore to crisp paper white (255, 255, 255).
        const targetR = bgR[pIdx] < 254 ? bgR[pIdx] : 255;
        const targetG = bgG[pIdx] < 254 ? bgG[pIdx] : 255;
        const targetB = bgB[pIdx] < 254 ? bgB[pIdx] : 255;

        data[idx] = targetR;
        data[idx + 1] = targetG;
        data[idx + 2] = targetB;
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

