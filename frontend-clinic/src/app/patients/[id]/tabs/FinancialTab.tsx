'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, FileText, ArrowUpRight, ArrowDownLeft, Printer, AlertCircle } from 'lucide-react';
import { FinanceService } from '../../../../lib/services/finance.service';
import { formatCurrency } from '../../../../lib/utils/formatCurrency';
import { useToastStore } from '../../../../store/toastStore';
import Skeleton from '../../../../components/ui/Skeleton';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Nakit',
  CREDIT_CARD: 'Kredi Kartı',
  TRANSFER: 'Havale/EFT',
  OTHER: 'Diğer',
};

interface LedgerEntry {
  id: string;
  date: string;
  type: 'BORÇ' | 'ALACAK';
  detail: string;
  debt: number;
  credit: number;
  balance: number;
}

export default function FinancialTab({ patient }: { patient: any }) {
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const addToast = useToastStore(state => state.addToast);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [balance, payments] = await Promise.all([
        FinanceService.getPatientBalance(patient.id),
        FinanceService.getPatientPayments(patient.id),
      ]);

      const paid = payments.reduce((s, p) => s + p.amount, 0);
      setTotalDebt(balance.totalDebt);
      setTotalPaid(paid);

      // Build ledger entries from payment history (ALACAK entries)
      // Running balance: total charged = current debt + total paid; reduce with each payment
      const sorted = [...payments].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      let runningBalance = balance.totalDebt + paid;
      const entries: LedgerEntry[] = sorted.map(p => {
        runningBalance -= p.amount;
        const methodLabel = METHOD_LABELS[p.method] || p.method;
        return {
          id: p.id,
          date: format(new Date(p.createdAt), 'dd.MM.yyyy', { locale: tr }),
          type: 'ALACAK',
          detail: `Tahsilat (${methodLabel})${p.description ? ` - ${p.description}` : ''}`,
          debt: 0,
          credit: p.amount,
          balance: runningBalance,
        };
      });

      setLedger(entries);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Finansal veriler yüklenirken hata oluştu.';
      addToast({ title: 'Hata', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [patient, addToast]);

  useEffect(() => {
    if (!patient?.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/patient-change pattern
    fetchData();
  }, [patient?.id, fetchData]);

  const currentBalance = totalDebt;
  const totalCharged = totalDebt + totalPaid;
  const ledgerDebtTotal = ledger.reduce((s, r) => s + r.debt, 0);
  const ledgerCreditTotal = ledger.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="space-y-6">
      {/* Finansal Özet */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="m-card mb-0 shadow-none border border-slate-200/60 bg-white dark:bg-[#1c1f2e]">
          <div className="m-card-body py-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Toplam Tahakkuk</p>
            {loading
              ? <Skeleton className="w-32 h-6 mt-1" />
              : <p className="text-[20px] font-extrabold text-slate-700 dark:text-white">₺{formatCurrency(totalCharged)}</p>
            }
          </div>
        </div>
        <div className="m-card mb-0 shadow-none border border-slate-200/60 bg-white dark:bg-[#1c1f2e]">
          <div className="m-card-body py-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Toplam Tahsilat</p>
            {loading
              ? <Skeleton className="w-32 h-6 mt-1" />
              : <p className="text-[20px] font-extrabold text-metronic-success">₺{formatCurrency(totalPaid)}</p>
            }
          </div>
        </div>
        <div className={`m-card mb-0 shadow-none border border-slate-200/60 bg-white dark:bg-[#1c1f2e] ${currentBalance > 0 ? 'bg-metronic-danger/5 border-metronic-danger/20' : 'bg-metronic-success/5 border-metronic-success/20'}`}>
          <div className="m-card-body py-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Güncel Bakiye</p>
            {loading
              ? <Skeleton className="w-32 h-6 mt-1" />
              : <p className={`text-[20px] font-extrabold ${currentBalance > 0 ? 'text-metronic-danger' : 'text-metronic-success'}`}>
                  ₺{formatCurrency(Math.abs(currentBalance))} {currentBalance > 0 ? '(Borç)' : '(Alacak)'}
                </p>
            }
          </div>
        </div>
        <div className="m-card mb-0 shadow-none border border-slate-200/60 bg-white dark:bg-[#1c1f2e]">
          <div className="m-card-body py-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Son İşlem</p>
            {loading
              ? <Skeleton className="w-24 h-5 mt-1" />
              : <p className="text-[14px] font-bold text-slate-600 dark:text-slate-300 mt-1">
                  {ledger[ledger.length - 1]?.date || '-'}
                </p>
            }
          </div>
        </div>
      </div>

      {/* Cari Hareketler (Ledger) */}
      <div className="m-card shadow-none border border-slate-200/60 mb-0 overflow-hidden bg-white dark:bg-[#1c1f2e]">
        <div className="m-card-header flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <h4 className="m-card-title text-base font-bold text-slate-700 dark:text-white flex items-center gap-2">
            <FileText size={18} className="text-metronic-primary" />
            Hasta Cari Ekstresi (Tahsilat Geçmişi)
          </h4>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[13px] font-bold rounded-lg hover:bg-slate-200 transition-all border border-slate-200 dark:border-white/10">
              <Printer size={16} /> Yazdır
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-metronic-primary text-white text-[13px] font-bold rounded-lg hover:bg-blue-600 transition-all shadow-md">
              <Download size={16} /> PDF Ekstre İndir
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tarih</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Tür</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Açıklama / Detay</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Borç (₺)</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Alacak (₺)</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Bakiye (₺)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-4 text-center"><Skeleton className="w-16 h-6 mx-auto" /></td>
                    <td className="py-4 px-4"><Skeleton className="w-48 h-4" /></td>
                    <td className="py-4 px-4"><Skeleton className="w-14 h-4 ml-auto" /></td>
                    <td className="py-4 px-4"><Skeleton className="w-14 h-4 ml-auto" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={24} className="text-slate-300" />
                      <span className="text-[13px] font-medium">Henüz finansal hareket kaydı bulunmuyor.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                ledger.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-6 text-[13px] font-medium text-slate-500">{row.date}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-24 px-2 py-1 rounded-full text-[10px] font-bold tracking-tight ${
                        row.type === 'BORÇ'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          : 'bg-metronic-success-light text-metronic-success dark:bg-metronic-success/10'
                      }`}>
                        {row.type === 'BORÇ'
                          ? <ArrowUpRight size={10} className="mr-1" />
                          : <ArrowDownLeft size={10} className="mr-1" />
                        }
                        {row.type}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{row.detail}</span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          İşlem ID: #{row.id.toString().slice(-8).padStart(8, '0')}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`text-[13px] font-bold ${row.debt > 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-white/10'}`}>
                        {row.debt > 0 ? `₺${formatCurrency(row.debt)}` : '—'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`text-[13px] font-bold ${row.credit > 0 ? 'text-metronic-success' : 'text-slate-300 dark:text-white/10'}`}>
                        {row.credit > 0 ? `₺${formatCurrency(row.credit)}` : '—'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className={`text-[14px] font-extrabold ${row.balance > 0 ? 'text-metronic-danger' : 'text-metronic-success'}`}>
                        ₺{formatCurrency(Math.abs(row.balance))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && ledger.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/10">
                  <td colSpan={3} className="py-4 px-6 text-[13px] font-bold text-slate-700 dark:text-slate-200">GENEL TOPLAM</td>
                  <td className="py-4 px-4 text-right text-[14px] font-extrabold text-slate-700 dark:text-white">
                    {ledgerDebtTotal > 0 ? `₺${formatCurrency(ledgerDebtTotal)}` : '—'}
                  </td>
                  <td className="py-4 px-4 text-right text-[14px] font-extrabold text-metronic-success">
                    ₺{formatCurrency(ledgerCreditTotal)}
                  </td>
                  <td className="py-4 px-6 text-right text-[15px] font-black text-metronic-danger bg-metronic-danger/5">
                    ₺{formatCurrency(currentBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Notlar & Bilgi */}
      <div className="flex gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
        <div className="w-10 h-10 rounded-full bg-white dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 flex items-center justify-center flex-shrink-0">
          <FileText size={18} className="text-slate-400" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Ekstre Bilgilendirmesi</p>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Bu ekstre, hastanın klinik üzerindeki tahsilat hareketlerini kronolojik sırada göstermektedir.
            “Bakiye” sütunu, her işlem sonrası güncellenen <strong>Koşu Dengesi (Running Balance)</strong> değerini temsil eder.
            Kırmızı değerler borç bakiyesini, yeşil değerler ise alacak (fazla ödeme) bakiyesini ifade eder.
          </p>
        </div>
      </div>
    </div>
  );
}
