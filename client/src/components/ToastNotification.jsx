import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: [CheckCircle2, 'text-emerald-400'],
  error: [AlertTriangle, 'text-rose-400'],
  info: [Info, 'text-indigo-400'],
};

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.type === 'error' ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);
  const [Icon, color] = ICONS[toast.type] || ICONS.info;
  return (
    <div role="status" className="flex w-80 items-start gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3.5 shadow-2xl shadow-black/40">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{toast.title}</p>
        {toast.message && <p className="mt-0.5 break-words text-sm text-slate-400">{toast.message}</p>}
      </div>
      <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss" className="text-slate-500 hover:text-slate-200">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ToastNotification({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2 [&>*]:pointer-events-auto">
      {toasts.map((t) => <Toast key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  );
}
