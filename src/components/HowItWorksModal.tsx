import React from 'react';
import { X, Sparkles, Layers, ShieldCheck, Cpu, Zap, Download } from 'lucide-react';

interface HowItWorksModalProps {
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative flex flex-col gap-6">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">كيف يعمل محرك إزالة العلامات المائية للـ PDF؟</h3>
            <p className="text-xs text-slate-500">تقنية هجينة تجمع بين رؤية الذكاء الاصطناعي وهندسة الفكتور</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 text-xs text-slate-600">
          <div className="flex items-start gap-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200/90">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 border border-indigo-100">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-0.5">1. كشف وتحليل العلامات بالذكاء الاصطناعي</h4>
              <p className="text-slate-500 leading-relaxed">
                يقوم نموذج Vision باكتشاف الكلمات القطرية (DRAFT, CONFIDENTIAL)، الشعارات الشفافة، وتحديد إحداثياتها الدقيقة في أجزاء من الثانية.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200/90">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 border border-emerald-100">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-0.5">2. العزل اللوني والترميم الذكي (Inpainting)</h4>
              <p className="text-slate-500 leading-relaxed">
                يتم فصل طبقات الشفافية وعزل الألوان المائية واستبدالها بخلفية المستند الأصلية النقية مع الحفاظ الصارم على حدة نصوص المستند السوداء.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200/90">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl shrink-0 border border-purple-100">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-0.5">3. شريط المقارنة التفاعلي (Before / After)</h4>
              <p className="text-slate-500 leading-relaxed">
                يمكنك سحب الشريط لرؤية الفرق اللحظي بين الأصل والنتيجة تماماً كما في WatermarkRemover.io، مع إمكانية التعديل بالفرشاة اليدوية.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-indigo-200 transition"
        >
          فهمت ذلك، دعنا نبدأ!
        </button>
      </div>
    </div>
  );
};
