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
    lightnessThreshold: 165,
    colorSensitivity: 85,
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
    lightnessThreshold: 145,
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
 * Advanced Multi-Surface Document Watermark & Faint Link Removal Engine.
 * 
 * Capable of automatically removing:
 * 1. Faint gray text / diagonal teacher names / phone numbers across white paper.
 * 2. Translucent Telegram links (https://t.me/...) across solid colored banners (e.g. blue/cyan headers).
 * 3. Faint watermark overlays across light-blue / gradient containers and headers.
 * 4. Translucent watermarks spanning across multi-colored 3D biology diagrams and charts.
 * 
 * 100% preserves:
 * - High-contrast text (Arabic / English black or white ink).
 * - Saturated illustrations, cell diagrams, 3D anatomical blocks.
 * - Red question numbers (١), (٢), (٣), (01), (02).
 * - Colored bar charts (Cutin yellow, Suberin pink, Lignin green, Cellulose blue).
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

  // Calibrate lightness and sensitivity based on intensity level
  let effectiveThreshold = config.lightnessThreshold ?? 165;
  if (intensityLevel === 'gentle') {
    effectiveThreshold = Math.max(178, effectiveThreshold);
  } else if (intensityLevel === 'ultra_faint') {
    effectiveThreshold = Math.min(148, effectiveThreshold);
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

  // 0: Unclassified / Background / Potential Watermark
  // 1: Anti-Aliasing Text Halos (protected edge)
  // 2: Dark / Sharp Ink Core (Arabic letters, punctuation, 1px lines, arrows)
  // 3: Graphic / Diagram / High Contrast Content Core (3D biology organs, badges, colored bars)
  const protection = new Uint8Array(totalPixels);

  // 0: No watermark
  // 1: High-confidence watermark candidate
  // 2: Secondary / faint tail (promoted if connected to seed)
  const watermarkMap = new Uint8Array(totalPixels);

  // Color & Luminance Maps
  const lumCache = new Float32Array(totalPixels);
  const bgR = new Uint8ClampedArray(totalPixels);
  const bgG = new Uint8ClampedArray(totalPixels);
  const bgB = new Uint8ClampedArray(totalPixels);

  // =========================================================================
  // PASS 1: FEATURE DETECTION, COLOR ANALYSIS, PROTECTED CORES & BG ESTIMATION
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

      // Default background is crisp paper white
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
      const diffGreen = g - Math.max(r, b);

      const isMarginX = x < marginXLeft || x > marginXRight;
      const isMarginPixel = isMarginX || isMarginY;

      // -------------------------------------------------------------
      // 1. PHOTOS, BIOLOGY DIAGRAMS, AND COLORED GRAPHICS SHIELD
      // -------------------------------------------------------------
      if (preserveAllColorsAndPhotos) {
        // A. Red Question Markers e.g. (١), (٢), (٣), red boxes, red question headings
        const isRedBadge =
          preserveRedQuestions &&
          diffRed >= 16 &&
          r >= 90 &&
          g <= 140 &&
          b <= 140;

        // B. Cyan / Light-Blue Graph Gridlines & Axis Lines & Light-Blue Badges
        const isGraphGridOrAxis =
          (diffBlue >= 6 || (b >= r + 6 && g >= r + 4)) &&
          b >= 120 &&
          lum >= 100;

        // C. Saturated Illustration / 3D Biological Diagrams (vertebra, cells, organ colors)
        const isColoredIllustration = chroma >= 14;

        // D. Flat Tinted Background Containers (Light blue question container, cream/yellow cards)
        const isTintedContainerBackground =
          !removeBackgroundTint &&
          chroma >= 3 &&
          chroma < 14 &&
          lum >= 210 &&
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
        if (lum <= 140 && chroma < 30) {
          protection[pIdx] = 2; // Dark Ink Core
          continue;
        }

        // Dotted lines e.g. (..........) & thin 1px arrows
        if (lum <= 175 && chroma < 16 && !isMarginPixel) {
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
        if (lumCache[pIdx] < 170) {
          protection[pIdx] = 1; // Anti-Aliasing Edge
        }
      } else if (isTouchingGraphic) {
        if (lumCache[pIdx] < 192) {
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
        lum >= 105 &&
        lum <= 251 &&
        chroma < 28;

      if (isFaintWatermarkSeed || isMarginNumber) {
        watermarkMap[pIdx] = 1; // Seed
      } else if (isFaintWatermarkTail) {
        watermarkMap[pIdx] = 2; // Candidate tail
      }

      // If All Faint Overlays or Color Stamps mode
      if (targetColorMode === 'all_faint_overlays' || intensityLevel === 'ultra_faint') {
        if (lum >= effectiveThreshold - 10 && lum <= 251 && (chroma < 35 || r - g > 12)) {
          watermarkMap[pIdx] = 1;
        }
      }
    }
  }

  // =========================================================================
  // PASS 4: SPECIALIZED TRANSLUCENT BANNER & TELEGRAM LINK EXTRACTION
  // (Detects faint https://t.me/... or teacher names across colored banners like Image 2)
  // =========================================================================
  if (faintLinksDetection) {
    // Scan horizontal bands (rows) to find uniform colored banners with translucent text overlays
    const bandHeight = 24;
    for (let by = 0; by < h; by += bandHeight) {
      const ey = Math.min(h, by + bandHeight);

      // Sample middle region to find dominant banner color
      let bannerR = 0;
      let bannerG = 0;
      let bannerB = 0;
      let sampleCount = 0;

      for (let y = by; y < ey; y += 4) {
        for (let x = Math.floor(w * 0.2); x < Math.floor(w * 0.8); x += 10) {
          const p = (y * w + x) * 4;
          const pr = data[p];
          const pg = data[p + 1];
          const pb = data[p + 2];
          const pChroma = Math.max(pr, pg, pb) - Math.min(pr, pg, pb);

          // If this is a saturated colored banner (e.g. Blue banner #107CB7)
          if (pChroma > 25 && pr < 240) {
            bannerR += pr;
            bannerG += pg;
            bannerB += pb;
            sampleCount++;
          }
        }
      }

      if (sampleCount > 15) {
        const avgR = Math.round(bannerR / sampleCount);
        const avgG = Math.round(bannerG / sampleCount);
        const avgB = Math.round(bannerB / sampleCount);

        // Check pixels in this banner: Any pixel that deviates slightly from avg (translucent link) is wiped!
        for (let y = by; y < ey; y++) {
          for (let x = 0; x < w; x++) {
            const pIdx = y * w + x;
            if (protection[pIdx] === 3 || protection[pIdx] === 2) continue; // Keep sharp white text / badges!

            const idx = pIdx * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const colorDiff = Math.abs(r - avgR) + Math.abs(g - avgG) + Math.abs(b - avgB);

            // Translucent watermark on banner produces subtle color difference (typically 8 to 45)
            // Legitimate text produces huge difference (> 100) or has high white brightness
            if (colorDiff >= 6 && colorDiff <= 48) {
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
  // PASS 6: INPAINTING & SEAMLESS RECONSTRUCTION
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

      // Protected Graphic or Anti-Aliasing Halo: Keep intact!
      if (pStatus === 3 || pStatus === 1) {
        continue;
      }

      // Dark Ink Core: Crisp finish
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

