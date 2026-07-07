'use client';

import { useState, useEffect } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import { ReportsService, IncomeReportItem } from '../../../lib/services/reports.service';
import { ClinicBranchService, ClinicBranch } from '../../../lib/services/clinic-branch.service';
import Skeleton from '../../../components/ui/Skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Calendar, Filter, ChevronDown } from 'lucide-react';

function DropdownItem({ label, active = false, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'text-metronic-primary bg-metronic-primary-light dark:bg-metronic-primary/10 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {label}
    </button>
  );
}

export default function IncomeReportPage() {
  const [data, setData] = useState<IncomeReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicBranches, setClinicBranches] = useState<ClinicBranch[]>([]);
  const [branchFilter, setBranchFilter] = useState('');

  useEffect(() => {
    ClinicBranchService.findAll().then(setClinicBranches).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await ReportsService.getIncomeDetails(undefined, undefined, branchFilter || undefined);
        setData(response);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [branchFilter]);

  const totalIncome = data.reduce((sum, item) => sum + item.totalIncome, 0);

  return (
    <MetronicLayout title="Gelir Raporu" breadcrumbs={['Raporlar', 'Gelir Raporu']}>
      <div className="flex justify-end mb-4">
        <Dropdown align="right" trigger={
          <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${branchFilter ? 'bg-metronic-primary-light border-metronic-primary/30 text-metronic-primary' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary'}`}>
            <Filter size={15} /> {branchFilter ? (clinicBranches.find(b => b.id === branchFilter)?.name || 'Klinik') : 'Tüm Klinikler'} <ChevronDown size={13} className="opacity-50" />
          </button>
        }>
          <DropdownItem label="Tüm Klinikler" active={!branchFilter} onClick={() => setBranchFilter('')} />
          {clinicBranches.map(b => (
            <DropdownItem key={b.id} label={b.name} active={branchFilter === b.id} onClick={() => setBranchFilter(b.id)} />
          ))}
        </Dropdown>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="m-card shadow-sm border border-slate-200/60 p-6 flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
            <TrendingUp size={24} />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase">Son 6 Ay Toplam Gelir</span>
          {loading ? (
            <Skeleton className="w-32 h-8 mt-2" />
          ) : (
            <span className="text-3xl font-extrabold text-slate-800 mt-1">₺{totalIncome.toLocaleString()}</span>
          )}
        </div>
        
        {/* Placeholder cards for other metrics */}
        <div className="m-card shadow-sm border border-slate-200/60 p-6 flex flex-col justify-center items-center text-center">
           <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
            <Calendar size={24} />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase">Bu Ay Tahmini</span>
          <span className="text-2xl font-extrabold text-slate-700 mt-1">₺82,000</span>
        </div>
      </div>

      <div className="m-card shadow-sm border border-slate-200/60 p-6">
        <h3 className="text-[14px] font-bold text-slate-700 mb-6">Aylık Gelir Trendi</h3>
        
        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `₺${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`₺${Number(value).toLocaleString()}`, 'Gelir']}
                  labelStyle={{ fontWeight: 'bold', color: '#334155' }}
                />
                <Area type="monotone" dataKey="totalIncome" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </MetronicLayout>
  );
}
