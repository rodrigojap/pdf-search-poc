import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-slide-in-right flex items-start gap-3 px-4 py-3 rounded-xl
                     border shadow-2xl shadow-black/40 max-w-sm min-w-[280px]
                     backdrop-blur-2xl
                     bg-slate-900/90 border-white/10"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <XCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
          )}
          <p className="text-sm text-slate-200 flex-1 leading-snug">{toast.message}</p>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
