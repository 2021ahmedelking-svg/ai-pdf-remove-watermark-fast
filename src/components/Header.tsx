import React from 'react';
import { LanguageStrings } from '../types';
import { Sparkles, Globe, FileCheck2, Shield, Info } from 'lucide-react';

interface HeaderProps {
  currentLang: 'ar' | 'en';
  onToggleLang: () => void;
  t: LanguageStrings;
  onOpenInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onToggleLang,
  t,
  onOpenInfo,
}) => {
  return (
    <header className="w-full bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 shadow-md shadow-indigo-200 text-white font-black text-lg">
            <span className="font-extrabold text-white text-base">P</span>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                PDFClear<span className="text-indigo-600">.ai</span>
              </h1>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                AI Vision v4.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {currentLang === 'ar' ? 'إزالة العلامات المائية والأختام بجودة أصلية' : 'Smart watermark & stamp remover for PDFs'}
            </p>
          </div>
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenInfo}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">{currentLang === 'ar' ? 'كيف يعمل؟' : 'How it works'}</span>
          </button>

          {/* Language Switch */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>{currentLang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
