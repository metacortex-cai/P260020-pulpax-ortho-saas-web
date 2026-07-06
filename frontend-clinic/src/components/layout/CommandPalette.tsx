'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  User, 
  Calendar, 
  CreditCard, 
  Settings, 
  X, 
  Command,
  ArrowRight,
  UserPlus,
  Zap
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

import { useUIStore } from '../../store/uiStore';

export default function CommandPalette({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { openAddPatientModal } = useUIStore();

  const actions = [
    { id: 'add-patient', title: 'Yeni Hasta Ekle', icon: <UserPlus size={16} />, category: 'Hızlı İşlemler', action: () => openAddPatientModal() },
// ...    { id: 'patients', title: 'Hasta Listesi', icon: <User size={16} />, category: 'Navigasyon', path: '/patients' },
    { id: 'appointments', title: 'Randevu Takvimi', icon: <Calendar size={16} />, category: 'Navigasyon', path: '/appointments' },
    { id: 'finance', title: 'Finansal Özet', icon: <CreditCard size={16} />, category: 'Navigasyon', path: '/finance/patient-current' },
    { id: 'settings', title: 'Ayarlar', icon: <Settings size={16} />, category: 'Navigasyon', path: '/settings/clinic' },
  ];

  const filteredPatients: any[] = [];

  const filteredActions = actions.filter(a => a.title.toLowerCase().includes(query.toLowerCase()));

  const allResults = [
    ...filteredActions.map(a => ({ ...a, type: 'action' })),
    ...filteredPatients.map(p => ({ ...p, title: p.name, icon: <User size={16} />, type: 'patient', path: `/patients/${p.id}`, category: 'Hastalar' }))
  ];

  // Reset query/selection whenever the palette is (re)opened — pure derivation from the
  // `isOpen` prop with no async work, so it's computed during render instead of in an effect.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }

  // Focus the input on open — genuine DOM side effect, belongs in an effect.
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allResults.length) % allResults.length);
    } else if (e.key === 'Enter') {
      const selected = allResults[selectedIndex];
      if (selected) {
        handleSelect(selected);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (item: any) => {
    if (item.path) {
      router.push(item.path);
    } else if (item.action) {
      item.action();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Palette */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1c1f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 h-14 border-b border-slate-100 dark:border-white/5">
          <Search size={20} className="text-slate-400 mr-3" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Hasta adı, işlem veya menü ara... (ESC ile kapat)"
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-slate-700 dark:text-slate-200 placeholder-slate-400"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-1 px-1.5 py-1 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
            <Command size={12} className="text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500">K</span>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
          {allResults.length > 0 ? (
            <div className="space-y-4 py-2">
              {['Hızlı İşlemler', 'Navigasyon', 'Hastalar'].map(category => {
                const items = allResults.filter(r => r.category === category);
                if (items.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{category}</h3>
                    <div className="space-y-0.5">
                      {items.map((item) => {
                        const globalIndex = allResults.indexOf(item);
                        const isSelected = selectedIndex === globalIndex;
                        
                        return (
                          <div 
                            key={item.id}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                              isSelected ? 'bg-metronic-primary text-white shadow-lg shadow-metronic-primary/20' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                            }`}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/5'}`}>
                                {item.icon}
                              </div>
                              <div>
                                <p className={`text-[14px] font-semibold ${isSelected ? 'text-white' : ''}`}>{item.title}</p>
                                {item.type === 'patient' && <p className={`text-[11px] ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>{(item as any).phone}</p>}
                              </div>
                            </div>
                            {isSelected && <ArrowRight size={16} className="text-white animate-in slide-in-from-left-2" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search size={24} className="text-slate-300" />
              </div>
              <p className="text-[14px] font-medium text-slate-500">Sonuç bulunamadı.</p>
              <p className="text-[12px] text-slate-400 mt-1">Farklı bir kelime ile tekrar deneyin.</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5">
               <div className="px-1.5 py-0.5 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded shadow-sm text-[10px] font-bold text-slate-500">↑↓</div>
               <span className="text-[11px] text-slate-500">Gezin</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="px-1.5 py-0.5 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded shadow-sm text-[10px] font-bold text-slate-500">ENTER</div>
               <span className="text-[11px] text-slate-500">Seç</span>
             </div>
           </div>
           <div className="flex items-center gap-1.5">
             <Zap size={12} className="text-amber-500" />
             <span className="text-[11px] font-medium text-slate-500 italic">Pulpax Quick-Nav</span>
           </div>
        </div>
      </div>
    </div>
  );
}
