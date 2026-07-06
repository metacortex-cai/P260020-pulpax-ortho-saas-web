'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Building2,
  TrendingUp,
  Users,
  Activity,
  Layers,
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Download,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import SaasMetronicLayout from '../../../components/layout/SaasMetronicLayout';
import { formatCurrency } from '../../../lib/utils/formatCurrency';

// Mock consolidated data for Pulpax Clinic Chain
const BRANCHES_METRICS = [
  {
    id: 'all',
    name: 'Tüm Şubeler (Konsolide)',
    dentistCount: 14,
    patientCount: 1240,
    mrr: 1450000,
    commission: 290000,
    labCosts: 185000,
    stockValue: 320000,
    criticalStocks: 12,
    netProfit: 975000,
  },
  {
    id: 'kadikoy',
    name: 'Pulpax Kadıköy Şubesi',
    dentistCount: 6,
    patientCount: 580,
    mrr: 680000,
    commission: 136000,
    labCosts: 92000,
    stockValue: 140000,
    criticalStocks: 4,
    netProfit: 452000,
  },
  {
    id: 'nisantasi',
    name: 'Pulpax Nişantaşı Şubesi',
    dentistCount: 5,
    patientCount: 420,
    mrr: 510000,
    commission: 102000,
    labCosts: 63000,
    stockValue: 110000,
    criticalStocks: 3,
    netProfit: 345000,
  },
  {
    id: 'besiktas',
    name: 'Pulpax Beşiktaş Şubesi',
    dentistCount: 3,
    patientCount: 240,
    mrr: 260000,
    commission: 52000,
    labCosts: 30000,
    stockValue: 70000,
    criticalStocks: 5,
    netProfit: 178000,
  }
];

const REVENUE_TREND_DATA = [
  { month: 'Ocak', Kadikoy: 540000, Nisantasi: 420000, Besiktas: 210000 },
  { month: 'Şubat', Kadikoy: 590000, Nisantasi: 450000, Besiktas: 230000 },
  { month: 'Mart', Kadikoy: 620000, Nisantasi: 480000, Besiktas: 240000 },
  { month: 'Nisan', Kadikoy: 650000, Nisantasi: 490000, Besiktas: 250000 },
  { month: 'Mayıs', Kadikoy: 680000, Nisantasi: 510000, Besiktas: 260000 }
];

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#10b981'];

function Dropdown({ trigger, children, align = 'right' }: { trigger: React.ReactNode; children: React.ReactNode; align?: 'right' | 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-50 bg-white dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl dark:shadow-[0_15px_50px_rgba(0,0,0,0.4)] min-w-[190px] py-1.5`} style={{ animation: 'fadeInDown 0.12s ease' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({ icon, label, active = false, danger = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : active ? 'text-metronic-primary bg-metronic-primary-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

// Note: extended with an optional `align` prop (not present in TreatmentsView's reference
// signature) because this table has right/center-aligned numeric columns, unlike the
// reference which is all left-aligned text columns. Defaults to 'left' to match reference.
function SortableHeader({ label, column, sortColumn, sortDirection, onSort, icon, align = 'left' }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void; icon?: React.ReactNode; align?: 'left' | 'center' | 'right' }) {
  const isActive = sortColumn === column;
  const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  const textAlignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      onClick={() => onSort(column)}
      className={`pb-3 ${textAlignClass} text-[11px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors`}
    >
      <div className={`flex items-center gap-2 ${justifyClass}`}>
        {icon && <span>{icon}</span>}
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={13} className="text-metronic-primary" /> : <ArrowDown size={13} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

export default function MultiBranchPage() {
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Standard table pattern state (ADR-001) for the branch details table below
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(25);

  const selectedBranch = BRANCHES_METRICS.find(b => b.id === selectedBranchId) || BRANCHES_METRICS[0];

  const handleSyncData = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 800);
  };

  // Prepare Expense Breakdown Pie Data
  const expenseData = [
    { name: 'Hekim Primleri', value: selectedBranch.commission },
    { name: 'Laboratuvar Giderleri', value: selectedBranch.labCosts },
    { name: 'Depo/Stok Alımı', value: selectedBranch.stockValue * 0.15 }, // Mock ratio
    { name: 'Diğer Genel Giderler', value: selectedBranch.mrr - selectedBranch.netProfit - selectedBranch.commission - selectedBranch.labCosts - (selectedBranch.stockValue * 0.15) }
  ];

  // Branch details table (standard search + sort + pagination layer, ADR-001)
  const branchRecords = BRANCHES_METRICS.filter(b => b.id !== 'all');

  const filteredBranches = branchRecords.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSortedBranches = () => {
    const sorted = [...filteredBranches];
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal = a[sortColumn as keyof typeof a];
        let bVal = b[sortColumn as keyof typeof b];
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal as any).toLowerCase?.() || bVal;
        }
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  };

  const sortedBranches = getSortedBranches();
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const totalBranchPages = Math.max(1, Math.ceil(sortedBranches.length / pageLimit));
  const paginatedBranches = sortedBranches.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  // Arama değişince sayfayı sıfırla (render sırasında, efekt olmadan)
  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
  if (searchTerm !== prevSearchTerm) {
    setPrevSearchTerm(searchTerm);
    setCurrentPage(1);
  }

  return (
    <SaasMetronicLayout
      title="Çoklu Şube Konsolide Raporlama"
      breadcrumbs={['Konsolide Raporlar']}
      headerAction={
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSyncData}
            className={`flex items-center gap-2 px-3 py-1.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 rounded-lg text-xs font-bold transition-all ${isSyncing ? 'animate-pulse' : ''}`}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            Verileri Eşitle
          </button>
          
          <select 
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-lg outline-none text-slate-700 dark:text-white"
          >
            {BRANCHES_METRICS.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
      }
    >
      <div className="space-y-6">
        
        {/* TOP STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <TrendingUp size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">TOPLAM CIRO (MRR)</span>
              <span className="text-xl font-extrabold text-slate-800 dark:text-white block mt-0.5">
                ₺{formatCurrency(selectedBranch.mrr)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">NET KÂR</span>
              <span className="text-xl font-extrabold text-emerald-500 block mt-0.5">
                ₺{formatCurrency(selectedBranch.netProfit)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Activity size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">LABORATUVAR MALİYETİ</span>
              <span className="text-xl font-extrabold text-slate-800 dark:text-white block mt-0.5">
                ₺{formatCurrency(selectedBranch.labCosts)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-0.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedBranch.criticalStocks > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'}`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">KRİTİK STOK LİMİTİ</span>
              <span className={`text-xl font-extrabold block mt-0.5 ${selectedBranch.criticalStocks > 0 ? 'text-rose-500' : 'text-slate-700 dark:text-white'}`}>
                {selectedBranch.criticalStocks} Kalem
              </span>
            </div>
          </div>

        </div>

        {/* CHARTS CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Revenue Trends by Branch */}
          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm lg:col-span-2 flex flex-col p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-violet-500" /> Şubeler Ciro Dağılım Trendi (Son 5 Ay)
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Aylık bazda şube performans gelişim grafiği.</p>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={REVENUE_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" className="hidden dark:block" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                      borderRadius: '12px', 
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Kadikoy" name="Kadıköy" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Nisantasi" name="Nişantaşı" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Besiktas" name="Beşiktaş" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Consolidated Expense Breakdown */}
          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm flex flex-col p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Layers size={16} className="text-violet-500" /> Gider Kırılım Dağılımı
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Seçilen şube genelinde giderlerin oransal dağılımı.</p>
            </div>
            <div className="h-[200px] relative flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `₺${formatCurrency(value)}`}
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                      borderRadius: '12px', 
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                <span className="text-[10px] text-slate-400 font-bold">TOPLAM MALİYET</span>
                <span className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
                  ₺{formatCurrency(selectedBranch.mrr - selectedBranch.netProfit)}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              {expenseData.map((entry, index) => (
                <div key={entry.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }}></span>
                    <span>{entry.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-white">
                    ₺{formatCurrency(entry.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* DETAILS TABLE */}
        <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm p-6">
          <style>{`
            @keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
          `}</style>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Building2 size={16} className="text-violet-500" /> Şube Detaylı Finansal ve Operasyonel Tablosu
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Tüm lokasyonların anlık performans verilerinin karşılaştırılması.</p>
              </div>
              <span className="px-3 py-1 bg-metronic-primary/10 text-metronic-primary text-[11px] font-bold rounded-full border border-metronic-primary/20 whitespace-nowrap">
                {filteredBranches.length} ŞUBE
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Şube adı ile ara..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="m-input pl-9 h-10 text-[13px] bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                />
              </div>
              <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-10 px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-[13px] font-medium shadow-sm"><Download size={16} /> Dışa Aktar <ChevronDown size={14} className="opacity-50" /></button>}>
                <DropdownItem icon={<FileSpreadsheet size={15} className="text-green-600" />} label="Excel (.xlsx)" />
                <DropdownItem icon={<FileText size={15} className="text-red-500" />} label="PDF Raporu" />
              </Dropdown>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-[11px] font-black text-slate-400 uppercase">
                  <SortableHeader label="Şube Adı" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Hekim Sayısı" column="dentistCount" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="center" />
                  <SortableHeader label="Aktif Hasta" column="patientCount" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="center" />
                  <SortableHeader label="Ciro (MRR)" column="mrr" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="right" />
                  <SortableHeader label="Hekim Primleri" column="commission" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="right" />
                  <SortableHeader label="Laboratuvar Gideri" column="labCosts" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="right" />
                  <SortableHeader label="Net Kâr" column="netProfit" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="right" />
                  <SortableHeader label="Kritik Stok" column="criticalStocks" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-600 dark:text-slate-300">
                {paginatedBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                      {branch.name}
                    </td>
                    <td className="py-3 text-center font-bold">{branch.dentistCount}</td>
                    <td className="py-3 text-center">{branch.patientCount}</td>
                    <td className="py-3 text-right font-semibold">₺{formatCurrency(branch.mrr)}</td>
                    <td className="py-3 text-right">₺{formatCurrency(branch.commission)}</td>
                    <td className="py-3 text-right">₺{formatCurrency(branch.labCosts)}</td>
                    <td className="py-3 text-right text-emerald-500 font-bold">₺{formatCurrency(branch.netProfit)}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        branch.criticalStocks > 4 
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {branch.criticalStocks} Ürün
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-200/60 dark:border-white/5">
            <span className="text-slate-500 text-[13px]">Toplam <span className="font-bold text-slate-800 dark:text-slate-200">{filteredBranches.length}</span> kayıt</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10"><ChevronLeft size={16} /></button>
              <span className="px-3 text-[13px] font-bold">{currentPage} / {totalBranchPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalBranchPages, p + 1))} className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

      </div>
    </SaasMetronicLayout>
  );
}
