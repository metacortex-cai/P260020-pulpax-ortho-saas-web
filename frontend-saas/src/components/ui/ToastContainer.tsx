'use client';
import { useToastStore } from '../../store/toastStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle2 className="text-metronic-success" size={20} />,
  error: <AlertCircle className="text-metronic-danger" size={20} />,
  info: <Info className="text-blue-500" size={20} />,
  warning: <AlertTriangle className="text-amber-500" size={20} />,
};

const BORDERS = {
  success: 'border-metronic-success/30 bg-metronic-success-light/20',
  error: 'border-metronic-danger/30 bg-red-50',
  info: 'border-blue-200 bg-blue-50',
  warning: 'border-amber-200 bg-amber-50',
};

const BORDER_COLORS = {
  success: '#50cd89',
  error: '#f1416c',
  info: '#009ef7',
  warning: '#ffc700',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} 
             className={`pointer-events-auto flex items-start gap-3 w-[320px] p-4 bg-white rounded-xl shadow-lg border-l-[4px] border-y border-r border-y-slate-200/60 border-r-slate-200/60 transition-all duration-300 animate-slide-in-right`}
             style={{ borderLeftColor: BORDER_COLORS[toast.type] }}
        >
          <div className="flex-shrink-0 mt-0.5">{ICONS[toast.type]}</div>
          <div className="flex-1 min-w-0">
            {toast.title && <h4 className="text-[13px] font-bold text-slate-800 mb-0.5">{toast.title}</h4>}
            <p className="text-[12px] font-medium text-slate-600 leading-snug">{toast.message}</p>
          </div>
          <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}
