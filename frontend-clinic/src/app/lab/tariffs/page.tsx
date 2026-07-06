'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import InfoTooltip from '../../../components/ui/InfoTooltip';
import Dropdown from '../../../components/ui/Dropdown';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight, Settings,
  X, FileText, ChevronDown, CheckSquare, Tags, Plus, Save,
  CheckCircle2, XCircle, Copy, Percent, Calendar, ArrowUp, ArrowDown, Edit2, RotateCcw, Check, Building2, Trash2
} from 'lucide-react';
import { LabService } from '../../../lib/services/lab.service';
import { useToastStore } from '../../../store/toastStore';
import { formatCurrency } from '../../../lib/utils/formatCurrency';

// Helper Dropdown

function DropdownItem({ icon, label, danger = false, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void }) {
  const isActive = sortColumn === column;
  return (
    <th 
      onClick={() => onSort(column)}
      className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200/60 dark:border-white/5 cursor-pointer hover:text-metronic-primary transition-colors"
    >
      <div className="flex items-center gap-2">
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={13} className="text-metronic-primary" /> : <ArrowDown size={13} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

const LAB_MAP: Record<string, { cls: string }> = {
  'Özden Dental Lab': { cls: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' },
  'Modern Diş Lab': { cls: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10' },
  'Estetik Lab': { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' },
};

const STATUS_MAP: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  'AKTİF': { icon: <CheckCircle2 size={13} />, cls: 'bg-metronic-success-light text-metronic-success dark:bg-metronic-success/10', label: 'Aktif' },
  'PASİF': { icon: <XCircle size={13} />, cls: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400', label: 'Pasif' },
};

export default function LabTariffsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { addToast } = useToastStore();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labs, setLabs] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const PAGE_LIMIT_OPTIONS = [25, 50, 100, 1000];
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // New Tariff Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', labName: '', sourceTariff: '', validFrom: '', validTo: '' });
  const [additionalProcIds, setAdditionalProcIds] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  
  // Procedures Price Edit Modal States
  const [proceduresModalOpen, setProceduresModalOpen] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<any>(null);
  const [activeProcIds, setActiveProcIds] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [procSearchTerm, setProcSearchTerm] = useState('');
  const [procSelectedIds, setProcSelectedIds] = useState<Set<string>>(new Set());
  const [showAddProcPopover, setShowAddProcPopover] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Delete Confirmation States
  const [bulkRemovePricesConfirmOpen, setBulkRemovePricesConfirmOpen] = useState(false);
  const [bulkDeleteTariffsConfirmOpen, setBulkDeleteTariffsConfirmOpen] = useState(false);
  const [deleteTariffTargetId, setDeleteTariffTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    setLoading(true);
    setError(null);
    Promise.all([
      LabService.getTariffs(),
      LabService.getLabs(),
      LabService.getProcedureTypes(),
    ])
      .then(([tariffs, labList, procList]) => {
        setRecords(tariffs);
        setLabs(labList);
        setProcedures(procList);
      })
      .catch(() => setError('Veriler yüklenirken bir hata oluştu.'))
      .finally(() => setLoading(false));
  }, [user, router]);

  const filtered = records.filter(r => [r.name, r.labName, r.id].join(' ').toLowerCase().includes(searchTerm.toLowerCase()));
  
  const getSortedData = () => {
    let sorted = [...filtered];
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal = a[sortColumn as keyof typeof a];
        let bVal = b[sortColumn as keyof typeof b];
        if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal as any).toLowerCase?.() || bVal; }
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  };

  const sortedData = getSortedData();
  const handleSort = (column: string) => {
    if (sortColumn === column) { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); } 
    else { setSortColumn(column); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageLimit));
  const paginated = sortedData.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);
  if (searchTerm !== prevSearchTerm) {
    setPrevSearchTerm(searchTerm);
    setCurrentPage(1);
  }

  const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));
  const someSelected = filtered.some(r => selectedIds.has(r.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(paginated.map(r => r.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const activeTariffsCount = records.filter(r => r.status === 'AKTİF').length;
  const uniqueLabsCount = new Set(records.map(r => r.labName)).size;

  // New Tariff Submit with 1 Active Tariff Per Lab Constraint
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    const source = records.find(r => r.id === formData.sourceTariff);
    const sourceProcIds = source ? source.includedProcIds : [];
    const finalProcIds = Array.from(new Set([...sourceProcIds, ...additionalProcIds]));

    const finalPrices: Record<string, number> = {};
    if (source && source.customPrices) {
      Object.assign(finalPrices, source.customPrices);
    }
    additionalProcIds.forEach(id => {
      const p = procedures.find(x => x.id === id);
      if (p && finalPrices[id] === undefined) {
        finalPrices[id] = p.defaultCost;
      }
    });

    const targetLab = formData.labName || (labs[0]?.name ?? '');
    const existingActive = records.find(r => r.labName === targetLab && r.status === 'AKTİF');

    let newTariffStatus: 'AKTİF' | 'PASİF' = 'AKTİF';
    let shouldDeactivateExisting = false;

    if (existingActive) {
      const confirmed = confirm(`"${targetLab}" için halihazırda aktif bir tarife (${existingActive.name}) bulunmaktadır. Her laboratuvar için aynı anda yalnızca 1 tarife aktif olabilir.\n\nMevcut aktif tarifeyi PASİF duruma getirerek yeni tarifeyi AKTİF olarak kaydetmek istiyor musunuz?`);
      if (confirmed) {
        shouldDeactivateExisting = true;
      } else {
        newTariffStatus = 'PASİF';
        alert('Yeni tarife PASİF statüsünde oluşturuldu. Aktif tarifeyi değiştirmek isterseniz tablodan işlem yapabilirsiniz.');
      }
    }

    try {
      if (shouldDeactivateExisting && existingActive) {
        await LabService.updateTariff(existingActive.id, { status: 'PASİF' } as any);
      }
      const created = await LabService.createTariff({
        name: formData.name,
        labName: targetLab,
        validFrom: formData.validFrom || undefined,
        validTo: formData.validTo || undefined,
        includedProcIds: finalProcIds,
        customPrices: finalPrices,
        status: newTariffStatus,
      });
      setRecords(prev => {
        const next = shouldDeactivateExisting
          ? prev.map(item => item.labName === targetLab && item.status === 'AKTİF' ? { ...item, status: 'PASİF' } : item)
          : [...prev];
        return [created, ...next];
      });
      setModalOpen(false);
      setFormData({ name: '', labName: '', sourceTariff: '', validFrom: '', validTo: '' });
      setAdditionalProcIds([]);
      addToast({ type: 'success', message: 'Tarife başarıyla oluşturuldu.' });
    } catch {
      addToast({ type: 'error', message: 'Tarife oluşturulurken bir hata oluştu.' });
    } finally {
      setFormLoading(false);
    }
  };

  // Single Activation Handler (Row Action)
  const handleSingleActivate = async (tariffObj: any) => {
    const existingActive = records.find(item => item.labName === tariffObj.labName && item.status === 'AKTİF' && item.id !== tariffObj.id);
    if (existingActive) {
      const confirmed = confirm(`"${tariffObj.labName}" için halihazırda aktif bir tarife (${existingActive.name}) bulunmaktadır. Her laboratuvar için aynı anda yalnızca 1 tarife aktif olabilir.\n\n"${existingActive.name}" adlı tarifeyi PASİF duruma getirerek "${tariffObj.name}" adlı tarifeyi AKTİF yapmak istiyor musunuz?`);
      if (!confirmed) return;
      try {
        await LabService.updateTariff(existingActive.id, { status: 'PASİF' } as any);
      } catch {
        addToast({ type: 'error', message: 'Mevcut tarife pasif yapılırken bir hata oluştu.' });
        return;
      }
    }
    try {
      await LabService.updateTariff(tariffObj.id, { status: 'AKTİF' } as any);
      setRecords(prev => prev.map(item => {
        if (item.labName === tariffObj.labName) {
          return { ...item, status: item.id === tariffObj.id ? 'AKTİF' : 'PASİF' };
        }
        return item;
      }));
    } catch {
      addToast({ type: 'error', message: 'Tarife durumu güncellenirken bir hata oluştu.' });
    }
  };

  // Bulk Activation Handler
  const handleBulkActivate = async () => {
    const selectedTariffs = records.filter(r => selectedIds.has(r.id));
    const labsAffected = Array.from(new Set(selectedTariffs.map(r => r.labName)));

    let conflictMessage = '';
    labsAffected.forEach(lab => {
      const activeForLab = records.find(r => r.labName === lab && r.status === 'AKTİF' && !selectedIds.has(r.id));
      const selectedForLabCount = selectedTariffs.filter(r => r.labName === lab).length;
      if (activeForLab) {
        conflictMessage += `\n• ${lab} (Mevcut aktif: ${activeForLab.name})`;
      }
      if (selectedForLabCount > 1) {
        conflictMessage += `\n• ${lab} için ${selectedForLabCount} farklı tarife seçtiniz. (Yalnızca en güncel olanı aktif yapılacaktır)`;
      }
    });

    if (conflictMessage) {
      const confirmed = confirm(`Her laboratuvar için aynı anda yalnızca 1 tarife aktif olabilir. Aşağıdaki laboratuvarların mevcut aktif tarifeleri PASİF duruma getirilecektir:\n${conflictMessage}\n\nOnaylıyor musunuz?`);
      if (!confirmed) return;
    }

    try {
      // Collect all API calls
      const updates: Promise<any>[] = [];
      const newStatuses: Record<string, 'AKTİF' | 'PASİF'> = {};
      labsAffected.forEach(lab => {
        const selectedForLab = selectedTariffs.filter(r => r.labName === lab)[0];
        if (selectedForLab) {
          records.forEach(item => {
            if (item.labName === lab) {
              const targetStatus: 'AKTİF' | 'PASİF' = item.id === selectedForLab.id ? 'AKTİF' : 'PASİF';
              newStatuses[item.id] = targetStatus;
              if (item.status !== targetStatus) {
                updates.push(LabService.updateTariff(item.id, { status: targetStatus } as any));
              }
            }
          });
        }
      });
      await Promise.all(updates);
      setRecords(prev => prev.map(item => newStatuses[item.id] !== undefined ? { ...item, status: newStatuses[item.id] } : item));
      setSelectedIds(new Set());
    } catch {
      addToast({ type: 'error', message: 'Toplu güncelleme sırasında bir hata oluştu.' });
    }
  };

  // Open Price Editor
  const openPriceEditor = (tariff: any) => {
    setSelectedTariff(tariff);
    setActiveProcIds([...(tariff.includedProcIds || [])]);
    setPrices({ ...(tariff.customPrices || {}) });
    setIsSaved(false);
    setProcSelectedIds(new Set());
    setProcSearchTerm('');
    setShowAddProcPopover(false);
    setProceduresModalOpen(true);
  };

  const handlePriceChange = (id: string, value: string) => {
    setIsSaved(false);
    const num = parseFloat(value);
    if (!isNaN(num)) { setPrices(prev => ({ ...prev, [id]: num })); } 
    else if (value === '') { setPrices(prev => { const n = {...prev}; delete n[id]; return n; }); }
  };

  const handleSavePrices = async () => {
    setSavingPrices(true);
    try {
      await LabService.updateTariff(selectedTariff.id, { includedProcIds: activeProcIds, customPrices: prices } as any);
      setIsSaved(true);
      setRecords(prev => prev.map(r => r.id === selectedTariff.id ? { ...r, includedProcIds: activeProcIds, customPrices: prices } : r));
    } catch {
      addToast({ type: 'error', message: 'Fiyatlar kaydedilemedi.' });
    } finally {
      setSavingPrices(false);
    }
  };

  const handleBulkResetPrices = () => {
    setIsSaved(false);
    setPrices(prev => {
      const next = { ...prev };
      Array.from(procSelectedIds).forEach(id => {
        const proc = procedures.find(p => p.id === id);
        if (proc) next[id] = proc.defaultCost;
      });
      return next;
    });
  };

  const handleBulkRemovePrices = () => {
    setIsSaved(false);
    setActiveProcIds(prev => prev.filter(id => !procSelectedIds.has(id)));
    setPrices(prev => {
      const next = { ...prev };
      Array.from(procSelectedIds).forEach(id => delete next[id]);
      return next;
    });
    setProcSelectedIds(new Set());
    setBulkRemovePricesConfirmOpen(false);
  };

  const handleBulkDeleteTariffs = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map(id => LabService.deleteTariff(id)));
      setRecords(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    } catch {
      addToast({ type: 'error', message: 'Silme işlemi sırasında bir hata oluştu.' });
    } finally {
      setBulkDeleteTariffsConfirmOpen(false);
    }
  };

  const handleDeleteTariff = async (id: string) => {
    try {
      await LabService.deleteTariff(id);
      setRecords(prev => prev.filter(p => p.id !== id));
    } catch {
      addToast({ type: 'error', message: 'Tarife silinemedi.' });
    } finally {
      setDeleteTariffTargetId(null);
    }
  };

  const removeSingleProc = (id: string) => {
    setIsSaved(false);
    setActiveProcIds(prev => prev.filter(item => item !== id));
    setPrices(prev => { const next = {...prev}; delete next[id]; return next; });
    setProcSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const exportCSV = () => {
    const headers = ['Tarife Adı', 'Laboratuvar', 'Geçerlilik', 'Durum', 'İşlem Sayısı'];
    const rows = sortedData.map(r => [
      r.name,
      r.labName,
      r.validity,
      r.status === 'AKTİF' ? 'Aktif' : 'Pasif',
      String(r.includedProcIds ? r.includedProcIds.length : 0),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lab-tarifeler.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculations for New Tariff modal
  const selectedSourceObj = records.find(r => r.id === formData.sourceTariff);
  const sourceProcIds = selectedSourceObj ? selectedSourceObj.includedProcIds : [];
  const availableToAddInNew = procedures.filter(p => !sourceProcIds.includes(p.id));

  // Calculations for Price Edit modal
  const currentTariffProcs = procedures.filter(p => activeProcIds.includes(p.id));
  const filteredProcs = currentTariffProcs.filter(p => p.name.toLowerCase().includes(procSearchTerm.toLowerCase()) || p.code.toLowerCase().includes(procSearchTerm.toLowerCase()));
  const availableToAddInEdit = procedures.filter(p => !activeProcIds.includes(p.id));

  const allProcsSelected = filteredProcs.length > 0 && filteredProcs.every(p => procSelectedIds.has(p.id));
  const someProcsSelected = filteredProcs.some(p => procSelectedIds.has(p.id));
  const toggleAllProcs = () => setProcSelectedIds(allProcsSelected ? new Set() : new Set(filteredProcs.map(p => p.id)));
  const toggleOneProc = (id: string) => setProcSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <MetronicLayout 
      title="Laboratuvar Fiyat Tarifeleri" 
      breadcrumbs={['Laboratuvar', 'Fiyat Tarifeleri']}
      infoTooltip={
        <InfoTooltip 
          title="Laboratuvar Tarife Yönetimi"
          description="Her laboratuvar için geçerli fiyat listelerini (tarifeleri) buradan yönetebilirsiniz. Her laboratuvar için aynı anda yalnızca 1 tarife aktif olabilir."
        />
      }
    >
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Toplam Tarife Sayısı', value: `${records.length} Liste`, icon: <Tags size={20} />, color: 'text-metronic-primary', bg: 'bg-metronic-primary-light dark:bg-metronic-primary/10' },
          { label: 'Aktif Tarifeler', value: `${activeTariffsCount} Liste`, icon: <CheckCircle2 size={20} />, color: 'text-metronic-success', bg: 'bg-metronic-success-light dark:bg-metronic-success/10' },
          { label: 'Kayıtlı Laboratuvarlar', value: `${uniqueLabsCount} Laboratuvar`, icon: <Building2 size={20} />, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.color}`}>{c.icon}</div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
              <p className={`text-[1.2rem] font-bold mt-0.5 ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20 animate-[fadeInDown_0.2s_ease]">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} tarife seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleBulkActivate}
                className="h-8 px-3 bg-white border border-metronic-success/30 text-metronic-success text-[12px] font-bold rounded-lg hover:bg-metronic-success hover:text-white transition-all shadow-sm"
              >
                Aktif Yap
              </button>
              <button
                onClick={async () => {
                  try {
                    await Promise.all(Array.from(selectedIds).map(id => LabService.updateTariff(id, { status: 'PASİF' } as any)));
                    setRecords(prev => prev.map(r => selectedIds.has(r.id) ? { ...r, status: 'PASİF' } : r));
                    setSelectedIds(new Set());
                  } catch { addToast({ type: 'error', message: 'Pasif yapılırken bir hata oluştu.' }); }
                }}
                className="h-8 px-3 bg-white border border-metronic-danger/30 text-metronic-danger text-[12px] font-bold rounded-lg hover:bg-metronic-danger hover:text-white transition-all shadow-sm"
              >
                Pasif Yap
              </button>
              <button
                onClick={() => setBulkDeleteTariffsConfirmOpen(true)}
                className="h-8 px-3 bg-white border border-slate-200 text-slate-600 text-[12px] font-bold rounded-lg hover:bg-slate-50 transition-all shadow-sm"
              >
                Sil
              </button>
              <div className="w-px h-5 bg-metronic-primary/20 mx-1" />
              <button onClick={() => setSelectedIds(new Set())} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors shadow-sm"><X size={16} /></button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Lab Tarife Listeleri</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input type="text" placeholder="Tarife veya lab adı ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><Filter size={15} /> Filtrele <ChevronDown size={13} className="text-slate-400" /></button>}>
              <DropdownItem icon={<CheckCircle2 size={14} className="text-metronic-success" />} label="Aktif Tarifeler" onClick={() => setSearchTerm('AKTİF')} />
              <DropdownItem icon={<XCircle size={14} className="text-slate-400" />} label="Pasif Tarifeler" onClick={() => setSearchTerm('PASİF')} />
              <div className="border-t border-slate-100 dark:border-white/5 my-1" />
              {labs.map(l => <DropdownItem key={l.id} icon={<Building2 size={14} />} label={l.name} onClick={() => setSearchTerm(l.name)} />)}
            </Dropdown>

            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p>
              </div>
              <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>

            <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm">
              <Plus size={16} /> Yeni Tarife Oluştur
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10"><input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></th>
                <SortableHeader label="Tarife Kodu & Adı" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="İlgili Laboratuvar" column="labName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Geçerlilik" column="validity" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-center">İşlem Sayısı</th>
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Yükleniyor...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="py-12 text-center text-metronic-danger font-medium">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Eşleşen kayıt bulunamadı.</td></tr>
              ) : paginated.map((r, i) => {
                const isSelected = selectedIds.has(r.id);
                const labInfo = LAB_MAP[r.labName] || { cls: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400' };
                const statusInfo = STATUS_MAP[r.status] || STATUS_MAP['PASİF'];
                const isBottom = i >= paginated.length - 2 && paginated.length > 3;
                const procCount = r.includedProcIds ? r.includedProcIds.length : 0;

                return (
                  <tr key={r.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                    <td className="py-3 pl-6 pr-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-slate-800 dark:text-slate-100 font-bold text-[13px]">{r.name}</span>
                        <span className="text-slate-400 text-[11px] font-semibold mt-0.5 font-mono">{r.id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${labInfo.cls}`}>
                        <Building2 size={13} /> {r.labName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-600 dark:text-slate-300 font-medium text-[12px] flex items-center gap-1.5"><Calendar size={13} className="text-slate-400"/> {r.validity}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">{procCount}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold ${statusInfo.cls}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-3 pl-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Dropdown align="right" openUp={isBottom} trigger={<button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10 shadow-sm"><Settings size={18} /></button>}>
                          {r.status === 'PASİF' ? (
                            <DropdownItem icon={<CheckCircle2 size={14} className="text-metronic-success" />} label="Aktif Yap" onClick={() => handleSingleActivate(r)} />
                          ) : (
                            <DropdownItem icon={<XCircle size={14} className="text-slate-400" />} label="Pasif Yap" onClick={async () => {
                              try {
                                await LabService.updateTariff(r.id, { status: 'PASİF' } as any);
                                setRecords(prev => prev.map(item => item.id === r.id ? { ...item, status: 'PASİF' } : item));
                              } catch { addToast({ type: 'error', message: 'Tarife durumu güncellenemedi.' }); }
                            }} />
                          )}
                          <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                          <DropdownItem icon={<Edit2 size={14} className="text-metronic-primary" />} label="Fiyatları & İşlemleri Düzenle" onClick={() => openPriceEditor(r)} />
                          <DropdownItem icon={<Percent size={14} />} label="Toplu Zam / İndirim Uygula" onClick={() => openPriceEditor(r)} />
                          <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                          <DropdownItem icon={<Copy size={14} />} label="Tarifeyi Kopyala" />
                          <DropdownItem icon={<Download size={14} />} label="Excel Olarak İndir" />
                          <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                          <DropdownItem icon={<XCircle size={14} />} danger label="Tarifeyi Sil" onClick={() => setDeleteTariffTargetId(r.id)} />
                        </Dropdown>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-xl">
          <div className="flex items-center gap-4">
            <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">Toplam <span className="font-bold text-slate-700 dark:text-slate-200">{filtered.length}</span> tarife</span>
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-white/10 pl-4">
              <span className="text-[12px] text-slate-400">Sayfa başı:</span>
              <select value={pageLimit} onChange={(e) => setPageLimit(Number(e.target.value))} className="bg-transparent text-[13px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer">
                {PAGE_LIMIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt === 1000 ? 'Tümü' : opt}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { let p = i + 1; return (
              <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${p === currentPage ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>{p}</button>
            ); })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>

      {/* NEW TARIFF MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Lab Tarifesi Oluştur" subtitle="Mevcut bir laboratuvar tarifesini kopyalayarak veya münferit işlemler seçerek yeni fiyat listesi yaratın." size="md" footer={
        <><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
        <button form="tariff-form" type="submit" disabled={formLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70"><Save size={15} />{formLoading ? 'Oluşturuluyor...' : 'Tarifeyi Oluştur'}</button></>
      }>
        <form id="tariff-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tarife Adı <span className="text-metronic-danger">*</span></label>
            <input required type="text" placeholder="Örn: 2026 Özden Lab Güncel Fiyat Listesi" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="m-input" />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İlgili Laboratuvar <span className="text-metronic-danger">*</span></label>
            <select required value={formData.labName} onChange={e => setFormData({ ...formData, labName: e.target.value })} className="m-input">
              <option value="">Laboratuvar Seçiniz...</option>
              {labs.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kopyalanacak Kaynak Tarife (Opsiyonel)</label>
            <select value={formData.sourceTariff} onChange={e => { setFormData({ ...formData, sourceTariff: e.target.value }); setAdditionalProcIds([]); }} className="m-input">
              <option value="">Boş Tarife (Tüm işlemleri münferit seçeceğim)</option>
              {records.map(r => <option key={r.id} value={r.id}>{r.name} ({r.includedProcIds?.length || 0} İşlem)</option>)}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Seçilen tarifedeki tüm lab işlem maliyetleri bu yeni listeye aktarılacaktır.</p>
          </div>

          {/* Münferit İşlem Seçim Paneli (Yeni Tarife İçin) */}
          <div className="border border-slate-200 dark:border-white/10 rounded-xl p-4 bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                Tarife İçeriği & Münferit İşlem Ekleme
              </label>
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-metronic-primary/10 text-metronic-primary rounded-md">
                Toplam: {sourceProcIds.length + additionalProcIds.length} İşlem
              </span>
            </div>
            
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {selectedSourceObj ? `Kaynak tarifeden ${sourceProcIds.length} işlem kopyalanıyor.` : 'Şu an boş bir tarife oluşturuyorsunuz.'} Aşağıdan bu tarifede yer almasını istediğiniz ekstra işlemleri münferit olarak seçebilirsiniz:
            </p>

            {availableToAddInNew.length > 0 ? (
              <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-lg divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#1c1f2e] shadow-inner">
                {availableToAddInNew.map(p => {
                  const isAdded = additionalProcIds.includes(p.id);
                  return (
                    <div key={p.id} onClick={() => {
                      setAdditionalProcIds(prev => isAdded ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                    }} className={`flex items-center justify-between p-2.5 text-[12px] cursor-pointer transition-colors ${isAdded ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                      <div className="flex items-center gap-2.5">
                        <input type="checkbox" checked={isAdded} readOnly className="w-3.5 h-3.5 rounded border-slate-300 accent-metronic-primary pointer-events-none" />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                          <span className="text-slate-400 font-mono text-[10px] ml-1.5">({p.code})</span>
                        </div>
                      </div>
                      <span className="text-slate-500 font-medium">₺{p.defaultCost}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">Sistemdeki tüm işlemler bu tarifeye zaten dahil.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Geçerlilik Başlangıcı</label>
              <input type="date" value={formData.validFrom} onChange={e => setFormData({ ...formData, validFrom: e.target.value })} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Bitiş (Opsiyonel)</label>
              <input type="date" value={formData.validTo} onChange={e => setFormData({ ...formData, validTo: e.target.value })} className="m-input" />
            </div>
          </div>
        </form>
      </Modal>

      {/* PROCEDURES PRICE & CONTENT EDIT MODAL */}
      <Modal 
        isOpen={proceduresModalOpen} 
        onClose={() => setProceduresModalOpen(false)} 
        title={`${selectedTariff?.name || 'Tarife'} — Fiyat & İşlem Düzenleme`}
        subtitle={`${selectedTariff?.labName || 'Laboratuvar'} için geçerli işlemleri ve maliyetleri güncelleyin.`}
        size="xl"
        footer={
          <div className="w-full flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {procSelectedIds.size > 0 ? (
                <button type="button" onClick={() => setBulkRemovePricesConfirmOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-metronic-danger/10 hover:bg-metronic-danger/20 text-metronic-danger rounded-lg text-[12px] font-bold transition-colors">
                  <Trash2 size={14} /> Seçili İşlemleri Tarifeden Çıkar ({procSelectedIds.size})
                </button>
              ) : (
                <button type="button" onClick={handleBulkResetPrices} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-[12px] font-bold transition-colors">
                  <RotateCcw size={14} /> Tümünü Varsayılana Dön
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isSaved && <span className="flex items-center gap-1.5 text-[12px] font-bold text-metronic-success animate-pulse"><Check size={16} /> Değişiklikler Kaydedildi</span>}
              <button type="button" onClick={() => setProceduresModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">Kapat</button>
              <button type="button" onClick={handleSavePrices} disabled={savingPrices} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-success text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-70 shadow-sm">
                {savingPrices ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
                {savingPrices ? 'Kaydediliyor...' : 'Fiyatları & Listeyi Kaydet'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          
          {/* Top Toolbar in Edit Modal */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200/60 dark:border-white/5">
            <div className="relative flex-1 w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input type="text" placeholder="Tarifedeki işlemler içinde ara..." value={procSearchTerm} onChange={e => setProcSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-metronic-primary focus:ring-1 focus:ring-metronic-primary transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 shadow-sm" />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/5 shadow-sm">
                {filteredProcs.length} İşlem
              </span>
              <button type="button" onClick={() => setShowAddProcPopover(o => !o)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-bold transition-colors shadow-sm ${showAddProcPopover ? 'bg-metronic-primary text-white' : 'bg-metronic-primary/10 hover:bg-metronic-primary/20 text-metronic-primary'}`}>
                <Plus size={16} /> Tarifede Olmayan İşlem Ekle ({availableToAddInEdit.length})
              </button>
            </div>
          </div>

          {/* Collapsible Panel: Available Procedures to Add in Edit Modal */}
          {showAddProcPopover && (
            <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 animate-[fadeInDown_0.2s_ease] space-y-4 shadow-inner">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Plus size={16} className="text-metronic-primary" /> Sistemde Tanımlı Olup Bu Tarifede Yer Almayan İşlemler
                  </h4>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Aşağıdaki işlemler sistemde mevcuttur ancak şu an düzenlediğiniz tarifede bulunmamaktadır. “+ Tarifeye Ekle” butonuna basarak anında listeye dahil edebilirsiniz.
                  </p>
                </div>
                <button onClick={() => setShowAddProcPopover(false)} className="text-slate-400 hover:text-slate-600 bg-white dark:bg-white/5 p-1.5 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm"><X size={16} /></button>
              </div>
              
              {availableToAddInEdit.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                  {availableToAddInEdit.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-xl shadow-sm hover:border-metronic-primary/30 transition-all group">
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</span>
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-slate-500 font-semibold">{p.code}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-1 font-medium">{p.category} · Varsayılan: ₺{p.defaultCost}</span>
                      </div>
                      <button type="button" onClick={() => {
                        setActiveProcIds(prev => [...prev, p.id]);
                        setPrices(prev => ({ ...prev, [p.id]: p.defaultCost }));
                        setIsSaved(false);
                      }} className="flex items-center gap-1.5 px-3 py-2 bg-metronic-primary/10 hover:bg-metronic-primary text-metronic-primary hover:text-white rounded-lg text-[12px] font-bold transition-all shadow-sm flex-shrink-0">
                        <Plus size={14} /> Tarifeye Ekle
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-white dark:bg-[#1c1f2e] rounded-xl text-center border border-slate-200/60 dark:border-white/5">
                  <p className="text-[13px] text-slate-500 font-bold">Sistemdeki tüm işlemler bu tarifeye zaten eklenmiş durumdadır.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Yeni bir işlem tanımlamak için ’Laboratuvar &gt; İşlem Türleri’ sayfasına gidebilirsiniz.</p>
                </div>
              )}
            </div>
          )}

          {/* Current Tariff Procedures Table */}
          <div className="overflow-auto max-h-[420px] border border-slate-200/60 dark:border-white/5 rounded-xl shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-[#25293c]">
                <tr className="border-b border-slate-200/80 dark:border-white/5">
                  <th className="py-3 pl-6 pr-3 w-10"><input type="checkbox" checked={allProcsSelected} ref={el => { if (el) el.indeterminate = someProcsSelected && !allProcsSelected; }} onChange={toggleAllProcs} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">Kod</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">İşlem Adı</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Varsayılan Maliyet</th>
                  <th className="py-3 pr-6 pl-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right w-56">Lab Özel Maliyeti (₺)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#1c1f2e]">
                {filteredProcs.map(p => {
                  const isSelected = procSelectedIds.has(p.id);
                  return (
                    <tr key={p.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                      <td className="py-2.5 pl-6 pr-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOneProc(p.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                      <td className="py-2.5 px-4"><span className="text-slate-500 dark:text-slate-400 font-mono font-bold text-[13px] bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">{p.code}</span></td>
                      <td className="py-2.5 px-4">
                        <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 block leading-tight">{p.name}</span>
                        <span className="text-[11px] font-medium text-slate-400">{p.category}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right"><span className="text-[13px] font-medium text-slate-500">₺{formatCurrency(p.defaultCost)}</span></td>
                      <td className="py-2.5 pr-6 pl-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-slate-400 text-[13px] font-bold">₺</span>
                            <input type="number" value={prices[p.id] !== undefined ? prices[p.id] : ''} onChange={(e) => handlePriceChange(p.id, e.target.value)}
                              className="w-32 pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-right outline-none focus:border-metronic-primary focus:ring-1 focus:ring-metronic-primary text-[13px] font-bold text-slate-800 dark:text-white transition-all shadow-sm focus:bg-white" />
                          </div>
                          <button type="button" onClick={() => removeSingleProc(p.id)} title="Tarifeden Çıkar" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-metronic-danger/10 hover:text-metronic-danger transition-colors border border-transparent hover:border-metronic-danger/20 shadow-sm">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProcs.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500 font-medium">Bu tarifede eşleşen işlem bulunamadı veya tüm işlemler çıkarıldı.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={bulkRemovePricesConfirmOpen}
        onClose={() => setBulkRemovePricesConfirmOpen(false)}
        onConfirm={handleBulkRemovePrices}
        title="İşlemleri Tarifeden Çıkar"
        message="Seçili işlemleri bu tarifeden çıkarmak istediğinize emin misiniz?"
      />

      <ConfirmModal
        isOpen={bulkDeleteTariffsConfirmOpen}
        onClose={() => setBulkDeleteTariffsConfirmOpen(false)}
        onConfirm={handleBulkDeleteTariffs}
        title="Tarifeleri Sil"
        message="Seçili tarifeleri silmek istediğinize emin misiniz?"
      />

      <ConfirmModal
        isOpen={!!deleteTariffTargetId}
        onClose={() => setDeleteTariffTargetId(null)}
        onConfirm={() => deleteTariffTargetId && handleDeleteTariff(deleteTariffTargetId)}
        title="Tarifeyi Sil"
        message="Bu tarifeyi silmek istediğinize emin misiniz?"
      />
    </MetronicLayout>
  );
}
