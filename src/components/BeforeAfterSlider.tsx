import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BoundingBox, LanguageStrings } from '../types';
import { ZoomIn, ZoomOut, Maximize2, SplitSquareVertical, Columns, Eye, Layers, Sparkles } from 'lucide-react';

interface BeforeAfterSliderProps {
  originalImage: string;
  cleanedImage: string | null;
  detectedWatermarks: BoundingBox[];
  showBoundingBoxes: boolean;
  t: LanguageStrings;
  isProcessing: boolean;
  onSelectBox?: (boxId: string) => void;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  originalImage,
  cleanedImage,
  detectedWatermarks,
  showBoundingBoxes,
  t,
  isProcessing,
  onSelectBox,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'split' | 'side' | 'after' | 'before'>('split');
  const [zoom, setZoom] = useState<number>(100);
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveCleanedImage = cleanedImage || originalImage;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateSlider(e.clientX);
  };

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(pos);
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        updateSlider(e.clientX);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, updateSlider]);

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden flex-1 transition-colors">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-xs">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'split'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.splitView}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('side')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'side'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.sideBySide}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('after')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'after'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.afterOnly}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('before')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'before'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.beforeOnly}</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(50, z - 25))}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
            title={t.zoomOut}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 px-2 min-w-[42px] text-center">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(200, z + 25))}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
            title={t.zoomIn}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
            title={t.fitPage}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas & Comparison Area */}
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950/60 overflow-auto min-h-[440px]">
        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-30 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 animate-spin"></div>
              <Sparkles className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.processing}</p>
          </div>
        )}

        {/* View Mode: SPLIT SLIDER */}
        {viewMode === 'split' && (
          <div
            ref={containerRef}
            style={{ width: `${zoom}%`, maxWidth: zoom === 100 ? '700px' : 'none' }}
            className="relative select-none rounded-2xl overflow-hidden shadow-2xl bg-white border border-slate-200/90 dark:border-slate-700"
          >
            {/* Cleaned Image (Bottom Layer) */}
            <img
              src={effectiveCleanedImage}
              alt="Cleaned Document"
              className="w-full h-auto block pointer-events-none"
            />

            {/* Original Image (Top Clipped Layer) */}
            <div
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              className="absolute inset-0 overflow-hidden"
            >
              <img
                src={originalImage}
                alt="Original Document"
                className="w-full h-auto block pointer-events-none"
              />

              {/* Bounding Boxes on Original Layer */}
              {showBoundingBoxes &&
                detectedWatermarks.map((box) => (
                  <div
                    key={box.id}
                    onClick={() => onSelectBox?.(box.id)}
                    style={{
                      top: `${box.ymin / 10}%`,
                      left: `${box.xmin / 10}%`,
                      height: `${(box.ymax - box.ymin) / 10}%`,
                      width: `${(box.xmax - box.xmin) / 10}%`,
                    }}
                    className={`absolute cursor-pointer border-2 transition-all rounded-lg ${
                      box.selected !== false
                        ? 'border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-400/40'
                        : 'border-slate-400/60 bg-slate-400/10'
                    }`}
                  />
                ))}
            </div>

            {/* Draggable Divider Line */}
            <div
              style={{ left: `${sliderPosition}%` }}
              onPointerDown={handlePointerDown}
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.4)] z-20 flex items-center justify-center -translate-x-1/2"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white shadow-lg border-2 border-white flex items-center justify-center text-[10px] font-bold">
                ⬌
              </div>
            </div>

            {/* Floating Labels */}
            <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full pointer-events-none z-10">
              {t.after}
            </div>
            <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full pointer-events-none z-10">
              {t.before}
            </div>
          </div>
        )}

        {/* View Mode: SIDE BY SIDE */}
        {viewMode === 'side' && (
          <div
            style={{ width: `${zoom}%` }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl w-full"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white border border-slate-200">
              <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                {t.before}
              </div>
              <img src={originalImage} alt="Before" className="w-full h-auto block" />
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white border border-slate-200">
              <div className="absolute top-2 left-2 bg-emerald-700/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                {t.after}
              </div>
              <img src={effectiveCleanedImage} alt="After" className="w-full h-auto block" />
            </div>
          </div>
        )}

        {/* View Mode: AFTER ONLY */}
        {viewMode === 'after' && (
          <div
            style={{ width: `${zoom}%`, maxWidth: zoom === 100 ? '700px' : 'none' }}
            className="rounded-2xl overflow-hidden shadow-2xl bg-white border border-slate-200"
          >
            <img src={effectiveCleanedImage} alt="Cleaned" className="w-full h-auto block" />
          </div>
        )}

        {/* View Mode: BEFORE ONLY */}
        {viewMode === 'before' && (
          <div
            style={{ width: `${zoom}%`, maxWidth: zoom === 100 ? '700px' : 'none' }}
            className="rounded-2xl overflow-hidden shadow-2xl bg-white border border-slate-200"
          >
            <img src={originalImage} alt="Original" className="w-full h-auto block" />
          </div>
        )}
      </div>
    </div>
  );
};
