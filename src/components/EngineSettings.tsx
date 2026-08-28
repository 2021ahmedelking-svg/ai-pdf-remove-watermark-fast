import React from 'react';
import { RemovalConfig, LanguageStrings, RemovalIntensityLevel } from '../types';
import {
  Sparkles,
  Zap,
  Download,
  Layers,
  CheckCircle2,
  Image as ImageIcon,
  Link2,
  FileCheck2,
  RefreshCw,
} from 'lucide-react';

interface EngineSettingsProps {
  config: RemovalConfig;
  onChangeConfig: (newConfig: Partial<RemovalConfig>) => void;
  t: LanguageStrings;
  onOpenManualBrush?: () => void;
  onRunDetection?: () => void;
  onApplyCurrentPage: () => void;
  onApplyAllPages: () => void;
  isProcessing: boolean;
  totalPages: number;
  onOpenExport?: () => void;
}

export const EngineSettings: React.FC<EngineSettingsProps> = ({
  config,
  onChangeConfig,
  onApplyCurrentPage,
  onApplyAllPages,
  isProcessing,
  totalPages,
  onOpenExport,
}) => {
  const currentIntensity: RemovalIntensityLevel = config.intensityLevel || 'balanced';

  const handleSetIntensity = (level: RemovalIntensityLevel) => {
    let lightnessThreshold = 165;
    let colorSensitivity = 85;

    if (level === 'gentle') {
      lightnessThreshold = 180;
      colorSensitivity = 70;
    } else if (level === 'ultra_faint') {
      lightnessThreshold = 145;
      colorSensitivity = 95;
    }

    onChangeConfig({
      intensityLevel: level,
      lightnessThreshold,
      colorSensitivity,
      faintLinksDetection: level === 'ultra_faint' || config.faintLinksDetection,
    });
  };

  return (
    <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xl shadow-slate-100/70 dark:shadow-none transition-colors">
      {/* 1. Header & AI 1-Click Action */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                لوحة التحكم الذكية والمبسطة
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                إزالة تلقائية 100% بدون تعقيد
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            تلقائي نشط
          </span>
        </div>

        {/* Big 1-Click Auto Clean Button */}
        <button
          type="button"
          onClick={onApplyCurrentPage}
          disabled={isProcessing}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>{isProcessing ? 'جاري التنظيف الذكي...' : '✨ إعادة التنظيف التلقائي الفوري'}</span>
        </button>
      </div>

      <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />

      {/* 2. Three Simple Strength Levels (قوة الاستئصال) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            درجة قوة الإزالة (Intensity Level):
          </span>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
            {currentIntensity === 'gentle'
              ? 'خفيف'
              : currentIntensity === 'balanced'
              ? 'متوازن (موصى به)'
              : 'فائق للروابط والعلامات الشفافة'}
          </span>
        </label>

        <div className="grid grid-cols-3 gap-2">
          {/* Gentle */}
          <button
            type="button"
            onClick={() => handleSetIntensity('gentle')}
            className={`py-2.5 px-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
              currentIntensity === 'gentle'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="text-xs font-extrabold">🌿 خفيف</span>
            <span className="text-[9px] opacity-75">للعلامات السطحية</span>
          </button>

          {/* Balanced */}
          <button
            type="button"
            onClick={() => handleSetIntensity('balanced')}
            className={`py-2.5 px-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 relative overflow-hidden ${
              currentIntensity === 'balanced'
                ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="text-xs font-extrabold">⚡ متوازن</span>
            <span className="text-[9px] opacity-80">للمذكرات والكتب</span>
          </button>

          {/* Ultra Faint */}
          <button
            type="button"
            onClick={() => handleSetIntensity('ultra_faint')}
            className={`py-2.5 px-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
              currentIntensity === 'ultra_faint'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="text-xs font-extrabold">🚀 فائق</span>
            <span className="text-[9px] opacity-75">للروابط الشفافة t.me</span>
          </button>
        </div>
      </div>

      {/* 3. Essential Easy Switches */}
      <div className="flex flex-col gap-2.5 pt-1">
        {/* Protection Switch */}
        <div className="flex items-center justify-between p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                حماية الصور والرسومات والألوان
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                يحمي صور الأحياء والمخططات والدوائر الملونة 100%
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.preserveAllColorsAndPhotos}
              onChange={(e) => onChangeConfig({ preserveAllColorsAndPhotos: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Translucent Links / Telegram Switch */}
        <div className="flex items-center justify-between p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white">
              <Link2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-blue-950 dark:text-blue-200">
                استئصال الروابط وقنوات التليجرام الشفافة
              </div>
              <div className="text-[10px] text-blue-700 dark:text-blue-400">
                يكتشف https://t.me/ والأسماء الخفيفة على الهيدرات الملونة
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.faintLinksDetection !== false}
              onChange={(e) => onChangeConfig({ faintLinksDetection: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Clean Margins Switch */}
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-600 text-white">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                تنظيف هوامش وأطراف الصفحة
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                يمسح أرقام الهواتف والسناتر من أعلى وأسفل الصفحة
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.cleanMargins}
              onChange={(e) => onChangeConfig({ cleanMargins: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />

      {/* 4. Action Buttons (Apply to All Pages & Export) */}
      <div className="flex flex-col gap-2 pt-1">
        {totalPages > 1 && (
          <button
            type="button"
            onClick={onApplyAllPages}
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-2"
          >
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>تطبيق الإزالة على جميع الصفحات ({totalPages} صفحات)</span>
          </button>
        )}

        {onOpenExport && (
          <button
            type="button"
            onClick={onOpenExport}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Download className="w-4 h-4" />
            <span>تحميل وحفظ الملف المنظف (PDF / HD)</span>
          </button>
        )}
      </div>
    </div>
  );
};

