import React, { useRef, useState, useEffect } from 'react';
import { LanguageStrings } from '../types';
import { Eraser, Square, RotateCcw, Check, Paintbrush, X, Undo2 } from 'lucide-react';
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

  const [tool, setTool] = useState<'brush' | 'box'>('brush');
  const [brushSize, setBrushSize] = useState<number>(32);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Initialize canvases
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!baseCanvasRef.current || !maskCanvasRef.current) return;
      const baseCanvas = baseCanvasRef.current;
      const maskCanvas = maskCanvasRef.current;

      baseCanvas.width = img.width;
      baseCanvas.height = img.height;
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;

      const baseCtx = baseCanvas.getContext('2d');
      if (baseCtx) {
        baseCtx.drawImage(img, 0, 0);
      }

      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Coordinate mapper from event to canvas coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!maskCanvasRef.current) return { x: 0, y: 0 };
    const rect = maskCanvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = maskCanvasRef.current.width / rect.width;
    const scaleY = maskCanvasRef.current.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const saveHistoryState = () => {
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (!maskCtx || !maskCanvasRef.current) return;
    const current = maskCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    setHistory((prev) => [...prev.slice(-10), current]);
  };

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    saveHistoryState();
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    setStartPos(coords);

    if (tool === 'brush') {
      drawBrushPoint(coords.x, coords.y);
    }
  };

  const drawBrushPoint = (x: number, y: number) => {
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (!maskCtx) return;

    maskCtx.fillStyle = 'rgba(239, 68, 68, 0.65)'; // Red semi-transparent highlighter
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();
  };

  const handleMoveDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (tool === 'brush') {
      drawBrushPoint(coords.x, coords.y);
    }
  };

  const handleEndDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === 'box' && startPos) {
      const endCoords = getCanvasCoords(e);
      const maskCtx = maskCanvasRef.current?.getContext('2d');
      if (maskCtx) {
        maskCtx.fillStyle = 'rgba(239, 68, 68, 0.65)';
        const x = Math.min(startPos.x, endCoords.x);
        const y = Math.min(startPos.y, endCoords.y);
        const w = Math.abs(endCoords.x - startPos.x);
        const h = Math.abs(endCoords.y - startPos.y);
        maskCtx.fillRect(x, y, w, h);
      }
    }
    setStartPos(null);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (maskCtx && previous) {
      maskCtx.putImageData(previous, 0, 0);
      setHistory((prev) => prev.slice(0, -1));
    }
  };

  const handleClearAll = () => {
    saveHistoryState();
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (maskCtx && maskCanvasRef.current) {
      maskCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
  };

  const handleApply = async () => {
    if (!maskCanvasRef.current) return;
    const newImage = await applyBrushMaskInpaint(imageSrc, maskCanvasRef.current);
    onApplyMask(newImage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col gap-4 overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Paintbrush className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">الممحاة اليدوية والتحديد المخصص</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">حدد أي علامة أو نص بالفرشاة الحمراء لمسحه فوراً واستعادة الخلفية البيضاء</p>
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTool('brush')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                tool === 'brush'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>فرشاة حرة</span>
            </button>

            <button
              type="button"
              onClick={() => setTool('box')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                tool === 'box'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>تحديد مربع</span>
            </button>
          </div>

          {/* Brush size */}
          {tool === 'brush' && (
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <span>قطر الفرشاة:</span>
              <input
                type="range"
                min="10"
                max="80"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24 accent-indigo-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{brushSize}px</span>
            </div>
          )}

          {/* History / Clear */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-40 transition"
              title="تراجع"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تراجع</span>
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>مسح التحديد</span>
            </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-auto flex items-center justify-center p-4 min-h-[350px]"
        >
          <div className="relative select-none shadow-2xl rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <canvas ref={baseCanvasRef} className="block max-h-[60vh] max-w-full w-auto h-auto pointer-events-none" />
            <canvas
              ref={maskCanvasRef}
              onMouseDown={handleStartDraw}
              onMouseMove={handleMoveDraw}
              onMouseUp={handleEndDraw}
              onMouseLeave={handleEndDraw}
              onTouchStart={handleStartDraw}
              onTouchMove={handleMoveDraw}
              onTouchEnd={handleEndDraw}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-indigo-500/20 transition"
          >
            <Check className="w-4 h-4" />
            <span>تطبيق المسح واستبدال الخلفية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
