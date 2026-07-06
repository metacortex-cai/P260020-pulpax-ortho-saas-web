'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DropdownProps {
  trigger: React.ReactNode;
  align?: 'left' | 'right';
  /** Menü, tetikleyicinin üstünde açılır (ör. sayfanın en alt satırlarındaki aksiyon menüleri için). */
  openUp?: boolean;
  children: React.ReactNode;
}

interface DropdownItemProps {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}

/**
 * Standart aksiyon/filtre menüsü. İçerik React portal ile document.body'ye
 * render edilir ve tetikleyicinin ekran konumuna göre position:fixed ile
 * konumlandırılır — böylece overflow:auto/overflow:hidden olan kaydırılabilir
 * kapların (tablo gövdesi vb.) içinde açıldığında kesilip görünmez olmaz.
 */
export const Dropdown: React.FC<DropdownProps> = ({ trigger, align = 'right', openUp = false, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left?: number; right?: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const close = () => setIsOpen(false);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, []);

  const handleTriggerClick = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const horizontal = align === 'right' ? { right: window.innerWidth - rect.right } : { left: rect.left };
      const vertical = openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 };
      setCoords({ ...horizontal, ...vertical });
    }
    setIsOpen(o => !o);
  };

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div onClick={handleTriggerClick} className="inline-flex items-center justify-center">
        {trigger}
      </div>

      {isOpen && coords && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[100] w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1"
          style={{ top: coords.top, bottom: coords.bottom, left: coords.left, right: coords.right, animation: 'fadeInDown 0.12s ease' }}
        >
          {children}
        </div>,
        document.body,
      )}
    </div>
  );
};

export const DropdownItem: React.FC<DropdownItemProps> = ({
  icon,
  label,
  onClick,
  danger = false,
}) => {
  const dangerClass = danger
    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition-colors ${dangerClass}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

export default Dropdown;
