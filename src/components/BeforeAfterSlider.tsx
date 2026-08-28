import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BoundingBox, LanguageStrings } from '../types';
import { ZoomIn, ZoomOut, Maximize2, SplitSquareVertical, Columns, Eye, Layers } from 'lucide-react';

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
    <div className="flex flex-col h-full w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-50/90 border-b border-slate-200/80 gap-2">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          <button
            id="view-mode-split"
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'split'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={t.splitView}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.splitView}</span>
          </button>
          <button
            id="view-mode-side"
            onClick={() => setViewMode('side')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'side'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={t.sideBySide}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.sideBySide}</span>
          </button>
          <button
            id="view-mode-after"
            onClick={() => setViewMode('after')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'after'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={t.afterOnly}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.afterOnly}</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          <button
            id="zoom-out-btn"
            onClick={() => setZoom((prev) => Math.max(40, prev - 15))}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title={t.zoomOut}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-slate-700 px-2 min-w-[3.5rem] text-center">
            {zoom}%
          </span>
          <button
            id="zoom-in-btn"
            onClick={() => setZoom((prev) => Math.min(250, prev + 15))}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title={t.zoomIn}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            id="zoom-reset-btn"
            onClick={() => setZoom(100)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title={t.fitPage}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="relative flex-1 overflow-auto p-6 flex items-center justify-center min-h-[480px] bg-slate-100/60">
        {isProcessing && (
          <div className="absolute inset-0 z-30 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
            </div>
            <p className="text-sm font-bold text-indigo-700 animate-pulse">{t.processing}</p>
          </div>
        )}

        <div
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
          className="transition-transform duration-100 ease-out max-w-full flex items-center justify-center"
        >
          {viewMode === 'split' ? (
            /* Split Screen Comparison */
            <div
              ref={containerRef}
              id="before-after-container"
              onPointerDown={handlePointerDown}
              className="relative select-none shadow-2xl rounded-2xl overflow-hidden cursor-ew-resize bg-white border border-slate-200"
              style={{ maxWidth: '820px' }}
            >
              {/* Clean Result (Underneath Base) */}
              <img
                src={effectiveCleanedImage}
                alt="Clean Result"
                className="w-full h-auto block pointer-events-none"
              />

              {/* Original Watermarked Layer (Clipped by slider position) */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
              >
                <img
                  src={originalImage}
                  alt="Original Watermarked"
                  className="w-full h-auto block pointer-events-none"
                />

                {/* Bounding Boxes on Original if enabled */}
                {showBoundingBoxes && detectedWatermarks.map((box) => (
                  <div
                    key={box.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBox?.(box.id);
                    }}
                    style={{
                      top: `${box.ymin / 10}%`,
                      left: `${box.xmin / 10}%`,
                      width: `${(box.xmax - box.xmin) / 10}%`,
                      height: `${(box.ymax - box.ymin) / 10}%`,
                    }}
                    className="absolute border-2 border-rose-500 bg-rose-500/15 rounded-lg pointer-events-auto flex items-start p-1 animate-pulse"
                  >
                    <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none shadow">
                      {box.label || 'Watermark'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Vertical Drag Line Handle */}
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-0 bottom-0 -left-[1.5px] w-[3px] bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 bg-slate-900 border-2 border-white rounded-full flex items-center justify-center shadow-xl shadow-slate-900/30 text-white">
                  <div className="flex items-center gap-0.5 text-[11px] font-bold">
                    <span>‹</span>
                    <span>›</span>
                  </div>
                </div>
              </div>

              {/* Floating Badges */}
              <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-rose-700 border border-rose-200 shadow-sm">
                {t.before}
              </div>
              <div className="absolute top-3 right-3 z-10 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-emerald-700 border border-emerald-200 shadow-sm">
                {t.after}
              </div>
            </div>
          ) : viewMode === 'side' ? (
            /* Side by Side Mode */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
              <div className="relative rounded-2xl overflow-hidden bg-white shadow-xl border border-slate-200">
                <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-rose-600 text-white rounded-full text-xs font-bold shadow-md">
                  {t.before}
                </div>
                <img src={originalImage} alt="Original" className="w-full h-auto block" />
              </div>
              <div className="relative rounded-2xl overflow-hidden bg-white shadow-xl border border-slate-200">
                <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold shadow-md">
                  {t.after}
                </div>
                <img src={effectiveCleanedImage} alt="Cleaned" className="w-full h-auto block" />
              </div>
            </div>
          ) : (
            /* Single View (After Only or Before Only) */
            <div className="relative rounded-2xl overflow-hidden bg-white shadow-2xl border border-slate-200 max-w-2xl">
              <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-bold shadow-md">
                {viewMode === 'after' ? t.after : t.before}
              </div>
              <img
                src={viewMode === 'after' ? effectiveCleanedImage : originalImage}
                alt="Document View"
                className="w-full h-auto block"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
