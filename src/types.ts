export type RemovalEngineType = 'ai_smart' | 'color_threshold' | 'vector_clean' | 'manual_brush' | 'hybrid';

export type WatermarkPresetType = 
  | 'educational_exams'    // مذكرات وامتحانات مدرسية (أرقام هواتف، أسماء مدرسين، علامات مائلة)
  | 'margin_numbers'       // أرقام وهوامش جانبية
  | 'color_stamps'         // أختام ملونة وكام سكانر
  | 'confidential_draft'   // مسودات وعقود سرية
  | 'aggressive_deep'      // تنظيف شامل فائق الحساسية
  | 'custom';              // تخصيص يدوي

export type AppOperatingMode = 'auto' | 'manual';

export interface CustomManualTarget {
  id: string;
  textQuery: string;
  box2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
}

export interface BoundingBox {
  id: string;
  ymin: number; // 0 - 1000
  xmin: number;
  ymax: number;
  xmax: number;
  label?: string;
  type?: 'diagonal_text' | 'header_footer_stamp' | 'logo_seal' | 'tiled_pattern' | 'background_wash' | 'manual_box' | 'margin_watermark' | 'custom_prompt';
  confidence?: number;
  color?: string;
  selected?: boolean;
}

export interface PDFPageData {
  pageNumber: number;
  originalCanvasDataUrl: string;
  cleanedCanvasDataUrl: string | null;
  width: number;
  height: number;
  aspectRatio: number;
  detectedWatermarks: BoundingBox[];
  isProcessing: boolean;
  statusMessage?: string;
  hasVectorModifications?: boolean;
}

export interface PDFDocumentState {
  file: File | null;
  fileName: string;
  fileSize: number;
  totalPages: number;
  currentPageIndex: number; // 0-based
  pages: PDFPageData[];
  rawPdfBase64: string | null;
  isAnalyzing: boolean;
  isBatchProcessing: boolean;
  batchProgress: number; // 0 - 100
}

export type RemovalIntensityLevel = 'gentle' | 'balanced' | 'ultra_faint';

export interface RemovalConfig {
  engine: RemovalEngineType;
  preset: WatermarkPresetType;
  intensityLevel?: RemovalIntensityLevel;
  faintLinksDetection?: boolean; // Specifically strip translucent t.me, URLs, and faint background names across headers/diagrams
  cleanScope: 'full_page' | 'selected_regions_only';
  cleanMargins: boolean;
  preserveAllColorsAndPhotos: boolean; // 100% protect photos, colored diagrams, badges (01,02,03,04)
  targetColorMode: 'faint_gray_only' | 'all_faint_overlays' | 'margin_sweep_only';
  removeAnnotations: boolean;
  removeArtifacts: boolean;
  colorSensitivity: number; // 10 - 100
  lightnessThreshold: number; // 120 - 250
  preserveTextSharpness: boolean;
  preserveRedQuestions: boolean; // Protect dark red question titles (1), (2), etc.
  enhanceContrast: boolean; // Makes true original text ultra black & crisp
  removeBackgroundTint: boolean; // Remove light pink / yellow / gray page background washes
  customKeywords: string;
  maskColorType: 'auto_bg' | 'white' | 'inpaint_gradient';
  brushSize: number;
}

export interface LanguageStrings {
  title: string;
  tagline: string;
  uploadTitle: string;
  uploadSubtitle: string;
  dropHere: string;
  browseFiles: string;
  trySample: string;
  sample1: string;
  sample2: string;
  sample3: string;
  before: string;
  after: string;
  detectWatermarks: string;
  removeWatermark: string;
  removeAllPages: string;
  downloadPdf: string;
  downloadCurrentPage: string;
  page: string;
  of: string;
  watermarksFound: string;
  noWatermarksFound: string;
  aiDetection: string;
  colorThreshold: string;
  vectorPurge: string;
  manualBrush: string;
  brushSize: string;
  sensitivity: string;
  clearBrush: string;
  applyEraser: string;
  processing: string;
  ready: string;
  resetAll: string;
  zoomIn: string;
  zoomOut: string;
  fitPage: string;
  splitView: string;
  sideBySide: string;
  afterOnly: string;
  beforeOnly: string;
  confidence: string;
  exportQuality: string;
  allPagesCleaned: string;
  successNotification: string;
  customKeywordPlaceholder: string;
  arabicLang: string;
  englishLang: string;
}
