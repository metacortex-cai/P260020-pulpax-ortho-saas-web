'use client';

import { useRef, useEffect } from 'react';
import { X, UserPlus, CreditCard, CalendarCheck, Package, FlaskConical, CalendarOff, Check, Trash2, Info, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

const ICON_MAP: Record<string, { icon: React.ReactNode; bg: string }> = {
  INFO:          { icon: <Info size={16} />, bg: 'bg-blue-500' },
  SUCCESS:       { icon: <CheckCircle2 size={16} />, bg: 'bg-emerald-500' },
  WARNING:       { icon: <AlertTriangle size={16} />, bg: 'bg-amber-500' },
  ERROR:         { icon: <XCircle size={16} />, bg: 'bg-rose-500' },
  // Legacy types for fallback
  patient_added: { icon: <UserPlus size={16} />, bg: 'bg-blue-500' },
  payment:       { icon: <CreditCard size={16} />, bg: 'bg-emerald-500' },
  appointment:   { icon: <CalendarCheck size={16} />, bg: 'bg-violet-500' },
};

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, markAsRead } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Archive is frontend only for now
  const markAllRead = () => {
    notifications.filter(n => !n.isRead).forEach(n => markAsRead(n.id));
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2.5 w-[420px] max-h-[560px] bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-100 dark:border-white/10 overflow-hidden z-50 flex flex-col"
      style={{
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.03)',
        animation: 'profileDropIn 0.2s ease-out',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <h6 className="text-[15px] font-bold text-slate-800 dark:text-white">Bildirimler</h6>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-metronic-primary text-white text-[10px] font-bold rounded-full">{unreadCount} yeni</span>
          )}
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Check size={32} className="mb-2 text-slate-300" />
            <p className="text-[13px] font-medium">Tüm bildirimler okundu veya boş.</p>
          </div>
        ) : (
          notifications.map(n => {
            const iconInfo = ICON_MAP[n.type] || ICON_MAP['INFO'];
            
            let timeStr = '';
            try {
              timeStr = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: tr });
            } catch {
              timeStr = 'Az önce';
            }

            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markAsRead(n.id)}
                className={`flex gap-3.5 px-5 py-4 border-b border-slate-50 dark:border-white/[0.02] cursor-pointer transition-colors group ${
                  !n.isRead ? 'bg-blue-50/40 dark:bg-metronic-primary/5' : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 pt-0.5 relative">
                  <div className={`w-10 h-10 rounded-full ${iconInfo.bg} flex items-center justify-center text-white shadow-sm`}>
                    {iconInfo.icon}
                  </div>
                  {!n.isRead && (
                    <span className="absolute -left-1.5 top-3.5 w-2.5 h-2.5 bg-metronic-primary rounded-full border-2 border-white dark:border-[#1c1f2e]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h6 className={`text-[13px] leading-tight ${!n.isRead ? 'font-bold text-slate-800 dark:text-white' : 'font-semibold text-slate-600 dark:text-slate-300'}`}>
                    {n.title}
                  </h6>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 block font-medium">{timeStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="flex items-center border-t border-slate-100 dark:border-white/5 flex-shrink-0">
          <button
            onClick={markAllRead}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-[13px] font-semibold text-slate-500 dark:text-slate-400 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
          >
            <Check size={14} /> Tümünü Okundu İşaretle
          </button>
        </div>
      )}
    </div>
  );
}
