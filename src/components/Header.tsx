import React from 'react';
import { LanguageStrings } from '../types';
import { Sparkles, Globe, Info, Moon, Sun, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentLang: 'ar' | 'en';
  onToggleLang: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  t: LanguageStrings;
  onOpenInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onToggleLang,
  isDarkMode,
  onToggleDarkMode,
  t,
  onOpenInfo,
}) => {
  return (
    <header className="w-full bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-md shadow-indigo-500/20 text-white font-black text-lg">
            <span className="font-extrabold text-white text-base">P</span>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                PDFClear<span className="text-indigo-600 dark:text-indigo-400">.ai</span>
              </h1>
              <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-indigo-100 dark:border-indigo-800">
                PRO v4.2
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              {currentLang === 'ar' ? 'إزالة العلامات المائية والأختام وحماية الألوان' : 'Smart watermark & stamp remover with photo protection'}
            </p>
          </div>
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            id="btn-toggle-dark-mode"
            aria-label="Toggle dark mode"
            title={isDarkMode ? (currentLang === 'ar' ? 'الوضع الفاتح' : 'Light mode') : (currentLang === 'ar' ? 'الوضع الداكن' : 'Dark mode')}
            className="flex items-center justify-center w-9 h-9 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 animate-in spin-in-90 duration-200" />
            )}
          </button>

          {/* Info Button */}
          <button
            onClick={onOpenInfo}
            id="btn-open-info"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">{currentLang === 'ar' ? 'كيف يعمل؟' : 'How it works'}</span>
          </button>

          {/* Language Switch */}
          <button
            onClick={onToggleLang}
            id="btn-toggle-language"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors border border-slate-200/60 dark:border-slate-700"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{currentLang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
