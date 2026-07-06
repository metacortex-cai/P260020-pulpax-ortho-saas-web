'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, Trash2, Copy, ArrowRightLeft, Calendar, RotateCcw, Percent, Tag, CheckSquare, ChevronDown, ChevronRight, Search, Loader2, Download, FileText, FileSpreadsheet, AlertTriangle, FileSignature, Save } from 'lucide-react';
import Modal from '../../../../components/ui/Modal';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import Dropdown from '../../../../components/ui/Dropdown';
import DentalChart, { AREA_CODES, toothName } from '../../../../components/patients/DentalChart';
import { useToastStore } from '../../../../store/toastStore';
import { TreatmentService, Tariff } from '../../../../lib/services/treatment.service';
import { Employee, EmployeeService } from '../../../../lib/services/employee.service';
import { exportTreatmentPlanPDF, exportTreatmentPlanXLS } from '../../../../lib/utils/exportTreatmentPlan';
import { formatCurrency } from '../../../../lib/utils/formatCurrency';

// SUT kodu 3-digit prefix → DentalChart PROCS kategorisi
const SUT_CATEGORIES: Record<string, string> = {
  '401': 'Teşhis ve Planlama',
  '402': 'Tedavi & Endodonti',
  '403': 'Pedodonti',
  '404': 'Protez',
  '405': 'Cerrahi',
  '406': 'Periodontoloji',
  '407': 'Ortodonti',
  '601': 'Cerrahi',
  '602': 'Cerrahi',
  '611': 'Cerrahi',
};

function getSutCategory(sutCode: string): string {
  const prefix = String(sutCode ?? '').slice(0, 3);
  return SUT_CATEGORIES[prefix] ?? 'Diğer';
}

// Axios hatasından backend'in class-validator mesajını çıkarır (mesaj dizi de olabilir).
function getApiErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data?.message;
  if (Array.isArray(data)) return data.join(' ');
  if (typeof data === 'string') return data;
  return err?.message || fallback;
}

interface PlanItem {
  id: number | string;
  tariffId?: string;
  tooth: string;
  areas: string;
  category: string;
  name: string;
  price: number;
  originalPrice: number;
  doctor: string;
  paidAmount?: number;
}
interface Plan {
  id: string;
  name: string;
  createdAt: string;
  status: 'DRAFT' | 'ACTIVE';
  isSaved: boolean;
  items: PlanItem[];
  installments?: { id: string; label: string; dueDate: string; amount: number; order: number }[];
  description?: string | null;
}


function DropdownItem({ icon, label, danger = false, onClick }: { icon?: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left
        ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 hover:bg-slate-50 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

export default function TreatmentPlansTab({ patient }: { patient: any }) {
  const { addToast } = useToastStore();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string>('');
  const [checkedRows, setCheckedRows] = useState<Set<number | string>>(new Set());

  // Diş şeması
  const [multipleMode, setMultipleMode] = useState(false);
  const [multiSelectedTeeth, setMultiSelectedTeeth] = useState<Record<number, string>>({});
  const [chartOpen, setChartOpen] = useState(true);
  const [dentitionMode, setDentitionMode] = useState<'adult' | 'child'>('adult');

  // Tedavi ekleme modali
  const [treatModalOpen, setTreatModalOpen] = useState(false);
  const [pendingToothNum, setPendingToothNum] = useState<number | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalFilterCategory, setModalFilterCategory] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');

  // Oto-kayıt
  const [isSaving, setIsSaving] = useState(false);

  // Diğer modaller & onay
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [deleteItemsConfirmOpen, setDeleteItemsConfirmOpen] = useState(false);
  const [deletingItems, setDeletingItems] = useState(false);

  // Sözleşme (Ödeme Planı) Modalı
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractMode, setContractMode] = useState<'create' | 'edit'>('create');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [installmentRows, setInstallmentRows] = useState<{ label: string; dueDate: string; amount: string }[]>([]);
  const [contractDescription, setContractDescription] = useState('');
  const [activating, setActivating] = useState(false);
  const [discountItems, setDiscountItems] = useState<PlanItem[]>([]);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number | ''>('');
  const [globalDiscountTotal, setGlobalDiscountTotal] = useState<number | ''>('');

  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [doctors, setDoctors] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (keepActivePlanId?: string) => {
    try {
      setLoading(true);
      const [fetchedPlans, fetchedTariffs, fetchedEmployees] = await Promise.all([
        TreatmentService.findPlansByPatient(patient.id),
        TreatmentService.getTariffs(),
        EmployeeService.findAll(),
      ]);
      setTariffs(fetchedTariffs);
      const activeDocs = fetchedEmployees.filter(e => e.isDoctor && e.isActive);
      setDoctors(activeDocs);
      const assignedDoc = activeDocs.find(d => d.id === patient.assignedDoctor);
      if (assignedDoc) setSelectedDoctor(assignedDoc.id);
      else if (activeDocs.length > 0) setSelectedDoctor(activeDocs[0].id);

      if (fetchedPlans.length > 0) {
        const converted = fetchedPlans.map((plan, idx) => ({
          id: plan.id,
          name: `Plan ${idx + 1}`,
          createdAt: new Date(plan.createdAt).toLocaleDateString('tr-TR'),
          status: (plan.status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT') as 'DRAFT' | 'ACTIVE',
          isSaved: plan.status === 'ACTIVE',
          // Backend Decimal alanları JSON üzerinden string olarak gelir; number'a çevrilir.
          installments: plan.installments?.map(i => ({ ...i, amount: Number(i.amount) || 0 })),
          description: plan.description,
          items: plan.items.map(item => ({
            id: item.id,
            tooth: item.toothNo ? String(item.toothNo) : '',
            areas: '',
            category: (item.tariff?.masterTreatment as any)?.category || getSutCategory(item.tariff?.masterTreatment?.sutCode || ''),
            name: item.tariff?.masterTreatment?.name || '',
            price: Number(item.price),
            originalPrice: Number(item.tariff?.price || item.price),
            doctor: item.doctorId,
            paidAmount: item.paymentDistributions?.reduce((s, d) => s + Number(d.amount), 0) || 0,
          }))
        }));
        setPlans(converted);
        const stillExists = keepActivePlanId && converted.some(p => p.id === keepActivePlanId);
        setActivePlanId(stillExists ? keepActivePlanId! : converted[0].id);
      } else {
        const fallbackId = `local-1`;
        setPlans([{ id: fallbackId, name: 'Plan 1', createdAt: new Date().toLocaleDateString('tr-TR'), status: 'DRAFT', isSaved: false, items: [] }]);
        setActivePlanId(fallbackId);
      }
    } catch (err) {
      console.error('Failed to load treatment plans:', err);
      addToast({ type: 'error', title: 'Hata', message: 'Veriler yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!patient?.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern (loadData performs async network calls before setting state)
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData is recreated every render; including it would re-trigger the fetch on every render and cause an infinite loop
  }, [patient?.id]);

  const getDoctorName = (doctorId: string) => {
    const doc = doctors.find(d => d.id === doctorId);
    return doc ? `Dt. ${doc.firstName} ${doc.lastName}` : 'Belirtilmemiş';
  };

  const activePlan = plans.find(p => p.id === activePlanId) ?? plans[0];
  const activePlanTotal = activePlan?.items.reduce((s, i) => s + i.price, 0) ?? 0;

  // ── Oto-kayıt: yeni kalemleri anında DB'ye yaz ────────────────
  // Aynı anda (henüz DB'de olmayan) bir plana birden fazla ekleme yapılırsa
  // her ekleme ayrı bir plan oluşturmaya kalkışmasın diye ilk oluşturma isteğini
  // kilitleyip sonraki eklemelerin aynı plana yazılmasını sağlıyoruz.
  const planCreationLocks = useRef<Record<string, Promise<string>>>({});

  // Monotonic counter for client-side-only temp item ids (avoids calling the
  // impure Date.now() from the single-tooth add-from-modal flow)
  const tempItemIdCounter = useRef(0);

  const autoSaveNewItems = async (newItems: PlanItem[], currentPlan: Plan) => {
    if (newItems.length === 0) return;
    setIsSaving(true);
    try {
      const toPayload = (items: PlanItem[]) => items.map(item => {
        const tariffId = item.tariffId || tariffs.find(t => t.masterTreatment.name === item.name)?.id;
        if (!tariffId) throw new Error(`Tarife bulunamadı: ${item.name}`);
        return { tariffId, doctorId: item.doctor, price: item.price, toothNo: item.tooth ? parseInt(item.tooth) : undefined };
      });

      if (currentPlan.id.startsWith('local-')) {
        let creation = planCreationLocks.current[currentPlan.id];
        if (!creation) {
          // Plan henüz DB'de yok → tüm kalemlerle birlikte oluştur
          creation = TreatmentService.createPlan({
            patientId: patient.id,
            items: toPayload([...currentPlan.items, ...newItems]),
          }).then(p => p.id);
          planCreationLocks.current[currentPlan.id] = creation;
          const createdId = await creation;
          await loadData(createdId);
        } else {
          // Plan zaten oluşturuluyor → oluşmasını bekle, yeni kalemleri ona ekle
          const createdId = await creation;
          await TreatmentService.addItemsToPlan(createdId, toPayload(newItems));
          await loadData(createdId);
        }
      } else {
        await TreatmentService.addItemsToPlan(currentPlan.id, toPayload(newItems));
        await loadData(currentPlan.id);
      }
    } catch (err: any) {
      // Kayıt başarısız oldu: ekranda "eklendi" gibi görünen ama DB'ye hiç yazılmamış
      // kalemleri geri al. Aksi halde başka sayfaya geçilip geri dönüldüğünde
      // (veriler DB'den yeniden yüklendiğinde) bu kalemler sessizce kayboluyordu.
      delete planCreationLocks.current[currentPlan.id];
      setPlans(prev => prev.map(p => p.id === currentPlan.id
        ? { ...p, items: p.items.filter(i => !newItems.some(ni => ni.id === i.id)) }
        : p));
      addToast({ type: 'error', title: 'Kayıt Hatası', message: getApiErrorMessage(err, 'Otomatik kayıt başarısız.') + ' Eklenen tedavi geri alındı, lütfen tekrar deneyin.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Modalden tedavi ekle (tek diş) ────────────────────────────
  const addFromModal = (tariff: Tariff) => {
    if (activePlan?.status === 'ACTIVE') {
      addToast({ type: 'warning', title: 'Uyarı', message: 'Sözleşmesi oluşturulmuş aktif planlar kilittir.' });
      return;
    }
    const toothNum = pendingToothNum;
    if (!toothNum) return;

    const doctorId = selectedDoctor || doctors[0]?.id || '';
    if (!doctorId) {
      addToast({ type: 'error', title: 'Hekim Bulunamadı', message: 'Aktif bir hekim tanımlı değil. Lütfen önce Personel bölümünden aktif bir doktor ekleyin.' });
      return;
    }

    const isDuplicate = activePlan?.items.some(i => i.tooth === String(toothNum) && i.name === tariff.masterTreatment.name);
    if (isDuplicate && !window.confirm(`Diş ${toothNum} için bu tedavi zaten mevcut. Yine de eklemek ister misiniz?`)) return;

    const newItem: PlanItem = {
      id: `temp-${++tempItemIdCounter.current}`,
      tariffId: tariff.id,
      tooth: String(toothNum),
      areas: '',
      category: tariff.masterTreatment.sutCode || '',
      name: tariff.masterTreatment.name,
      price: Number(tariff.price),
      originalPrice: Number(tariff.price),
      doctor: doctorId,
    };
    const currentPlan = activePlan;
    setPlans(prev => prev.map(p => p.id === activePlanId ? { ...p, items: [...p.items, newItem] } : p));
    setTreatModalOpen(false);
    setModalSearch('');
    setModalFilterCategory('');
    addToast({ type: 'success', title: `Diş ${toothNum} — ${toothName(toothNum)}`, message: `${tariff.masterTreatment.name} eklendi.` });
    autoSaveNewItems([newItem], currentPlan);
  };

  // ── Çoklu mod: seçili dişlere tedavi ekle ──────────────────────
  const addTreatmentToMultiple = (tariff: Tariff) => {
    if (activePlan?.status === 'ACTIVE') {
      addToast({ type: 'warning', title: 'Uyarı', message: 'Sözleşmesi oluşturulmuş aktif planlar kilittir.' });
      return;
    }
    const nums = Object.keys(multiSelectedTeeth).map(Number);
    if (nums.length === 0) {
      addToast({ type: 'warning', title: 'Diş Seçilmedi', message: 'Çoklu modda şemadan diş seçin.' });
      return;
    }
    const doctorId = selectedDoctor || doctors[0]?.id || '';
    if (!doctorId) {
      addToast({ type: 'error', title: 'Hekim Bulunamadı', message: 'Aktif bir hekim tanımlı değil. Lütfen önce Personel bölümünden aktif bir doktor ekleyin.' });
      return;
    }
    const newItems: PlanItem[] = nums.map((n, i) => ({
      id: `temp-${Date.now() + i}`,
      tariffId: tariff.id,
      tooth: String(n),
      areas: '',
      category: tariff.masterTreatment.sutCode || '',
      name: tariff.masterTreatment.name,
      price: Number(tariff.price),
      originalPrice: Number(tariff.price),
      doctor: doctorId,
    }));
    const currentPlan = activePlan;
    setPlans(prev => prev.map(p => p.id === activePlanId ? { ...p, items: [...p.items, ...newItems] } : p));
    setMultiSelectedTeeth({});
    setTreatModalOpen(false);
    setModalSearch('');
    setModalFilterCategory('');
    addToast({ type: 'success', title: 'Tedavi Eklendi', message: `${tariff.masterTreatment.name} — ${nums.length} dişe eklendi.` });
    autoSaveNewItems(newItems, currentPlan);
  };

  // ── Diş şemasına tıklama ───────────────────────────────────────
  const handleToothClick = (toothNum: number, _imgSrc: string, _sel: string) => {
    if (activePlan?.status === 'ACTIVE') {
      addToast({ type: 'warning', title: 'Uyarı', message: 'Sözleşmesi oluşturulmuş aktif planlar kilittir.' });
      return;
    }
    if (multipleMode) {
      setMultiSelectedTeeth(prev => {
        const next = { ...prev };
        if (next[toothNum]) delete next[toothNum];
        else next[toothNum] = _imgSrc;
        return next;
      });
    } else {
      setPendingToothNum(toothNum);
      setModalSearch('');
      setModalFilterCategory('');
      setTreatModalOpen(true);
    }
  };

  const openMultiModal = () => {
    const nums = Object.keys(multiSelectedTeeth).map(Number);
    if (nums.length === 0) {
      addToast({ type: 'warning', title: 'Diş Seçilmedi', message: 'Önce diş şemasından diş seçin.' });
      return;
    }
    setModalSearch('');
    setModalFilterCategory('');
    setTreatModalOpen(true);
    setPendingToothNum(null);
  };

  const toggleMultiple = () => {
    setMultipleMode(m => !m);
    setMultiSelectedTeeth({});
  };

  // ── Plan yönetimi ───────────────────────────────────────────────
  const addPlan = () => {
    const existingNums = plans.map(p => parseInt(p.name.replace('Plan ', ''))).filter(n => !isNaN(n));
    const n = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    const newPlan: Plan = { id: `local-${Date.now()}`, name: `Plan ${n}`, createdAt: new Date().toLocaleDateString('tr-TR'), status: 'DRAFT', isSaved: false, items: [] };
    setPlans(p => [...p, newPlan]);
    setActivePlanId(newPlan.id);
    setCheckedRows(new Set());
    addToast({ type: 'success', title: 'Plan Oluşturuldu', message: `${newPlan.name} başarıyla açıldı.` });
  };

  const deletePlan = async (idToDelete: string) => {
    // Henüz kaydedilmemiş (yalnızca yerel) bir plan ise API çağrısına gerek yok.
    if (idToDelete.startsWith('local-') || idToDelete.startsWith('plan-')) {
      setPlans(prev => {
        const next = prev.filter(p => p.id !== idToDelete);
        if (idToDelete === activePlanId) setActivePlanId(next.length > 0 ? next[next.length - 1].id : '');
        return next;
      });
      setCheckedRows(new Set());
      setDeleteConfirmOpen(false);
      addToast({ type: 'info', title: 'Plan Silindi', message: 'Tedavi planı kaldırıldı.' });
      return;
    }
    setDeletingPlan(true);
    try {
      await TreatmentService.deletePlan(idToDelete);
      setCheckedRows(new Set());
      setDeleteConfirmOpen(false);
      addToast({ type: 'success', title: 'Plan Silindi', message: 'Tedavi planı silindi.' });
      await loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Hata', message: getApiErrorMessage(err, 'Tedavi planı silinemedi.') });
    } finally {
      setDeletingPlan(false);
    }
  };

  const allIds = activePlan?.items.map(i => i.id) ?? [];
  const allChecked = allIds.length > 0 && allIds.every(id => checkedRows.has(id));
  const someChecked = allIds.some(id => checkedRows.has(id)) && !allChecked;
  const toggleAll = () => { if (allChecked) setCheckedRows(new Set()); else setCheckedRows(new Set(allIds)); };
  const toggleRow = (id: number | string) => {
    setCheckedRows(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const deleteChecked = () => {
    setDeleteItemsConfirmOpen(true);
  };

  const performDeleteChecked = async () => {
    if (!activePlan) return;
    const persistedIds = Array.from(checkedRows).filter(id => !String(id).startsWith('temp-')) as string[];
    const localOnlyIds = new Set(Array.from(checkedRows).filter(id => String(id).startsWith('temp-')));

    if (persistedIds.length === 0) {
      // Sadece henüz kaydedilmemiş (temp-) kalemler seçili — yerelden çıkar.
      setPlans(prev => prev.map(p => p.id === activePlanId ? { ...p, items: p.items.filter(i => !localOnlyIds.has(i.id)) } : p));
      addToast({ type: 'warning', title: 'İşlemler Kaldırıldı', message: `${localOnlyIds.size} kalem plandan çıkarıldı.` });
      setCheckedRows(new Set());
      setDeleteItemsConfirmOpen(false);
      return;
    }

    setDeletingItems(true);
    try {
      if (localOnlyIds.size > 0) {
        setPlans(prev => prev.map(p => p.id === activePlanId ? { ...p, items: p.items.filter(i => !localOnlyIds.has(i.id)) } : p));
      }
      const reallocate = activePlan.status === 'ACTIVE';
      const result = await TreatmentService.deleteItems(persistedIds, reallocate);
      let message = `${checkedRows.size} kalem silindi.`;
      if (reallocate && (result.reallocatedToDebt > 0 || result.reallocatedToAdvance > 0)) {
        const parts: string[] = [];
        if (result.reallocatedToDebt > 0) parts.push(`₺${formatCurrency(result.reallocatedToDebt)} diğer borçlara`);
        if (result.reallocatedToAdvance > 0) parts.push(`₺${formatCurrency(result.reallocatedToAdvance)} avans bakiyesine`);
        message += ` Dağıtılmış ödeme ${parts.join(' ve ')} aktarıldı.`;
      }
      addToast({ type: 'success', title: 'İşlemler Silindi', message });
      if (reallocate) {
        addToast({ type: 'info', title: 'Sözleşme Tutarı Değişti', message: 'Ödeme planını gözden geçirmek için Sözleşme > Düzenle\'yi kullanabilirsiniz.' });
      }
      setCheckedRows(new Set());
      setDeleteItemsConfirmOpen(false);
      await loadData(activePlan.id);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Hata', message: getApiErrorMessage(err, 'Tedavi kalemleri silinemedi.') });
    } finally {
      setDeletingItems(false);
    }
  };

  const updateItem = (itemId: number | string, field: keyof PlanItem, value: any) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== activePlanId) return p;
      return { ...p, items: p.items.map(i => i.id === itemId ? { ...i, [field]: value } : i) };
    }));
  };

  const openDiscountModal = () => {
    const items = activePlan.items.filter(i => checkedRows.has(i.id));
    setDiscountItems(items.map(i => ({ ...i })));
    setGlobalDiscountPercent('');
    setGlobalDiscountTotal('');
    setDiscountModalOpen(true);
  };

  const applyPercentDiscount = (percent: number) => {
    setGlobalDiscountPercent(percent);
    setGlobalDiscountTotal('');
    if (percent < 0) return;
    setDiscountItems(prev => prev.map(item => ({ ...item, price: Math.max(0, Math.round(item.originalPrice * (1 - percent / 100))) })));
  };

  const applyTotalDiscount = (newTotal: number) => {
    setGlobalDiscountTotal(newTotal);
    setGlobalDiscountPercent('');
    if (newTotal < 0) return;
    const origTotal = discountItems.reduce((s, i) => s + i.originalPrice, 0);
    if (origTotal === 0) return;
    const ratio = newTotal / origTotal;
    setDiscountItems(prev => prev.map(item => ({ ...item, price: Math.max(0, Math.round(item.originalPrice * ratio)) })));
  };

  const updateDiscountItemPrice = (id: number | string, val: number) => {
    setGlobalDiscountPercent('');
    setGlobalDiscountTotal('');
    setDiscountItems(prev => prev.map(item => item.id === id ? { ...item, price: Math.max(0, val) } : item));
  };

  const saveDiscount = () => {
    setPlans(prev => prev.map(p => {
      if (p.id !== activePlanId) return p;
      return { ...p, items: p.items.map(i => { const matched = discountItems.find(d => d.id === i.id); return matched ? { ...i, price: matched.price } : i; }) };
    }));
    setDiscountModalOpen(false);
    setCheckedRows(new Set());
    addToast({ type: 'success', title: 'Fiyatlar Güncellendi', message: 'Toplu fiyat/indirim işlemi uygulandı.' });
  };

  const copyChecked = (destPlanId: string) => {
    let newPlans = [...plans];
    if (destPlanId === 'NEW_PLAN') {
      const existingNums = plans.map(p => parseInt(p.name.replace('Plan ', ''))).filter(n => !isNaN(n));
      const n = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      destPlanId = `plan-${Date.now()}`;
      newPlans.push({ id: destPlanId, name: `Plan ${n}`, createdAt: new Date().toLocaleDateString('tr-TR'), status: 'DRAFT', isSaved: false, items: [] });
    }
    const itemsToCopy = activePlan.items.filter(i => checkedRows.has(i.id)).map((i, idx) => ({ ...i, id: Date.now() + idx }));
    setPlans(newPlans.map(p => p.id === destPlanId ? { ...p, items: [...p.items, ...itemsToCopy] } : p));
    addToast({ type: 'success', title: 'Kopyalandı', message: `${itemsToCopy.length} kalem hedef plana kopyalandı.` });
    setCheckedRows(new Set());
  };

  const moveChecked = (destPlanId: string) => {
    let newPlans = [...plans];
    if (destPlanId === 'NEW_PLAN') {
      const existingNums = plans.map(p => parseInt(p.name.replace('Plan ', ''))).filter(n => !isNaN(n));
      const n = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      destPlanId = `plan-${Date.now()}`;
      newPlans.push({ id: destPlanId, name: `Plan ${n}`, createdAt: new Date().toLocaleDateString('tr-TR'), status: 'DRAFT', isSaved: false, items: [] });
    }
    const itemsToMove = activePlan.items.filter(i => checkedRows.has(i.id));
    setPlans(newPlans.map(p => {
      if (p.id === activePlanId) return { ...p, items: p.items.filter(i => !checkedRows.has(i.id)) };
      if (p.id === destPlanId) return { ...p, items: [...p.items, ...itemsToMove] };
      return p;
    }));
    addToast({ type: 'success', title: 'Taşındı', message: `${itemsToMove.length} kalem hedef plana taşındı.` });
    setCheckedRows(new Set());
  };

  const handleSavePlanToDatabase = async () => {
    if (!activePlan || activePlan.status === 'ACTIVE') return;
    if (activePlan.items.length === 0) { addToast({ type: 'warning', title: 'Hata', message: 'Boş plan kaydedilemez.' }); return; }
    try {
      if (activePlan.id.startsWith('local-')) {
        const payloadItems = activePlan.items.map(item => {
          if (item.tariffId) return { tariffId: item.tariffId, doctorId: item.doctor, price: item.price, toothNo: item.tooth ? parseInt(item.tooth) : undefined };
          const tariff = tariffs.find(t => t.masterTreatment.name === item.name);
          if (!tariff) throw new Error(`Tarife bulunamadı: ${item.name}`);
          return { tariffId: tariff.id, doctorId: item.doctor, price: item.price, toothNo: item.tooth ? parseInt(item.tooth) : undefined };
        });
        const created = await TreatmentService.createPlan({ patientId: patient.id, items: payloadItems });
        addToast({ type: 'success', title: 'Başarılı', message: 'Tedavi planı kaydedildi.' });
        await loadData(created.id);
        return;
      } else {
        const newItems = activePlan.items.filter(i => String(i.id).startsWith('temp-'));
        if (newItems.length === 0) { addToast({ type: 'info', title: 'Bilgi', message: 'Eklenecek yeni kalem bulunmuyor.' }); return; }
        const payloadItems = newItems.map(item => {
          if (item.tariffId) return { tariffId: item.tariffId, doctorId: item.doctor, price: item.price, toothNo: item.tooth ? parseInt(item.tooth) : undefined };
          const tariff = tariffs.find(t => t.masterTreatment.name === item.name);
          if (!tariff) throw new Error(`Tarife bulunamadı: ${item.name}`);
          return { tariffId: tariff.id, doctorId: item.doctor, price: item.price, toothNo: item.tooth ? parseInt(item.tooth) : undefined };
        });
        await TreatmentService.addItemsToPlan(activePlan.id, payloadItems);
      }
      addToast({ type: 'success', title: 'Başarılı', message: 'Tedavi planı kaydedildi.' });
      await loadData(activePlan.id);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Hata', message: getApiErrorMessage(err, 'Tedavi planı kaydedilemedi.') });
    }
  };

  const buildInstallmentRows = (count: number, total: number) => {
    const n = Math.max(1, count);
    const base = Math.floor((total / n) * 100) / 100;
    const rows: { label: string; dueDate: string; amount: string }[] = [];
    let allocated = 0;
    for (let i = 0; i < n; i++) {
      const due = new Date();
      due.setMonth(due.getMonth() + i);
      const amount = i === n - 1 ? Math.round((total - allocated) * 100) / 100 : base;
      allocated += amount;
      rows.push({
        label: i === 0 ? 'Peşinat' : `${i}. Taksit`,
        dueDate: due.toISOString().split('T')[0],
        amount: amount.toFixed(2),
      });
    }
    return rows;
  };

  const handleActivatePlan = () => {
    if (!activePlan || activePlan.id.startsWith('local-')) { addToast({ type: 'warning', title: 'Uyarı', message: 'Önce planı kaydedin.' }); return; }
    if (activePlan.status === 'ACTIVE') { addToast({ type: 'warning', title: 'Uyarı', message: 'Bu plan zaten aktif.' }); return; }
    if (activePlan.items.length === 0) { addToast({ type: 'warning', title: 'Hata', message: 'Boş plan aktifleştirilemez.' }); return; }
    const total = activePlan.items.reduce((s, i) => s + i.price, 0);
    setContractMode('create');
    setContractDescription('');
    setInstallmentCount(1);
    setInstallmentRows(buildInstallmentRows(1, total));
    setContractModalOpen(true);
  };

  const handleOpenContractView = () => {
    if (!activePlan || activePlan.id.startsWith('local-')) return;
    if (activePlan.status !== 'ACTIVE') { addToast({ type: 'warning', title: 'Uyarı', message: 'Bu plan aktif değil.' }); return; }
    const existing = activePlan.installments && activePlan.installments.length > 0
      ? activePlan.installments.map(i => ({ label: i.label, dueDate: i.dueDate.split('T')[0], amount: i.amount.toFixed(2) }))
      : buildInstallmentRows(1, activePlan.items.reduce((s, i) => s + i.price, 0));
    setContractMode('edit');
    setContractDescription(activePlan.description || '');
    setInstallmentCount(existing.length);
    setInstallmentRows(existing);
    setContractModalOpen(true);
  };

  const handleInstallmentCountChange = (count: number) => {
    const total = activePlan?.items.reduce((s, i) => s + i.price, 0) || 0;
    setInstallmentCount(count);
    setInstallmentRows(buildInstallmentRows(count, total));
  };

  const updateInstallmentRow = (idx: number, field: 'dueDate' | 'amount', value: string) => {
    setInstallmentRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const installmentsTotal = installmentRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const performActivatePlan = async () => {
    if (!activePlan) return;
    const contractTotal = activePlan.items.reduce((s, i) => s + i.price, 0);
    if (Math.abs(installmentsTotal - contractTotal) > 0.01) {
      addToast({ type: 'error', title: 'Hata', message: 'Ödeme planına dağıtılan toplam tutar, sözleşme tutarına eşit olmalıdır.' });
      return;
    }
    setActivating(true);
    try {
      await TreatmentService.activatePlan(
        activePlan.id,
        installmentRows.map(r => ({ label: r.label, dueDate: r.dueDate, amount: parseFloat(r.amount) || 0 })),
        contractDescription || undefined,
      );
      addToast({ type: 'success', title: 'Sözleşme Oluşturuldu', message: 'Tedavi planı aktifleştirildi.' });
      setContractModalOpen(false);
      await loadData(activePlan.id);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Hata', message: getApiErrorMessage(err, 'Plan aktifleştirilemedi.') });
    } finally {
      setActivating(false);
    }
  };

  const performUpdateContract = async () => {
    if (!activePlan) return;
    const contractTotal = activePlan.items.reduce((s, i) => s + i.price, 0);
    if (Math.abs(installmentsTotal - contractTotal) > 0.01) {
      addToast({ type: 'error', title: 'Hata', message: 'Ödeme planına dağıtılan toplam tutar, sözleşme tutarına eşit olmalıdır.' });
      return;
    }
    setActivating(true);
    try {
      await TreatmentService.updateContract(
        activePlan.id,
        installmentRows.map(r => ({ label: r.label, dueDate: r.dueDate, amount: parseFloat(r.amount) || 0 })),
        contractDescription || undefined,
      );
      addToast({ type: 'success', title: 'Sözleşme Güncellendi', message: 'Ödeme planı güncellendi.' });
      setContractModalOpen(false);
      await loadData(activePlan.id);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Hata', message: getApiErrorMessage(err, 'Sözleşme güncellenemedi.') });
    } finally {
      setActivating(false);
    }
  };

  const handleCancelPlan = () => {
    if (!activePlan || activePlan.id.startsWith('local-')) return;
    if (activePlan.status !== 'ACTIVE') { addToast({ type: 'warning', title: 'Uyarı', message: 'Bu plan aktif değil.' }); return; }
    setContractModalOpen(false);
    setCancelConfirmOpen(true);
  };

  const performCancelPlan = async () => {
    setCancelConfirmOpen(false);
    try {
      await TreatmentService.cancelPlan(activePlan.id);
      addToast({ type: 'success', title: 'Sözleşme İptal Edildi', message: 'Sözleşme iptal edildi.' });
      await loadData(activePlan.id);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Hata', message: err.response?.data?.message || err.message || 'Sözleşme iptal edilemedi.' });
    }
  };

  const handleExportCSV = () => {
    if (!activePlan) return;
    const rows = [
      ['Diş No', 'Tedavi', 'Hekim', 'Liste Fiyatı', 'Uygulanan Fiyat'],
      ...activePlan.items.map(i => [i.tooth || '—', i.name, getDoctorName(i.doctor), i.originalPrice.toString(), i.price.toString()]),
      ['', '', 'TOPLAM', '', activePlanTotal.toString()],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${patient.firstName}_${patient.lastName}_${activePlan.name}.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'CSV İndirildi', message: `${activePlan.name} indirildi.` });
  };

  const handleExportPDF = async () => {
    if (!activePlan) return;
    try {
      await exportTreatmentPlanPDF({ planName: activePlan.name, planDate: activePlan.createdAt, status: activePlan.status, items: activePlan.items.map(i => ({ ...i, doctor: getDoctorName(i.doctor) })), total: activePlan.items.reduce((s, i) => s + i.originalPrice, 0), discountedTotal: activePlanTotal, patient: { firstName: patient.firstName, lastName: patient.lastName, id: patient.id, phone: patient.phone }, clinicName: 'Pulpax Diş Kliniği' });
      addToast({ type: 'success', title: 'PDF İndirildi', message: `${activePlan.name} PDF olarak kaydedildi.` });
    } catch (err) { addToast({ type: 'error', title: 'Hata', message: 'PDF oluşturulamadı.' }); }
  };

  const handleExportXLS = async () => {
    if (!activePlan) return;
    try {
      await exportTreatmentPlanXLS({ planName: activePlan.name, planDate: activePlan.createdAt, status: activePlan.status, items: activePlan.items.map(i => ({ ...i, doctor: getDoctorName(i.doctor) })), total: activePlan.items.reduce((s, i) => s + i.originalPrice, 0), discountedTotal: activePlanTotal, patient: { firstName: patient.firstName, lastName: patient.lastName, id: patient.id, phone: patient.phone }, clinicName: 'Pulpax Diş Kliniği' });
      addToast({ type: 'success', title: 'Excel İndirildi', message: `${activePlan.name} Excel olarak kaydedildi.` });
    } catch (err) { addToast({ type: 'error', title: 'Hata', message: 'Excel oluşturulamadı.' }); }
  };

  // Modal: filtreli tarife listesi
  const multiSelectedNums = Object.keys(multiSelectedTeeth).map(Number);
  const availableCategories = Array.from(new Set(tariffs.map(t => getSutCategory(t.masterTreatment.sutCode || '')))).sort();
  const modalFilteredTariffs = tariffs.filter(t => {
    const matchSearch = t.masterTreatment.name.toLowerCase().includes(modalSearch.toLowerCase()) || (t.masterTreatment.sutCode || '').toLowerCase().includes(modalSearch.toLowerCase());
    const matchCat = !modalFilterCategory || getSutCategory(t.masterTreatment.sutCode || '') === modalFilterCategory;
    return matchSearch && matchCat;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-400">
        <Loader2 className="animate-spin text-metronic-primary mr-2" size={24} />
        <span className="text-[13px] font-semibold">Tedavi planları yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ===== DİŞ ŞEMASI ===== */}
      {chartOpen ? (
        <div className="rounded-xl border border-slate-200/60 overflow-hidden bg-white shadow-sm">

          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-100 bg-white">
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              <div className="flex items-center h-8 bg-slate-100 rounded-lg p-1">
                <button onClick={() => { setDentitionMode('adult'); setMultiSelectedTeeth({}); }}
                  className={`px-3 h-6 rounded-md text-[12px] font-bold transition-all ${dentitionMode === 'adult' ? 'bg-white text-metronic-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Yetişkin
                </button>
                <button onClick={() => { setDentitionMode('child'); setMultiSelectedTeeth({}); }}
                  className={`px-3 h-6 rounded-md text-[12px] font-bold transition-all ${dentitionMode === 'child' ? 'bg-white text-metronic-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Çocuk
                </button>
              </div>
              <button onClick={toggleMultiple}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-bold transition-colors whitespace-nowrap ${multipleMode ? 'bg-metronic-primary text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {multipleMode ? <Check size={14} /> : <CheckSquare size={14} className="text-slate-400" />}
                Çoklu Seçim
                {multipleMode && multiSelectedNums.length > 0 && (
                  <span className="ml-1 bg-white/20 text-white text-[11px] font-bold px-1.5 rounded-full">{multiSelectedNums.length}</span>
                )}
              </button>
              {multipleMode && multiSelectedNums.length > 0 && (
                <button onClick={openMultiModal}
                  className="flex items-center gap-1.5 h-8 px-3 bg-metronic-primary text-white rounded-lg text-[12px] font-bold hover:bg-blue-600 transition-colors shadow-sm">
                  <Plus size={14} /> İşlem Ekle ({multiSelectedNums.length} diş)
                </button>
              )}
              {multipleMode && multiSelectedNums.length > 0 && (
                <button onClick={() => setMultiSelectedTeeth({})}
                  className="flex items-center gap-1.5 h-8 px-3 bg-white border border-metronic-danger/30 text-metronic-danger rounded-lg text-[12px] font-bold hover:bg-metronic-danger hover:text-white transition-colors">
                  <X size={13} /> Temizle
                </button>
              )}
            </div>
            <button onClick={() => setChartOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-metronic-primary transition-colors"
              title="Diş şemasını gizle">
              <X size={15} />
            </button>
          </div>

          {/* Diş Şeması — tam genişlik */}
          <div className="w-full overflow-auto flex items-center justify-center bg-white relative" style={{ minHeight: 380 }}>
            <DentalChart
              onToothClick={handleToothClick}
              selectedTeeth={multiSelectedTeeth}
              plans={plans.filter(p => p.id === activePlanId)}
              dentitionMode={dentitionMode}
            />
          </div>
        </div>
      ) : (
        <button onClick={() => setChartOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 bg-white rounded-xl border border-slate-200/60 shadow-sm text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors">
          <ChevronRight size={14} />
          <span className="text-[11px] font-bold">Diş Şemasını Göster</span>
        </button>
      )}

      {/* ===== TEDAVİ PLANLARI TABLOSU ===== */}
      <div className="flex-1 flex flex-col gap-0 rounded-xl border border-slate-200/60 overflow-hidden bg-white shadow-sm min-w-0">

        {/* Plan Seçici + Aksiyon Butonları */}
        <div className="flex flex-wrap items-center justify-between px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <Dropdown align="left" trigger={
              <button className="flex items-center gap-2 h-9 px-3 bg-white border border-slate-200 text-slate-700 rounded-lg text-[13px] font-bold hover:bg-slate-50 transition-colors shadow-sm min-w-[140px]">
                <span className="flex-1 text-left truncate">{activePlan?.name ?? 'Plan Seç'}</span>
                <ChevronDown size={13} className="text-slate-400 flex-shrink-0" />
              </button>
            }>
              <div className="py-1">
                {plans.map(plan => (
                  <button key={plan.id}
                    onClick={() => { setActivePlanId(plan.id); setCheckedRows(new Set()); setMultiSelectedTeeth({}); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-[13px] font-medium transition-colors text-left ${plan.id === activePlanId ? 'bg-metronic-primary/5 text-metronic-primary font-bold' : 'text-slate-700 hover:bg-slate-50'}`}>
                    {plan.id === activePlanId && <Check size={13} className="flex-shrink-0" />}
                    <span className="truncate">{plan.name}</span>
                    {plan.status === 'ACTIVE' && <span className="ml-auto flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400" />}
                  </button>
                ))}
              </div>
            </Dropdown>

            {activePlan && !activePlan.id.startsWith('local-') && (
              <span className={`px-2 py-1 rounded-lg text-[11px] font-bold flex-shrink-0 border ${activePlan.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60' : 'bg-amber-50 text-amber-600 border-amber-200/60'}`}>
                {activePlan.status === 'ACTIVE' ? '✓ Sözleşme Oluşturuldu' : 'Taslak'}
              </span>
            )}
            {activePlan && activePlan.items.length > 0 && (
              <span className="text-slate-400 text-[12px] font-medium flex-shrink-0 hidden sm:inline">
                {activePlan.items.length} Kalem · ₺{formatCurrency(activePlan.items.reduce((s, i) => s + i.price, 0))}
              </span>
            )}
            {isSaving && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 flex-shrink-0">
                <Loader2 size={12} className="animate-spin" /> Kaydediliyor...
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {activePlan && !activePlan.id.startsWith('local-') && activePlan.status === 'DRAFT' && activePlan.items.length > 0 && (
              <button onClick={handleActivatePlan} className="flex items-center gap-1.5 h-8 px-3 mb-1 bg-emerald-600 text-white rounded-lg text-[12px] font-bold hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm flex-shrink-0">
                <FileSignature size={14} />
                <span>Sözleşme</span>
              </button>
            )}
            {activePlan && !activePlan.id.startsWith('local-') && activePlan.status === 'ACTIVE' && (
              <button onClick={handleOpenContractView} className="flex items-center gap-1.5 h-8 px-3 mb-1 bg-rose-600 text-white rounded-lg text-[12px] font-bold hover:bg-rose-700 active:bg-rose-800 transition-colors shadow-sm flex-shrink-0">
                <FileSignature size={14} />
                <span>Sözleşme</span>
              </button>
            )}
            {activePlan && activePlan.items.length > 0 && (
              <Dropdown align="right" trigger={
                <button className="flex items-center gap-1.5 h-8 px-3 mb-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-[12px] font-bold hover:bg-slate-50 transition-colors shadow-sm flex-shrink-0">
                  <Download size={14} /> Dışarı Aktar <ChevronDown size={11} />
                </button>
              }>
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">Format Seç</div>
                <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="PDF olarak indir" onClick={handleExportPDF} />
                <DropdownItem icon={<FileSpreadsheet size={14} className="text-green-600" />} label="Excel (.xlsx) olarak indir" onClick={handleExportXLS} />
                <div className="border-t border-slate-100 my-1" />
                <DropdownItem icon={<Download size={14} className="text-slate-400" />} label="CSV olarak indir" onClick={handleExportCSV} />
              </Dropdown>
            )}
            {plans.length > 1 && (
              <button onClick={() => setDeleteConfirmOpen(true)}
                className="flex items-center gap-1.5 h-8 px-2.5 mb-1 bg-white border border-rose-200 text-rose-500 rounded-lg text-[12px] font-bold hover:bg-rose-50 transition-colors shadow-sm flex-shrink-0" title="Aktif Planı Sil">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={addPlan}
              className="flex items-center gap-1.5 h-8 px-3 mb-1 bg-metronic-primary text-white rounded-lg text-[12px] font-bold hover:bg-blue-600 transition-colors shadow-sm flex-shrink-0">
              <Plus size={14} /> Plan Ekle
            </button>
          </div>
        </div>

        {/* Toplu İşlem Araç Çubuğu */}
        {checkedRows.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-metronic-primary-light border-b border-metronic-primary/20 flex-shrink-0">
            <div className="flex items-center gap-3 flex-1">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{checkedRows.size} tedavi seçildi</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={openDiscountModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-metronic-primary/30 text-metronic-primary text-[12px] font-bold rounded-lg hover:bg-metronic-primary hover:text-white transition-colors">
                <Tag size={13} /> Fiyat / İndirim
              </button>
              <Dropdown align="left" trigger={
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-metronic-primary/30 text-metronic-primary text-[12px] font-bold rounded-lg hover:bg-metronic-primary hover:text-white transition-colors">
                  <Copy size={13} /> Kopyala <ChevronDown size={12} />
                </button>
              }>
                <DropdownItem label="+ Yeni Plan Oluştur" onClick={() => copyChecked('NEW_PLAN')} />
                {plans.filter(p => p.id !== activePlanId).length > 0 && <div className="border-t border-slate-100 my-1" />}
                {plans.filter(p => p.id !== activePlanId).map(p => <DropdownItem key={p.id} label={p.name} onClick={() => copyChecked(p.id)} />)}
              </Dropdown>
              <Dropdown align="left" trigger={
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-metronic-primary/30 text-metronic-primary text-[12px] font-bold rounded-lg hover:bg-metronic-primary hover:text-white transition-colors">
                  <ArrowRightLeft size={13} /> Taşı <ChevronDown size={12} />
                </button>
              }>
                <DropdownItem label="+ Yeni Plan Oluştur" onClick={() => moveChecked('NEW_PLAN')} />
                {plans.filter(p => p.id !== activePlanId).length > 0 && <div className="border-t border-slate-100 my-1" />}
                {plans.filter(p => p.id !== activePlanId).map(p => <DropdownItem key={p.id} label={p.name} onClick={() => moveChecked(p.id)} />)}
              </Dropdown>
              <button onClick={deleteChecked} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-metronic-danger/30 text-metronic-danger text-[12px] font-bold rounded-lg hover:bg-metronic-danger hover:text-white transition-colors ml-1">
                <Trash2 size={13} /> Sil
              </button>
              <button onClick={() => setCheckedRows(new Set())} className="w-7 h-7 flex items-center justify-center rounded-lg text-metronic-primary hover:bg-white transition-colors ml-1">
                <X size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50/70 border-b border-slate-100 flex-shrink-0 min-h-[42px]">
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-bold text-slate-800">{activePlan?.name}</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                <Calendar size={10} />{activePlan?.createdAt}
              </span>
              {activePlan?.status !== 'ACTIVE' && (
                activePlan?.id.startsWith('local-') ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">Taslak</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full border border-blue-200">Taslak (Kaydedildi)</span>
                )
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {activePlan?.items.length ?? 0} kalem · <strong className="text-slate-700 text-[12px]">₺{formatCurrency(activePlanTotal)}</strong>
            </span>
          </div>
        )}

        {/* Tablo */}
        <div className="flex-1 overflow-y-auto">
          {!activePlan ? (
            <div className="p-10 text-center text-slate-400 text-[12px] flex flex-col items-center justify-center h-full">
              <span className="text-3xl mb-3">📁</span>
              <p>Hiç tedavi planı bulunmuyor.</p>
            </div>
          ) : activePlan.items.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-[12px] flex flex-col items-center justify-center h-full">
              <span className="text-3xl mb-3">🦷</span>
              <p>Bu planda henüz tedavi yok.</p>
              <p className="text-[11px] mt-1">Yukarıdaki diş şemasından bir dişe tıklayın.</p>
            </div>
          ) : (
            <>
            {/* MOBİL KART LİSTESİ */}
            <div className="md:hidden divide-y divide-slate-100">
              {activePlan.items.map(item => {
                const isChecked = checkedRows.has(item.id);
                return (
                  <div key={item.id} onClick={() => toggleRow(item.id)}
                    className={`px-4 py-3 transition-colors active:bg-slate-50 ${isChecked ? 'bg-metronic-primary-light/40' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-11 h-11 flex-shrink-0 -ml-1">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleRow(item.id)} onClick={e => e.stopPropagation()}
                          className="w-5 h-5 rounded border-slate-300 accent-metronic-primary cursor-pointer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] font-mono font-bold text-white bg-slate-600 px-1.5 py-0.5 rounded flex-shrink-0">{item.tooth || '—'}</span>
                          <span className="text-[13px] font-semibold text-slate-900 leading-tight">{item.name}</span>
                        </div>
                        <select value={item.doctor} onChange={e => updateItem(item.id, 'doctor', e.target.value)} onClick={e => e.stopPropagation()} disabled={activePlan.isSaved}
                          className="w-full h-10 px-3 text-[12px] font-medium text-slate-700 border border-slate-200 rounded-lg bg-white outline-none focus:border-metronic-primary disabled:opacity-60">
                          {doctors.map(doc => <option key={doc.id} value={doc.id}>{`Dt. ${doc.firstName} ${doc.lastName}`}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 pt-1">
                        {item.price !== item.originalPrice ? (
                          <>
                            <span className="text-[14px] font-extrabold text-metronic-success">₺{formatCurrency(item.price)}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[11px] font-bold text-red-400 line-through">₺{formatCurrency(item.originalPrice)}</span>
                              <button onClick={e => { e.stopPropagation(); updateItem(item.id, 'price', item.originalPrice); }}
                                className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 active:bg-slate-200 text-slate-500">
                                <RotateCcw size={11} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <span className="text-[13px] font-bold text-slate-900">₺{formatCurrency(item.price)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="px-4 py-3 bg-slate-100/90 border-t-2 border-slate-200 flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Toplam</span>
                <span className="text-[15px] font-extrabold text-slate-800">₺{formatCurrency(activePlanTotal)}</span>
              </div>
            </div>

            {/* MASAÜSTÜ TABLO */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200/80 bg-slate-50">
                  <th className="py-4 pl-6 pr-3 w-10">
                    <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked; }} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" />
                  </th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap w-px">Diş</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tedavi</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap w-px">Hekim</th>
                  <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap min-w-[100px] w-28">Ücret</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activePlan.items.map(item => {
                  const isChecked = checkedRows.has(item.id);
                  return (
                    <tr key={item.id} className={`transition-colors group ${isChecked ? 'bg-metronic-primary-light/40' : 'hover:bg-slate-50'}`} onClick={() => toggleRow(item.id)}>
                      <td className="py-3 pl-6 pr-3 w-10">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleRow(item.id)} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" />
                      </td>
                      <td className="py-3 px-4 text-[13px] font-mono font-bold text-slate-600 whitespace-nowrap w-px">{item.tooth}</td>
                      <td className="py-3 px-4">
                        <span className="text-[13px] font-semibold text-slate-800">{item.name}</span>
                        {item.areas && (
                          <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                            {item.areas.split('').map((a: string) => AREA_CODES[a] || a).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap w-px">
                        <select value={item.doctor} onChange={(e) => updateItem(item.id, 'doctor', e.target.value)} onClick={e => e.stopPropagation()} disabled={activePlan.isSaved}
                          className="h-8 px-2 text-[12px] font-medium text-slate-600 border border-transparent hover:border-slate-200 focus:border-metronic-primary focus:ring-1 focus:ring-metronic-primary/20 rounded-md bg-transparent outline-none cursor-pointer transition-all disabled:opacity-80 disabled:cursor-not-allowed">
                          {doctors.map(doc => <option key={doc.id} value={doc.id}>{`Dt. ${doc.firstName} ${doc.lastName}`}</option>)}
                        </select>
                      </td>
                      <td className="py-3 pl-4 pr-6 text-right whitespace-nowrap min-w-[100px] w-28">
                        <div className="flex flex-col items-end">
                          {item.price !== item.originalPrice ? (
                            <>
                              <div className="flex items-center justify-end gap-2 mb-0.5">
                                <span className="text-[14px] font-extrabold text-metronic-success">₺{formatCurrency(item.price)}</span>
                                <button onClick={(e) => { e.stopPropagation(); updateItem(item.id, 'price', item.originalPrice); }}
                                  className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors" title="Liste fiyatına dön">
                                  <RotateCcw size={12} />
                                </button>
                              </div>
                              <span className="text-[12px] font-bold text-red-500 line-through">₺{formatCurrency(item.originalPrice)}</span>
                            </>
                          ) : (
                            <span className="text-[13px] font-bold text-slate-700">₺{formatCurrency(item.price)}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0">
                <tr className="bg-slate-100/90 border-t-2 border-slate-200">
                  <td colSpan={4} className="py-3 px-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider text-right">Toplam</td>
                  <td className="py-3 pl-4 pr-6 text-[15px] font-extrabold text-slate-800 text-right">₺{formatCurrency(activePlanTotal)}</td>
                </tr>
              </tfoot>
            </table>
            </div>
            </>
          )}
        </div>
      </div>

      {/* ===== TEDAVİ SEÇME MODALİ ===== */}
      <Modal
        isOpen={treatModalOpen}
        onClose={() => { setTreatModalOpen(false); setModalSearch(''); setModalFilterCategory(''); }}
        title={
          pendingToothNum
            ? `Diş ${pendingToothNum} — ${toothName(pendingToothNum)}`
            : `${multiSelectedNums.length} Diş — Toplu İşlem`
        }
        subtitle="Eklenecek işlemi seçin"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hekim</span>
              <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                className="h-9 px-3 text-[13px] font-medium text-slate-700 border border-slate-200 rounded-lg outline-none focus:border-metronic-primary bg-white cursor-pointer">
                {doctors.map(doc => <option key={doc.id} value={doc.id}>{`Dt. ${doc.firstName} ${doc.lastName}`}</option>)}
              </select>
            </div>
            <button onClick={() => { setTreatModalOpen(false); setModalSearch(''); setModalFilterCategory(''); }}
              className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              İptal
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 h-[420px]">
          {/* Filtreler */}
          <div className="flex gap-2 flex-shrink-0">
            <select value={modalFilterCategory} onChange={e => setModalFilterCategory(e.target.value)}
              className="h-9 px-2 text-[12px] font-semibold text-slate-900 border border-slate-200 rounded-lg outline-none focus:border-metronic-primary bg-white cursor-pointer w-44 flex-shrink-0">
              <option value="">Tüm Kategoriler</option>
              {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="İşlem adı veya SUT kodu ara..."
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-metronic-primary focus:ring-1 focus:ring-metronic-primary/10 bg-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Tedavi listesi */}
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg min-h-0">
            {modalFilteredTariffs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400">
                <Search size={24} className="mb-2 opacity-30" />
                <p className="text-[13px] font-medium">Sonuç bulunamadı</p>
              </div>
            ) : modalFilteredTariffs.map(t => (
              <button key={t.id}
                onClick={() => pendingToothNum ? addFromModal(t) : addTreatmentToMultiple(t)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-metronic-primary/5 hover:border-metronic-primary/10 transition-colors text-left group last:border-b-0">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-[13px] font-semibold text-slate-900 group-hover:text-metronic-primary truncate transition-colors leading-tight">
                    {t.masterTreatment.name}
                  </p>
                  {t.masterTreatment.sutCode && (
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{t.masterTreatment.sutCode}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[14px] font-bold text-slate-900 group-hover:text-metronic-primary transition-colors">
                    ₺{formatCurrency(Number(t.price))}
                  </span>
                  <span className="w-7 h-7 rounded-full bg-metronic-primary/10 group-hover:bg-metronic-primary flex items-center justify-center transition-colors flex-shrink-0">
                    <Plus size={13} className="text-metronic-primary group-hover:text-white transition-colors" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal: Toplu İndirim */}
      <Modal isOpen={discountModalOpen} onClose={() => setDiscountModalOpen(false)} title="Seçili Tedavileri Fiyatlandır" subtitle={`${discountItems.length} kalem için fiyat düzenlemesi`} size="md" footerAlign="center"
        footer={<><button onClick={() => setDiscountModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">İptal</button><button onClick={saveDiscount} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600"><Check size={15} /> Fiyatları Uygula</button></>}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">% İndirim (Toplu)</label>
              <div className="relative"><Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" value={globalDiscountPercent} onChange={(e) => applyPercentDiscount(Number(e.target.value))} placeholder="Örn: 15" className="w-full h-9 pl-8 pr-3 text-[13px] font-bold border border-slate-200 rounded-lg outline-none focus:border-metronic-primary" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Yeni Toplam (₺)</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₺</span>
                <input type="number" value={globalDiscountTotal} onChange={(e) => applyTotalDiscount(Number(e.target.value))} placeholder={discountItems.reduce((s, i) => s + i.originalPrice, 0).toString()} className="w-full h-9 pl-8 pr-3 text-[13px] font-bold border border-slate-200 rounded-lg outline-none focus:border-metronic-primary" />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Seçili Kalemler</label>
            <div className="max-h-[250px] overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0 z-10"><tr>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase">İşlem</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase text-right">Liste</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase text-right w-32">Yeni Fiyat</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {discountItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4"><div className="text-[13px] font-bold text-slate-700">{item.name}</div><div className="text-[11px] font-mono text-slate-500">Diş: {item.tooth}</div></td>
                      <td className="py-2.5 px-4 text-right"><span className={`text-[13px] font-bold ${item.price !== item.originalPrice ? 'text-slate-400 line-through' : 'text-slate-600'}`}>₺{formatCurrency(item.originalPrice)}</span></td>
                      <td className="py-2.5 px-4 text-right"><div className="flex items-center justify-end gap-1.5"><span className="text-[12px] font-bold text-slate-600">₺</span>
                        <input type="number" value={item.price} onChange={(e) => updateDiscountItemPrice(item.id, Number(e.target.value))} className="w-full max-w-[80px] h-8 px-2 text-right text-[13px] font-bold text-metronic-success bg-white border border-slate-200 rounded outline-none focus:border-metronic-primary" />
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-2 px-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[12px] font-bold text-slate-500">Toplam: <span className="line-through ml-1 text-slate-400">₺{formatCurrency(discountItems.reduce((s, i) => s + i.originalPrice, 0))}</span></span>
              <span className="text-[14px] font-extrabold text-metronic-success">Yeni: ₺{formatCurrency(discountItems.reduce((s, i) => s + i.price, 0))}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Plan Silme */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => activePlan && deletePlan(activePlan.id)}
        loading={deletingPlan}
        title="Planı Sil"
        message={<>{activePlan?.name} silinecek. Bu işlem geri alınamaz.</>}
      />

      {/* Tedavi Kalemi(leri) Silme */}
      <ConfirmModal
        isOpen={deleteItemsConfirmOpen}
        onClose={() => setDeleteItemsConfirmOpen(false)}
        onConfirm={performDeleteChecked}
        loading={deletingItems}
        title="Tedavi Kalemlerini Sil"
        message={
          activePlan?.status === 'ACTIVE' ? (
            <>
              <strong>{checkedRows.size}</strong> tedavi kalemi sözleşmeden silinecek
              {(() => {
                const paidTotal = activePlan.items.filter(i => checkedRows.has(i.id)).reduce((s, i) => s + (i.paidAmount || 0), 0);
                return paidTotal > 0 ? <> (₺{formatCurrency(paidTotal)} ödeme dağıtılmış)</> : null;
              })()}
              . Sözleşme tutarı bu kadar azalacaktır. Dağıtılmış ödeme varsa: önce hastanın başka borcu kapatılır (FIFO sırayla), kalan tutar avans bakiyesine aktarılır. Kasa/banka bakiyesi etkilenmez. Bu işlem geri alınamaz.
            </>
          ) : (
            <><strong>{checkedRows.size}</strong> tedavi kalemi silinecek. Bu işlem geri alınamaz.</>
          )
        }
      />

      {/* Sözleşme (Ödeme Planı) */}
      <Modal
        isOpen={contractModalOpen}
        onClose={() => !activating && setContractModalOpen(false)}
        title="Sözleşme"
        size="md"
        footer={
          contractMode === 'create' ? (
            <>
              <button
                onClick={() => setContractModalOpen(false)}
                disabled={activating}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50"
              >
                <RotateCcw size={14} /> Vazgeç
              </button>
              <button
                onClick={performActivatePlan}
                disabled={activating || Math.abs(installmentsTotal - (activePlan?.items.reduce((s, i) => s + i.price, 0) || 0)) > 0.01}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {activating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Kaydet
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelPlan}
                disabled={activating}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 disabled:opacity-50"
              >
                <Trash2 size={14} /> Sil
              </button>
              <button
                onClick={performUpdateContract}
                disabled={activating || Math.abs(installmentsTotal - (activePlan?.items.reduce((s, i) => s + i.price, 0) || 0)) > 0.01}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {activating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Düzenle
              </button>
            </>
          )
        }
      >
        <div className="space-y-4">
          <div>
            <span className="text-[12px] font-bold text-slate-500">Toplam: </span>
            <span className="text-[16px] font-extrabold text-slate-800">₺{formatCurrency(activePlan?.items.reduce((s, i) => s + i.price, 0) || 0)}</span>
          </div>

          <div>
            <p className="text-[13px] font-bold text-metronic-primary border-b border-dashed border-metronic-primary/30 pb-2 mb-3">Ödeme Planı</p>

            <div className="flex flex-col gap-1.5 max-w-[140px] mb-3">
              <label className="text-[11px] font-bold text-metronic-danger uppercase tracking-wider">Taksit</label>
              <input
                type="number"
                min={1}
                max={36}
                value={installmentCount}
                onChange={e => handleInstallmentCountChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="m-input"
              />
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider"></th>
                    <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tarih</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {installmentRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 text-[12px] font-bold text-slate-700 whitespace-nowrap">{row.label}</td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={row.dueDate}
                          onChange={e => updateInstallmentRow(idx, 'dueDate', e.target.value)}
                          className="m-input text-[12px] py-1.5"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={row.amount}
                          onChange={e => updateInstallmentRow(idx, 'amount', e.target.value)}
                          className="m-input text-right text-[12px] py-1.5"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50">
                    <td className="py-2 px-3" colSpan={2}></td>
                    <td className={`py-2 px-3 text-right text-[13px] font-extrabold ${Math.abs(installmentsTotal - (activePlan?.items.reduce((s, i) => s + i.price, 0) || 0)) > 0.01 ? 'text-metronic-danger' : 'text-metronic-success'}`}>
                      ₺{formatCurrency(installmentsTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Açıklama</label>
            <textarea
              value={contractDescription}
              onChange={e => setContractDescription(e.target.value)}
              rows={3}
              placeholder="İsteğe bağlı not"
              className="m-input resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Sözleşme İptal */}
      <Modal isOpen={cancelConfirmOpen} onClose={() => setCancelConfirmOpen(false)} title="Sözleşmeyi İptal Et" size="sm"
        footer={<div className="flex gap-2 justify-end"><button onClick={() => setCancelConfirmOpen(false)} className="px-4 py-2 text-[13px] font-bold bg-slate-100 text-slate-600 rounded-lg">İptal</button><button onClick={performCancelPlan} className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold bg-rose-600 text-white rounded-lg"><X size={14} /> Evet, İptal Et</button></div>}>
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertTriangle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <div><p className="text-[13px] font-bold text-rose-700">{activePlan?.name} sözleşmesi iptal edilecek</p><p className="text-[12px] text-rose-600/80 mt-1">İlişkili tedaviler silinecektir. Geri alınamaz.</p></div>
        </div>
      </Modal>
    </div>
  );
}
