import React from 'react';
import { PDFPageData, LanguageStrings } from '../types';
import { CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

interface PageThumbnailStripProps {
  pages: PDFPageData[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  t: LanguageStrings;
}

export const PageThumbnailStrip: React.FC<PageThumbnailStripProps> = ({
  pages,
  currentPageIndex,
  onSelectPage,
  t,
}) => {
  if (pages.length <= 1) return null;

  return (
    <div className="flex flex-col gap-2 bg-white rounded-3xl border border-slate-200/90 p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-1">
        <span>صفحات المستند ({pages.length} صفحات)</span>
        <span className="text-[11px] text-indigo-600 font-mono font-bold">
          {t.page} {currentPageIndex + 1} {t.of} {pages.length}
        </span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
        {pages.map((page, idx) => {
          const isCurrent = idx === currentPageIndex;
          const isCleaned = Boolean(page.cleanedCanvasDataUrl);

          return (
            <button
              key={page.pageNumber}
              onClick={() => onSelectPage(idx)}
              className={`relative flex flex-col items-center shrink-0 rounded-2xl overflow-hidden border-2 transition-all p-1.5 group ${
                isCurrent
                  ? 'border-indigo-600 bg-indigo-50/60 shadow-md shadow-indigo-100 scale-105'
                  : 'border-slate-200 bg-slate-50 hover:border-indigo-300'
              }`}
            >
              <div className="relative w-16 h-22 bg-white rounded-xl overflow-hidden shadow-xs flex items-center justify-center border border-slate-100">
                <img
                  src={page.cleanedCanvasDataUrl || page.originalCanvasDataUrl}
                  alt={`Page ${page.pageNumber}`}
                  className="w-full h-full object-cover"
                />

                {isCleaned && (
                  <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <span
                className={`text-[10px] font-bold mt-1.5 ${
                  isCurrent ? 'text-indigo-600 font-extrabold' : 'text-slate-600'
                }`}
              >
                {page.pageNumber}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
