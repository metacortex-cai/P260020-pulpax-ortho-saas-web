'use client';

import { useState } from 'react';
import { FileText, ExternalLink, Download, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../../../../lib/utils/formatCurrency';

// Not: Sistemde henüz hastaya özel resmi fatura kaydı tutan bir backend (Paraşüt/e-Fatura
// entegrasyonu hasta bazında fatura listesi döndürmüyor) bulunmuyor; bu yüzden liste
// sahte veriyle doldurulmuyor, gerçek durumu yansıtan boş liste gösteriliyor.
export default function FinancialInvoicesTab({ patient }: { patient: any }) {
  const [invoices] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Fatura ve Makbuzlar</h3>
            <p className="text-[13px] text-slate-400">Resmi muhasebe evrak dökümleri</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-[13px] font-bold rounded-lg hover:bg-purple-700 transition-all shadow-md">
          <FileText size={16} /> Fatura Oluştur (Paraşüt)
        </button>
      </div>

      {invoices.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5">
                <th className="py-4 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Evrak No</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tarih</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tür</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Matrah</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">KDV</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Toplam Tutar</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="py-4 px-2 text-[13px] font-bold text-metronic-primary underline underline-offset-4 cursor-pointer">{inv.id}</td>
                  <td className="py-4 px-4 text-[13px] font-medium text-slate-500">{inv.date}</td>
                  <td className="py-4 px-4 text-[12px] font-bold text-slate-600 dark:text-slate-400">{inv.type}</td>
                  <td className="py-4 px-4 text-right text-[13px] font-medium text-slate-600">₺{formatCurrency(inv.amount)}</td>
                  <td className="py-4 px-4 text-right text-[13px] font-medium text-slate-600">₺{formatCurrency(inv.tax)}</td>
                  <td className="py-4 px-4 text-right text-[14px] font-black text-slate-800 dark:text-white">₺{formatCurrency(inv.total)}</td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-3 text-slate-400">
                      <button className="hover:text-metronic-primary transition-colors"><ExternalLink size={16} /></button>
                      <button className="hover:text-metronic-primary transition-colors"><Download size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
          <AlertCircle size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Henüz resmi bir fatura kaydı bulunmamaktadır.</p>
        </div>
      )}
    </div>
  );
}
