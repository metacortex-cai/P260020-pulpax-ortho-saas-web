'use client';

import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, CheckCircle2, Eye, AlertTriangle, Stethoscope, Loader2, Search, Download } from 'lucide-react';
import Modal from '../../../../../components/ui/Modal';
import { TreatmentService, TreatmentPlan } from '../../../../../lib/services/treatment.service';
import { formatCurrency } from '../../../../../lib/utils/formatCurrency';
import { exportContractPDF } from '../../../../../lib/utils/exportContract';

interface Contract {
  id: string;
  date: string;
  title: string;
  finalAmount: number;
  paid: number;
  balance: number;
  items: {
    id: string;
    name: string;
    toothNo?: number;
    price: number;
    taxRate: number;
  }[];
  installments: {
    label: string;
    dueDate: string;
    amount: number;
  }[];
}

export default function FinancialContractsTab({ patient }: { patient: any }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!patient?.id) return;
    (async () => {
      try {
        setLoading(true);
        const plans = await TreatmentService.findPlansByPatient(patient.id);

        const activePlans: TreatmentPlan[] = plans.filter(p => p.status === 'ACTIVE');
        setContracts(activePlans.map((plan, idx) => {
          const items = plan.items.map(item => ({
            id: item.id,
            name: item.tariff?.masterTreatment?.name || 'Bilinmeyen Tedavi',
            toothNo: item.toothNo,
            price: Number(item.price),
            taxRate: Number(item.tariff?.taxRate ?? 0),
          }));
          const finalAmount = items.reduce((s, i) => s + i.price, 0);
          const paid = plan.items.reduce((s, item) =>
            s + (item.paymentDistributions?.reduce((ds, d) => ds + Number(d.amount), 0) || 0), 0);
          return {
            id: plan.id,
            date: new Date(plan.createdAt).toLocaleDateString('tr-TR'),
            title: `Sözleşme #${idx + 1}`,
            finalAmount,
            paid,
            balance: Math.max(0, finalAmount - paid),
            items,
            installments: (plan.installments || [])
              .slice()
              .sort((a, b) => a.order - b.order)
              .map(inst => ({ label: inst.label, dueDate: inst.dueDate, amount: Number(inst.amount) })),
          };
        }));
      } catch (err) {
        console.error('Failed to fetch contracts:', err);
        setContracts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [patient?.id]);

  const filteredContractItems = useMemo(() => {
    if (!selectedContract) return [];
    const term = modalSearchTerm.trim().toLowerCase();
    if (!term) return selectedContract.items;
    return selectedContract.items.filter(item =>
      item.name.toLowerCase().includes(term) || (item.toothNo != null && String(item.toothNo).includes(term))
    );
  }, [selectedContract, modalSearchTerm]);

  const closeContractModal = () => {
    setSelectedContract(null);
    setModalSearchTerm('');
  };

  const handleExportContract = async () => {
    if (!selectedContract) return;
    try {
      setExporting(true);
      await exportContractPDF({
        title: selectedContract.title,
        date: selectedContract.date,
        finalAmount: selectedContract.finalAmount,
        paid: selectedContract.paid,
        balance: selectedContract.balance,
        items: selectedContract.items,
        installments: selectedContract.installments,
        patient: {
          firstName: patient?.firstName || '',
          lastName: patient?.lastName || '',
          id: patient?.id || '',
          fileNo: patient?.fileNo,
          phone: patient?.phone,
          nationalId: patient?.nationalId,
        },
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <ClipboardList size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Sözleşmeler</h3>
            <p className="text-[13px] text-slate-400">Onaylanmış (aktif) tedavi planları ve ödeme taahhütleri</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin text-metronic-primary mr-2" size={20} />
          <span className="text-[13px] font-semibold">Yükleniyor...</span>
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
          <AlertTriangle size={32} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium text-[13px]">Bu hastaya ait sözleşmeye dönüştürülmüş (aktif) bir tedavi planı bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {contracts.map((c) => (
            <div key={c.id} className="p-5 bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-metronic-primary/30 transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-metronic-primary/10 text-metronic-primary">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white group-hover:text-metronic-primary transition-colors">{c.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                     <span className="text-[12px] text-slate-400 font-medium">{c.date} tarihinde oluşturuldu</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-8">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOPLAM TUTAR</p>
                  <p className="text-[15px] font-black text-slate-700 dark:text-white">₺{formatCurrency(c.finalAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ÖDENEN</p>
                  <p className="text-[15px] font-black text-metronic-success">₺{formatCurrency(c.paid)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KALAN</p>
                  <p className={`text-[15px] font-black ${c.balance > 0 ? 'text-metronic-danger' : 'text-slate-400'}`}>
                    ₺{formatCurrency(c.balance)}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedContract(c)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-metronic-primary rounded-xl text-[12px] font-bold hover:bg-metronic-primary hover:text-white transition-all shadow-sm"
                >
                  <Eye size={16} /> Detaylar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-200 dark:border-amber-500/20 flex gap-3">
        <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
        <p className="text-[12px] text-amber-700 dark:text-amber-400 font-medium">
          Bir tedavi planı, “Tedavi Planları” sekmesinden <strong>Sözleşme Oluştur</strong> ile aktifleştirildiğinde burada listelenir.
        </p>
      </div>

      {/* Contract Detail Modal */}
      <Modal
        isOpen={!!selectedContract}
        onClose={closeContractModal}
        title={selectedContract?.title || 'Sözleşme'}
        subtitle="Sözleşme İçeriği ve Tedavi Kalemleri"
        size="lg"
      >
        <div className="space-y-6">
          {/* Toolbar: search + export */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={modalSearchTerm}
                onChange={e => setModalSearchTerm(e.target.value)}
                placeholder="Tedavi veya diş no ara..."
                className="h-9 pl-9 pr-3 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary transition-colors w-56"
              />
            </div>
            <button
              onClick={handleExportContract}
              disabled={exporting}
              className="flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold border border-slate-200 rounded-lg bg-white text-slate-600 hover:border-metronic-primary hover:text-metronic-primary transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Dışa Aktar
            </button>
          </div>

          <p className="text-[11px] font-medium text-slate-400 -mt-2">
            Fiyatlar KDV hariçtir; KDV tutarı ve KDV dahil toplam ayrı sütunlarda gösterilmiştir.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Diş No</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tedavi / İşlem</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Fiyat (KDV Hariç)</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">KDV</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Toplam (KDV Dahil)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                {filteredContractItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-[13px] font-medium">
                      Aramayla eşleşen tedavi kalemi bulunamadı.
                    </td>
                  </tr>
                ) : filteredContractItems.map((item) => {
                  const vatAmount = item.price * (item.taxRate / 100);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01]">
                      <td className="py-4 px-4 text-[12px] font-bold text-slate-500 font-mono">{item.toothNo ?? '—'}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                            <Stethoscope size={16} />
                          </div>
                          <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right text-[13px] font-black text-slate-800 dark:text-white">₺{formatCurrency(item.price)}</td>
                      <td className="py-4 px-4 text-right text-[12px] font-semibold text-slate-500">%{item.taxRate} · ₺{formatCurrency(vatAmount)}</td>
                      <td className="py-4 px-4 text-right text-[13px] font-black text-metronic-primary">₺{formatCurrency(item.price + vatAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex gap-8">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">SÖZLEŞME TOPLAMI</p>
                <p className="text-[18px] font-black text-slate-800 dark:text-white">₺{formatCurrency(selectedContract?.finalAmount ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">ÖDENEN</p>
                <p className="text-[18px] font-black text-metronic-success">₺{formatCurrency(selectedContract?.paid ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">KALAN BAKİYE</p>
                <p className="text-[18px] font-black text-metronic-danger">₺{formatCurrency(selectedContract?.balance ?? 0)}</p>
              </div>
            </div>
            <button onClick={closeContractModal} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-[13px] font-bold hover:bg-slate-900 transition-all">
              Kapat
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
