import React from 'react';
import { BoundingBox, LanguageStrings } from '../types';
import { CheckCircle2, ShieldAlert, Sparkles, Trash2, Tag, Crosshair } from 'lucide-react';

interface WatermarkListProps {
  watermarks: BoundingBox[];
  t: LanguageStrings;
  onToggleBox: (id: string) => void;
  onRemoveSingleBox: (box: BoundingBox) => void;
  onRemoveAllDetected: () => void;
  isProcessing: boolean;
}

export const WatermarkList: React.FC<WatermarkListProps> = ({
  watermarks,
  t,
  onToggleBox,
  onRemoveSingleBox,
  onRemoveAllDetected,
  isProcessing,
}) => {
  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'diagonal_text':
        return 'نص مائل قطري';
      case 'margin_watermark':
        return 'رقم هاتف / علامة هامش';
      case 'header_footer_stamp':
        return 'ختم ترويسة/تذييل';
      case 'logo_seal':
        return 'شعار / ختم رسمي';
      case 'tiled_pattern':
        return 'نمط خلفية متكرر';
      default:
        return 'علامة مائية';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xl flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/60">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">{t.watermarksFound}</h4>
            <span className="text-[11px] text-slate-500">
              {watermarks.length > 0 ? `${watermarks.length} عنصر مكتشف` : t.noWatermarksFound}
            </span>
          </div>
        </div>

        {watermarks.length > 0 && (
          <button
            onClick={onRemoveAllDetected}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-full text-xs font-bold shadow-md shadow-indigo-200 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>إزالة الكل فوراً</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
        {watermarks.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Crosshair className="w-6 h-6 text-slate-300" />
            <span>اضغط على "كشف بالذكاء الاصطناعي" أو استخدم الفلتر السريع للكشف التلقائي</span>
          </div>
        ) : (
          watermarks.map((box) => (
            <div
              key={box.id}
              className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/90 rounded-2xl hover:border-indigo-300 transition-colors group"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <input
                  type="checkbox"
                  checked={box.selected !== false}
                  onChange={() => onToggleBox(box.id)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {box.label || 'Watermark Overlay'}
                    </span>
                    {box.confidence && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold border border-indigo-100">
                        {Math.round(box.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5 text-slate-400" />
                      {getTypeLabel(box.type)}
                    </span>
                    {box.color && <span>• {box.color}</span>}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onRemoveSingleBox(box)}
                disabled={isProcessing}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                title="إزالة هذه العلامة فقط"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
