import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400" />,
    info: <Info className="w-4 h-4 text-sky-400" />
  };

  const colors = {
    success: 'bg-slate-900 text-white border-emerald-500/50',
    error: 'bg-slate-900 text-white border-rose-500/50',
    info: 'bg-slate-900 text-white border-sky-500/50'
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-bounce-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold ${colors[toast.type || 'info']}`}>
        {icons[toast.type || 'info']}
        <span>{toast.message}</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white ml-2"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

