import React, { useRef, useState, useEffect, useCallback } from 'react';
import { LanguageStrings } from '../types';
import {
  Eraser,
  Square,
  RotateCcw,
  Check,
  Paintbrush,
  X,
  Undo2,
  Sparkles,
  Wand2,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { applyBrushMaskInpaint } from '../utils/imageProcessing';

interface ManualEraserCanvasProps {
  imageSrc: string;
  t: LanguageStrings;
  onApplyMask: (newImageSrc: string) => void;
  onClose: () => void;
}

export const ManualEraserCanvas: React.FC<ManualEraserCanvasProps> = ({
  imageSrc,
  t,
  onApplyMask,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // For live rubberband & cursor preview

  const [tool, setTool] = useState<'brush' | 'box' | 'magic'>('brush');
  const [brushSize, setBrushSize] = useState<number>(36);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [zoom, setZoom] = useState<number>(100);
  const [hasEdits, setHasEdits] = useState<boolean>(false);

  // Initialize canvases
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!baseCanvasRef.current || !maskCanvasRef.current || !overlayCanvasRef.current) return;
      const baseCanvas = baseCanvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      const w = img.width;
      const h = img.height;

      baseCanvas.width = w;
      baseCanvas.height = h;
      maskCanvas.width = w;
      maskCanvas.height = h;
      overlayCanvas.width = w;
      overlayCanvas.height = h;

      const baseCtx = baseCanvas.getContext('2d');
      if (baseCtx) {
        baseCtx.drawImage(img, 0, 0);
      }

      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.clearRect(0, 0, w, h);
      }

      const overlayCtx = overlayCanvas.getContext('2d');
      if (overlayCtx) {
        overlayCtx.clearRect(0, 0, w, h);
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Coordinate mapper from mouse/touch event to canvas coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!overlayCanvasRef.current) return { x: 0, y: 0 };
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = overlayCanvasRef.current.width / rect.width;
    const scaleY = overlayCanvasRef.current.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const saveHistoryState = () => {
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (!maskCtx || !maskCanvasRef.current) return;
    const current = maskCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    setHistory((prev) => [...prev.slice(-15), current]);
    setHasEdits(true);
  };

  // Live stroke interpolation for continuous, silky smooth brush paths
  const drawBrushStroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (!maskCtx) return;

    maskCtx.save();
    maskCtx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // Vibrant red highlighter
    maskCtx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    maskCtx.lineWidth = brushSize;
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';

    maskCtx.beginPath();
    maskCtx.moveTo(from.x, from.y);
    maskCtx.lineTo(to.x, to.y);
    maskCtx.stroke();

    // Round end dots
    maskCtx.beginPath();
    maskCtx.arc(to.x, to.y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.restore();
  };

  // Magic tap: instantly highlights the rectangular region around the clicked spot
  const handleMagicClick = (x: number, y: number) => {
    if (!maskCanvasRef.current) return;
    saveHistoryState();
    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (!maskCtx) return;

    // Detect watermark block or select a generous rectangular swatch around click
    const w = Math.min(maskCanvasRef.current.width * 0.45, 450);
    const h = 75;
    const rx = Math.max(0, x - w / 2);
    const ry = Math.max(0, y - h / 2);

    maskCtx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    maskCtx.beginPath();
    maskCtx.roundRect(rx, ry, w, h, 8);
    maskCtx.fill();
  };

  // Clear live overlay (rubberband preview & cursor)
  const clearOverlay = () => {
    const overlayCtx = overlayCanvasRef.current?.getContext('2d');
    if (overlayCtx && overlayCanvasRef.current) {
      overlayCtx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
  };

  // Draw live rubberband box while dragging
  const drawRubberBandBox = (start: { x: number; y: number }, current: { x: number; y: number }) => {
    const overlayCtx = overlayCanvasRef.current?.getContext('2d');
    if (!overlayCtx || !overlayCanvasRef.current) return;

    overlayCtx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);

    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);

    overlayCtx.save();
    overlayCtx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    overlayCtx.strokeStyle = 'rgba(220, 38, 38, 0.95)';
    overlayCtx.lineWidth = 3;
    overlayCtx.setLineDash([8, 6]);

    overlayCtx.fillRect(x, y, width, height);
    overlayCtx.strokeRect(x, y, width, height);

    // Dimension label
    overlayCtx.fillStyle = '#dc2626';
    overlayCtx.font = 'bold 16px sans-serif';
    overlayCtx.fillText(`${Math.round(width)} × ${Math.round(height)}px`, x + 8, y > 25 ? y - 8 : y + 22);
    overlayCtx.restore();
  };

  // Pointer Handlers
  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (tool === 'magic') {
      handleMagicClick(coords.x, coords.y);
      return;
    }

    saveHistoryState();
    setIsDrawing(true);
    setStartPos(coords);
    setLastPos(coords);

    if (tool === 'brush') {
      drawBrushStroke(coords, coords);
    }
  };

  const handleMoveDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (isDrawing) {
      if (tool === 'brush' && lastPos) {
        drawBrushStroke(lastPos, coords);
        setLastPos(coords);
      } else if (tool === 'box' && startPos) {
        drawRubberBandBox(startPos, coords);
      }
    }
  };

  const handleEndDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === 'box' && startPos) {
      const endCoords = getCanvasCoords(e);
      clearOverlay();

      const maskCtx = maskCanvasRef.current?.getContext('2d');
      if (maskCtx) {
        const x = Math.min(startPos.x, endCoords.x);
        const y = Math.min(startPos.y, endCoords.y);
        const width = Math.abs(endCoords.x - startPos.x);
        const height = Math.abs(endCoords.y - startPos.y);

        // Only draw if minimum size
        if (width > 5 && height > 5) {
          maskCtx.fillStyle = 'rgba(239, 68, 68, 0.7)';
          maskCtx.fillRect(x, y, width, height);
        }
      }
    }

    setStartPos(null);
    setLastPos(null);
  };

  // Quick preset region selectors (Header link, footer, diagonal watermark)
  const handleAddPresetArea = (preset: 'top_banner' | 'bottom_bar' | 'center_diagonal') => {
    if (!maskCanvasRef.current) return;
    saveHistoryState();
    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (!maskCtx) return;

    const w = maskCanvasRef.current.width;
    const h = maskCanvasRef.current.height;

    maskCtx.fillStyle = 'rgba(239, 68, 68, 0.7)';

    if (preset === 'top_banner') {
      // Top header link / telegram / phone watermark
      maskCtx.fillRect(0, 0, w, h * 0.12);
    } else if (preset === 'bottom_bar') {
      // Bottom footer copyright / channel link
      maskCtx.fillRect(0, h * 0.90, w, h * 0.10);
    } else if (preset === 'center_diagonal') {
      // Large center diagonal watermark area
      maskCtx.fillRect(w * 0.1, h * 0.25, w * 0.8, h * 0.50);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (maskCtx && previous) {
      maskCtx.putImageData(previous, 0, 0);
      setHistory((prev) => prev.slice(0, -1));
    }
    clearOverlay();
  };

  const handleClearAll = () => {
    saveHistoryState();
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (maskCtx && maskCanvasRef.current) {
      maskCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
    clearOverlay();
    setHasEdits(false);
  };

  const handleApply = async () => {
    if (!maskCanvasRef.current) return;
    const newImage = await applyBrushMaskInpaint(imageSrc, maskCanvasRef.current);
    onApplyMask(newImage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 max-w-5xl w-full max-h-[95vh] shadow-2xl flex flex-col gap-4 overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Paintbrush className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>أداة المسح اليدوي الدقيقة</span>
                <span className="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  سلسة وسريعة
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                مرر الفرشاة أو اسحب المربع فوق العلامات المراد محوها لاستعادة نقاء الصفحة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/90 dark:border-slate-700">
          {/* Tool Selection */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {/* Brush */}
            <button
              type="button"
              onClick={() => setTool('brush')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tool === 'brush'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>فرشاة حرة</span>
            </button>

            {/* Box */}
            <button
              type="button"
              onClick={() => setTool('box')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tool === 'box'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>تحديد مربع حي</span>
            </button>

            {/* Magic Click */}
            <button
              type="button"
              onClick={() => setTool('magic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tool === 'magic'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="انقر في أي مكان لمسح العلامة المائية في تلك المنطقة بلمسة واحدة"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>نقرة سحرية</span>
            </button>
          </div>

          {/* Quick Presets for Fast Cleaning */}
          <div className="flex items-center gap-1.5 hidden md:flex">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">تحديد سريع:</span>
            <button
              type="button"
              onClick={() => handleAddPresetArea('top_banner')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition"
            >
              أعلى الصفحة
            </button>
            <button
              type="button"
              onClick={() => handleAddPresetArea('center_diagonal')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition"
            >
              وسط الصفحة
            </button>
            <button
              type="button"
              onClick={() => handleAddPresetArea('bottom_bar')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition"
            >
              أسفل الصفحة
            </button>
          </div>

          {/* Brush size slider */}
          {tool === 'brush' && (
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-medium">حجم الفرشاة:</span>
              <input
                type="range"
                min="12"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20 sm:w-28 accent-indigo-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 min-w-[32px] text-left">
                {brushSize}px
              </span>
            </div>
          )}

          {/* History / Clear */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition"
              title="تراجع عن آخر خطوة"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>تراجع</span>
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>مسح الكل</span>
            </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-slate-100/90 dark:bg-slate-950 rounded-2xl overflow-auto flex items-center justify-center p-3 sm:p-5 min-h-[380px]"
        >
          <div
            style={{ width: `${zoom}%`, maxWidth: zoom === 100 ? '650px' : 'none' }}
            className="relative select-none shadow-2xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white"
          >
            {/* Base Document Image Canvas */}
            <canvas ref={baseCanvasRef} className="block w-full h-auto pointer-events-none" />

            {/* Red Highlighter Mask Canvas */}
            <canvas
              ref={maskCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />

            {/* Interactive Top Event Canvas with Rubberband Preview */}
            <canvas
              ref={overlayCanvasRef}
              onMouseDown={handleStartDraw}
              onMouseMove={handleMoveDraw}
              onMouseUp={handleEndDraw}
              onMouseLeave={handleEndDraw}
              onTouchStart={handleStartDraw}
              onTouchMove={handleMoveDraw}
              onTouchEnd={handleEndDraw}
              className={`absolute inset-0 w-full h-full z-20 touch-none ${
                tool === 'brush' ? 'cursor-crosshair' : tool === 'box' ? 'cursor-crosshair' : 'cursor-pointer'
              }`}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>التكبير:</span>
            <button
              onClick={() => setZoom((z) => Math.max(60, z - 20))}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(180, z + 20))}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition"
            >
              إلغاء
            </button>

            <button
              type="button"
              id="btn-apply-manual-mask"
              onClick={handleApply}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-indigo-500/25 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>تطبيق المسح واستعادة النقاء</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
