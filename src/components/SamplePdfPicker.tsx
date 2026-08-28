import React from 'react';
import { LanguageStrings } from '../types';
import { FileText, Award, Receipt, Sparkles, ArrowUpRight, GraduationCap } from 'lucide-react';

interface SamplePdfPickerProps {
  onSelectSample: (type: 'contract' | 'academic' | 'invoice' | 'arabic_exam') => void;
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
      <div className="flex items-center gap-2 justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>{t.trySample}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Sample 0: Egyptian Biology Exam */}
        <button
          onClick={() => onSelectSample('arabic_exam')}
          disabled={isLoading}
          className="flex items-start gap-3.5 p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl text-right transition-all group shadow-sm hover:shadow-md ring-2 ring-indigo-500/10"
        >
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded-xl group-hover:scale-105 transition-transform shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                امتحان أحياء (ثانوية عامة)
              </span>
              <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              رسومات فقرات ورسم بياني مع رقم هاتف 0114...
            </span>
          </div>
        </button>

        {/* Sample 1: Contract */}
        <button
          onClick={() => onSelectSample('contract')}
          disabled={isLoading}
          className="flex items-start gap-3.5 p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 rounded-2xl text-right transition-all group shadow-sm hover:shadow-md"
        >
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900 rounded-xl group-hover:scale-105 transition-transform shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                عقد اتفاقية NDA
              </span>
              <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              علامة مائية حمراء مائلة "CONFIDENTIAL"
            </span>
          </div>
        </button>

        {/* Sample 2: Academic Paper */}
        <button
          onClick={() => onSelectSample('academic')}
          disabled={isLoading}
          className="flex items-start gap-3.5 p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 rounded-2xl text-right transition-all group shadow-sm hover:shadow-md"
        >
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900 rounded-xl group-hover:scale-105 transition-transform shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                بحث علمي ودراسة
              </span>
              <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              شريط مسودة وتكرار "DRAFT COPY"
            </span>
          </div>
        </button>

        {/* Sample 3: Invoice */}
        <button
          onClick={() => onSelectSample('invoice')}
          disabled={isLoading}
          className="flex items-start gap-3.5 p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 rounded-2xl text-right transition-all group shadow-sm hover:shadow-md"
        >
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-xl group-hover:scale-105 transition-transform shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                فاتورة تجارية
              </span>
              <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              ختم أزرق وشعار كام سكانر CamScanner
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

