import React from 'react';
import { RemovalConfig, LanguageStrings, WatermarkPresetType } from '../types';
import { PRESET_CONFIGS } from '../utils/imageProcessing';
import {
  Sparkles,
  ShieldCheck,
  Paintbrush,
  SlidersHorizontal,
  GraduationCap,
  PhoneCall,
  Stamp,
  Flame,
  CheckCircle2,
  ScanLine,
  Image as ImageIcon,
  Palette,
  Layers,
  Wand2,
} from 'lucide-react';

interface EngineSettingsProps {
  config: RemovalConfig;
  onChangeConfig: (newConfig: Partial<RemovalConfig>) => void;
  t: LanguageStrings;
  onOpenManualBrush: () => void;
  onRunDetection: () => void;
  onApplyCurrentPage: () => void;
  onApplyAllPages: () => void;
  isProcessing: boolean;
  totalPages: number;
}

export const EngineSettings: React.FC<EngineSettingsProps> = ({
  config,
  onChangeConfig,
  t,
  onOpenManualBrush,
  onRunDetection,
  onApplyCurrentPage,
  onApplyAllPages,
  isProcessing,
  totalPages,
}) => {
  const handleSelectPreset = (preset: WatermarkPresetType) => {
    const presetConfig = PRESET_CONFIGS[preset];
    if (presetConfig) {
      onChangeConfig(presetConfig);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xl transition-colors">
      {/* 1. PHOTO & GRAPHIC PROTECTION BANNER */}
      <div className="flex items-center justify-between p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/80 rounded-2xl transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
              درع حماية الصور والرسومات والألوان
              <span className="text-[10px] bg-emerald-200/70 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                مفعّل 100%
              </span>
            </div>
            <div className="text-[10px] text-emerald-800 dark:text-emerald-400">
              يحافظ على صور الأحياء، المأكولات، الدوائر الملونة (01, 02, 03, 04) وصناديق الأسئلة
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
          <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 dark:peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      {/* 2. Presets Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            أنماط الإزالة المجهزة (Smart Presets):
          </label>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900">
            تخصيص فوري
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSelectPreset('educational_exams')}
            className={`flex items-center gap-2.5 p-3 rounded-2xl border text-right transition-all ${
              config.preset === 'educational_exams'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div
              className={`p-2 rounded-xl ${
                config.preset === 'educational_exams' ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs">مذكرات وامتحانات دراسية</span>
              <span
                className={`text-[10px] ${
                  config.preset === 'educational_exams' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                حماية تامة للصور والألوان مع إزالة العلامات
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('margin_numbers')}
            className={`flex items-center gap-2.5 p-3 rounded-2xl border text-right transition-all ${
              config.preset === 'margin_numbers'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div
              className={`p-2 rounded-xl ${
                config.preset === 'margin_numbers' ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs">أرقام هواتف وهوامش فقط</span>
              <span
                className={`text-[10px] ${
                  config.preset === 'margin_numbers' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                تطهير أرقام 0114... على أطراف الصفحة
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('color_stamps')}
            className={`flex items-center gap-2.5 p-3 rounded-2xl border text-right transition-all ${
              config.preset === 'color_stamps'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div
              className={`p-2 rounded-xl ${
                config.preset === 'color_stamps' ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              <Stamp className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs">أختام ملونة وكام سكانر</span>
              <span
                className={`text-[10px] ${
                  config.preset === 'color_stamps' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                استئصال الأختام بالمناطق المحددة
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('aggressive_deep')}
            className={`flex items-center gap-2.5 p-3 rounded-2xl border text-right transition-all ${
              config.preset === 'aggressive_deep'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div
              className={`p-2 rounded-xl ${
                config.preset === 'aggressive_deep' ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
              }`}
            >
              <Flame className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs">تنظيف أبيض كامل (أحادي اللون)</span>
              <span
                className={`text-[10px] ${
                  config.preset === 'aggressive_deep' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                للمستندات النصية غير المصورة
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Scope and Color Target Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Clean Scope */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
            <ScanLine className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            نطاق التنظيف:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onChangeConfig({ cleanScope: 'full_page' })}
              className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                config.cleanScope === 'full_page'
                  ? 'bg-white dark:bg-slate-900 border-indigo-500 text-indigo-900 dark:text-indigo-300 shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              كامل الصفحة
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig({ cleanScope: 'selected_regions_only' })}
              className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                config.cleanScope === 'selected_regions_only'
                  ? 'bg-white dark:bg-slate-900 border-indigo-500 text-indigo-900 dark:text-indigo-300 shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              المناطق المحددة
            </button>
          </div>
        </div>

        {/* Target Watermark Color Mode */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            نوع العلامة المستهدفة:
          </label>
          <select
            value={config.targetColorMode}
            onChange={(e) => onChangeConfig({ targetColorMode: e.target.value as any, preset: 'custom' })}
            className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="faint_gray_only">العلامات الرمادية الباهتة والهوامش (آمن للألوان)</option>
            <option value="margin_sweep_only">أرقام الهواتف على الهوامش فقط</option>
            <option value="all_faint_overlays">كافة العلامات الباهتة والأختام</option>
          </select>
        </div>
      </div>

      {/* 4. Fine-Tuning Sliders & Protective Toggles */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            ضبط حساسية الإزالة
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">تحكم دقيق بدون إتلاف الألوان</span>
        </div>

        {/* Sliders */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{t.sensitivity}:</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{config.colorSensitivity}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="95"
            value={config.colorSensitivity}
            onChange={(e) => onChangeConfig({ colorSensitivity: Number(e.target.value), preset: 'custom' })}
            className="accent-indigo-600 cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">عتبة السطوع والشفافية (Lightness Threshold):</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{config.lightnessThreshold}</span>
          </div>
          <input
            type="range"
            min="140"
            max="230"
            value={config.lightnessThreshold}
            onChange={(e) => onChangeConfig({ lightnessThreshold: Number(e.target.value), preset: 'custom' })}
            className="accent-indigo-600 cursor-pointer"
          />
        </div>

        {/* Feature Toggles */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.cleanMargins}
              onChange={(e) => onChangeConfig({ cleanMargins: e.target.checked })}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              تطهير هوامش الصفحة وأرقام الهواتف الجانبية (Margin Cleaner)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.preserveRedQuestions}
              onChange={(e) => onChangeConfig({ preserveRedQuestions: e.target.checked })}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              حماية نصوص وأرقام الأسئلة الملونة باللون الأحمر <span className="text-red-600 dark:text-red-400 font-bold">(١)، (٢)</span>
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.removeBackgroundTint}
              onChange={(e) => onChangeConfig({ removeBackgroundTint: e.target.checked })}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              تحويل صناديق الأسئلة الصفراء/الوردية إلى خلفية بيضاء (اختياري)
            </span>
          </label>
        </div>
      </div>

      {/* Manual Eraser Brush Button */}
      <button
        type="button"
        onClick={onOpenManualBrush}
        className="flex items-center justify-between p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-900 dark:text-indigo-200 transition-all text-right"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm">
            <Paintbrush className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs">الممحاة والفرشاة اليدوية</div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400">لتحديد أي شارة أو لوجو أو نص متبقٍ بالفرشاة المباشرة</div>
          </div>
        </div>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-indigo-100 dark:border-indigo-800">
          فتح الممحاة
        </span>
      </button>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5 pt-1">
        <button
          id="btn-remove-current-page"
          onClick={onApplyCurrentPage}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl text-sm shadow-lg shadow-indigo-500/20 transition"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>تطبيق الإزالة الفائقة على هذه الصفحة</span>
        </button>

        {totalPages > 1 && (
          <button
            id="btn-remove-all-pages"
            onClick={onApplyAllPages}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs shadow-md transition"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{t.removeAllPages} ({totalPages} صفحات)</span>
          </button>
        )}
      </div>
    </div>
  );
};
