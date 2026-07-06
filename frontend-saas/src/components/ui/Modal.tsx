'use client';

import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: ReactNode;
  footer?: ReactNode;
  footerAlign?: 'start' | 'center' | 'end';
}

const SIZE_MAP = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
};

export default function Modal({ isOpen, onClose, title, subtitle, size = 'md', children, footer, footerAlign = 'end' }: ModalProps) {
  // ESC ile kapat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Body scroll kilidi
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.15s ease' }}
        onClick={onClose}
      />

      {/* Modal Kutusu */}
      <div
        className={`relative w-full ${SIZE_MAP[size]} bg-white dark:bg-[#1c1f2e] rounded-2xl shadow-2xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]`}
        style={{ animation: 'slideUp 0.18s ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/70 dark:border-white/5 flex-shrink-0">
          <div>
            <h3 id="modal-title" className="text-[1rem] font-bold text-slate-800 dark:text-white leading-tight">{title}</h3>
            {subtitle && <p className="text-[12px] text-slate-400 font-medium mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>

        {/* Footer (opsiyonel) */}
        {footer && (
          <div className={`flex items-center justify-${footerAlign} gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] rounded-b-2xl flex-shrink-0`}>
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
