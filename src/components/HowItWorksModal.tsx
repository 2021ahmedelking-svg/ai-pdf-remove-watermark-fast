import React from 'react';
import { X, Sparkles, Layers, ShieldCheck, Cpu, Zap, Download, Lock, CheckCircle2 } from 'lucide-react';

interface HowItWorksModalProps {
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative flex flex-col gap-6 transition-colors">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded-2xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">كيف يعمل محرك إزالة العلامات المائية للـ PDF؟</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">تقنية هجينة تجمع بين رؤية الذكاء الاصطناعي وحماية الألوان</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-3.5 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/90 dark:border-slate-700">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0 border border-indigo-100 dark:border-indigo-900">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-0.5">1. كشف وتحليل العلامات بالذكاء الاصطناعي</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                يقوم نموذج Vision باكتشاف الكلمات القطرية (DRAFT, CONFIDENTIAL)، أرقام الهواتف على الهوامش، والشعارات الشفافة وتحديد إحداثياتها الدقيقة.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/90 dark:border-slate-700">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 border border-emerald-100 dark:border-emerald-900">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-0.5">2. درع حماية الصور والرسومات والألوان</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                حماية مطلقة لصور الأحياء والمأكولات والأيقونات الملونة (01, 02, 03, 04) وصناديق الأسئلة دون مساس بجودتها الأصلية.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/90 dark:border-slate-700">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl shrink-0 border border-purple-100 dark:border-purple-900">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-0.5">3. شريط المقارنة التفاعلي (Before / After)</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                يمكنك معاينة النتيجة قبل التصدير عبر سحب شريط المقارنة التفاعلي أو تفعيل الفرشاة اليدوية لأي تعديل مخصص.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>معالجة آمنة وخاصة 100% داخل المتصفح</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition"
          >
            فهمت ذلك، البدء الآن
          </button>
        </div>
      </div>
    </div>
  );
};
