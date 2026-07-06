'use client';

import { useState, useEffect } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import { ReportsService, PopularTreatmentItem } from '../../../lib/services/reports.service';
import Skeleton from '../../../components/ui/Skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4'];

export default function TreatmentsReportPage() {
  const [data, setData] = useState<PopularTreatmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // const response = await ReportsService.getPopularTreatments();
        // setData(response);
        setTimeout(() => {
          setData([
            { name: 'Kompozit Dolgu', count: 145 },
            { name: 'Diş Taşı Temizliği', count: 120 },
            { name: 'Kanal Tedavisi', count: 85 },
            { name: 'İmplant', count: 42 },
            { name: 'Zirkonyum Kaplama', count: 38 },
            { name: 'Diş Çekimi', count: 35 },
            { name: 'Panoramik Röntgen', count: 180 },
          ].sort((a, b) => b.count - a.count));
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <MetronicLayout title="Tedavi İstatistikleri" breadcrumbs={['Raporlar', 'Tedaviler']}>
      
      <div className="m-card shadow-sm border border-slate-200/60 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-slate-700">En Çok Uygulanan Tedaviler</h3>
            <p className="text-[12px] text-slate-500">Klinikte en çok tercih edilen ilk 10 işlem dağılımı</p>
          </div>
        </div>
        
        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 500}} width={150} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [value, 'Uygulama Sayısı']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </MetronicLayout>
  );
}
