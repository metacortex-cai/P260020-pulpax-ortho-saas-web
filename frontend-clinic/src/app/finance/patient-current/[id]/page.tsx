'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MetronicLayout from '../../../../components/layout/MetronicLayout';
import { PatientService } from '../../../../lib/services/patient.service';
import { FinanceService } from '../../../../lib/services/finance.service';
import { formatCurrency } from '../../../../lib/utils/formatCurrency';
import {
  User,
  CreditCard,
  FileText,
  ClipboardList,
  ChevronLeft,
  Printer,
  Calendar,
  Hash,
  Loader2
} from 'lucide-react';

// Tabs
import FinancialPaymentsTab from './tabs/FinancialPaymentsTab';
import FinancialInvoicesTab from './tabs/FinancialInvoicesTab';
import FinancialContractsTab from './tabs/FinancialContractsTab';
import FinancialPlansTab from './tabs/FinancialPlansTab';

const TABS = [
  { id: 'contracts', label: 'Sözleşmeler', icon: <ClipboardList size={16} /> },
  { id: 'plans', label: 'Tedavi Planları', icon: <FileText size={16} /> },
  { id: 'payments', label: 'Ödemeler', icon: <CreditCard size={16} /> },
  { id: 'invoices', label: 'Faturalar', icon: <FileText size={16} /> },
];

export default function PatientFinancialDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('contracts');
  const [patient, setPatient] = useState<any>(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [lastTxDate, setLastTxDate] = useState('—');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const [p, payments] = await Promise.all([
          PatientService.findOne(id as string),
          FinanceService.getPatientPayments(id as string).catch(() => []),
        ]);
        setPatient(p);
        setTotalPaid(payments.reduce((s, pay) => s + pay.amount, 0));
        if (payments.length > 0) {
          const latest = payments.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b);
          setLastTxDate(new Date(latest.createdAt).toLocaleDateString('tr-TR'));
        }
      } catch (err) {
        console.error('Failed to load patient financial detail:', err);
        setPatient(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const renderTab = () => {
    switch (activeTab) {
      case 'contracts': return <FinancialContractsTab patient={patient} />;
      case 'plans':     return <FinancialPlansTab patient={patient} />;
      case 'payments':  return <FinancialPaymentsTab patient={patient} />;
      case 'invoices':  return <FinancialInvoicesTab patient={patient} />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <MetronicLayout title="Hasta Cari Detayı" breadcrumbs={['Muhasebe', 'Hasta Cari']}>
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="animate-spin text-metronic-primary mr-2" size={22} />
          <span className="text-[13px] font-semibold">Yükleniyor...</span>
        </div>
      </MetronicLayout>
    );
  }

  if (!patient) {
    return (
      <MetronicLayout title="Hasta Cari Detayı" breadcrumbs={['Muhasebe', 'Hasta Cari']}>
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <p className="text-[13px] font-semibold">Hasta bulunamadı.</p>
        </div>
      </MetronicLayout>
    );
  }

  const fullName = `${patient.firstName} ${patient.lastName}`;
  const totalDebt = Number(patient.totalDebt) || 0;
  const advance = Number(patient.advance) || 0;

  return (
    <MetronicLayout title="Hasta Cari Detayı" breadcrumbs={['Muhasebe', 'Hasta Cari', fullName]}>
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* LEFT PANEL: Patient Profile */}
        <div className="w-full lg:w-[320px] flex-shrink-0 space-y-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[13px] font-bold text-slate-500 hover:text-metronic-primary transition-colors mb-2"
          >
            <ChevronLeft size={16} /> Geri Dön
          </button>

          <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden">
            {/* Header with Avatar */}
            <div className="p-6 text-center border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="w-20 h-20 rounded-3xl bg-metronic-primary text-white flex items-center justify-center font-bold text-3xl mx-auto shadow-xl shadow-metronic-primary/20 mb-4">
                {patient.firstName?.charAt(0)}
              </div>
              <h1 className="text-[18px] font-black text-slate-800 dark:text-white leading-tight">{fullName}</h1>
              <p className="text-[13px] font-medium text-slate-400 mt-1">{patient.phone}</p>
            </div>

            {/* Profile Details */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TC KİMLİK NO</p>
                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{patient.nationalId || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <Hash size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DOSYA NO</p>
                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{patient.fileNo ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DOĞUM TARİHİ</p>
                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('tr-TR') : '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <CreditCard size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SON İŞLEM</p>
                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{lastTxDate}</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-white/5" />

              {/* Financial Summaries in Sidebar */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-bold text-slate-400 uppercase">Toplam Ödenen</span>
                  <span className="text-[14px] font-black text-metronic-success">₺{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-bold text-slate-400 uppercase">Avans Bakiyesi</span>
                  <span className="text-[14px] font-black text-metronic-primary">₺{formatCurrency(advance)}</span>
                </div>
                <div className="p-3 bg-metronic-danger/5 dark:bg-metronic-danger/10 rounded-xl border border-metronic-danger/10 flex justify-between items-center mt-2">
                  <span className="text-[12px] font-bold text-metronic-danger uppercase">KALAN BORÇ</span>
                  <span className="text-[16px] font-black text-metronic-danger underline underline-offset-4">₺{formatCurrency(totalDebt)}</span>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-all shadow-sm">
                <Printer size={16} /> 📄 Ekstre (PDF)
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Tab Content */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                  activeTab === tab.id
                  ? 'bg-white dark:bg-white/10 text-metronic-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden min-h-[600px]">
            <div className="p-8">
              {renderTab()}
            </div>
          </div>
        </div>

      </div>
    </MetronicLayout>
  );
}
