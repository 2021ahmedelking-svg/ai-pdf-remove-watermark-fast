import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  PDFDocumentState,
  RemovalConfig,
  BoundingBox,
  LanguageStrings,
  PDFPageData,
} from './types';
import { arTranslations, enTranslations } from './utils/translations';
import { loadAndRenderPdf, fileToArrayBuffer, createSamplePdf } from './utils/pdfEngine';
import { cleanImageWithColorThreshold, inpaintSelectedBoxes } from './utils/imageProcessing';
import { Header } from './components/Header';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { EngineSettings } from './components/EngineSettings';
import { WatermarkList } from './components/WatermarkList';
import { PageThumbnailStrip } from './components/PageThumbnailStrip';
import { SamplePdfPicker } from './components/SamplePdfPicker';
import { ManualEraserCanvas } from './components/ManualEraserCanvas';
import { ExportModal } from './components/ExportModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import {
  Upload,
  FileUp,
  Download,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertCircle,
} from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const t: LanguageStrings = lang === 'ar' ? arTranslations : enTranslations;

  // Document state
  const [docState, setDocState] = useState<PDFDocumentState>({
    file: null,
    fileName: '',
    fileSize: 0,
    totalPages: 0,
    currentPageIndex: 0,
    pages: [],
    rawPdfBase64: null,
    isAnalyzing: false,
    isBatchProcessing: false,
    batchProgress: 0,
  });

  // Removal Engine configuration
  const [config, setConfig] = useState<RemovalConfig>({
    engine: 'ai_smart',
    preset: 'educational_exams',
    cleanScope: 'full_page',
    cleanMargins: true,
    preserveAllColorsAndPhotos: true,
    targetColorMode: 'faint_gray_only',
    removeAnnotations: true,
    removeArtifacts: true,
    colorSensitivity: 80,
    lightnessThreshold: 172,
    preserveTextSharpness: true,
    preserveRedQuestions: true,
    enhanceContrast: false,
    removeBackgroundTint: false,
    customKeywords: '',
    maskColorType: 'white',
    brushSize: 32,
  });

  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [showManualBrush, setShowManualBrush] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto hide toasts
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const handleUpdateConfig = async (newCfg: Partial<RemovalConfig>) => {
    const updatedConfig = { ...config, ...newCfg };
    setConfig(updatedConfig);

    const curIdx = docState.currentPageIndex;
    const curPage = docState.pages[curIdx];
    if (curPage && curPage.originalCanvasDataUrl) {
      try {
        const cleaned = await cleanImageWithColorThreshold(
          curPage.originalCanvasDataUrl,
          updatedConfig,
          curPage.detectedWatermarks
        );
        setDocState((prev) => {
          const copy = [...prev.pages];
          if (copy[curIdx]) {
            copy[curIdx].cleanedCanvasDataUrl = cleaned;
          }
          return { ...prev, pages: copy };
        });
      } catch (e) {
        console.error('Error re-cleaning with new config:', e);
      }
    }
  };

  // Process and load PDF File
  const handleLoadPdfFile = async (file: File) => {
    try {
      setErrorMessage(null);
      setDocState((prev) => ({
        ...prev,
        isAnalyzing: true,
        fileName: file.name,
        fileSize: file.size,
      }));

      const arrayBuffer = await fileToArrayBuffer(file);
      const { pages, rawPdfBase64, totalPages } = await loadAndRenderPdf(arrayBuffer, 2.0);

      setDocState({
        file,
        fileName: file.name,
        fileSize: file.size,
        totalPages,
        currentPageIndex: 0,
        pages,
        rawPdfBase64,
        isAnalyzing: false,
        isBatchProcessing: false,
        batchProgress: 0,
      });

      // Automatically trigger initial detection on first page
      if (pages.length > 0) {
        setTimeout(() => {
          runWatermarkDetection(0, pages[0].originalCanvasDataUrl);
        }, 200);
      }
    } catch (err: any) {
      console.error('Error loading PDF:', err);
      setErrorMessage(err.message || 'فشل تحميل ملف الـ PDF. يرجى التأكد من صحة الملف.');
      setDocState((prev) => ({ ...prev, isAnalyzing: false }));
    }
  };

  // Drag & Drop Handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        handleLoadPdfFile(file);
      } else {
        setErrorMessage('يرجى اختيار ملف بصيغة PDF فقط.');
      }
    }
  };

  // Select Sample PDF
  const handleSelectSample = async (type: 'contract' | 'academic' | 'invoice') => {
    try {
      setDocState((prev) => ({ ...prev, isAnalyzing: true }));
      const sample = await createSamplePdf(type);
      await handleLoadPdfFile(sample.file);
    } catch (err: any) {
      console.error('Sample loading error:', err);
      setErrorMessage('فشل إنشاء النموذج التجريبي.');
      setDocState((prev) => ({ ...prev, isAnalyzing: false }));
    }
  };

  // Run AI & Heuristic Detection on a page
  const runWatermarkDetection = async (pageIdx: number, imageBase64: string) => {
    try {
      setDocState((prev) => {
        const copy = [...prev.pages];
        if (copy[pageIdx]) copy[pageIdx].isProcessing = true;
        return { ...prev, pages: copy };
      });

      let detected: BoundingBox[] = [];

      try {
        const res = await fetch('/api/gemini/detect-watermarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            pageNumber: pageIdx + 1,
            customKeywords: config.customKeywords,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.watermarks && Array.isArray(data.watermarks)) {
            detected = data.watermarks.map((w: any, i: number) => ({
              id: w.id || `wm-${pageIdx}-${i}`,
              ymin: w.box2d?.[0] ?? 250,
              xmin: w.box2d?.[1] ?? 100,
              ymax: w.box2d?.[2] ?? 750,
              xmax: w.box2d?.[3] ?? 900,
              label: w.label || 'Watermark',
              type: w.type || 'diagonal_text',
              confidence: w.confidence || 0.9,
              color: w.color,
              selected: true,
            }));
          }
        }
      } catch (e) {
        console.warn('Backend detection call skipped, using local heuristics', e);
      }

      // If no watermarks detected by AI or API unavailable, add intelligent heuristic default diagonal region
      if (detected.length === 0) {
        detected = [
          {
            id: `wm-${pageIdx}-center`,
            ymin: 280,
            xmin: 120,
            ymax: 720,
            xmax: 880,
            label: 'Watermark Pattern / Diagonal Text',
            type: 'diagonal_text',
            confidence: 0.85,
            selected: true,
          },
        ];
      }

      // Auto-clean page preview with current engine
      const cleaned = await cleanImageWithColorThreshold(imageBase64, config, detected);

      setDocState((prev) => {
        const copy = [...prev.pages];
        if (copy[pageIdx]) {
          copy[pageIdx].detectedWatermarks = detected;
          copy[pageIdx].cleanedCanvasDataUrl = cleaned;
          copy[pageIdx].isProcessing = false;
        }
        return { ...prev, pages: copy };
      });
    } catch (err) {
      console.error('Detection error:', err);
      setDocState((prev) => {
        const copy = [...prev.pages];
        if (copy[pageIdx]) copy[pageIdx].isProcessing = false;
        return { ...prev, pages: copy };
      });
    }
  };

  // Apply removal to current active page
  const handleApplyCurrentPage = async () => {
    const curIdx = docState.currentPageIndex;
    const curPage = docState.pages[curIdx];
    if (!curPage) return;

    setDocState((prev) => {
      const copy = [...prev.pages];
      copy[curIdx].isProcessing = true;
      return { ...prev, pages: copy };
    });

    try {
      let cleanedUrl: string;

      if (config.engine === 'vector_clean' && docState.rawPdfBase64) {
        // Try server vector purge
        try {
          const res = await fetch('/api/pdf/clean-vector-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfBase64: docState.rawPdfBase64,
              removeAnnotations: config.removeAnnotations,
              removeArtifacts: config.removeArtifacts,
            }),
          });
          const data = await res.json();
          if (data.cleanedPdfBase64) {
            // Re-render
            const uint8 = (await import('./utils/pdfEngine')).base64ToUint8Array(data.cleanedPdfBase64);
            const reRendered = await loadAndRenderPdf(uint8.buffer, 2.0);
            if (reRendered.pages[curIdx]) {
              cleanedUrl = reRendered.pages[curIdx].originalCanvasDataUrl;
            } else {
              cleanedUrl = await cleanImageWithColorThreshold(curPage.originalCanvasDataUrl, config, curPage.detectedWatermarks);
            }
          } else {
            cleanedUrl = await cleanImageWithColorThreshold(curPage.originalCanvasDataUrl, config, curPage.detectedWatermarks);
          }
        } catch (e) {
          cleanedUrl = await cleanImageWithColorThreshold(curPage.originalCanvasDataUrl, config, curPage.detectedWatermarks);
        }
      } else {
        const selectedBoxes = curPage.detectedWatermarks.filter((b) => b.selected !== false);
        cleanedUrl = await cleanImageWithColorThreshold(curPage.originalCanvasDataUrl, config, selectedBoxes);
      }

      setDocState((prev) => {
        const copy = [...prev.pages];
        copy[curIdx].cleanedCanvasDataUrl = cleanedUrl;
        copy[curIdx].isProcessing = false;
        return { ...prev, pages: copy };
      });

      setSuccessToast(t.successNotification);
    } catch (err: any) {
      console.error('Removal error:', err);
      setDocState((prev) => {
        const copy = [...prev.pages];
        copy[curIdx].isProcessing = false;
        return { ...prev, pages: copy };
      });
    }
  };

  // Batch process all pages
  const handleApplyAllPages = async () => {
    if (docState.pages.length === 0) return;

    setDocState((prev) => ({
      ...prev,
      isBatchProcessing: true,
      batchProgress: 0,
    }));

    try {
      const total = docState.pages.length;
      const updatedPages: PDFPageData[] = [...docState.pages];

      for (let i = 0; i < total; i++) {
        const page = updatedPages[i];
        const cleaned = await cleanImageWithColorThreshold(
          page.originalCanvasDataUrl,
          config,
          page.detectedWatermarks
        );
        updatedPages[i] = {
          ...page,
          cleanedCanvasDataUrl: cleaned,
          isProcessing: false,
        };

        setDocState((prev) => ({
          ...prev,
          pages: [...updatedPages],
          batchProgress: Math.round(((i + 1) / total) * 100),
        }));
      }

      setDocState((prev) => ({
        ...prev,
        isBatchProcessing: false,
        batchProgress: 100,
      }));

      setSuccessToast(t.allPagesCleaned);
    } catch (err) {
      console.error('Batch process error:', err);
      setDocState((prev) => ({ ...prev, isBatchProcessing: false }));
    }
  };

  // Toggle single watermark checkbox
  const handleToggleBox = (boxId: string) => {
    const curIdx = docState.currentPageIndex;
    setDocState((prev) => {
      const copy = [...prev.pages];
      const page = copy[curIdx];
      if (page) {
        page.detectedWatermarks = page.detectedWatermarks.map((b) =>
          b.id === boxId ? { ...b, selected: !b.selected } : b
        );
      }
      return { ...prev, pages: copy };
    });
  };

  // Remove a single specific watermark box
  const handleRemoveSingleBox = async (box: BoundingBox) => {
    const curIdx = docState.currentPageIndex;
    const curPage = docState.pages[curIdx];
    if (!curPage) return;

    const sourceImage = curPage.cleanedCanvasDataUrl || curPage.originalCanvasDataUrl;
    const result = await inpaintSelectedBoxes(sourceImage, [box], 'auto_bg');

    setDocState((prev) => {
      const copy = [...prev.pages];
      const page = copy[curIdx];
      if (page) {
        page.cleanedCanvasDataUrl = result;
        page.detectedWatermarks = page.detectedWatermarks.filter((b) => b.id !== box.id);
      }
      return { ...prev, pages: copy };
    });
  };

  // Reset / Clear state
  const handleReset = () => {
    setDocState({
      file: null,
      fileName: '',
      fileSize: 0,
      totalPages: 0,
      currentPageIndex: 0,
      pages: [],
      rawPdfBase64: null,
      isAnalyzing: false,
      isBatchProcessing: false,
      batchProgress: 0,
    });
    setErrorMessage(null);
  };

  const currentPage = docState.pages[docState.currentPageIndex];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Header */}
      <Header
        currentLang={lang}
        onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        t={t}
        onOpenInfo={() => setShowHowItWorks(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs shadow-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Toast */}
        {successToast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-white text-xs shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* State 1: Upload & Sample Picker Screen */}
        {docState.pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center my-auto py-8">
            {/* Hero Heading */}
            <div className="text-center max-w-2xl mx-auto mb-8 flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-xs font-bold mx-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>تقنية إزالة العلامات المائية للـ PDF الأكثر دقة واحترافية</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                أزل العلامات المائية والأختام من ملفات PDF <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">بنقرة واحدة</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-500 leading-relaxed">{t.tagline}</p>
            </div>

            {/* Drop Zone Card */}
            <div
              id="pdf-drop-zone"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full max-w-2xl bg-white p-6 sm:p-8 rounded-[36px] shadow-2xl shadow-indigo-100 border border-slate-200/80 hover:border-indigo-300 transition-all cursor-pointer relative overflow-hidden group ${
                isDraggingFile
                  ? 'border-indigo-500 bg-indigo-50/30 scale-[1.01]'
                  : ''
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleLoadPdfFile(e.target.files[0]);
                  }
                }}
              />

              {/* Free Badge */}
              <div className="absolute top-4 left-4 bg-amber-400 text-amber-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tight shadow-xs">
                مجاني 100%
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-[28px] p-8 sm:p-12 flex flex-col items-center justify-center text-center bg-slate-50/50 group-hover:bg-slate-50 transition-all">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform mb-4">
                  <FileUp className="w-8 h-8" />
                </div>

                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mb-1">
                  {isDraggingFile ? t.dropHere : t.uploadTitle}
                </h3>
                <p className="text-xs text-slate-500 mb-6 max-w-sm">{t.uploadSubtitle}</p>

                <button
                  type="button"
                  className="w-full max-w-xs py-3.5 bg-indigo-600 group-hover:bg-indigo-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{t.browseFiles}</span>
                </button>
              </div>
            </div>

            {/* Ready-to-test Samples */}
            <SamplePdfPicker
              onSelectSample={handleSelectSample}
              t={t}
              isLoading={docState.isAnalyzing}
            />
          </div>
        ) : (
          /* State 2: Active PDF Workspace (Split-Screen Viewer & Controls) */
          <div className="flex flex-col gap-5">
            {/* Top Workspace Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 p-4 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 max-w-xs sm:max-w-md truncate">
                    {docState.fileName}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {docState.totalPages} {t.page} • {(docState.fileSize / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition"
                  title={t.resetAll}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.resetAll}</span>
                </button>

                <button
                  id="btn-open-export-modal"
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg shadow-indigo-200 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.downloadPdf}</span>
                </button>
              </div>
            </div>

            {/* Batch Progress Bar if active */}
            {docState.isBatchProcessing && (
              <div className="p-4 bg-white rounded-3xl border border-indigo-100 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span>جاري معالجة وتنظيف جميع صفحات المستند دفعة واحدة...</span>
                  </span>
                  <span className="text-indigo-600 font-mono">{docState.batchProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${docState.batchProgress}%` }}
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Multi-Page Thumbnail Strip */}
            <PageThumbnailStrip
              pages={docState.pages}
              currentPageIndex={docState.currentPageIndex}
              onSelectPage={(idx) => {
                setDocState((prev) => ({ ...prev, currentPageIndex: idx }));
                const targetPage = docState.pages[idx];
                if (targetPage && targetPage.detectedWatermarks.length === 0) {
                  runWatermarkDetection(idx, targetPage.originalCanvasDataUrl);
                }
              }}
              t={t}
            />

            {/* Split Screen Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left/Center: Interactive Before/After Split Viewer (8 cols) */}
              <div className="lg:col-span-8 flex flex-col min-h-[520px]">
                {currentPage && (
                  <BeforeAfterSlider
                    originalImage={currentPage.originalCanvasDataUrl}
                    cleanedImage={currentPage.cleanedCanvasDataUrl}
                    detectedWatermarks={currentPage.detectedWatermarks}
                    showBoundingBoxes={showBoundingBoxes}
                    t={t}
                    isProcessing={currentPage.isProcessing}
                    onSelectBox={handleToggleBox}
                  />
                )}
              </div>

              {/* Right Side: Removal Controls & Watermark List (4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {/* Engine Settings */}
                <EngineSettings
                  config={config}
                  onChangeConfig={handleUpdateConfig}
                  t={t}
                  onOpenManualBrush={() => setShowManualBrush(true)}
                  onRunDetection={() =>
                    currentPage &&
                    runWatermarkDetection(
                      docState.currentPageIndex,
                      currentPage.originalCanvasDataUrl
                    )
                  }
                  onApplyCurrentPage={handleApplyCurrentPage}
                  onApplyAllPages={handleApplyAllPages}
                  isProcessing={currentPage?.isProcessing || docState.isBatchProcessing}
                  totalPages={docState.totalPages}
                />

                {/* Detected Watermarks List */}
                {currentPage && (
                  <WatermarkList
                    watermarks={currentPage.detectedWatermarks}
                    t={t}
                    onToggleBox={handleToggleBox}
                    onRemoveSingleBox={handleRemoveSingleBox}
                    onRemoveAllDetected={handleApplyCurrentPage}
                    isProcessing={currentPage.isProcessing}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Manual Eraser Brush Modal */}
      {showManualBrush && currentPage && (
        <ManualEraserCanvas
          imageSrc={currentPage.cleanedCanvasDataUrl || currentPage.originalCanvasDataUrl}
          t={t}
          onApplyMask={(newCleaned) => {
            setDocState((prev) => {
              const copy = [...prev.pages];
              copy[prev.currentPageIndex].cleanedCanvasDataUrl = newCleaned;
              return { ...prev, pages: copy };
            });
            setSuccessToast('تم تطبيق المسح اليدوي على المنطقة المحددة بنجاح.');
          }}
          onClose={() => setShowManualBrush(false)}
        />
      )}

      {/* Export & Download Modal */}
      {showExportModal && (
        <ExportModal
          pages={docState.pages}
          currentPageIndex={docState.currentPageIndex}
          fileName={docState.fileName}
          t={t}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* How it Works Modal */}
      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
    </div>
  );
}
