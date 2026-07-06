'use client';

import { useState, useEffect } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import { ReportsService, IncomeReportItem } from '../../../lib/services/reports.service';
import Skeleton from '../../../components/ui/Skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';

export default function IncomeReportPage() {
  const [data, setData] = useState<IncomeReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // const response = await ReportsService.getIncomeReport(6);
        // setData(response);
        setTimeout(() => {
          setData([
            { month: '2025-12', totalIncome: 45000 },
            { month: '2026-01', totalIncome: 52000 },
            { month: '2026-02', totalIncome: 48000 },
            { month: '2026-03', totalIncome: 61000 },
            { month: '2026-04', totalIncome: 59000 },
            { month: '2026-05', totalIncome: 75000 },
          ]);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalIncome = data.reduce((sum, item) => sum + item.totalIncome, 0);

  return (
    <MetronicLayout title="Gelir Raporu" breadcrumbs={['Raporlar', 'Gelir Raporu']}>
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
