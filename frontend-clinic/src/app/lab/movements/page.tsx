'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import Modal from '../../../components/ui/Modal';
import InfoTooltip from '../../../components/ui/InfoTooltip';
import { Search, Filter, Download, ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, Clock, AlertCircle, RefreshCcw, X, Plus, Activity, Beaker, CheckSquare, Trash2, Settings, Edit2, Save, FileText, Loader2, ArrowDownCircle, GitBranch, ArrowUp, ArrowDown, Check, Info } from 'lucide-react';
import { LabService, LabOrder, Lab, LabProcedure, CreateLabOrderPayload, LabRecordType, LabProcessType } from '../../../lib/services/lab.service';
import { PatientService } from '../../../lib/services/patient.service';
import { EmployeeService } from '../../../lib/services/employee.service';
import { useToastStore } from '../../../store/toastStore';


function DropdownItem({ icon, label, danger = false, onClick }: { icon?: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

function FilterItem({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'bg-metronic-primary/5 text-metronic-primary font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {label}{active && <Check size={12} className="ml-auto text-metronic-primary" />}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort, className = '' }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void; className?: string }) {
  const isActive = sortColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      className={`py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={13} className="text-metronic-primary" /> : <ArrowDown size={13} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

const LAB_STATUS_MAP: Record<string, { cls: string; label: string; icon: any }> = {
  'SENT': { cls: 'bg-blue-50 text-blue-600', label: 'Gönderildi', icon: Activity },
  'RECEIVED': { cls: 'bg-metronic-success-light text-metronic-success', label: 'Geldi', icon: CheckCircle2 },
  'REVISION': { cls: 'bg-purple-50 text-purple-600', label: 'Revizyon', icon: RefreshCcw },
  'CANCELLED': { cls: 'bg-metronic-danger-light text-metronic-danger', label: 'İptal', icon: AlertCircle },
  'PENDING': { cls: 'bg-slate-50 text-slate-500', label: 'Beklemede', icon: Clock },
  'FITTED': { cls: 'bg-emerald-50 text-emerald-600', label: 'Takıldı', icon: CheckSquare },
};

const RECORD_TYPE_MAP: Record<LabRecordType, { cls: string; label: string }> = {
  'GIDEN': { cls: 'bg-amber-50 text-amber-700', label: 'Giden' },
  'GELEN': { cls: 'bg-metronic-success-light text-metronic-success', label: 'Gelen' },
};

const PROCESS_TYPE_MAP: Record<LabProcessType, { cls: string; label: string }> = {
  'YENI': { cls: 'bg-blue-50 text-blue-600', label: 'Yeni' },
  'PROVA': { cls: 'bg-purple-50 text-purple-600', label: 'Prova' },
  'REVIZYON': { cls: 'bg-orange-50 text-orange-600', label: 'Revizyon' },
};

const EMPTY_FORM: CreateLabOrderPayload = {
  patientId: '',
  doctorId: '',
  clinicStaffId: '',
  labId: '',
  procedureId: '',
  recordType: 'GIDEN',
  processType: 'YENI',
  dueDate: '',
  labStaffName: '',
  description: '',
  cost: 0,
};

type ModalMode = 'create' | 'deliver' | 'revision';

const MODAL_TITLES: Record<ModalMode, { title: string; subtitle: string; submitLabel: string }> = {
  create: { title: 'Laboratuvar Yeni İşlem Formu', subtitle: 'Klinik, işlem ve süreç bilgilerini girerek yeni bir laboratuvar kaydı açın.', submitLabel: 'Kaydı Oluştur' },
  deliver: { title: 'Laboratuvar İşlem Teslim Formu', subtitle: 'Laboratuvardan gelen işlemi teslim alın ve bilgileri gerekirse güncelleyin.', submitLabel: 'Teslim Al ve Kaydet' },
  revision: { title: 'Laboratuvar Revizyon İşlem Formu', subtitle: 'Bu işleme bağlı yeni bir revizyon kaydı oluşturun. Revizyon ücretsizdir.', submitLabel: 'Revizyonu Kaydet' },
};

export default function LabMovementsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [prevPagingFilters, setPrevPagingFilters] = useState({ searchTerm: '', filterStatus: '', filterProcessType: '', filterRecordType: '' });

  // Sıralama
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtreleme
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProcessType, setFilterProcessType] = useState('');
  const [filterRecordType, setFilterRecordType] = useState('');

  // Sayfalama
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100];

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [newStatus, setNewStatus] = useState('');

  // Yeni İşlem / Teslim / Revizyon — tek paylaşılan modal (LABORATUVAR İŞLEM KAYDI formu)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [targetOrder, setTargetOrder] = useState<LabOrder | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<CreateLabOrderPayload>(EMPTY_FORM);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [procedures, setProcedures] = useState<LabProcedure[]>([]);

  const addToast = useToastStore(state => state.addToast);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await LabService.getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'İşlemler yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [ptsRes, staffList, labList, procList] = await Promise.all([
        PatientService.findAll({ limit: 200, sortBy: 'firstName', sortDir: 'asc' }),
        EmployeeService.findAll(),
        LabService.getLabs(),
        LabService.getProcedureTypes(),
      ]);
      // Yeni laboratuvar kaydı yalnızca Aktif/Pasif hastalar için açılabilir; Aday (henüz tedavi planı olmayan) hastalar listelenmez.
      setPatients(ptsRes.data.filter((p: any) => p.status !== 'ADAY'));
      setStaff(staffList);
      setDoctors(staffList.filter(s => s.isDoctor));
      setLabs(labList);
      setProcedures(procList.filter(p => p.active));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    if (user) { fetchOrders(); fetchFormData(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchOrders/fetchFormData are redefined every render; adding them would retrigger this effect on every render
  }, [user]);

  const rows = useMemo(() => orders.map(o => {
    const patient = o.patient || o.treatmentItem?.plan?.patient;
    const doctor = doctors.find(d => d.id === o.doctorId);
    return {
      order: o,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : '-',
      doctorName: doctor ? `Dt. ${doctor.firstName} ${doctor.lastName}` : '-',
      procedureName: o.procedure?.name || o.treatmentItem?.tariff?.masterTreatment?.name || '-',
      labName: o.lab?.name || '-',
    };
  }), [orders, doctors]);

  const filtered = rows.filter(r => {
    const matchesSearch = [r.patientName, r.doctorName, r.order.id, r.labName, r.procedureName, r.order.status]
      .join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || r.order.status === filterStatus;
    const matchesProcessType = !filterProcessType || r.order.processType === filterProcessType;
    const matchesRecordType = !filterRecordType || r.order.recordType === filterRecordType;
    return matchesSearch && matchesStatus && matchesProcessType && matchesRecordType;
  });

  if (searchTerm !== prevPagingFilters.searchTerm || filterStatus !== prevPagingFilters.filterStatus || filterProcessType !== prevPagingFilters.filterProcessType || filterRecordType !== prevPagingFilters.filterRecordType) {
    setPrevPagingFilters({ searchTerm, filterStatus, filterProcessType, filterRecordType });
    setCurrentPage(1);
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SORT_KEY_MAP: Record<string, (r: typeof rows[number]) => string> = {
    patientName: r => r.patientName,
    doctorName: r => r.doctorName,
    procedureName: r => r.procedureName,
    labName: r => r.labName,
    status: r => r.order.status,
  };

  const sortedData = [...filtered].sort((a, b) => {
    if (!sortColumn || !SORT_KEY_MAP[sortColumn]) return 0;
    const aVal = SORT_KEY_MAP[sortColumn](a);
    const bVal = SORT_KEY_MAP[sortColumn](b);
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageLimit));
  const paginated = sortedData.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    try {
      await LabService.updateOrderStatus(selectedOrder.id, newStatus);
      addToast({ title: 'Başarılı', message: 'Durum güncellendi.', type: 'success' });
      setStatusModalOpen(false);
      fetchOrders();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Güncelleme başarısız.', type: 'error' });
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setTargetOrder(null);
    setCreateForm(EMPTY_FORM);
    setCreateModalOpen(true);
  };

  // "İşlemi Teslim Al": Laboratuvar İşlem Teslim Formu — mevcut kaydın bilgileriyle dolu gelir,
  // Klinik Personeli boş bırakılır (teslim alan kişi burada seçilir).
  const openDeliverModal = (order: LabOrder) => {
    const patient = order.patient || order.treatmentItem?.plan?.patient;
    setModalMode('deliver');
    setTargetOrder(order);
    setCreateForm({
      patientId: patient?.id || '',
      doctorId: order.doctorId || '',
      clinicStaffId: '',
      labId: order.labId || '',
      procedureId: order.procedureId || '',
      recordType: order.recordType,
      processType: order.processType,
      dueDate: order.dueDate ? order.dueDate.slice(0, 16) : '',
      labStaffName: order.labStaffName || '',
      description: order.description || '',
      cost: Number(order.cost) || 0,
      colorCode: order.colorCode,
    });
    setCreateModalOpen(true);
  };

  // "Revizyon Ekle": Laboratuvar Revizyon İşlem Formu — sadece Durum:Geldi olan işlemler için aktiftir.
  const openRevisionModal = (order: LabOrder) => {
    const patient = order.patient || order.treatmentItem?.plan?.patient;
    setModalMode('revision');
    setTargetOrder(order);
    setCreateForm({
      patientId: patient?.id || '',
      doctorId: order.doctorId || '',
      clinicStaffId: order.clinicStaffId || '',
      labId: order.labId || '',
      procedureId: order.procedureId || '',
      recordType: 'GIDEN',
      processType: 'REVIZYON',
      dueDate: order.dueDate ? order.dueDate.slice(0, 16) : '',
      labStaffName: order.labStaffName || '',
      description: order.description || '',
      cost: 0,
      colorCode: order.colorCode,
    });
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.patientId) {
      addToast({ title: 'Eksik Bilgi', message: 'Lütfen hasta seçiniz.', type: 'error' });
      return;
    }
    setCreateLoading(true);
    try {
      if (modalMode === 'create') {
        const procedure = procedures.find(p => p.id === createForm.procedureId);
        await LabService.createOrder({
          ...createForm,
          cost: createForm.processType === 'YENI' ? (createForm.cost ?? Number(procedure?.defaultCost ?? 0)) : 0,
        });
        addToast({ title: 'Başarılı', message: 'Laboratuvar kaydı oluşturuldu.', type: 'success' });
      } else if (modalMode === 'deliver' && targetOrder) {
        await LabService.deliverOrder(targetOrder.id, {
          patientId: createForm.patientId,
          doctorId: createForm.doctorId,
          clinicStaffId: createForm.clinicStaffId,
          labStaffName: createForm.labStaffName,
          labId: createForm.labId,
          procedureId: createForm.procedureId,
          cost: createForm.cost,
          dueDate: createForm.dueDate,
          description: createForm.description,
          colorCode: createForm.colorCode,
        });
        addToast({ title: 'Başarılı', message: 'İşlem teslim alındı.', type: 'success' });
      } else if (modalMode === 'revision' && targetOrder) {
        await LabService.addRevision(targetOrder.id, {
          description: createForm.description,
          dueDate: createForm.dueDate,
          labStaffName: createForm.labStaffName,
          labId: createForm.labId,
          procedureId: createForm.procedureId,
          doctorId: createForm.doctorId,
          clinicStaffId: createForm.clinicStaffId,
          colorCode: createForm.colorCode,
        });
        addToast({ title: 'Başarılı', message: 'Revizyon kaydı eklendi.', type: 'success' });
      }
      setCreateModalOpen(false);
      setTargetOrder(null);
      setCreateForm(EMPTY_FORM);
      fetchOrders();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Kayıt oluşturulamadı.', type: 'error' });
    } finally {
      setCreateLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

  const exportCSV = () => {
    const headers = ['İşlem No', 'Tarih', 'Laboratuvar', 'Hasta', 'Hekim', 'İşlem', 'Kayıt Tipi', 'İşlem Tipi', 'Durum', 'Maliyet'];
    const rowsCsv = filtered.map(r => {
      const o = r.order;
      const statusLabel = LAB_STATUS_MAP[o.status]?.label || o.status;
      return [
        o.orderNumber || '-',
        new Date(o.createdAt).toLocaleDateString('tr-TR'),
        r.labName,
        r.patientName,
        r.doctorName,
        r.procedureName,
        RECORD_TYPE_MAP[o.recordType]?.label || o.recordType,
        PROCESS_TYPE_MAP[o.processType]?.label || o.processType,
        statusLabel,
        String(Number(o.cost)),
      ];
    });
    const csv = [headers, ...rowsCsv].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lab-hareketleri.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const modalInfo = MODAL_TITLES[modalMode];
  const targetPatientName = targetOrder ? (targetOrder.patient ? `${targetOrder.patient.firstName} ${targetOrder.patient.lastName}` : `${targetOrder.treatmentItem?.plan?.patient?.firstName || ''} ${targetOrder.treatmentItem?.plan?.patient?.lastName || ''}`) : '';
  const targetProcedureName = targetOrder?.procedure?.name || targetOrder?.treatmentItem?.tariff?.masterTreatment?.name || '-';

  return (
    <MetronicLayout
      title="Laboratuvar Hareketleri"
      breadcrumbs={['Laboratuvar', 'Hareketler']}
    >
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">

        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">İşlem Listesi</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filtered.length} İşlem</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px] max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input type="text" placeholder="Hasta, hekim, laboratuvar, işlem ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
            </div>

            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterStatus || filterProcessType || filterRecordType ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>
                <Filter size={15} /> Filtrele {(filterStatus || filterProcessType || filterRecordType) && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase">Durum</p></div>
              <FilterItem label="Tüm Durumlar" active={!filterStatus} onClick={() => setFilterStatus('')} />
              {Object.entries(LAB_STATUS_MAP).map(([key, info]) => (
                <FilterItem key={key} label={info.label} active={filterStatus === key} onClick={() => setFilterStatus(filterStatus === key ? '' : key)} />
              ))}
              <div className="px-4 py-2 border-t border-b border-slate-100 dark:border-white/5 mt-1"><p className="text-[11px] font-bold text-slate-400 uppercase">İşlem Tipi</p></div>
              <FilterItem label="Tüm İşlem Tipleri" active={!filterProcessType} onClick={() => setFilterProcessType('')} />
              {Object.entries(PROCESS_TYPE_MAP).map(([key, info]) => (
                <FilterItem key={key} label={info.label} active={filterProcessType === key} onClick={() => setFilterProcessType(filterProcessType === key ? '' : key)} />
              ))}
              <div className="px-4 py-2 border-t border-b border-slate-100 dark:border-white/5 mt-1"><p className="text-[11px] font-bold text-slate-400 uppercase">Kayıt Tipi</p></div>
              <FilterItem label="Tüm Kayıt Tipleri" active={!filterRecordType} onClick={() => setFilterRecordType('')} />
              {Object.entries(RECORD_TYPE_MAP).map(([key, info]) => (
                <FilterItem key={key} label={info.label} active={filterRecordType === key} onClick={() => setFilterRecordType(filterRecordType === key ? '' : key)} />
              ))}
              {(filterStatus || filterProcessType || filterRecordType) && (
                <div className="border-t border-slate-100 mt-1 px-3 py-2">
                  <button onClick={() => { setFilterStatus(''); setFilterProcessType(''); setFilterRecordType(''); }} className="w-full text-center text-[12px] font-bold text-rose-500">Filtreleri Temizle</button>
                </div>
              )}
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

            <button onClick={fetchOrders} className="p-2 text-slate-400 hover:text-metronic-primary transition-colors bg-slate-50 rounded-lg">
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            <button onClick={openCreateModal} className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm ml-1">
              <Plus size={16} /> Yeni İşlem Kaydı
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 bg-slate-50 dark:bg-white/[0.02]">
                <SortableHeader label="Hasta" column="patientName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Hekim" column="doctorName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="İşlem/No" column="procedureName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Laboratuvar" column="labName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-center">İşlem Tipi</th>
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-center" />
                <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium"><Loader2 className="animate-spin inline mr-2" size={18} /> Yükleniyor...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">Kayıt bulunamadı.</td></tr>
              ) : paginated.map(r => {
                const order = r.order;
                const statusInfo = LAB_STATUS_MAP[order.status] || LAB_STATUS_MAP['PENDING'];
                const StatusIcon = statusInfo.icon;
                const recordInfo = RECORD_TYPE_MAP[order.recordType] || RECORD_TYPE_MAP['GIDEN'];
                const processInfo = PROCESS_TYPE_MAP[order.processType] || PROCESS_TYPE_MAP['YENI'];
                const canDeliver = order.recordType === 'GIDEN';
                const canRevise = order.status === 'RECEIVED';

                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-800">{r.patientName}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{new Date(order.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[13px] font-semibold text-slate-600">{r.doctorName}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-700">{r.procedureName}</span>
                        <span className="text-[11px] text-slate-400 font-mono font-medium">{order.orderNumber || '-'}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{fmt(Number(order.cost))}</span>
                        {order.parentId && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-orange-600"><GitBranch size={11} /> Revizyon</span>
                        )}
                        {!!order.revisions?.length && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-500">{order.revisions.length} revizyon kaydı</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[13px] font-semibold text-slate-600">{r.labName}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black ${recordInfo.cls}`}>{recordInfo.label}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black ${processInfo.cls}`}>{processInfo.label}</span>
                        {order.dueDate && (
                          <span className={`text-[10px] font-bold ${new Date(order.dueDate) < new Date() && order.status !== 'RECEIVED' ? 'text-red-500' : 'text-slate-400'}`}>
                            {new Date(order.dueDate).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${statusInfo.cls}`}>
                        <StatusIcon size={12} /> {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canDeliver && (
                          <button
                            onClick={() => openDeliverModal(order)}
                            title="İşlemi Teslim Al"
                            className="p-2 text-slate-400 hover:text-metronic-success hover:bg-metronic-success-light rounded-lg transition-all"
                          >
                            <ArrowDownCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => canRevise && openRevisionModal(order)}
                          disabled={!canRevise}
                          title={canRevise ? 'Revizyon Ekle' : 'Revizyon eklemek için işlemin teslim alınmış (Geldi) olması gerekir'}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                        >
                          <GitBranch size={16} />
                        </button>
                        <button
                          onClick={() => { setSelectedOrder(order); setNewStatus(order.status); setStatusModalOpen(true); }}
                          title="Durum Güncelle"
                          className="p-2 text-slate-400 hover:text-metronic-primary hover:bg-slate-100 rounded-lg transition-all"
                        >
                          <Settings size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-xl">
          <div className="flex items-center gap-3">
            <select value={pageLimit} onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }} className="h-7 px-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[12px] font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-metronic-primary cursor-pointer w-20">
              {PAGE_LIMIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
            <div className="w-px h-4 bg-slate-200 dark:bg-white/10"></div>
            <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">
              <span className="font-bold text-slate-700 dark:text-slate-200">{sortedData.length === 0 ? 0 : Math.min((currentPage - 1) * pageLimit + 1, sortedData.length)}–{Math.min(currentPage * pageLimit, sortedData.length)}</span>{' / '}<span className="font-bold text-slate-700 dark:text-slate-200">{sortedData.length}</span> kayıt
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${page === currentPage ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>{page}</button>
              );
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="İşlem Durumu Güncelle" size="sm">
        <div className="space-y-4 py-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Seçili İşlem</p>
            <p className="text-[13px] font-bold text-slate-700 mt-1">
              {selectedOrder?.patient?.firstName || selectedOrder?.treatmentItem?.plan?.patient?.firstName} - {selectedOrder?.procedure?.name || selectedOrder?.treatmentItem?.tariff?.masterTreatment?.name}
            </p>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Yeni Durum Seçin</label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {Object.entries(LAB_STATUS_MAP).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setNewStatus(key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${newStatus === key ? 'border-metronic-primary bg-metronic-primary/5 ring-2 ring-metronic-primary/10' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${info.cls}`}>
                    <info.icon size={16} />
                  </div>
                  <span className={`text-[13px] font-bold ${newStatus === key ? 'text-metronic-primary' : 'text-slate-600'}`}>{info.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleUpdateStatus}
            className="w-full py-3 bg-metronic-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all mt-4"
          >
            Güncelle ve Kaydet
          </button>
        </div>
      </Modal>

      {/* Yeni İşlem / Teslim / Revizyon Formu — paylaşılan modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={modalInfo.title}
        subtitle={modalInfo.subtitle}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button form="new-lab-order-form" type="submit" disabled={createLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70"><Save size={15} />{createLoading ? 'Kaydediliyor...' : modalInfo.submitLabel}</button>
          </>
        }
      >
        <form id="new-lab-order-form" onSubmit={handleCreateSubmit} className="space-y-5">
          {modalMode === 'revision' && (
            <div className="flex items-start gap-2.5 p-3 bg-orange-50 border border-orange-100 rounded-xl">
              <Info size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-orange-700 leading-relaxed">
                Bu kayıt, <strong>{targetPatientName}</strong> hastasının <strong>{targetProcedureName}</strong> işlemine bağlı yeni bir revizyonu olarak oluşturulacak. Revizyon ücretsizdir.
              </p>
            </div>
          )}
          {modalMode === 'deliver' && (
            <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <Info size={16} className="text-metronic-success flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-emerald-700 leading-relaxed">
                <strong>{targetPatientName}</strong> hastasının <strong>{targetProcedureName}</strong> işlemi teslim alınacak. Lütfen teslim alan klinik personelini seçin.
              </p>
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Klinik Bilgileri</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Hasta <span className="text-metronic-danger">*</span></label>
                <select required value={createForm.patientId} onChange={e => setCreateForm({ ...createForm, patientId: e.target.value })} className="m-input">
                  <option value="">Hasta Seçiniz...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Diş Hekimi</label>
                <select value={createForm.doctorId} onChange={e => setCreateForm({ ...createForm, doctorId: e.target.value })} className="m-input">
                  <option value="">Hekim Seçiniz...</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>Dt. {d.firstName} {d.lastName}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Klinik Personeli</label>
                <select value={createForm.clinicStaffId} onChange={e => setCreateForm({ ...createForm, clinicStaffId: e.target.value })} className="m-input">
                  <option value="">Personel Seçiniz...</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">İşlem Bilgileri</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Laboratuvar <span className="text-metronic-danger">*</span></label>
                <select required value={createForm.labId} onChange={e => setCreateForm({ ...createForm, labId: e.target.value })} className="m-input">
                  <option value="">Laboratuvar Seçiniz...</option>
                  {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Yapılacak İşlem</label>
                <select value={createForm.procedureId} onChange={e => {
                  const proc = procedures.find(p => p.id === e.target.value);
                  setCreateForm({ ...createForm, procedureId: e.target.value, cost: proc ? Number(proc.defaultCost) : createForm.cost });
                }} className="m-input">
                  <option value="">İşlem Seçiniz...</option>
                  {procedures.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Süreç Bilgileri</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {modalMode === 'create' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Kayıt Tipi</label>
                  <select value={createForm.recordType} onChange={e => setCreateForm({ ...createForm, recordType: e.target.value as LabRecordType })} className="m-input">
                    <option value="GIDEN">Giden</option>
                    <option value="GELEN">Gelen</option>
                  </select>
                </div>
              )}
              {modalMode === 'create' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">İşlem Tipi</label>
                  <select value={createForm.processType} onChange={e => setCreateForm({ ...createForm, processType: e.target.value as LabProcessType })} className="m-input">
                    <option value="YENI">Yeni</option>
                    <option value="PROVA">Prova</option>
                    <option value="REVIZYON">Revizyon</option>
                  </select>
                  {createForm.processType !== 'YENI' && (
                    <p className="text-[10px] text-slate-400 mt-0.5">Prova ve Revizyon ücretsizdir.</p>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Teslim Tarihi</label>
                <input type="datetime-local" value={createForm.dueDate} onChange={e => setCreateForm({ ...createForm, dueDate: e.target.value })} className="m-input" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Operasyon Tarafları</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Laboratuvar Personeli</label>
                <input type="text" placeholder="Ad Soyad" value={createForm.labStaffName} onChange={e => setCreateForm({ ...createForm, labStaffName: e.target.value })} className="m-input" />
              </div>
              {modalMode !== 'revision' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Maliyet (₺)</label>
                  <input
                    type="number"
                    disabled={createForm.processType !== 'YENI'}
                    value={createForm.processType === 'YENI' ? (createForm.cost ?? 0) : 0}
                    onChange={e => setCreateForm({ ...createForm, cost: parseFloat(e.target.value) || 0 })}
                    className="m-input disabled:opacity-50"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Açıklama</label>
            <textarea placeholder="Serbest metin" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} className="m-input min-h-[70px]" />
          </div>
        </form>
      </Modal>

    </MetronicLayout>
  );
}
