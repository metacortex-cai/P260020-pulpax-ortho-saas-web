'use client';

import React, { useState, useEffect } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import { 
  User, 
  TrendingUp, 
  Stethoscope, 
  CreditCard, 
  Search, 
  Calendar as CalendarIcon,
  ArrowRight,
  Filter,
  BarChart3,
  Award,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { ReportsService } from '../../../lib/services/reports.service';
import { EmployeeService, Employee } from '../../../lib/services/employee.service';
import Skeleton from '../../../components/ui/Skeleton';
import { useToastStore } from '../../../store/toastStore';
import Link from 'next/link';

export default function DoctorPerformancePage() {
  const [performance, setPerformance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const addToast = useToastStore(state => state.addToast);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [perfData, empData] = await Promise.all([
        ReportsService.getDoctorPerformance(startDate || undefined, endDate || undefined),
        EmployeeService.findAll()
      ]);
      setPerformance(perfData);
      setEmployees(empData);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Performans verileri yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchData intentionally excluded: it captures startDate/endDate and is only meant to run once on mount, re-fetching on filter change is triggered manually via the "Filtrele" button
  }, []);

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

  return (
    <MetronicLayout title="Hekim Performans ve Prim Raporu" breadcrumbs={['Raporlar', 'Hekim Performansı']}>
      
      {/* Filters */}
      <div className="m-card p-6 border border-slate-200/60 mb-6 bg-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <CalendarIcon size={14} className="text-slate-400" />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none outline-none text-[12px] font-bold text-slate-600 py-0.5" />
              <ArrowRight size={12} className="text-slate-400" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none outline-none text-[12px] font-bold text-slate-600 py-0.5" />
            </div>
            <button onClick={fetchData} className="px-4 py-2 bg-metronic-primary text-white rounded-lg text-[12px] font-bold hover:bg-blue-600 transition-all flex items-center gap-2">
              <Filter size={14} /> Filtrele
            </button>
          </div>
          <div className="text-[12px] text-slate-500 font-medium italic">
            * Primler, personelin aktif sözleşmesindeki oranlara göre tamamlanan işlemler üzerinden hesaplanır.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)
        ) : performance.length > 0 ? (
          performance.map((p) => {
            const emp = employees.find(e => e.id === p.doctorId);
            const name = emp ? `Dt. ${emp.firstName} ${emp.lastName}` : 'Bilinmeyen Hekim';
            
            return (
              <div key={p.doctorId} className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col group hover:border-metronic-primary/40 transition-all">
                <div className="p-6 border-b border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-metronic-primary-light text-metronic-primary flex items-center justify-center font-bold text-lg">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-slate-800">{name}</h4>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Hekim • {p.treatmentCount} İşlem</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Üretilen Ciro</p>
                      <p className="text-[15px] font-black text-slate-700 mt-1">{fmt(p.totalRevenue)}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-[10px] font-bold text-red-600 uppercase">Lab Maliyeti</p>
                      <p className="text-[15px] font-black text-red-700 mt-1">{fmt(p.totalLabCost)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-600 uppercase">Net Katkı</p>
                      <p className="text-[15px] font-black text-blue-700 mt-1">{fmt(p.totalRevenue - p.totalLabCost)}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Hakediş (Prim)</p>
                      <p className="text-[15px] font-black text-emerald-700 mt-1">{fmt(p.totalCommission)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                      <Stethoscope size={12} /> İşlem Dağılımı
                    </p>
                    <div className="space-y-2">
                      {Object.entries(p.treatments).slice(0, 3).map(([tName, count]: any) => (
                        <div key={tName} className="flex items-center justify-between text-[12px]">
                          <span className="text-slate-600 font-medium truncate max-w-[140px]">{tName}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-bold">{count}</span>
                        </div>
                      ))}
                      {Object.keys(p.treatments).length > 3 && (
                        <p className="text-[11px] text-slate-400 text-center mt-2 italic">+ {Object.keys(p.treatments).length - 3} farklı işlem tipi</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <Link href={`/hr/staff/${p.doctorId}`} className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                    Personel Detayına Git <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-24 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
            <Award className="mx-auto text-slate-200 mb-4" size={48} />
            <h4 className="text-lg font-bold text-slate-400">Veri Bulunmuyor</h4>
            <p className="text-sm text-slate-400 mt-1">Seçilen tarih aralığında tamamlanmış prim kaydı bulunamadı.</p>
          </div>
        )}
      </div>

    </MetronicLayout>
  );
}
