import React, { useState } from 'react';
import { PDFPageData, LanguageStrings } from '../types';
import { Download, FileCheck2, Image as ImageIcon, Sparkles, X, Check } from 'lucide-react';
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
      }, 800);
    } catch (err) {
      console.error('Export error:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative flex flex-col gap-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">{t.exportQuality}</h3>
            <p className="text-xs text-slate-500">تصدير المستند بعد إزالة العلامات المائية بجودة أصلية</p>
          </div>
        </div>

        {/* Format Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-800">صيغة الملف:</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setExportFormat('pdf')}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                exportFormat === 'pdf'
                  ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileCheck2 className="w-5 h-5 text-indigo-600" />
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold">مستند PDF نظيف</span>
                <span className="text-[10px] text-slate-500">Crisp Multi-Page PDF</span>
              </div>
            </button>

            <button
              onClick={() => setExportFormat('png')}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                exportFormat === 'png'
                  ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ImageIcon className="w-5 h-5 text-indigo-600" />
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold">صورة PNG فائقة الدقة</span>
                <span className="text-[10px] text-slate-500">High-Res PNG (300DPI)</span>
              </div>
            </button>
          </div>
        </div>

        {/* Scope Selection (All vs Current) */}
        {exportFormat === 'pdf' && pages.length > 1 && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-800">نطاق التصدير:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDownloadScope('all')}
                className={`p-3.5 rounded-2xl border text-xs font-bold text-right transition ${
                  downloadScope === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                جميع الصفحات ({pages.length} صفحات)
              </button>

              <button
                onClick={() => setDownloadScope('current')}
                className={`p-3.5 rounded-2xl border text-xs font-bold text-right transition ${
                  downloadScope === 'current'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                الصفحة الحالية فقط (صفحة {currentPageIndex + 1})
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleDownload}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-2xl text-sm shadow-lg shadow-indigo-200 transition-all mt-2"
        >
          <Download className="w-5 h-5" />
          <span>{isExporting ? 'جاري تجهيز التحميل...' : 'بدء التحميل الآن (مجاناً وبدون حدود)'}</span>
        </button>
      </div>
    </div>
  );
};
