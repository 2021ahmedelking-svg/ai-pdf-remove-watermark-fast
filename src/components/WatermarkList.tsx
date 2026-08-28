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
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xl flex flex-col gap-3.5 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200/60 dark:border-amber-900">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{t.watermarksFound}</h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {watermarks.length > 0 ? `${watermarks.length} عنصر مكتشف` : t.noWatermarksFound}
            </span>
          </div>
        </div>

        {watermarks.length > 0 && (
          <button
            onClick={onRemoveAllDetected}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-full text-xs font-bold shadow-md shadow-indigo-500/20 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>إزالة المكتشف</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
        {watermarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
            <Crosshair className="w-8 h-8 mb-1.5 opacity-40 text-indigo-500" />
            <span>المستند نظيف أو انقر "كشف بالذكاء الاصطناعي"</span>
          </div>
        ) : (
          watermarks.map((wm, i) => (
            <div
              key={wm.id}
              className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                wm.selected !== false
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/80 text-slate-800 dark:text-slate-200'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  checked={wm.selected !== false}
                  onChange={() => onToggleBox(wm.id)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">{wm.label || `علامة مائية #${i + 1}`}</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <Tag className="w-3 h-3 text-indigo-500" />
                    <span>{getTypeLabel(wm.type)}</span>
                    {wm.confidence && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                        ({Math.round(wm.confidence * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRemoveSingleBox(wm)}
                disabled={isProcessing}
                title="مسح هذه العلامة فقط"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition shrink-0"
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
