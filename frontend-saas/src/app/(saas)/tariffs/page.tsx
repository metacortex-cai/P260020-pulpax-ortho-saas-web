'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, ChevronDown, ChevronUp, Tags, CheckCircle2, Stethoscope,
  Loader2, Send, FileText, X, AlertTriangle, RefreshCw,
  Filter, ChevronLeft, ChevronRight, ArrowUp, ArrowDown,
} from 'lucide-react';
import SaasMetronicLayout from '../../../components/layout/SaasMetronicLayout';
import Modal from '../../../components/ui/Modal';
import { TDB_2026_TREATMENTS, Treatment } from '../../../lib/tdb_treatments';
import { SaasService } from '../../../lib/services/saas.service';
import { useToastStore } from '../../../store/toastStore';
import { formatCurrency } from '../../../lib/utils/formatCurrency';

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

function DropdownItem({ icon, label, danger = false, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort, icon }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void; icon?: React.ReactNode }) {
  const isActive = sortColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={13} className="text-metronic-primary" /> : <ArrowDown size={13} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

const CATEGORIES = Array.from(new Set(TDB_2026_TREATMENTS.map(t => t.category))).sort();

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Teşhis ve Planlama':  { bg: 'bg-blue-50 dark:bg-blue-500/10',    text: 'text-blue-700 dark:text-blue-300',    dot: 'bg-blue-500' },
  'Tedavi & Endodonti':  { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'Pedodonti':           { bg: 'bg-pink-50 dark:bg-pink-500/10',     text: 'text-pink-700 dark:text-pink-300',    dot: 'bg-pink-500' },
  'Protez':              { bg: 'bg-amber-50 dark:bg-amber-500/10',   text: 'text-amber-700 dark:text-amber-300',  dot: 'bg-amber-500' },
  'Cerrahi':             { bg: 'bg-red-50 dark:bg-red-500/10',       text: 'text-red-700 dark:text-red-300',      dot: 'bg-red-500' },
  'Periodontoloji':      { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  'Ortodonti':           { bg: 'bg-teal-50 dark:bg-teal-500/10',    text: 'text-teal-700 dark:text-teal-300',    dot: 'bg-teal-500' },
};
const DEFAULT_COLOR = { bg: 'bg-slate-100 dark:bg-white/5', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' };

const fmt = formatCurrency;

interface PackageInfo {
  name: string;
  shortName: string;
  year: number;
  validity: string;
  source: string;
  treatments: Treatment[];
  publishedAt: string | null;
}

const PACKAGES: PackageInfo[] = [
  {
    name: 'TDB 2026 Yılı Asgari Ücret Tarifesi',
    shortName: 'TDB 2026',
    year: 2026,
    validity: '01.01.2026 – 31.12.2026',
    source: 'Türk Diş Hekimleri Birliği',
    treatments: TDB_2026_TREATMENTS,
    publishedAt: null,
  },
];

function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
      {category}
    </span>
  );
}

function TreatmentTable({ treatments }: { treatments: Treatment[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(25);

  const filtered = useMemo(() => {
    let list = treatments;
    if (categoryFilter) list = list.filter(t => t.category === categoryFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.sutCode.toLowerCase().includes(q));
    }
    return list;
  }, [treatments, categoryFilter, searchTerm]);

  const sortedData = useMemo(() => {
    const sorted = [...filtered];
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal: any = a[sortColumn as keyof Treatment];
        let bVal: any = b[sortColumn as keyof Treatment];
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal?.toLowerCase?.() ?? bVal;
        }
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filtered, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageLimit));
  const paginated = sortedData.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  // Arama veya kategori filtresi değişince sayfayı sıfırla (render sırasında, efekt olmadan)
  const [prevPagingFilters, setPrevPagingFilters] = useState({ searchTerm, categoryFilter });
  if (searchTerm !== prevPagingFilters.searchTerm || categoryFilter !== prevPagingFilters.categoryFilter) {
    setPrevPagingFilters({ searchTerm, categoryFilter });
    setCurrentPage(1);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar: search + category filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Tedavi adı veya kod ara..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-[13px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>

        <Dropdown
          align="left"
          trigger={
            <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 text-[12px] font-semibold shadow-sm">
              <Filter size={14} /> {categoryFilter ?? 'Kategori'} <ChevronDown size={13} className="opacity-50" />
            </button>
          }
        >
          <DropdownItem icon={<X size={14} />} label="Filtreyi Temizle" onClick={() => setCategoryFilter(null)} />
          {CATEGORIES.map(cat => {
            const c = CATEGORY_COLORS[cat] ?? DEFAULT_COLOR;
            return (
              <DropdownItem
                key={cat}
                label={cat}
                onClick={() => setCategoryFilter(cat)}
                icon={<div className={`w-2 h-2 rounded-full ${c.dot}`} />}
              />
            );
          })}
        </Dropdown>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5 max-h-[520px] overflow-y-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#1a1d2e] shadow-sm">
            <tr className="border-b border-slate-200 dark:border-white/5">
              <th className="py-4 px-4 w-10 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">#</th>
              <SortableHeader label="SUT Kodu" column="sutCode" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Tedavi Adı" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Kategori" column="category" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="KDV Hariç" column="priceExclVat" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <th className="py-4 px-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">KDV</th>
              <SortableHeader label="Toplam" column="priceInclVat" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[13px]">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400 text-sm">
                  Aranan kriterde tedavi bulunamadı.
                </td>
              </tr>
            ) : (
              paginated.map((t, i) => (
                <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="px-4 py-2.5 text-center text-slate-400 text-[11px]">{(currentPage - 1) * pageLimit + i + 1}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">{t.sutCode}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-white">{t.name}</td>
                  <td className="px-4 py-2.5"><CategoryBadge category={t.category} /></td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-200">{fmt(t.priceExclVat)} ₺</td>
                  <td className="px-4 py-2.5 text-center text-slate-500 text-[12px]">%{t.vatRate}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white">{fmt(t.priceInclVat)} ₺</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sortedData.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-slate-500 text-[11px]">
            Toplam <span className="font-bold text-slate-700 dark:text-slate-300">{sortedData.length}</span> tedavi
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10 text-slate-500 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 text-[12px] font-bold text-slate-600 dark:text-slate-300">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10 text-slate-500 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TariffPackagesPage() {
  const { addToast } = useToastStore();
  const [expandedPackage, setExpandedPackage] = useState<number | null>(null);
  const [publishingYear, setPublishingYear] = useState<number | null>(null);
  const [confirmPackage, setConfirmPackage] = useState<PackageInfo | null>(null);

  const handlePublish = async (pkg: PackageInfo) => {
    setConfirmPackage(null);
    setPublishingYear(pkg.year);
    try {
      await SaasService.publishTariffPackage(pkg.year, pkg.treatments);
      addToast({ type: 'success', message: `${pkg.shortName} tarifesi tüm kliniklere başarıyla yüklendi.` });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Tarife yüklenirken bir hata oluştu.';
      addToast({ type: 'error', message: msg });
    } finally {
      setPublishingYear(null);
    }
  };

  const totalTreatments = PACKAGES.reduce((sum, p) => sum + p.treatments.length, 0);

  return (
    <SaasMetronicLayout
      title="TDB Tarife Paketleri"
      breadcrumbs={['Sistem Tanımları', 'TDB Tarifeleri']}
    >
      <div className="space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Mevcut Paket',
              value: `${PACKAGES.length} Paket`,
              icon: <Tags size={20} />,
              color: 'text-violet-600 dark:text-violet-400',
              bg: 'bg-violet-50 dark:bg-violet-500/10',
            },
            {
              label: 'Aktif Tarife',
              value: 'TDB 2026',
              icon: <CheckCircle2 size={20} />,
              color: 'text-emerald-600 dark:text-emerald-400',
              bg: 'bg-emerald-50 dark:bg-emerald-500/10',
            },
            {
              label: 'Toplam Tedavi',
              value: `${totalTreatments} İşlem`,
              icon: <Stethoscope size={20} />,
              color: 'text-blue-600 dark:text-blue-400',
              bg: 'bg-blue-50 dark:bg-blue-500/10',
            },
          ].map((c) => (
            <div key={c.label} className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 px-5 py-4 flex items-center gap-4 shadow-sm">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.color}`}>
                {c.icon}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                <p className={`text-[1.15rem] font-bold mt-0.5 ${c.color}`}>{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl px-5 py-4 flex items-start gap-3">
          <FileText size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mb-0.5">TDB Tarife Sistemi</p>
            <p className="text-[12px] text-blue-700 dark:text-blue-300 leading-relaxed">
              Türk Diş Hekimleri Birliği tarafından yayımlanan yıllık asgari ücret tarifeleri buradan yönetilir.
              <strong> &quot;Kliniklere Yükle&quot;</strong> butonuna tıkladığınızda seçilen tarife paketi, platformdaki tüm aktif kliniklere
              <em> Sistem Tarifesi</em> olarak otomatik eklenir.
            </p>
          </div>
        </div>

        {/* Package Cards */}
        <div className="space-y-4">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">Tarife Paketleri</h2>

          {PACKAGES.map((pkg, idx) => {
            const isExpanded = expandedPackage === idx;
            const isPublishing = publishingYear === pkg.year;
            const catCount = new Set(pkg.treatments.map(t => t.category)).size;

            return (
              <div key={pkg.year} className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden">
                {/* Package Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-violet-700 dark:text-violet-300 font-black text-[15px]">{pkg.year}</span>
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">{pkg.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-[11px] text-slate-400">{pkg.source}</span>
                        <span className="text-slate-300 dark:text-white/20">·</span>
                        <span className="text-[11px] text-slate-400">{catCount} Kategori</span>
                        <span className="text-slate-300 dark:text-white/20">·</span>
                        <span className="text-[11px] text-slate-400">{pkg.treatments.length} Tedavi</span>
                        <span className="text-slate-300 dark:text-white/20">·</span>
                        <span className="text-[11px] text-slate-400">{pkg.validity}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setExpandedPackage(isExpanded ? null : idx)}
                      className="flex items-center gap-1.5 h-9 px-3 text-[12px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      {isExpanded ? 'Gizle' : 'Tedavileri Gör'}
                    </button>
                    <button
                      onClick={() => setConfirmPackage(pkg)}
                      disabled={isPublishing}
                      className="flex items-center gap-1.5 h-9 px-4 text-[12px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-60 shadow-sm"
                    >
                      {isPublishing ? (
                        <><Loader2 size={14} className="animate-spin" /> Yükleniyor...</>
                      ) : (
                        <><Send size={14} /> Kliniklere Yükle</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Category summary chips */}
                <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                  {CATEGORIES.map(cat => {
                    const count = pkg.treatments.filter(t => t.category === cat).length;
                    if (count === 0) return null;
                    const c = CATEGORY_COLORS[cat] ?? DEFAULT_COLOR;
                    return (
                      <span key={cat} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                        {cat} ({count})
                      </span>
                    );
                  })}
                </div>

                {/* Expanded treatments */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 dark:border-white/5 pt-4">
                    <TreatmentTable treatments={pkg.treatments} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm Publish Modal */}
      <Modal
        isOpen={!!confirmPackage}
        onClose={() => setConfirmPackage(null)}
        title="Tarifeyi Kliniklere Yükle"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setConfirmPackage(null)}
              className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={() => confirmPackage && handlePublish(confirmPackage)}
              className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              <RefreshCw size={14} /> Evet, Yükle
            </button>
          </>
        }
      >
        <div className="flex items-start gap-4 py-2">
          <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-[14px] text-slate-700 dark:text-slate-200 font-semibold mb-1">
              {confirmPackage?.name}
            </p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Bu tarife paketi ({confirmPackage?.treatments.length} tedavi) platformdaki tüm aktif kliniklere
              <strong> Sistem Tarifesi</strong> olarak yüklenecektir. Devam etmek istiyor musunuz?
            </p>
          </div>
        </div>
      </Modal>
    </SaasMetronicLayout>
  );
}
