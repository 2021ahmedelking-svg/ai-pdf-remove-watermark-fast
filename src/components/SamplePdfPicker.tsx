import React from 'react';
import { LanguageStrings } from '../types';
import { FileText, Award, Receipt, Sparkles } from 'lucide-react';

interface SamplePdfPickerProps {
  onSelectSample: (type: 'contract' | 'academic' | 'invoice') => void;
  t: LanguageStrings;
  isLoading: boolean;
}

export const SamplePdfPicker: React.FC<SamplePdfPickerProps> = ({
  onSelectSample,
  t,
  isLoading,
}) => {
  return (
    <div className="flex flex-col gap-3 w-full max-w-4xl mx-auto mt-8">
      <div className="flex items-center gap-2 justify-center text-xs font-bold text-slate-500">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
        <span>{t.trySample}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Sample 1 */}
        <button
          onClick={() => onSelectSample('contract')}
          disabled={isLoading}
          className="flex items-start gap-3.5 p-4 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-indigo-300 rounded-2xl text-right transition-all group shadow-sm hover:shadow-md"
        >
          <div className="p-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
              عقد اتفاقية NDA
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              علامة مائية حمراء مائلة "CONFIDENTIAL"
            </span>
          </div>
        </button>

        {/* Sample 2 */}
        <button
          onClick={() => onSelectSample('academic')}
          disabled={isLoading}
          className="flex items-start gap-3.5 p-4 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-indigo-300 rounded-2xl text-right transition-all group shadow-sm hover:shadow-md"
        >
          <div className="p-2.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl group-hover:scale-105 transition-transform">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
              بحث علمي ودراسة
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              شريط مسودة وتكرار "DRAFT COPY"
            </span>
          </div>
        </button>

        {/* Sample 3 */}
        <button
          onClick={() => onSelectSample('invoice')}
          disabled={isLoading}
          className="flex items-start gap-3.5 p-4 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-indigo-300 rounded-2xl text-right transition-all group shadow-sm hover:shadow-md"
        >
          <div className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl group-hover:scale-105 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
              فاتورة ضريبية رسمية
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              شعار "CamScanner" وختم مائل
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
