import React, { useState } from 'react';
import { PDFPageData, LanguageStrings } from '../types';
import { Download, FileCheck2, Image as ImageIcon, Sparkles, X, Check, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { buildAndDownloadPdf } from '../utils/pdfEngine';

interface ExportModalProps {
  pages: PDFPageData[];
  currentPageIndex: number;
  fileName: string;
  t: LanguageStrings;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  pages,
  currentPageIndex,
  fileName,
  t,
  onClose,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadScope, setDownloadScope] = useState<'all' | 'current'>('all');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png'>('pdf');

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#10b981', '#38bdf8', '#a855f7'],
    });
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (exportFormat === 'pdf') {
        const pagesToExport = downloadScope === 'all' ? pages : [pages[currentPageIndex]];
        const cleanName = fileName.replace(/\.pdf$/i, '') + '-cleaned.pdf';
        
        const blob = await buildAndDownloadPdf(pagesToExport, cleanName, true);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = cleanName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // PNG export of current page
        const cur = pages[currentPageIndex];
        const dataUrl = cur.cleanedCanvasDataUrl || cur.originalCanvasDataUrl;
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${fileName.replace(/\.pdf$/i, '')}-page-${cur.pageNumber}-clean.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      triggerCelebration();
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Export error:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative flex flex-col gap-6 transition-colors">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded-2xl">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{t.exportQuality}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">تصدير المستند المنظف بأعلى جودة جاهزة للطباعة</p>
          </div>
        </div>

        {/* Format selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200">صيغة التصدير:</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setExportFormat('pdf')}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                exportFormat === 'pdf'
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="flex flex-col text-right">
                <span className="font-bold text-xs">ملف PDF متكامل</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">جاهز للطباعة والقراءة</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('png')}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                exportFormat === 'png'
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="flex flex-col text-right">
                <span className="font-bold text-xs">صورة PNG فائقة الجودة</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">الصفحة الحالية بدقة HD</span>
              </div>
            </button>
          </div>
        </div>

        {/* Scope selector (if PDF and multiple pages) */}
        {exportFormat === 'pdf' && pages.length > 1 && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">نطاق الصفحات:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDownloadScope('all')}
                className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all ${
                  downloadScope === 'all'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800'
                }`}
              >
                جميع الصفحات ({pages.length} صفحات)
              </button>
              <button
                type="button"
                onClick={() => setDownloadScope('current')}
                className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all ${
                  downloadScope === 'current'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800'
                }`}
              >
                الصفحة الحالية فقط (#{currentPageIndex + 1})
              </button>
            </div>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleDownload}
          disabled={isExporting}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl text-sm shadow-xl shadow-indigo-500/25 transition flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <Sparkles className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          <span>{isExporting ? 'جاري إنشاء الملف وتنزيله...' : 'تنزيل الملف النظيف الآن'}</span>
        </button>
      </div>
    </div>
  );
};
