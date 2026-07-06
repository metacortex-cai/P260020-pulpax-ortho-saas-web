'use client';

import { AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';
import Modal from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
}

/**
 * Sistem genelinde standart silme/onay diyaloğu. Tarayıcının window.confirm()
 * yerine kullanılır — tutarlı görünüm, yükleniyor durumu ve erişilebilirlik sağlar.
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Sil',
  cancelLabel = 'İptal',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  const isDanger = variant === 'danger';

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 text-[13px] font-bold text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
              isDanger ? 'bg-metronic-danger hover:bg-red-600' : 'bg-metronic-primary hover:bg-blue-600'
            }`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'İşleniyor...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isDanger ? 'bg-red-100 text-metronic-danger' : 'bg-metronic-primary-light text-metronic-primary'
        }`}>
          {isDanger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
        </div>
        <div className="text-[13px] text-slate-600 leading-relaxed pt-1.5">{message}</div>
      </div>
    </Modal>
  );
}
