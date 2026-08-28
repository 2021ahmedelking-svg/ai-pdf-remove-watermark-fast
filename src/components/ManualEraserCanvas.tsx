import React, { useRef, useState, useEffect } from 'react';
import { LanguageStrings } from '../types';
import { Eraser, Square, RotateCcw, Check, Paintbrush } from 'lucide-react';
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

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    setStartPos(coords);

    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (!maskCtx || !maskCanvasRef.current) return;

    // Save history
    setHistory(prev => [...prev.slice(-10), maskCtx.getImageData(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height)]);

    if (tool === 'brush') {
      maskCtx.beginPath();
      maskCtx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
      maskCtx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      maskCtx.fill();
    }
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (!maskCtx) return;

    if (tool === 'brush') {
      maskCtx.beginPath();
      maskCtx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
      maskCtx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      maskCtx.fill();
    }
  };

  const handleEnd = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === 'box' && startPos) {
      const coords = getCanvasCoords(e);
      const maskCtx = maskCanvasRef.current?.getContext('2d');
      if (!maskCtx) return;

      const x = Math.min(startPos.x, coords.x);
      const y = Math.min(startPos.y, coords.y);
      const w = Math.abs(coords.x - startPos.x);
      const h = Math.abs(coords.y - startPos.y);

      maskCtx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      maskCtx.fillRect(x, y, w, h);
    }
    setStartPos(null);
  };

  const handleUndo = () => {
    if (history.length === 0 || !maskCanvasRef.current) return;
    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (!maskCtx) return;
    const last = history[history.length - 1];
    maskCtx.putImageData(last, 0, 0);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (!maskCanvasRef.current) return;
    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (!maskCtx) return;
    maskCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    setHistory([]);
  };

  const handleApply = async () => {
    if (!maskCanvasRef.current) return;
    const result = await applyBrushMaskInpaint(imageSrc, maskCanvasRef.current);
    onApplyMask(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col p-4 md:p-8">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-6 py-4 rounded-3xl border border-slate-200 shadow-xl mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <Eraser className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{t.manualBrush}</h3>
            <p className="text-xs text-slate-500">حدد المناطق المراد محوها يدوياً بالفرشاة أو المربع</p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setTool('brush')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tool === 'brush'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Paintbrush className="w-4 h-4" />
              <span>فرشاة</span>
            </button>
            <button
              onClick={() => setTool('box')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tool === 'box'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Square className="w-4 h-4" />
              <span>مربع تحديد</span>
            </button>
          </div>

          {tool === 'brush' && (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <span className="text-slate-600 font-semibold">{t.brushSize}:</span>
              <input
                type="range"
                min="10"
                max="90"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24 accent-indigo-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-indigo-600">{brushSize}px</span>
            </div>
          )}

          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 rounded-xl transition"
            title="تراجع"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleClear}
            className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-2xl border border-rose-200 transition"
          >
            {t.clearBrush}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition"
          >
            إلغاء
          </button>

          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 transition"
          >
            <Check className="w-4 h-4" />
            <span>{t.applyEraser}</span>
          </button>
        </div>
      </div>

      {/* Drawing Stage */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto bg-slate-100 rounded-3xl border border-slate-200 flex items-center justify-center p-4"
      >
        <div className="relative shadow-2xl rounded-2xl overflow-hidden bg-white max-w-full max-h-full border border-slate-200">
          <canvas ref={baseCanvasRef} className="block max-w-full max-h-[75vh] w-auto h-auto" />
          <canvas
            ref={maskCanvasRef}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          />
        </div>
      </div>
    </div>
  );
};
