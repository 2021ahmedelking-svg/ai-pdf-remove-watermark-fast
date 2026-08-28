import React, { useState, useRef } from 'react';
import { BoundingBox, LanguageStrings } from '../types';
import {
  MousePointerClick,
  Sparkles,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Wand2,
  Crosshair,
  PencilLine,
  HelpCircle,
  SquareDashed,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ManualGuideControlsProps {
  detectedWatermarks: BoundingBox[];
  manualPrompt: string;
  onChangeManualPrompt: (prompt: string) => void;
  onRunAiManualAnalysis: (prompt: string, boxes: BoundingBox[]) => void;
  onAddManualBox: (box: BoundingBox) => void;
  onToggleBox: (id: string) => void;
  onRemoveBox: (id: string) => void;
  onOpenManualEraser: () => void;
  onApplyManualCleaning: () => void;
  isProcessing: boolean;
  t: LanguageStrings;
}

export const ManualGuideControls: React.FC<ManualGuideControlsProps> = ({
  detectedWatermarks,
  manualPrompt,
  onChangeManualPrompt,
  onRunAiManualAnalysis,
  onAddManualBox,
  onToggleBox,
  onRemoveBox,
  onOpenManualEraser,
  onApplyManualCleaning,
  isProcessing,
  t,
}) => {
  const [quickKeyword, setQuickKeyword] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'prompt' | 'point' | 'brush'>('prompt');

  // Quick preset chips for common watermarks
  const popularKeywords = [
    'CamScanner',
    'CONFIDENTIAL',
    'DRAFT',
    'أرقام الهواتف (0114...)',
    'اسم الأستاذ والعلامة المائلة',
    'الختم الأحمر',
    'الباركود وشعار المركز',
  ];

  const handleApplyKeyword = (kw: string) => {
    const newPrompt = manualPrompt ? `${manualPrompt} ، ${kw}` : kw;
    onChangeManualPrompt(newPrompt);
  };

  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualPrompt.trim()) {
      onRunAiManualAnalysis(manualPrompt, detectedWatermarks);
    }
  };

  // Add preset location region
  const handleAddPresetRegion = (position: 'center' | 'left_margin' | 'right_margin' | 'top_header' | 'bottom_footer') => {
    let newBox: BoundingBox;
    const id = `manual-reg-${Date.now()}`;
    switch (position) {
      case 'center':
        newBox = {
          id,
          ymin: 250,
          xmin: 150,
          ymax: 750,
          xmax: 850,
          label: manualPrompt || 'منطقة المنتصف (علامة قطرية مائلة)',
          type: 'diagonal_text',
          selected: true,
          confidence: 1.0,
        };
        break;
      case 'left_margin':
        newBox = {
          id,
          ymin: 50,
          xmin: 0,
          ymax: 950,
          xmax: 150,
          label: 'شريط الهامش الأيسر (أرقام وهواتف)',
          type: 'margin_watermark',
          selected: true,
          confidence: 1.0,
        };
        break;
      case 'right_margin':
        newBox = {
          id,
          ymin: 50,
          xmin: 850,
          ymax: 950,
          xmax: 1000,
          label: 'شريط الهامش الأيمن (أرقام وهواتف)',
          type: 'margin_watermark',
          selected: true,
          confidence: 1.0,
        };
        break;
      case 'top_header':
        newBox = {
          id,
          ymin: 0,
          xmin: 50,
          ymax: 150,
          xmax: 950,
          label: 'ترويسة أعلى الصفحة',
          type: 'header_footer_stamp',
          selected: true,
          confidence: 1.0,
        };
        break;
      case 'bottom_footer':
        newBox = {
          id,
          ymin: 850,
          xmin: 50,
          ymax: 1000,
          xmax: 950,
          label: 'تذييل أسفل الصفحة (CamScanner / رقم المطبقة)',
          type: 'header_footer_stamp',
          selected: true,
          confidence: 1.0,
        };
        break;
    }
    onAddManualBox(newBox);
  };

  const selectedCount = detectedWatermarks.filter((w) => w.selected !== false).length;

  return (
    <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xl transition-colors">
      {/* Mode Header Banner */}
      <div className="flex items-center justify-between p-3.5 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/90 dark:border-indigo-800/80 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm">
            <MousePointerClick className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              الوضع اليدوي والتوجيه المخصص
              <span className="text-[10px] bg-indigo-200/80 dark:bg-indigo-900/90 text-indigo-900 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                AI + إشارة المستخدم
              </span>
            </div>
            <div className="text-[10px] text-indigo-800/90 dark:text-indigo-400">
              اكتب للذكاء الاصطناعي ما تريد إزالته، أو حدد أماكن العلامات بيدك مباشرة
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs: 1. Tell AI in words (Prompt), 2. Point regions (Boxes), 3. Free Brush */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('prompt')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'prompt'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <PencilLine className="w-3.5 h-3.5" />
          <span>وصف بالكلمات للـ AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('point')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'point'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <SquareDashed className="w-3.5 h-3.5" />
          <span>تحديد مناطق العلامات</span>
        </button>

        <button
          type="button"
          onClick={onOpenManualEraser}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 transition"
        >
          <Crosshair className="w-3.5 h-3.5 text-rose-500" />
          <span>فرشاة حرة</span>
        </button>
      </div>

      {/* Tab 1: AI Prompt Search & Tell */}
      {activeTab === 'prompt' && (
        <div className="flex flex-col gap-3">
          <form onSubmit={handleManualSearchSubmit} className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                اكتب النص أو الكلمات المكتوبة على العلامة المائية:
              </span>
            </label>

            <div className="relative">
              <textarea
                value={manualPrompt}
                onChange={(e) => onChangeManualPrompt(e.target.value)}
                placeholder="مثال: احذف اسم الأستاذ 'محمد أحمد' وأرقام الهواتف '0114338784' وشعار CamScanner والختم المائل..."
                rows={3}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all leading-relaxed resize-none"
              />
            </div>

            {/* Keyword fast suggestions */}
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                اقتراحات سريعة للإضافة بنقرة واحدة:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {popularKeywords.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => handleApplyKeyword(kw)}
                    className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 rounded-full transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-indigo-500" />
                    <span>{kw}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing || !manualPrompt.trim()}
              className="mt-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>اطلب من الـ AI كشف واستئصال هذا النص المكتوب</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Point & Select Regions (Bounding Boxes) */}
      {activeTab === 'point' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <SquareDashed className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              أضف منطقة إشارة للـ AI على الصفحة:
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              اختر المنطقة المستهدفة لتظهر في شاشة العرض، وسيقوم الـ AI بتنظيفها فوراً:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleAddPresetRegion('center')}
              className="p-2.5 text-right bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 rounded-2xl transition flex flex-col gap-0.5"
            >
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">منتصف الصفحة ⬌</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">العلامات المائلة والأسماء</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddPresetRegion('left_margin')}
              className="p-2.5 text-right bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 rounded-2xl transition flex flex-col gap-0.5"
            >
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">الهامش الأيسر ⯇</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">أرقام الهواتف 011...</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddPresetRegion('right_margin')}
              className="p-2.5 text-right bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 rounded-2xl transition flex flex-col gap-0.5"
            >
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">الهامش الأيمن ⯈</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">أرقام الهواتف الجانبية</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddPresetRegion('bottom_footer')}
              className="p-2.5 text-right bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 rounded-2xl transition flex flex-col gap-0.5"
            >
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">أسفل الصفحة ⯆</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">شعار CamScanner والتذييل</span>
            </button>
          </div>
        </div>
      )}

      {/* Target Regions List (Managed Manually) */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            المناطق والعلامات المحددة حالياً ({detectedWatermarks.length}):
          </span>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
            {selectedCount} مفعل للإزالة
          </span>
        </div>

        <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
          {detectedWatermarks.length === 0 ? (
            <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl">
              لم تقم بتحديد أي منطقة بعد. انقر على أزرار الهوامش أعلاه أو اكتب نص العلامة ليحددها الـ AI.
            </div>
          ) : (
            detectedWatermarks.map((wm, i) => (
              <div
                key={wm.id}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                  wm.selected !== false
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-200'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={wm.selected !== false}
                    onChange={() => onToggleBox(wm.id)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-bold truncate">
                    {wm.label || `منطقة محددة #${i + 1}`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveBox(wm.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition shrink-0"
                  title="حذف هذه المنطقة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Execute Button */}
      <button
        type="button"
        onClick={onApplyManualCleaning}
        disabled={isProcessing}
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>تطبيق الإزالة اليدوية واستئصال المحدد الآن</span>
      </button>
    </div>
  );
};
