import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  title: string;
  description: React.ReactNode;
}

export default function InfoTooltip({ title, description }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative inline-flex items-center ml-1" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button 
        onClick={() => setOpen(!open)}
        className={`text-slate-400 hover:text-metronic-primary transition-colors focus:outline-none ${open ? 'text-metronic-primary' : ''}`}
      >
        <Info size={18} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-[280px] md:w-[320px] z-[100] bg-white dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-4 pointer-events-none" style={{ animation: 'fadeIn 0.15s ease-out' }}>
          <h4 className="text-[13px] font-bold text-slate-800 dark:text-white mb-1.5">{title}</h4>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed m-0">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
