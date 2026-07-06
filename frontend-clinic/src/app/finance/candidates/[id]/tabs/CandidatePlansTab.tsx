'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Plus,
  Copy, 
  ArrowRightLeft, 
  Calendar, 
  Tag, 
  CheckSquare, 
  ChevronDown, 
  Stethoscope, 
  ArrowRight,
  Info
} from 'lucide-react';
import Modal from '../../../../../components/ui/Modal';
import Dropdown from '../../../../../components/ui/Dropdown';
import { formatCurrency } from '../../../../../lib/utils/formatCurrency';

interface PlanItem {
  id: number;
  tooth: string;
  areas: string;
  category: string;
  name: string;
  price: number;
  originalPrice: number;
  doctor: string;
}

interface Plan {
  id: string;
  name: string;
  createdAt: string;
  items: PlanItem[];
}



function DropdownItem({ icon, label, onClick }: { icon?: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary">
      {icon}{label}
    </button>
  );
}

export default function CandidatePlansTab({ candidate }: { candidate: any }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string>('');
  const [checkedRows, setCheckedRows] = useState<Set<number>>(new Set());
  
  // Price Update Modal State
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountItems, setDiscountItems] = useState<PlanItem[]>([]);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('');

  const activePlan = plans.find(p => p.id === activePlanId) ?? plans[0];
  const activePlanTotal = activePlan?.items.reduce((s, i) => s + i.price, 0) ?? 0;

  const toggleRow = (id: number) => {
    const next = new Set(checkedRows);
    next.has(id) ? next.delete(id) : next.add(id);
    setCheckedRows(next);
  };

  const applyDiscount = () => {
    const val = parseFloat(discountValue) || 0;
    const origTotal = discountItems.reduce((s, i) => s + i.originalPrice, 0);
    if (origTotal === 0) return;

    setDiscountItems(prev => prev.map(item => ({
      ...item,
      price: discountType === 'PERCENT' 
        ? Math.round(item.originalPrice * (1 - val / 100))
        : Math.round(item.originalPrice * (1 - (val / origTotal)))
    })));
  };

  const saveDiscount = () => {
    setPlans(plans.map(p => {
      if (p.id !== activePlanId) return p;
      return {
        ...p,
        items: p.items.map(item => {
          const matched = discountItems.find(d => d.id === item.id);
          return matched ? { ...item, price: matched.price } : item;
        })
      };
    }));
    setDiscountModalOpen(false);
    setCheckedRows(new Set());
  };

  const copyItems = (destId: string) => {
    let currentPlans = [...plans];
    let targetId = destId;

    if (destId === 'NEW_PLAN') {
      const n = plans.length + 1;
      targetId = `plan-${Date.now()}`;
      currentPlans.push({
        id: targetId,
        name: `Plan ${n}`,
        createdAt: new Date().toLocaleDateString('tr-TR'),
        items: []
      });
    }

    const itemsToCopy = activePlan.items
      .filter(i => checkedRows.has(i.id))
      .map(i => ({ ...i, id: Date.now() + Math.random() }));

    setPlans(currentPlans.map(p => p.id === targetId ? { ...p, items: [...p.items, ...itemsToCopy] } : p));
    if (destId === 'NEW_PLAN') setActivePlanId(targetId);
    setCheckedRows(new Set());
  };

  const moveItems = (destId: string) => {
    let currentPlans = [...plans];
    let targetId = destId;

    if (destId === 'NEW_PLAN') {
      const n = plans.length + 1;
      targetId = `plan-${Date.now()}`;
      currentPlans.push({
        id: targetId,
        name: `Plan ${n}`,
        createdAt: new Date().toLocaleDateString('tr-TR'),
        items: []
      });
    }

    const itemsToMove = activePlan.items.filter(i => checkedRows.has(i.id));
    
    setPlans(currentPlans.map(p => {
      if (p.id === activePlanId) return { ...p, items: p.items.filter(i => !checkedRows.has(i.id)) };
      if (p.id === targetId) return { ...p, items: [...p.items, ...itemsToMove] };
      return p;
    }));
    
    if (destId === 'NEW_PLAN') setActivePlanId(targetId);
    setCheckedRows(new Set());
  };

  return (
    <div className="space-y-6">
      
      {/* Selection & Multi-Action Toolbar */}
      {checkedRows.size > 0 && (
        <div className="flex items-center justify-between px-6 py-4 bg-metronic-primary-light dark:bg-metronic-primary/10 border border-metronic-primary/20 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-3">
            <CheckSquare size={18} className="text-metronic-primary" />
            <span className="text-[14px] font-black text-metronic-primary">{checkedRows.size} işlem seçildi</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setDiscountItems(activePlan.items.filter(i => checkedRows.has(i.id))); setDiscountModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-metronic-primary/30 text-metronic-primary rounded-xl text-[12px] font-bold hover:bg-metronic-primary hover:text-white transition-all shadow-sm"
            >
              <Tag size={14} /> Fiyat Güncelle
            </button>
            <Dropdown align="left" trigger={<button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 text-slate-600 rounded-xl text-[12px] font-bold hover:bg-slate-50 transition-all shadow-sm"><Copy size={14} /> Kopyala <ChevronDown size={14} /></button>}>
              <DropdownItem icon={<Plus size={14} className="text-metronic-primary" />} label="Yeni Plan Oluştur" onClick={() => copyItems('NEW_PLAN')} />
              <div className="border-t border-slate-100 dark:border-white/5 my-1" />
              {plans.filter(p => p.id !== activePlanId).map(p => <DropdownItem key={p.id} label={p.name} onClick={() => copyItems(p.id)} />)}
            </Dropdown>
            <Dropdown align="left" trigger={<button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 text-slate-600 rounded-xl text-[12px] font-bold hover:bg-slate-50 transition-all shadow-sm"><ArrowRightLeft size={14} /> Taşı <ChevronDown size={14} /></button>}>
              <DropdownItem icon={<Plus size={14} className="text-metronic-primary" />} label="Yeni Plan Oluştur" onClick={() => moveItems('NEW_PLAN')} />
              <div className="border-t border-slate-100 dark:border-white/5 my-1" />
              {plans.filter(p => p.id !== activePlanId).map(p => <DropdownItem key={p.id} label={p.name} onClick={() => moveItems(p.id)} />)}
            </Dropdown>
            <button onClick={() => setCheckedRows(new Set())} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-white rounded-xl transition-all"><X size={18} /></button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
        
        {/* Top Header: Price & Convert Action */}
        <div className="flex items-center justify-between px-8 py-6 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
           <div className="flex flex-col">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">SEÇİLİ PLAN TOPLAMI</span>
              <div className="flex items-center gap-4">
                <span className="text-[28px] font-black text-slate-800 dark:text-white">₺{formatCurrency(activePlanTotal)}</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg shadow-sm">
                  <Calendar size={12} className="text-slate-400" />
                  <span className="text-[12px] font-bold text-slate-500">{activePlan.createdAt}</span>
                </div>
              </div>
           </div>
           <button className="flex items-center gap-2 px-5 py-2.5 bg-metronic-primary text-white rounded-xl text-[13px] font-bold shadow-lg shadow-metronic-primary/20 hover:bg-blue-600 hover:shadow-metronic-primary/30 active:scale-95 transition-all">
              Sözleşmeye Dönüştür <ArrowRight size={16} />
           </button>
        </div>

        {/* Plan Tabs - BELOW the convert button area */}
        <div className="flex items-center gap-1 px-6 pt-6 pb-0 border-b border-slate-100 dark:border-white/5">
          {plans.map(p => (
            <button 
              key={p.id} 
              onClick={() => { setActivePlanId(p.id); setCheckedRows(new Set()); }} 
              className={`px-8 py-3 text-[13px] font-black rounded-t-xl border-x border-t transition-all ${p.id === activePlanId ? 'bg-white dark:bg-[#1c1f2e] border-slate-200 dark:border-white/10 text-metronic-primary -mb-px z-10' : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Plan Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/[0.01] border-b border-slate-100 dark:border-white/5">
                <th className="py-4 px-6 w-10">
                  <input 
                    type="checkbox" 
                    checked={activePlan.items.length > 0 && activePlan.items.every(i => checkedRows.has(i.id))}
                    onChange={() => setCheckedRows(checkedRows.size === activePlan.items.length ? new Set() : new Set(activePlan.items.map(i => i.id)))}
                    className="w-4 h-4 rounded accent-metronic-primary cursor-pointer" 
                  />
                </th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16 text-center">Diş</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">İşlem / Tedavi</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Hekim</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Birim Fiyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
              {activePlan?.items.map(item => (
                <tr key={item.id} className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group cursor-pointer ${checkedRows.has(item.id) ? 'bg-metronic-primary/5 dark:bg-metronic-primary/10' : ''}`} onClick={() => toggleRow(item.id)}>
                  <td className="py-4 px-6" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={checkedRows.has(item.id)} onChange={() => toggleRow(item.id)} className="w-4 h-4 rounded accent-metronic-primary" />
                  </td>
                  <td className="py-4 px-4 text-center font-black text-slate-700 dark:text-slate-200 text-[13px] font-mono">{item.tooth}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 flex-shrink-0"><Stethoscope size={16} /></div>
                      <div>
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 leading-tight block">{item.name}</span>
                        <span className="text-[11px] font-medium text-slate-400">{item.category} • {item.areas}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-[12px] font-medium text-slate-500 whitespace-nowrap">{item.doctor}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-[14px] font-black text-slate-800 dark:text-white">₺{formatCurrency(item.price)}</span>
                      {item.price !== item.originalPrice && <span className="text-[11px] font-bold text-slate-400 line-through">₺{formatCurrency(item.originalPrice)}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 flex gap-3">
        <Info size={18} className="text-slate-400 flex-shrink-0" />
        <p className="text-[12px] text-slate-500 leading-relaxed">
          <strong>Plan Yönetimi:</strong> Aday hastanın mevcut tedavi planlarını burada görüntüleyebilir, seçilen planı resmi sözleşmeye dönüştürebilirsiniz. Yeni tedavi eklemek için lütfen klinik kartını kullanın.
        </p>
      </div>

      {/* Price Update Modal */}
      <Modal isOpen={discountModalOpen} onClose={() => setDiscountModalOpen(false)} title="Seçili İşlemleri Fiyatlandır" size="md">
        <div className="space-y-6">
          <div className="p-4 bg-metronic-primary/5 rounded-2xl border border-metronic-primary/10 flex items-center gap-4">
            <div className="flex items-center h-10 bg-white dark:bg-white/10 rounded-xl p-1 border border-slate-200 dark:border-white/10">
              <button onClick={() => setDiscountType('PERCENT')} className={`px-4 h-full rounded-lg text-[11px] font-black transition-all ${discountType === 'PERCENT' ? 'bg-metronic-primary text-white' : 'text-slate-400'}`}>%</button>
              <button onClick={() => setDiscountType('AMOUNT')} className={`px-4 h-full rounded-lg text-[11px] font-black transition-all ${discountType === 'AMOUNT' ? 'bg-metronic-primary text-white' : 'text-slate-400'}`}>₺</button>
            </div>
            <div className="flex-1">
              <input type="number" className="m-input text-right font-black" placeholder="İndirim Tutarı" value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
            </div>
            <button onClick={applyDiscount} className="px-5 py-2 bg-slate-800 text-white text-[12px] font-black rounded-xl hover:bg-slate-900 transition-all">UYGULA</button>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
             {discountItems.map(item => (
               <div key={item.id} className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Orijinal: ₺{formatCurrency(item.originalPrice)}</span>
                  </div>
                  <input 
                    type="number" 
                    className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-right text-[12px] font-black" 
                    value={item.price}
                    onChange={e => setDiscountItems(discountItems.map(d => d.id === item.id ? { ...d, price: parseFloat(e.target.value) || 0 } : d))}
                  />
               </div>
             ))}
          </div>

          <div className="flex justify-between items-center p-4 bg-slate-100/50 dark:bg-white/5 rounded-2xl">
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">YENİ TOPLAM</span>
                <span className="text-[18px] font-black text-slate-800 dark:text-white">₺{formatCurrency(discountItems.reduce((s,i)=>s+i.price, 0))}</span>
             </div>
             <div className="flex gap-2">
                <button onClick={() => setDiscountModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-500">İptal</button>
                <button onClick={saveDiscount} className="px-6 py-2 bg-metronic-primary text-white rounded-xl text-[13px] font-bold">Fiyatları Güncelle</button>
             </div>
          </div>
        </div>
      </Modal>

    </div>
  );
}
