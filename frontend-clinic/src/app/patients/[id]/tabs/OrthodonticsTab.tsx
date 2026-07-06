'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Save, Trash2, Smile, Plus, Loader2, Stethoscope, ClipboardList, CalendarClock, AlertTriangle,
  Image as ImageIcon, ScanLine, TrendingUp, ShieldCheck, UploadCloud, Eye, X, CalendarPlus,
} from 'lucide-react';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import { useToastStore } from '../../../../store/toastStore';
import {
  OrthodonticsService,
  OrthoCase,
  OrthoTreatmentTrack,
  OrthoDiagnosis,
  OrthoRecordSet,
  OrthoMiniScrewRecord,
  OrthoGrowthAssessment,
  OrthoRetentionPlan,
} from '../../../../lib/services/orthodontics.service';
import { TreatmentService, Tariff } from '../../../../lib/services/treatment.service';
import { Employee, EmployeeService } from '../../../../lib/services/employee.service';
import { formatCurrency } from '../../../../lib/utils/formatCurrency';
import { resolveDocumentUrl } from '../../../../lib/services/patient.service';

// ─── ICON Scoring System ─────────────────────────────────────────────────────

const SCORE_SECTIONS = [
  {
    key: 'aesthetic',
    label: 'Estetik Komponent',
    weight: 7,
    options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => ({ value: n, label: String(n) })),
    isAesthetic: true,
  },
  {
    key: 'upperCrowding',
    label: 'Üst Ark Çapraşıklığı',
    weight: 5,
    options: [
      { value: 0, label: '<2 mm' },
      { value: 1, label: '2.1-5 mm' },
      { value: 2, label: '5.1-9 mm' },
      { value: 3, label: '9.1-13 mm' },
      { value: 4, label: '13.1-17 mm' },
      { value: 5, label: '>17 mm / Gömülü Diş' },
    ],
  },
  {
    key: 'upperSpacing',
    label: 'Üst Ark Boşluğu',
    weight: 5,
    options: [
      { value: 0, label: '<2 mm' },
      { value: 1, label: '2.1-5 mm' },
      { value: 2, label: '5.1-9 mm' },
      { value: 3, label: '>9 mm' },
    ],
  },
  {
    key: 'crossbite',
    label: 'Çapraz Kapanış',
    weight: 5,
    options: [
      { value: 0, label: 'Mevcut Değil' },
      { value: 1, label: 'Mevcut' },
    ],
  },
  {
    key: 'openBite',
    label: 'Ön Açık Kapanış',
    weight: 4,
    options: [
      { value: 0, label: 'Tam Kapanış' },
      { value: 1, label: '<1 mm' },
      { value: 2, label: '1.1-2 mm' },
      { value: 3, label: '2.1-4 mm' },
      { value: 4, label: '>4 mm' },
    ],
  },
  {
    key: 'deepBite',
    label: 'Ön Derin Kapanış',
    weight: 4,
    options: [
      { value: 0, label: "Alt kesicinin 1/3'den daha az örtmüş" },
      { value: 1, label: "1/3'den 2/3'üne kadar örtmüş" },
      { value: 2, label: "2/3'ünden tamamına kadar örtmüş" },
      { value: 3, label: 'Tamamen örtmüş' },
    ],
  },
  {
    key: 'molarLeft',
    label: 'Bukkal Bölge Ön-Arka Yön İlişkisi (Sol)',
    weight: 3,
    options: [
      { value: 0, label: 'Tüberkül fossa ilişkisi sadece Sınıf I, II yada III ilişki' },
      { value: 1, label: 'Tüberkül fossa ilişkisi ile Tüberkül tüberküle ilişki arasında bir ilişki' },
      { value: 2, label: 'Tüberkül tüberküle ilişki' },
    ],
  },
  {
    key: 'molarRight',
    label: 'Bukkal Bölge Ön-Arka Yön İlişkisi (Sağ)',
    weight: 3,
    options: [
      { value: 0, label: 'Tüberkül fossa ilişkisi sadece Sınıf I, II yada III ilişki' },
      { value: 1, label: 'Tüberkül fossa ilişkisi ile Tüberkül tüberküle ilişki arasında bir ilişki' },
      { value: 2, label: 'Tüberkül tüberküle ilişki' },
    ],
  },
] as const;

type SectionKey = 'aesthetic' | 'upperCrowding' | 'upperSpacing' | 'crossbite' | 'openBite' | 'deepBite' | 'molarLeft' | 'molarRight';

const defaultIconValues: Record<SectionKey, number> = {
  aesthetic: 0,
  upperCrowding: -1,
  upperSpacing: -1,
  crossbite: -1,
  openBite: -1,
  deepBite: -1,
  molarLeft: -1,
  molarRight: -1,
};

function calcIconTotal(values: Record<SectionKey, number>): number {
  let total = 0;
  if (values.aesthetic >= 1) total += values.aesthetic * 7;
  if (values.upperCrowding >= 0) total += values.upperCrowding * 5;
  if (values.upperSpacing >= 0) total += values.upperSpacing * 5;
  if (values.crossbite >= 0) total += values.crossbite * 5;
  if (values.openBite >= 0) total += values.openBite * 4;
  if (values.deepBite >= 0) total += values.deepBite * 4;
  if (values.molarLeft >= 0) total += values.molarLeft * 3;
  if (values.molarRight >= 0) total += values.molarRight * 3;
  return total;
}

function getInterpretation(score: number): { label: string; style: string } {
  if (score <= 29) return { label: 'Tedavi Gerekmez', style: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
  if (score <= 43) return { label: 'Az Tedavi İhtiyacı', style: 'bg-blue-100 text-blue-700 border border-blue-200' };
  if (score <= 67) return { label: 'Orta Tedavi İhtiyacı', style: 'bg-amber-100 text-amber-700 border border-amber-200' };
  return { label: 'Yüksek Tedavi İhtiyacı', style: 'bg-red-100 text-red-700 border border-red-200' };
}

// ─── Domain sabitleri ────────────────────────────────────────────────────────

const TRACK_TYPE_LABELS: Record<string, string> = {
  SABIT: 'Sabit Tedavi',
  ALIGNER: 'Şeffaf Plak (Aligner)',
  RPE: 'Üst Çene Genişletme (RME)',
  HEADGEAR: 'Headgear',
  HABIT: 'Alışkanlık Kırıcı Aparey',
  SPACE_MAINTAINER: 'Boşluk Tutucu',
  MYOFUNCTIONAL: 'Miyofonksiyonel Terapi',
  ORTHO_RESTORATIVE: 'Ortho-Restoratif',
  KISA_SURELI: 'Kısa Süreli Tedavi',
};

const TRACK_STATUS_LABELS: Record<string, { label: string; style: string }> = {
  AKTIF: { label: 'Aktif', style: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  BITIRME: { label: 'Bitirme', style: 'bg-amber-100 text-amber-700 border border-amber-200' },
  TAMAMLANDI: { label: 'Tamamlandı', style: 'bg-blue-100 text-blue-700 border border-blue-200' },
  IPTAL: { label: 'İptal', style: 'bg-slate-100 text-slate-500 border border-slate-200' },
};

const CASE_STATUS_LABELS: Record<string, { label: string; style: string }> = {
  AKTIF: { label: 'Aktif', style: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  TAMAMLANDI: { label: 'Tamamlandı', style: 'bg-blue-100 text-blue-700 border border-blue-200' },
  RETANSIYONDA: { label: 'Retansiyonda', style: 'bg-violet-100 text-violet-700 border border-violet-200' },
  IPTAL: { label: 'İptal', style: 'bg-slate-100 text-slate-500 border border-slate-200' },
};

const SKELETAL_CLASSES = [
  { value: 'SINIF_I', label: 'Sınıf I' },
  { value: 'SINIF_II', label: 'Sınıf II' },
  { value: 'SINIF_III', label: 'Sınıf III' },
];

const PROFILE_TYPES = [
  { value: 'DUZ', label: 'Düz' },
  { value: 'KONVEKS', label: 'Konveks' },
  { value: 'KONKAV', label: 'Konkav' },
];

const CROWDING_LEVELS = [
  { value: 'HAFIF', label: 'Hafif' },
  { value: 'ORTA', label: 'Orta' },
  { value: 'SIDDETLI', label: 'Şiddetli' },
];

const CEPH_KEYS = ['SNA', 'SNB', 'ANB', 'SN-GoGn', 'U1-SN', 'IMPA'];

const ACTIVATION_TYPES = [
  { value: 'VIDA_TURU', label: 'Vida Turu (RME)', unit: 'TUR' },
  { value: 'KULLANIM_SURESI', label: 'Kullanım Süresi', unit: 'SAAT' },
  { value: 'EGZERSIZ', label: 'Egzersiz Tekrarı', unit: 'TEKRAR' },
];

const RECORD_TYPE_LABELS: Record<string, string> = {
  FOTO: 'Fotoğraf',
  OPG: 'Panoramik Röntgen (OPG)',
  SEFALOMETRIK: 'Sefalometrik Röntgen',
  EL_BILEK: 'El-Bilek Röntgeni',
  CBCT: 'CBCT',
  STL: 'Ölçü / STL Tarama',
};

const PHASE_LABELS: Record<string, string> = {
  FAZ01: 'Faz 01 — İlk Başvuru',
  FAZ02: 'Faz 02 — Muayene & Kayıt',
  FAZ03: 'Faz 03 — Planlama',
  FAZ04: 'Faz 04 — Aparey Yerleştirme',
  FAZ05: 'Faz 05 — Aktif Tedavi',
  FAZ06: 'Faz 06 — Bitirme',
  FAZ07: 'Faz 07 — Aparey Çıkarma',
  FAZ08: 'Faz 08 — Retansiyon',
};

const MINISCREW_STATUS_LABELS: Record<string, { label: string; style: string }> = {
  AKTIF: { label: 'Aktif', style: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  CIKARILDI: { label: 'Çıkarıldı', style: 'bg-slate-100 text-slate-500 border border-slate-200' },
  KAYBEDILDI: { label: 'Kaybedildi', style: 'bg-red-100 text-red-700 border border-red-200' },
};

const GROWTH_PHASE_LABELS: Record<string, string> = {
  ATILIM_ONCESI: 'Atılım Öncesi',
  ATILIMDA: 'Atılımda',
  ATILIM_SONRASI: 'Atılım Sonrası',
};

const RETAINER_TYPE_LABELS: Record<string, string> = {
  SABIT_LINGUAL: 'Sabit (Lingual Tel)',
  HAWLEY: 'Hawley',
  ESSIX: 'Essix (Şeffaf)',
};

const RETENTION_STATUS_LABELS: Record<string, { label: string; style: string }> = {
  AKTIF: { label: 'Aktif', style: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  GEVSEMIS: { label: 'Gevşemiş', style: 'bg-amber-100 text-amber-700 border border-amber-200' },
  KIRIK_KAYIP: { label: 'Kırık / Kayıp', style: 'bg-red-100 text-red-700 border border-red-200' },
  YENILENDI: { label: 'Yenilendi', style: 'bg-blue-100 text-blue-700 border border-blue-200' },
  TAMAMLANDI: { label: 'Tamamlandı', style: 'bg-slate-100 text-slate-500 border border-slate-200' },
};

const RETENTION_SCHEDULE_PRESETS = ['1. Ay', '3. Ay', '6. Ay', '1. Yıl'];

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return iso.split('T')[0];
}

// ─── Tanı formu varsayılanı ──────────────────────────────────────────────────

const defaultDiagnosisForm = {
  examDate: new Date().toISOString().slice(0, 10),
  skeletalClass: '',
  profileType: '',
  overjet: '',
  overbite: '',
  crowding: '',
  openBite: '',
  deepBite: '',
  crossbite: '',
  midlineDeviation: '',
  tmjAssessment: '',
  boltonAnalysis: '',
  haysNanceAnalysis: '',
  notes: '',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrthodonticsTab({ patient }: { patient: any }) {
  const { addToast } = useToastStore();

  const [innerTab, setInnerTab] = useState<'tani' | 'plan' | 'timeline' | 'gallery' | 'miniscrew' | 'growth' | 'retention'>('tani');
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<OrthoCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>('');
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [doctors, setDoctors] = useState<Employee[]>([]);
  const [creatingCase, setCreatingCase] = useState(false);

  const activeCase = cases.find(c => c.id === activeCaseId) ?? cases[0] ?? null;

  const orthoTariffs = useMemo(
    () => tariffs.filter(t => t.masterTreatment?.category === 'Ortodonti'),
    [tariffs],
  );

  // Büyüme Değerlendirmesi sekmesi öncelikle büyüme çağı (~6-16 yaş) hastalar için
  // anlamlıdır; yaş bilinmiyorsa veya aralık dışındaysa sekme yine erişilebilir
  // kalır, sadece bilgilendirici bir not gösterilir (hard-block yok).
  const patientAge: number | null = useMemo(() => {
    if (!patient?.birthDate) return null;
    const birth = new Date(patient.birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const diffMs = Date.now() - birth.getTime();
    return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  }, [patient?.birthDate]);
  const isGrowthAgeRelevant = patientAge == null || (patientAge >= 6 && patientAge <= 16);

  const loadData = useCallback(async (keepCaseId?: string) => {
    if (!patient?.id) return;
    try {
      setLoading(true);
      const [fetchedCases, fetchedTariffs, fetchedEmployees] = await Promise.all([
        OrthodonticsService.findCasesByPatient(patient.id),
        TreatmentService.getTariffs(),
        EmployeeService.findAll(),
      ]);
      setCases(fetchedCases);
      setTariffs(fetchedTariffs);
      setDoctors(fetchedEmployees.filter(e => e.isDoctor && e.isActive));
      if (keepCaseId && fetchedCases.some(c => c.id === keepCaseId)) {
        setActiveCaseId(keepCaseId);
      } else if (fetchedCases.length > 0) {
        setActiveCaseId(prev => (fetchedCases.some(c => c.id === prev) ? prev : fetchedCases[0].id));
      }
    } catch (e) {
      console.warn('Ortodonti verileri alınamadı', e);
      addToast({ type: 'error', title: 'Hata', message: 'Ortodonti verileri yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  }, [patient?.id, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/patient-change pattern
    loadData();
  }, [loadData]);

  const handleCreateCase = async () => {
    try {
      setCreatingCase(true);
      const created = await OrthodonticsService.createCase({
        patientId: patient.id,
        doctorId: doctors.find(d => d.id === patient?.assignedDoctor)?.id,
      });
      addToast({ type: 'success', title: 'Vaka Açıldı', message: 'Ortodonti vakası oluşturuldu.' });
      await loadData(created.id);
    } catch (e) {
      console.error('Vaka oluşturulamadı', e);
      addToast({ type: 'error', title: 'Hata', message: 'Vaka oluşturulamadı.' });
    } finally {
      setCreatingCase(false);
    }
  };

  // ── Yükleniyor / boş durum ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 p-6">
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-5 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!activeCase) {
    return (
      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
            <Smile size={26} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-[14px] font-bold text-slate-500 dark:text-slate-400">Bu hasta için ortodonti vakası açılmamış</p>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1 max-w-md">
            Vaka açıldığında tanı, tedavi planı ve zaman çizelgesi kayıtları bu sekmede tutulur.
          </p>
          <button
            onClick={handleCreateCase}
            disabled={creatingCase}
            className="mt-5 flex items-center gap-2 px-5 py-2 bg-metronic-primary hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-[13px] font-bold transition-colors shadow-sm"
          >
            {creatingCase ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Ortodonti Vakası Aç
          </button>
        </div>
      </div>
    );
  }

  const caseStatus = CASE_STATUS_LABELS[activeCase.status] ?? CASE_STATUS_LABELS.AKTIF;

  return (
    <div className="space-y-6">
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div className="m-card overflow-visible shadow-sm border border-slate-200/60 dark:border-white/5">
        {/* ── Vaka başlığı ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <h4 className="text-[1.05rem] font-bold text-slate-800 dark:text-slate-100 tracking-tight m-0">Ortodonti Vakası</h4>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${caseStatus.style}`}>{caseStatus.label}</span>
            <span className="text-[12px] text-slate-400 dark:text-slate-500 font-medium">Başlangıç: {formatDate(activeCase.startDate)}</span>
            {activeCase.doctor && (
              <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium hidden md:inline">
                Dt. {activeCase.doctor.firstName} {activeCase.doctor.lastName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cases.length > 1 && (
              <select
                className="m-input !h-8 !py-0 text-[12px] w-44"
                value={activeCase.id}
                onChange={e => setActiveCaseId(e.target.value)}
              >
                {cases.map((c, idx) => (
                  <option key={c.id} value={c.id}>Vaka {cases.length - idx} — {formatDate(c.startDate)}</option>
                ))}
              </select>
            )}
            <select
              className="m-input !h-8 !py-0 text-[12px] w-36"
              value={activeCase.status}
              onChange={async e => {
                try {
                  await OrthodonticsService.updateCase(activeCase.id, { status: e.target.value });
                  await loadData(activeCase.id);
                } catch {
                  addToast({ type: 'error', title: 'Hata', message: 'Vaka durumu güncellenemedi.' });
                }
              }}
            >
              {Object.entries(CASE_STATUS_LABELS).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Inner Tab Header ─────────────────────────────────────────── */}
        <div className="flex border-b border-slate-100 dark:border-white/5 overflow-x-auto no-scrollbar">
          {([
            { key: 'tani', label: 'Tanı', icon: <Stethoscope size={14} /> },
            { key: 'plan', label: 'Tedavi Planı', icon: <ClipboardList size={14} /> },
            { key: 'timeline', label: 'Zaman Çizelgesi', icon: <CalendarClock size={14} /> },
            { key: 'gallery', label: 'Kayıt Galerisi', icon: <ImageIcon size={14} /> },
            { key: 'miniscrew', label: 'Mini Vida', icon: <ScanLine size={14} /> },
            { key: 'growth', label: 'Büyüme Değerlendirmesi', icon: <TrendingUp size={14} /> },
            { key: 'retention', label: 'Retansiyon', icon: <ShieldCheck size={14} /> },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setInnerTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-4 text-[13px] font-bold transition-colors border-b-2 whitespace-nowrap ${
                innerTab === tab.key
                  ? 'border-metronic-primary text-metronic-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {innerTab === 'tani' && (
          <DiagnosisSection orthoCase={activeCase} doctors={doctors} onChanged={() => loadData(activeCase.id)} />
        )}
        {innerTab === 'plan' && (
          <TreatmentPlanSection
            orthoCase={activeCase}
            orthoTariffs={orthoTariffs}
            doctors={doctors}
            patient={patient}
            onChanged={() => loadData(activeCase.id)}
          />
        )}
        {innerTab === 'timeline' && (
          <TimelineSection orthoCase={activeCase} onChanged={() => loadData(activeCase.id)} />
        )}
        {innerTab === 'gallery' && (
          <RecordGallerySection orthoCase={activeCase} onChanged={() => loadData(activeCase.id)} />
        )}
        {innerTab === 'miniscrew' && (
          <MiniScrewSection
            orthoCase={activeCase}
            orthoTariffs={orthoTariffs}
            doctors={doctors}
            onChanged={() => loadData(activeCase.id)}
          />
        )}
        {innerTab === 'growth' && (
          <GrowthAssessmentSection
            orthoCase={activeCase}
            isAgeRelevant={isGrowthAgeRelevant}
            patientAge={patientAge}
            onChanged={() => loadData(activeCase.id)}
          />
        )}
        {innerTab === 'retention' && (
          <RetentionPlanSection orthoCase={activeCase} onChanged={() => loadData(activeCase.id)} />
        )}
      </div>
    </div>
  );
}

// ─── Tanı (Faz 02) ───────────────────────────────────────────────────────────

function DiagnosisSection({
  orthoCase,
  doctors,
  onChanged,
}: {
  orthoCase: OrthoCase;
  doctors: Employee[];
  onChanged: () => Promise<void> | void;
}) {
  const { addToast } = useToastStore();
  const [mode, setMode] = useState<'list' | 'new'>(orthoCase.diagnoses.length === 0 ? 'new' : 'list');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({ ...defaultDiagnosisForm });
  const [doctorId, setDoctorId] = useState('');
  const [ceph, setCeph] = useState<Record<string, string>>({});
  const [iconValues, setIconValues] = useState<Record<SectionKey, number>>({ ...defaultIconValues });

  const iconTotal = calcIconTotal(iconValues);
  const { label: interpretation, style: interpretationStyle } = getInterpretation(iconTotal);

  const getSectionDisplayScore = (section: typeof SCORE_SECTIONS[number]): string => {
    const val = iconValues[section.key as SectionKey];
    if (section.key === 'aesthetic') return val >= 1 ? String(val * section.weight) : '—';
    return val >= 0 ? String(val * section.weight) : '—';
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const cephEntries = Object.entries(ceph).filter(([, v]) => v !== '');
      await OrthodonticsService.addDiagnosis(orthoCase.id, {
        examDate: form.examDate,
        doctorId: doctorId || undefined,
        skeletalClass: form.skeletalClass || undefined,
        profileType: form.profileType || undefined,
        overjet: form.overjet !== '' ? Number(form.overjet) : undefined,
        overbite: form.overbite !== '' ? Number(form.overbite) : undefined,
        crowding: form.crowding || undefined,
        openBite: form.openBite || undefined,
        deepBite: form.deepBite || undefined,
        crossbite: form.crossbite || undefined,
        midlineDeviation: form.midlineDeviation || undefined,
        tmjAssessment: form.tmjAssessment || undefined,
        cephalometricValues: cephEntries.length > 0 ? Object.fromEntries(cephEntries) : undefined,
        boltonAnalysis: form.boltonAnalysis || undefined,
        haysNanceAnalysis: form.haysNanceAnalysis || undefined,
        iconScore: iconTotal > 0 ? iconTotal : undefined,
        iconDetails: iconTotal > 0 ? iconValues : undefined,
        notes: form.notes || undefined,
      } as Partial<OrthoDiagnosis>);
      addToast({ type: 'success', title: 'Tanı Kaydedildi', message: 'Ortodontik değerlendirme kaydedildi.' });
      setForm({ ...defaultDiagnosisForm });
      setCeph({});
      setIconValues({ ...defaultIconValues });
      setMode('list');
      await onChanged();
    } catch (e) {
      console.error('Tanı kaydedilemedi', e);
      addToast({ type: 'error', title: 'Hata', message: 'Tanı kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await OrthodonticsService.deleteDiagnosis(id);
      setConfirmDeleteId(null);
      await onChanged();
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Tanı silinemedi.' });
    }
  };

  const skeletalLabel = (v?: string | null) => SKELETAL_CLASSES.find(s => s.value === v)?.label ?? '—';
  const crowdingLabel = (v?: string | null) => CROWDING_LEVELS.find(s => s.value === v)?.label ?? '—';

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider m-0">
          Ortodontik Değerlendirmeler ({orthoCase.diagnoses.length})
        </p>
        <button
          onClick={() => setMode(m => (m === 'list' ? 'new' : 'list'))}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[12px] font-bold transition-colors shadow-sm"
        >
          {mode === 'list' ? <><Plus size={13} /> Yeni Değerlendirme</> : 'Listeye Dön'}
        </button>
      </div>

      {mode === 'list' && (
        orthoCase.diagnoses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-[13px]">Henüz değerlendirme girilmemiş.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.02]">
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tarih</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">İskelet Sınıfı</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Overjet / Overbite</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Çapraşıklık</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">ICON</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Değerlendirme</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {orthoCase.diagnoses.map(d => {
                  const interp = d.iconScore != null ? getInterpretation(d.iconScore) : null;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-[13px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatDate(d.examDate)}</td>
                      <td className="py-3 px-4 text-[13px] text-slate-600 dark:text-slate-300">{skeletalLabel(d.skeletalClass)}</td>
                      <td className="py-3 px-4 text-[13px] text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">
                        {d.overjet != null ? `${d.overjet} mm` : '—'} / {d.overbite != null ? `%${d.overbite}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-[13px] text-slate-600 dark:text-slate-300">{crowdingLabel(d.crowding)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[15px] font-black text-metronic-primary">{d.iconScore ?? '—'}</span>
                      </td>
                      <td className="py-3 px-4">
                        {interp ? (
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${interp.style}`}>{interp.label}</span>
                        ) : (
                          <span className="text-[12px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setConfirmDeleteId(d.id)}
                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {mode === 'new' && (
        <div className="space-y-6">
          {/* Klinik bulgular */}
          <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/10 space-y-4">
            <h5 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 m-0">Klinik Bulgular</h5>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Muayene Tarihi</label>
                <input type="date" className="m-input" value={form.examDate}
                  onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hekim</label>
                <select className="m-input" value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                  <option value="">Seçiniz...</option>
                  {doctors.map(doc => <option key={doc.id} value={doc.id}>{`Dt. ${doc.firstName} ${doc.lastName}`}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">İskelet Sınıfı</label>
                <select className="m-input" value={form.skeletalClass} onChange={e => setForm(f => ({ ...f, skeletalClass: e.target.value }))}>
                  <option value="">Seçiniz...</option>
                  {SKELETAL_CLASSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profil</label>
                <select className="m-input" value={form.profileType} onChange={e => setForm(f => ({ ...f, profileType: e.target.value }))}>
                  <option value="">Seçiniz...</option>
                  {PROFILE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overjet (mm)</label>
                <input type="number" step="0.1" className="m-input" value={form.overjet}
                  onChange={e => setForm(f => ({ ...f, overjet: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overbite (%)</label>
                <input type="number" step="1" className="m-input" value={form.overbite}
                  onChange={e => setForm(f => ({ ...f, overbite: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Çapraşıklık</label>
                <select className="m-input" value={form.crowding} onChange={e => setForm(f => ({ ...f, crowding: e.target.value }))}>
                  <option value="">Seçiniz...</option>
                  {CROWDING_LEVELS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Orta Hat Kayması</label>
                <input type="text" className="m-input" placeholder="Örn: 2 mm sağ" value={form.midlineDeviation}
                  onChange={e => setForm(f => ({ ...f, midlineDeviation: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Açık Kapanış</label>
                <input type="text" className="m-input" placeholder="Bölge, mm" value={form.openBite}
                  onChange={e => setForm(f => ({ ...f, openBite: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Derin Kapanış</label>
                <input type="text" className="m-input" placeholder="Örtme notu" value={form.deepBite}
                  onChange={e => setForm(f => ({ ...f, deepBite: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Çapraz Kapanış</label>
                <input type="text" className="m-input" placeholder="Bölge, mm" value={form.crossbite}
                  onChange={e => setForm(f => ({ ...f, crossbite: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">TME Değerlendirme</label>
                <input type="text" className="m-input" placeholder="Ağrı / klik / kısıtlılık" value={form.tmjAssessment}
                  onChange={e => setForm(f => ({ ...f, tmjAssessment: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Sefalometrik analiz */}
          <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/10 space-y-4">
            <h5 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 m-0">Sefalometrik Analiz <span className="text-[11px] text-slate-400 font-normal">(derece)</span></h5>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {CEPH_KEYS.map(key => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{key}</label>
                  <input type="number" step="0.1" className="m-input" value={ceph[key] ?? ''}
                    onChange={e => setCeph(prev => ({ ...prev, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Model analizi */}
          <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/10 space-y-4">
            <h5 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 m-0">Model Analizi</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bolton Analizi</label>
                <textarea className="m-input resize-none" rows={2} placeholder="Üst/alt diş mesiodistal genişlik oranı..."
                  value={form.boltonAnalysis} onChange={e => setForm(f => ({ ...f, boltonAnalysis: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hays-Nance Analizi</label>
                <textarea className="m-input resize-none" rows={2} placeholder="Karışık dişlenimde ark uzunluğu / boşluk analizi..."
                  value={form.haysNanceAnalysis} onChange={e => setForm(f => ({ ...f, haysNanceAnalysis: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* ICON skorlama */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.02]">
                  <th className="py-3 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Bölüm</th>
                  <th className="py-3 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Seçenekler</th>
                  <th className="py-3 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Ağırlık</th>
                  <th className="py-3 pr-4 pl-2 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Puan</th>
                </tr>
              </thead>
              <tbody>
                {SCORE_SECTIONS.map(section => {
                  const currentVal = iconValues[section.key as SectionKey];
                  return (
                    <tr key={section.key} className="border-t border-slate-100 dark:border-white/5">
                      <td className="py-4 pl-4 pr-2 text-[13px] font-semibold text-metronic-primary min-w-[160px] align-top">{section.label}</td>
                      <td className="py-4 px-2">
                        <div className="flex flex-wrap gap-2">
                          {section.options.map(opt => {
                            const isSelected = currentVal === opt.value;
                            return (
                              <label
                                key={opt.value}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-[12px] font-medium transition-all select-none ${
                                  isSelected
                                    ? 'border-metronic-primary bg-metronic-primary/5 text-metronic-primary dark:bg-metronic-primary/10'
                                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-metronic-primary/50 hover:text-metronic-primary/70'
                                }`}
                              >
                                <input
                                  type="radio"
                                  className="sr-only"
                                  name={section.key}
                                  value={opt.value}
                                  checked={isSelected}
                                  onChange={() => setIconValues(prev => ({ ...prev, [section.key]: opt.value }))}
                                />
                                {opt.label}
                              </label>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center align-top">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-bold rounded">&times;{section.weight}</span>
                      </td>
                      <td className="py-4 pr-4 pl-2 text-right font-bold text-[14px] text-slate-700 dark:text-slate-200 align-top">
                        {getSectionDisplayScore(section)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ICON toplam */}
          <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/10">
            <div>
              <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider m-0">Ortodonti ICON Skoru (Genel Toplam)</p>
              <p className="text-3xl font-black text-metronic-primary mt-1 mb-0">{iconTotal}</p>
            </div>
            <div className={`px-4 py-2 rounded-xl text-[13px] font-bold ${interpretationStyle}`}>{interpretation}</div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notlar</label>
            <textarea className="m-input resize-none" rows={2} placeholder="Ek klinik notlar..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-metronic-primary hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-bold transition-colors shadow-sm"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Kaydet
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        title="Tanıyı Sil"
        message="Bu değerlendirmeyi silmek istediğinize emin misiniz?"
      />
    </div>
  );
}

// ─── Tedavi Planı (Faz 03) ───────────────────────────────────────────────────

function TreatmentPlanSection({
  orthoCase,
  orthoTariffs,
  doctors,
  patient,
  onChanged,
}: {
  orthoCase: OrthoCase;
  orthoTariffs: Tariff[];
  doctors: Employee[];
  patient: any;
  onChanged: () => Promise<void> | void;
}) {
  const { addToast } = useToastStore();
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(orthoCase.tracks.length === 0);

  const [trackType, setTrackType] = useState('SABIT');
  const [tariffId, setTariffId] = useState('');
  const [doctorId, setDoctorId] = useState(() => {
    const assigned = doctors.find(d => d.id === patient?.assignedDoctor);
    return assigned?.id ?? doctors[0]?.id ?? '';
  });
  const [applianceInfo, setApplianceInfo] = useState('');
  const [notes, setNotes] = useState('');

  const selectedTariff = orthoTariffs.find(t => t.id === tariffId);

  const handleCreate = async () => {
    if (!trackType) return;
    if (tariffId && !doctorId) {
      addToast({ type: 'warning', title: 'Uyarı', message: 'Tarifeli tedavi için hekim seçimi zorunludur.' });
      return;
    }
    try {
      setSaving(true);
      await OrthodonticsService.createTrack(orthoCase.id, {
        trackType,
        tariffId: tariffId || undefined,
        doctorId: tariffId ? doctorId : undefined,
        applianceInfo: applianceInfo || undefined,
        notes: notes || undefined,
      });
      addToast({
        type: 'success',
        title: 'Tedavi Başlatıldı',
        message: tariffId
          ? `${TRACK_TYPE_LABELS[trackType]} — ${selectedTariff?.masterTreatment.name ?? ''} plan kalemi oluşturuldu (DRAFT).`
          : `${TRACK_TYPE_LABELS[trackType]} takibi başlatıldı.`,
      });
      setTariffId('');
      setApplianceInfo('');
      setNotes('');
      setFormOpen(false);
      await onChanged();
    } catch (e) {
      console.error('Tedavi başlatılamadı', e);
      addToast({ type: 'error', title: 'Hata', message: 'Tedavi başlatılamadı.' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (track: OrthoTreatmentTrack, status: string) => {
    try {
      await OrthodonticsService.updateTrack(track.id, {
        status,
        endDate: status === 'TAMAMLANDI' ? new Date().toISOString() : undefined,
      });
      await onChanged();
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Track durumu güncellenemedi.' });
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider m-0">
          Tedavi Track&apos;leri ({orthoCase.tracks.length})
        </p>
        <button
          onClick={() => setFormOpen(o => !o)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[12px] font-bold transition-colors shadow-sm"
        >
          {formOpen ? 'Formu Kapat' : <><Plus size={13} /> Yeni Tedavi</>}
        </button>
      </div>

      {formOpen && (
        <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/10 space-y-4">
          <h5 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 m-0">Yeni Tedavi Başlat</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tedavi Tipi <span className="text-metronic-danger">*</span></label>
              <select className="m-input" value={trackType} onChange={e => setTrackType(e.target.value)}>
                {Object.entries(TRACK_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tarife / Kademe</label>
              <select className="m-input" value={tariffId} onChange={e => setTariffId(e.target.value)}>
                <option value="">Faturasız takip (tarife yok)</option>
                {orthoTariffs.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.masterTreatment.name} — {formatCurrency(Number(t.price))}
                  </option>
                ))}
              </select>
              {orthoTariffs.length === 0 && (
                <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle size={11} /> Ortodonti tarifesi bulunamadı — katalog seed edilmemiş olabilir.
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Hekim {tariffId && <span className="text-metronic-danger">*</span>}
              </label>
              <select className="m-input" value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                <option value="">Seçiniz...</option>
                {doctors.map(doc => <option key={doc.id} value={doc.id}>{`Dt. ${doc.firstName} ${doc.lastName}`}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aparey Bilgisi</label>
              <input type="text" className="m-input" placeholder="Marka/malzeme, ilk tel veya set bilgisi..."
                value={applianceInfo} onChange={e => setApplianceInfo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Not</label>
              <input type="text" className="m-input" placeholder="Çekim kararı, cerrahi gereksinim vb."
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
          {selectedTariff && (
            <div className="flex items-center justify-between p-3 bg-metronic-primary/5 dark:bg-metronic-primary/10 rounded-lg border border-metronic-primary/20">
              <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">{selectedTariff.masterTreatment.name}</span>
              <span className="text-[14px] font-black text-metronic-primary">{formatCurrency(Number(selectedTariff.price))}</span>
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-metronic-primary hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-bold transition-colors shadow-sm"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Tedaviyi Başlat
            </button>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 m-0">
            Tarife seçildiğinde sistem otomatik olarak DRAFT bir tedavi planı kalemi oluşturur;
            sözleşme ve tahsilat, Tedavi Planları sekmesindeki mevcut akışla yürür.
          </p>
        </div>
      )}

      {orthoCase.tracks.length === 0 ? (
        !formOpen && <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-[13px]">Henüz tedavi başlatılmamış.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tedavi Tipi</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tarife / Kademe</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Tutar</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Başlangıç</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">İlerleme</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {orthoCase.tracks.map(track => {
                const progressCount = track.adjustmentVisits.length + track.activationLogs.length + track.alignerSets.length;
                return (
                  <tr key={track.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {TRACK_TYPE_LABELS[track.trackType] ?? track.trackType}
                      {track.applianceInfo && <div className="text-[11px] font-normal text-slate-400 mt-0.5">{track.applianceInfo}</div>}
                    </td>
                    <td className="py-3 px-4 text-[13px] text-slate-600 dark:text-slate-300">
                      {track.treatmentItem?.tariff?.masterTreatment?.name ?? <span className="text-slate-400">Faturasız takip</span>}
                    </td>
                    <td className="py-3 px-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 text-right whitespace-nowrap">
                      {track.treatmentItem ? formatCurrency(Number(track.treatmentItem.price)) : '—'}
                    </td>
                    <td className="py-3 px-4 text-[12px] text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDate(track.startDate)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-bold rounded">
                        {progressCount} kayıt
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        className="m-input !h-8 !py-0 text-[12px] w-32"
                        value={track.status}
                        onChange={e => handleStatusChange(track, e.target.value)}
                      >
                        {Object.entries(TRACK_STATUS_LABELS).map(([value, { label }]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Zaman Çizelgesi (Faz 05) ────────────────────────────────────────────────

type TimelineEntry = {
  id: string;
  kind: 'VISIT' | 'ACTIVATION' | 'ALIGNER';
  date: string;
  title: string;
  details: string[];
  isEmergency?: boolean;
};

const defaultVisitForm = {
  visitDate: new Date().toISOString().slice(0, 10),
  wireSize: '',
  elasticType: '',
  iprDone: false,
  iprNote: '',
  complianceNote: '',
  nextVisitWeeks: '',
  isEmergency: false,
  note: '',
};

const defaultActivationForm = {
  date: new Date().toISOString().slice(0, 10),
  logType: 'VIDA_TURU',
  value: '',
  note: '',
};

const defaultAlignerForm = {
  deliveryDate: new Date().toISOString().slice(0, 10),
  setNo: '',
  isRefinement: false,
  wearComplianceNote: '',
};

function TimelineSection({
  orthoCase,
  onChanged,
}: {
  orthoCase: OrthoCase;
  onChanged: () => Promise<void> | void;
}) {
  const { addToast } = useToastStore();
  const [selectedTrackId, setSelectedTrackId] = useState<string>(() => {
    const active = orthoCase.tracks.find(t => t.status === 'AKTIF');
    return active?.id ?? orthoCase.tracks[0]?.id ?? '';
  });
  const [entryKind, setEntryKind] = useState<'VISIT' | 'ACTIVATION' | 'ALIGNER'>('VISIT');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TimelineEntry | null>(null);

  const [visitForm, setVisitForm] = useState({ ...defaultVisitForm });
  const [activationForm, setActivationForm] = useState({ ...defaultActivationForm });
  const [alignerForm, setAlignerForm] = useState({ ...defaultAlignerForm });

  const track = orthoCase.tracks.find(t => t.id === selectedTrackId) ?? orthoCase.tracks[0] ?? null;

  // Seçili track değiştiyse ve artık yoksa senkronize et (render sırasında, efekt olmadan)
  const [prevCaseId, setPrevCaseId] = useState(orthoCase.id);
  if (prevCaseId !== orthoCase.id) {
    setPrevCaseId(orthoCase.id);
    const active = orthoCase.tracks.find(t => t.status === 'AKTIF');
    setSelectedTrackId(active?.id ?? orthoCase.tracks[0]?.id ?? '');
  }

  const timeline: TimelineEntry[] = useMemo(() => {
    if (!track) return [];
    const entries: TimelineEntry[] = [];
    for (const v of track.adjustmentVisits) {
      const details: string[] = [];
      if (v.wireSize) details.push(`Tel: ${v.wireSize}`);
      if (v.elasticType) details.push(`Elastik: ${v.elasticType}`);
      if (v.iprDone) details.push(`IPR: ${v.iprNote || 'yapıldı'}`);
      if (v.complianceNote) details.push(`Uyum: ${v.complianceNote}`);
      if (v.nextVisitWeeks) details.push(`Sonraki randevu: ${v.nextVisitWeeks} hafta`);
      if (v.note) details.push(v.note);
      entries.push({
        id: v.id,
        kind: 'VISIT',
        date: v.visitDate,
        title: v.isEmergency ? 'Acil Ziyaret' : 'Kontrol Ziyareti',
        details,
        isEmergency: v.isEmergency,
      });
    }
    for (const a of track.activationLogs) {
      const typeInfo = ACTIVATION_TYPES.find(t2 => t2.value === a.logType);
      const details: string[] = [];
      if (a.value != null) details.push(`Değer: ${a.value} ${a.unit ? a.unit.toLowerCase() : ''}`.trim());
      if (a.note) details.push(a.note);
      entries.push({
        id: a.id,
        kind: 'ACTIVATION',
        date: a.date,
        title: typeInfo?.label ?? a.logType,
        details,
      });
    }
    for (const s of track.alignerSets) {
      const details: string[] = [];
      if (s.isRefinement) details.push('Refinement seti');
      if (s.wearComplianceNote) details.push(`Uyum: ${s.wearComplianceNote}`);
      entries.push({
        id: s.id,
        kind: 'ALIGNER',
        date: s.deliveryDate,
        title: `Plak Seti #${s.setNo} Teslimi`,
        details,
      });
    }
    return entries.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [track]);

  const handleSave = async () => {
    if (!track) return;
    try {
      setSaving(true);
      if (entryKind === 'VISIT') {
        await OrthodonticsService.addAdjustmentVisit(track.id, {
          visitDate: visitForm.visitDate,
          wireSize: visitForm.wireSize || undefined,
          elasticType: visitForm.elasticType || undefined,
          iprDone: visitForm.iprDone,
          iprNote: visitForm.iprNote || undefined,
          complianceNote: visitForm.complianceNote || undefined,
          nextVisitWeeks: visitForm.nextVisitWeeks !== '' ? Number(visitForm.nextVisitWeeks) : undefined,
          isEmergency: visitForm.isEmergency,
          note: visitForm.note || undefined,
        } as any);
        setVisitForm({ ...defaultVisitForm });
      } else if (entryKind === 'ACTIVATION') {
        const typeInfo = ACTIVATION_TYPES.find(t2 => t2.value === activationForm.logType);
        await OrthodonticsService.addActivationLog(track.id, {
          date: activationForm.date,
          logType: activationForm.logType,
          value: activationForm.value !== '' ? Number(activationForm.value) : undefined,
          unit: typeInfo?.unit,
          note: activationForm.note || undefined,
        } as any);
        setActivationForm({ ...defaultActivationForm });
      } else {
        if (alignerForm.setNo === '') {
          addToast({ type: 'warning', title: 'Uyarı', message: 'Set numarası zorunludur.' });
          return;
        }
        await OrthodonticsService.addAlignerSet(track.id, {
          setNo: Number(alignerForm.setNo),
          deliveryDate: alignerForm.deliveryDate,
          isRefinement: alignerForm.isRefinement,
          wearComplianceNote: alignerForm.wearComplianceNote || undefined,
        } as any);
        setAlignerForm({ ...defaultAlignerForm });
      }
      addToast({ type: 'success', title: 'Kaydedildi', message: 'İlerleme kaydı eklendi.' });
      await onChanged();
    } catch (e) {
      console.error('İlerleme kaydı eklenemedi', e);
      addToast({ type: 'error', title: 'Hata', message: 'İlerleme kaydı eklenemedi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: TimelineEntry) => {
    try {
      if (entry.kind === 'VISIT') await OrthodonticsService.deleteAdjustmentVisit(entry.id);
      else if (entry.kind === 'ACTIVATION') await OrthodonticsService.deleteActivationLog(entry.id);
      else await OrthodonticsService.deleteAlignerSet(entry.id);
      setConfirmDelete(null);
      await onChanged();
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Kayıt silinemedi.' });
    }
  };

  if (orthoCase.tracks.length === 0) {
    return (
      <div className="p-6">
        <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-[13px]">
          Zaman çizelgesi için önce Tedavi Planı sekmesinden bir tedavi başlatın.
        </div>
      </div>
    );
  }

  const kindBadge = (kind: TimelineEntry['kind'], isEmergency?: boolean) => {
    if (isEmergency) return 'bg-red-100 text-red-700 border border-red-200';
    if (kind === 'VISIT') return 'bg-blue-100 text-blue-700 border border-blue-200';
    if (kind === 'ACTIVATION') return 'bg-amber-100 text-amber-700 border border-amber-200';
    return 'bg-violet-100 text-violet-700 border border-violet-200';
  };

  const kindLabel = (kind: TimelineEntry['kind']) =>
    kind === 'VISIT' ? 'Ziyaret' : kind === 'ACTIVATION' ? 'Aktivasyon' : 'Plak Seti';

  return (
    <div className="p-6 space-y-5">
      {/* Track seçimi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <p className="text-[12px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider m-0">
          Aktif Tedavi Zaman Çizelgesi ({timeline.length} kayıt)
        </p>
        <select
          className="m-input !h-8 !py-0 text-[12px] w-full md:w-72"
          value={track?.id ?? ''}
          onChange={e => setSelectedTrackId(e.target.value)}
        >
          {orthoCase.tracks.map(t => (
            <option key={t.id} value={t.id}>
              {TRACK_TYPE_LABELS[t.trackType] ?? t.trackType} — {TRACK_STATUS_LABELS[t.status]?.label ?? t.status}
            </option>
          ))}
        </select>
      </div>

      {/* Hızlı kayıt formu */}
      <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          {(['VISIT', 'ACTIVATION', 'ALIGNER'] as const).map(kind => (
            <button
              key={kind}
              onClick={() => setEntryKind(kind)}
              className={`px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-all ${
                entryKind === kind
                  ? 'border-metronic-primary bg-metronic-primary/5 text-metronic-primary dark:bg-metronic-primary/10'
                  : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-metronic-primary/50'
              }`}
            >
              {kindLabel(kind)}
            </button>
          ))}
        </div>

        {entryKind === 'VISIT' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tarih</label>
              <input type="date" className="m-input" value={visitForm.visitDate}
                onChange={e => setVisitForm(f => ({ ...f, visitDate: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tel Boyutu</label>
              <input type="text" className="m-input" placeholder="Örn: 0.014 NiTi" value={visitForm.wireSize}
                onChange={e => setVisitForm(f => ({ ...f, wireSize: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Elastik Tipi</label>
              <input type="text" className="m-input" placeholder="Class II, 12 saat/gün..." value={visitForm.elasticType}
                onChange={e => setVisitForm(f => ({ ...f, elasticType: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sonraki Randevu (hafta)</label>
              <input type="number" min="1" className="m-input" value={visitForm.nextVisitWeeks}
                onChange={e => setVisitForm(f => ({ ...f, nextVisitWeeks: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Uyum Notu</label>
              <input type="text" className="m-input" placeholder="Hasta uyumu (elastik/plak kullanımı)..." value={visitForm.complianceNote}
                onChange={e => setVisitForm(f => ({ ...f, complianceNote: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Not</label>
              <input type="text" className="m-input" placeholder="Ek not..." value={visitForm.note}
                onChange={e => setVisitForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="flex items-center gap-5 md:col-span-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={visitForm.iprDone}
                  onChange={e => setVisitForm(f => ({ ...f, iprDone: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30" />
                <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">IPR yapıldı</span>
              </label>
              {visitForm.iprDone && (
                <input type="text" className="m-input flex-1" placeholder="IPR bölgesi, mm..." value={visitForm.iprNote}
                  onChange={e => setVisitForm(f => ({ ...f, iprNote: e.target.value }))} />
              )}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={visitForm.isEmergency}
                  onChange={e => setVisitForm(f => ({ ...f, isEmergency: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-red-500 focus:ring-red-500/30" />
                <span className="text-[12px] font-bold text-red-600 dark:text-red-400">Acil (kırık braket / batan tel)</span>
              </label>
            </div>
          </div>
        )}

        {entryKind === 'ACTIVATION' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tarih</label>
              <input type="date" className="m-input" value={activationForm.date}
                onChange={e => setActivationForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tür</label>
              <select className="m-input" value={activationForm.logType}
                onChange={e => setActivationForm(f => ({ ...f, logType: e.target.value }))}>
                {ACTIVATION_TYPES.map(t2 => <option key={t2.value} value={t2.value}>{t2.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Değer ({ACTIVATION_TYPES.find(t2 => t2.value === activationForm.logType)?.unit.toLowerCase()})
              </label>
              <input type="number" step="0.5" className="m-input" value={activationForm.value}
                onChange={e => setActivationForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Not</label>
              <input type="text" className="m-input" value={activationForm.note}
                onChange={e => setActivationForm(f => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
        )}

        {entryKind === 'ALIGNER' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Teslim Tarihi</label>
              <input type="date" className="m-input" value={alignerForm.deliveryDate}
                onChange={e => setAlignerForm(f => ({ ...f, deliveryDate: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Set No <span className="text-metronic-danger">*</span></label>
              <input type="number" min="1" className="m-input" value={alignerForm.setNo}
                onChange={e => setAlignerForm(f => ({ ...f, setNo: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Uyum / Tracking Notu</label>
              <input type="text" className="m-input" placeholder="Günlük 20-22 saat kullanım..." value={alignerForm.wearComplianceNote}
                onChange={e => setAlignerForm(f => ({ ...f, wearComplianceNote: e.target.value }))} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={alignerForm.isRefinement}
                  onChange={e => setAlignerForm(f => ({ ...f, isRefinement: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30" />
                <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">Refinement seti</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !track}
            className="flex items-center gap-2 px-5 py-2 bg-metronic-primary hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-bold transition-colors shadow-sm"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Kayıt Ekle
          </button>
        </div>
      </div>

      {/* Kronolojik liste */}
      {timeline.length === 0 ? (
        <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-[13px]">
          Bu tedavi için henüz ilerleme kaydı yok.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
          {timeline.map(entry => (
            <div key={`${entry.kind}-${entry.id}`} className="flex items-start gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
              <div className="w-24 flex-shrink-0 pt-0.5">
                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(entry.date)}</span>
              </div>
              <div className="flex-shrink-0 pt-0.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${kindBadge(entry.kind, entry.isEmergency)}`}>
                  {entry.isEmergency ? 'Acil' : kindLabel(entry.kind)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 m-0">{entry.title}</p>
                {entry.details.length > 0 && (
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 mb-0">{entry.details.join(' · ')}</p>
                )}
              </div>
              <button
                onClick={() => setConfirmDelete(entry)}
                className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
                title="Sil"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Kaydı Sil"
        message="Bu ilerleme kaydını silmek istediğinize emin misiniz?"
      />
    </div>
  );
}

// ─── Kayıt Galerisi (Faz 02 & 07) ────────────────────────────────────────────

const defaultUploadForm = {
  recordType: 'FOTO',
  phase: 'FAZ02',
  takenAt: new Date().toISOString().slice(0, 10),
  description: '',
};

function RecordGallerySection({
  orthoCase,
  onChanged,
}: {
  orthoCase: OrthoCase;
  onChanged: () => Promise<void> | void;
}) {
  const { addToast } = useToastStore();
  const [uploadForm, setUploadForm] = useState({ ...defaultUploadForm });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');
  const [previewRecord, setPreviewRecord] = useState<OrthoRecordSet | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const records = orthoCase.recordSets;
  const filtered = phaseFilter === 'ALL' ? records : records.filter(r => r.phase === phaseFilter);

  const faz02Records = records.filter(r => r.phase === 'FAZ02');
  const faz07Records = records.filter(r => r.phase === 'FAZ07');
  const showComparison = faz02Records.length > 0 && faz07Records.length > 0;

  const handleUpload = async () => {
    if (!selectedFile) {
      addToast({ type: 'warning', title: 'Uyarı', message: 'Lütfen bir dosya seçin.' });
      return;
    }
    try {
      setUploading(true);
      await OrthodonticsService.uploadRecord(orthoCase.id, selectedFile, {
        recordType: uploadForm.recordType,
        phase: uploadForm.phase,
        description: uploadForm.description || undefined,
        takenAt: uploadForm.takenAt || undefined,
      });
      addToast({ type: 'success', title: 'Yüklendi', message: 'Kayıt galeriye eklendi.' });
      setSelectedFile(null);
      setUploadForm({ ...defaultUploadForm });
      if (fileInputRef.current) fileInputRef.current.value = '';
      await onChanged();
    } catch (e) {
      console.error('Kayıt yüklenemedi', e);
      addToast({ type: 'error', title: 'Hata', message: 'Kayıt yüklenemedi.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await OrthodonticsService.deleteRecord(id);
      setConfirmDeleteId(null);
      setPreviewRecord(null);
      await onChanged();
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Kayıt silinemedi.' });
    }
  };

  const RecordCard = ({ record }: { record: OrthoRecordSet }) => (
    <div className="group relative bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div className="aspect-[4/3] bg-slate-50 dark:bg-white/5 relative overflow-hidden flex items-center justify-center">
        {record.fileType?.startsWith('image/') ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic backend-hosted file URL, not a static asset next/image can optimize
          <img src={resolveDocumentUrl(record.fileUrl)} alt={record.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-600">
            <ScanLine size={36} />
            <span className="text-[10px] font-bold uppercase">{RECORD_TYPE_LABELS[record.recordType] ?? record.recordType}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button onClick={() => setPreviewRecord(record)} className="w-8 h-8 rounded-full bg-white text-slate-700 flex items-center justify-center hover:bg-metronic-primary hover:text-white transition-colors"><Eye size={14} /></button>
          <button onClick={() => setConfirmDeleteId(record.id)} className="w-8 h-8 rounded-full bg-white text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14} /></button>
        </div>
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-600 whitespace-nowrap">
          {record.phase}
        </span>
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate m-0">{record.name}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 mb-0">{formatDate(record.takenAt)}</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Yükleme formu */}
      <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/10 space-y-4">
        <h5 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 m-0">Yeni Kayıt Yükle</h5>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kayıt Tipi</label>
            <select className="m-input" value={uploadForm.recordType} onChange={e => setUploadForm(f => ({ ...f, recordType: e.target.value }))}>
              {Object.entries(RECORD_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faz Etiketi</label>
            <select className="m-input" value={uploadForm.phase} onChange={e => setUploadForm(f => ({ ...f, phase: e.target.value }))}>
              {Object.entries(PHASE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Çekim Tarihi</label>
            <input type="date" className="m-input" value={uploadForm.takenAt}
              onChange={e => setUploadForm(f => ({ ...f, takenAt: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Açıklama</label>
            <input type="text" className="m-input" placeholder="İsteğe bağlı..." value={uploadForm.description}
              onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <input ref={fileInputRef} type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); setSelectedFile(e.dataTransfer.files?.[0] || null); }}
          className="p-6 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl text-center bg-white dark:bg-white/[0.02] hover:border-metronic-primary/50 transition-colors cursor-pointer"
        >
          <UploadCloud className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={26} />
          {selectedFile ? (
            <p className="text-[12px] font-bold text-metronic-primary m-0">{selectedFile.name} <span className="text-slate-400 font-medium">({(selectedFile.size / 1024).toFixed(0)} KB)</span></p>
          ) : (
            <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 m-0">Dosyayı sürükleyin veya <span className="text-metronic-primary">bilgisayarınızdan seçin</span></p>
          )}
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 mb-0">Foto/röntgen/STL — Maks 25MB</p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="flex items-center gap-2 px-5 py-2 bg-metronic-primary hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-bold transition-colors shadow-sm"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />} Yükle
          </button>
        </div>
      </div>

      {/* Öncesi/Sonrası karşılaştırma */}
      {showComparison && (
        <div>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-3">
            Öncesi / Sonrası Karşılaştırma (Faz 02 → Faz 07)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/10">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Öncesi — {PHASE_LABELS.FAZ02}</p>
              <div className="grid grid-cols-2 gap-3">
                {faz02Records.map(r => <RecordCard key={r.id} record={r} />)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/10">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Sonrası — {PHASE_LABELS.FAZ07}</p>
              <div className="grid grid-cols-2 gap-3">
                {faz07Records.map(r => <RecordCard key={r.id} record={r} />)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Galeri */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider m-0">
            Tüm Kayıtlar ({filtered.length})
          </p>
          <select className="m-input !h-8 !py-0 text-[12px] w-56" value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)}>
            <option value="ALL">Tüm Fazlar</option>
            {Object.entries(PHASE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-[13px]">Bu filtreye uygun kayıt yok.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map(r => <RecordCard key={r.id} record={r} />)}
          </div>
        )}
      </div>

      {/* Önizleme */}
      {previewRecord && (
        <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewRecord(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white dark:bg-[#1c1f2e] rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white m-0">{previewRecord.name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-0">{PHASE_LABELS[previewRecord.phase] ?? previewRecord.phase} · {formatDate(previewRecord.takenAt)}</p>
              </div>
              <button onClick={() => setPreviewRecord(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0f1117] flex items-center justify-center">
              {previewRecord.fileType?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic backend-hosted file URL, not a static asset next/image can optimize
                <img src={resolveDocumentUrl(previewRecord.fileUrl)} alt={previewRecord.name} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              ) : (
                <div className="p-16 text-center">
                  <ScanLine size={56} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 dark:text-slate-400 font-bold">Bu dosya türü için önizleme desteklenmiyor.</p>
                  <button
                    onClick={() => window.open(resolveDocumentUrl(previewRecord.fileUrl), '_blank')}
                    className="mt-4 px-6 py-2 bg-metronic-primary text-white rounded-lg font-bold"
                  >
                    Dosyayı İndir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        title="Kaydı Sil"
        message="Bu galeri kaydını silmek istediğinize emin misiniz?"
      />
    </div>
  );
}

// ─── Mini Vida ────────────────────────────────────────────────────────────────

const defaultMiniScrewForm = {
  region: '',
  purpose: '',
  placementDate: new Date().toISOString().slice(0, 10),
  tariffId: '',
  doctorId: '',
  note: '',
};

function MiniScrewSection({
  orthoCase,
  orthoTariffs,
  doctors,
  onChanged,
}: {
  orthoCase: OrthoCase;
  orthoTariffs: Tariff[];
  doctors: Employee[];
  onChanged: () => Promise<void> | void;
}) {
  const { addToast } = useToastStore();
  const [formOpen, setFormOpen] = useState(orthoCase.miniScrews.length === 0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...defaultMiniScrewForm });
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>({});

  const miniScrewTariffs = useMemo(() => {
    const named = orthoTariffs.filter(t => t.masterTreatment.name.toLowerCase().includes('mini vida'));
    return named.length > 0 ? named : orthoTariffs;
  }, [orthoTariffs]);

  const handleCreate = async () => {
    if (!form.region.trim()) {
      addToast({ type: 'warning', title: 'Uyarı', message: 'Bölge zorunludur.' });
      return;
    }
    if (form.tariffId && !form.doctorId) {
      addToast({ type: 'warning', title: 'Uyarı', message: 'Faturalı mini vida için hekim seçimi zorunludur.' });
      return;
    }
    try {
      setSaving(true);
      await OrthodonticsService.addMiniScrew(orthoCase.id, {
        region: form.region,
        purpose: form.purpose || undefined,
        placementDate: form.placementDate,
        tariffId: form.tariffId || undefined,
        doctorId: form.tariffId ? form.doctorId : undefined,
        note: form.note || undefined,
      } as any);
      addToast({ type: 'success', title: 'Kaydedildi', message: 'Mini vida kaydı eklendi.' });
      setForm({ ...defaultMiniScrewForm });
      setFormOpen(false);
      await onChanged();
    } catch (e) {
      console.error('Mini vida kaydedilemedi', e);
      addToast({ type: 'error', title: 'Hata', message: 'Mini vida kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (screw: OrthoMiniScrewRecord, status: string) => {
    try {
      await OrthodonticsService.updateMiniScrew(screw.id, {
        status,
        removalDate: status === 'CIKARILDI' || status === 'KAYBEDILDI' ? new Date().toISOString() : undefined,
      });
      await onChanged();
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Durum güncellenemedi.' });
    }
  };

  const handleAddFollowUp = async (screw: OrthoMiniScrewRecord) => {
    const draft = followUpDrafts[screw.id];
    if (!draft) return;
    try {
      await OrthodonticsService.updateMiniScrew(screw.id, {
        followUpDates: [...screw.followUpDates, draft],
      });
      setFollowUpDrafts(prev => ({ ...prev, [screw.id]: '' }));
      await onChanged();
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Kontrol tarihi eklenemedi.' });
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider m-0">
          Mini Vida (TAD) Kayıtları ({orthoCase.miniScrews.length})
        </p>
        <button
          onClick={() => setFormOpen(o => !o)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[12px] font-bold transition-colors shadow-sm"
        >
          {formOpen ? 'Formu Kapat' : <><Plus size={13} /> Yeni Mini Vida</>}
        </button>
      </div>

      {formOpen && (
        <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/10 space-y-4">
          <h5 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 m-0">Yeni Mini Vida Kaydı</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bölge <span className="text-metronic-danger">*</span></label>
              <input type="text" className="m-input" placeholder="Örn: Üst sağ bukkal 15-16 arası"
                value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amaç</label>
              <input type="text" className="m-input" placeholder="Ankraj amacı..."
                value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Yerleştirme Tarihi</label>
              <input type="date" className="m-input" value={form.placementDate}
                onChange={e => setForm(f => ({ ...f, placementDate: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tarife (Faturalama)</label>
              <select className="m-input" value={form.tariffId} onChange={e => setForm(f => ({ ...f, tariffId: e.target.value }))}>
                <option value="">Faturasız kayıt</option>
                {miniScrewTariffs.map(t => (
                  <option key={t.id} value={t.id}>{t.masterTreatment.name} — {formatCurrency(Number(t.price))}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Hekim {form.tariffId && <span className="text-metronic-danger">*</span>}
              </label>
              <select className="m-input" value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}>
                <option value="">Seçiniz...</option>
                {doctors.map(doc => <option key={doc.id} value={doc.id}>{`Dt. ${doc.firstName} ${doc.lastName}`}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Not</label>
              <input type="text" className="m-input" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-metronic-primary hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-bold transition-colors shadow-sm"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Kaydet
            </button>
          </div>
        </div>
      )}

      {orthoCase.miniScrews.length === 0 ? (
        !formOpen && <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-[13px]">Henüz mini vida kaydı yok.</div>
      ) : (
        <div className="space-y-3">
          {orthoCase.miniScrews.map(screw => {
            const statusInfo = MINISCREW_STATUS_LABELS[screw.status] ?? MINISCREW_STATUS_LABELS.AKTIF;
            return (
              <div key={screw.id} className="p-4 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 m-0">{screw.region}</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 mb-0">
                      {screw.purpose || 'Amaç belirtilmemiş'} · Yerleştirme: {formatDate(screw.placementDate)}
                      {screw.treatmentItem && <> · {formatCurrency(Number(screw.treatmentItem.price))}</>}
                    </p>
                  </div>
                  <select
                    className="m-input !h-8 !py-0 text-[12px] w-36"
                    value={screw.status}
                    onChange={e => handleStatusChange(screw, e.target.value)}
                  >
                    {Object.entries(MINISCREW_STATUS_LABELS).map(([value, { label }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${statusInfo.style}`}>{statusInfo.label}</span>
                  {screw.followUpDates.map((d, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-bold rounded whitespace-nowrap">
                      Kontrol: {formatDate(d)}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="m-input !h-8 !py-0 text-[12px] w-40"
                    value={followUpDrafts[screw.id] ?? ''}
                    onChange={e => setFollowUpDrafts(prev => ({ ...prev, [screw.id]: e.target.value }))}
                  />
                  <button
                    onClick={() => handleAddFollowUp(screw)}
                    disabled={!followUpDrafts[screw.id]}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-bold transition-colors"
                  >
                    <CalendarPlus size={12} /> Kontrol Tarihi Ekle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Büyüme Değerlendirmesi ─────────────────────────────────────────────────

const defaultGrowthForm = {
  xrayDate: new Date().toISOString().slice(0, 10),
  skeletalAge: '',
  growthPhase: '',
  note: '',
};

function GrowthAssessmentSection({
  orthoCase,
  isAgeRelevant,
  patientAge,
  onChanged,
}: {
  orthoCase: OrthoCase;
  isAgeRelevant: boolean;
  patientAge: number | null;
  onChanged: () => Promise<void> | void;
}) {
  const { addToast } = useToastStore();
  const [formOpen, setFormOpen] = useState(orthoCase.growthAssessments.length === 0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...defaultGrowthForm });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      setSaving(true);
      await OrthodonticsService.addGrowthAssessment(orthoCase.id, {
        xrayDate: form.xrayDate,
        skeletalAge: form.skeletalAge || undefined,
        growthPhase: form.growthPhase || undefined,
        note: form.note || undefined,
      } as Partial<OrthoGrowthAssessment>);
      addToast({ type: 'success', title: 'Kaydedildi', message: 'Büyüme değerlendirmesi eklendi.' });
      setForm({ ...defaultGrowthForm });
      setFormOpen(false);
      await onChanged();
    } catch (e) {
      console.error('Büyüme değerlendirmesi kaydedilemedi', e);
      addToast({ type: 'error', title: 'Hata', message: 'Büyüme değerlendirmesi kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await OrthodonticsService.deleteGrowthAssessment(id);
      setConfirmDeleteId(null);
      await onChanged();
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Kayıt silinemedi.' });
    }
  };

  return (
    <div className="p-6 space-y-5">
      {!isAgeRelevant && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
          <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-700 dark:text-amber-400 m-0">
            Bu hasta {patientAge} yaşında — büyüme takibi öncelikle 6-16 yaş aralığındaki büyüme çağı hastaları için anlamlıdır.
            Yine de gerekirse bu sekmeden kayıt girebilirsiniz.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[12px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider m-0">
          Büyüme Değerlendirmeleri ({orthoCase.growthAssessments.length})
        </p>
        <button
          onClick={() => setFormOpen(o => !o)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[12px] font-bold transition-colors shadow-sm"
        >
          {formOpen ? 'Formu Kapat' : <><Plus size={13} /> Yeni Değerlendirme</>}
        </button>
      </div>

      {formOpen && (
        <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/10 space-y-4">
          <h5 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 m-0">Yeni Büyüme Değerlendirmesi</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">El-Bilek Röntgen Tarihi</label>
              <input type="date" className="m-input" value={form.xrayDate}
                onChange={e => setForm(f => ({ ...f, xrayDate: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">İskelet Yaşı</label>
              <input type="text" className="m-input" placeholder="Örn: 11 yaş 6 ay" value={form.skeletalAge}
                onChange={e => setForm(f => ({ ...f, skeletalAge: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Büyüme Atılımı Fazı</label>
              <select className="m-input" value={form.growthPhase} onChange={e => setForm(f => ({ ...f, growthPhase: e.target.value }))}>
                <option value="">Seçiniz...</option>
                {Object.entries(GROWTH_PHASE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Not</label>
            <textarea className="m-input resize-none" rows={2} value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-metronic-primary hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-bold transition-colors shadow-sm"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Kaydet
            </button>
          </div>
        </div>
      )}

      {orthoCase.growthAssessments.length === 0 ? (
        !formOpen && <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-[13px]">Henüz büyüme değerlendirmesi girilmemiş.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Röntgen Tarihi</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">İskelet Yaşı</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Büyüme Fazı</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Not</th>
                <th className="py-3 px-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {orthoCase.growthAssessments.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 text-[13px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatDate(a.xrayDate)}</td>
                  <td className="py-3 px-4 text-[13px] text-slate-600 dark:text-slate-300">{a.skeletalAge || '—'}</td>
                  <td className="py-3 px-4 text-[13px] text-slate-600 dark:text-slate-300">{a.growthPhase ? GROWTH_PHASE_LABELS[a.growthPhase] ?? a.growthPhase : '—'}</td>
                  <td className="py-3 px-4 text-[12px] text-slate-500 dark:text-slate-400">{a.note || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setConfirmDeleteId(a.id)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        title="Kaydı Sil"
        message="Bu büyüme değerlendirmesini silmek istediğinize emin misiniz?"
      />
    </div>
  );
}

// ─── Retansiyon (Faz 08) ─────────────────────────────────────────────────────

const defaultRetentionForm = {
  retainerType: 'ESSIX',
  archCoverage: 'CIFT',
  deliveryDate: new Date().toISOString().slice(0, 10),
  usageInstruction: '',
  note: '',
};

function RetentionPlanSection({
  orthoCase,
  onChanged,
}: {
  orthoCase: OrthoCase;
  onChanged: () => Promise<void> | void;
}) {
  const { addToast } = useToastStore();
  const allTracksFinished = orthoCase.tracks.length > 0 && orthoCase.tracks.every(t => t.status === 'TAMAMLANDI' || t.status === 'IPTAL');
  const [formOpen, setFormOpen] = useState(orthoCase.retentionPlans.length === 0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...defaultRetentionForm });
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      setSaving(true);
      const followUpSchedule = RETENTION_SCHEDULE_PRESETS
        .filter(label => schedule[label])
        .map(label => ({ label, dueDate: schedule[label] }));
      await OrthodonticsService.addRetentionPlan(orthoCase.id, {
        retainerType: form.retainerType,
        archCoverage: form.archCoverage,
        deliveryDate: form.deliveryDate || undefined,
        usageInstruction: form.usageInstruction || undefined,
        followUpSchedule: followUpSchedule.length > 0 ? followUpSchedule : undefined,
        note: form.note || undefined,
      } as Partial<OrthoRetentionPlan>);
      addToast({ type: 'success', title: 'Kaydedildi', message: 'Retansiyon planı oluşturuldu.' });
      setForm({ ...defaultRetentionForm });
      setSchedule({});
      setFormOpen(false);
      await onChanged();
    } catch (e) {
      console.error('Retansiyon planı kaydedilemedi', e);
      addToast({ type: 'error', title: 'Hata', message: 'Retansiyon planı kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (plan: OrthoRetentionPlan, status: string) => {
    try {
      await OrthodonticsService.updateRetentionPlan(plan.id, { status });
      await onChanged();
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Durum güncellenemedi.' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await OrthodonticsService.deleteRetentionPlan(id);
      setConfirmDeleteId(null);
      await onChanged();
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Kayıt silinemedi.' });
    }
  };

  return (
    <div className="p-6 space-y-5">
      {allTracksFinished && orthoCase.retentionPlans.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
          <ShieldCheck size={15} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-blue-700 dark:text-blue-400 m-0">
            Bu vakadaki tüm tedavi track&apos;leri tamamlanmış görünüyor — retansiyon planı oluşturmanın zamanı gelmiş olabilir.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[12px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider m-0">
          Retansiyon Planları ({orthoCase.retentionPlans.length})
        </p>
        <button
          onClick={() => setFormOpen(o => !o)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[12px] font-bold transition-colors shadow-sm"
        >
          {formOpen ? 'Formu Kapat' : <><Plus size={13} /> Yeni Retansiyon Planı</>}
        </button>
      </div>

      {formOpen && (
        <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/10 space-y-4">
          <h5 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 m-0">Yeni Retansiyon Planı</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Retainer Tipi</label>
              <select className="m-input" value={form.retainerType} onChange={e => setForm(f => ({ ...f, retainerType: e.target.value }))}>
                {Object.entries(RETAINER_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ark Kapsamı</label>
              <select className="m-input" value={form.archCoverage} onChange={e => setForm(f => ({ ...f, archCoverage: e.target.value }))}>
                <option value="TEK">Tek Çene</option>
                <option value="CIFT">Çift Çene</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Teslim Tarihi</label>
              <input type="date" className="m-input" value={form.deliveryDate}
                onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kullanım Talimatı</label>
            <input type="text" className="m-input" placeholder="İlk 3-6 ay tam gün, sonra sadece gece..." value={form.usageInstruction}
              onChange={e => setForm(f => ({ ...f, usageInstruction: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kontrol Takvimi</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {RETENTION_SCHEDULE_PRESETS.map(label => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
                  <input type="date" className="m-input" value={schedule[label] ?? ''}
                    onChange={e => setSchedule(prev => ({ ...prev, [label]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Not</label>
            <textarea className="m-input resize-none" rows={2} value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-metronic-primary hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-bold transition-colors shadow-sm"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Kaydet
            </button>
          </div>
        </div>
      )}

      {orthoCase.retentionPlans.length === 0 ? (
        !formOpen && <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-[13px]">Henüz retansiyon planı oluşturulmamış.</div>
      ) : (
        <div className="space-y-3">
          {orthoCase.retentionPlans.map(plan => {
            const statusInfo = RETENTION_STATUS_LABELS[plan.status] ?? RETENTION_STATUS_LABELS.AKTIF;
            const scheduleEntries: { label: string; dueDate: string }[] = Array.isArray(plan.followUpSchedule) ? plan.followUpSchedule : [];
            return (
              <div key={plan.id} className="p-4 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 m-0">
                      {RETAINER_TYPE_LABELS[plan.retainerType] ?? plan.retainerType} — {plan.archCoverage === 'CIFT' ? 'Çift Çene' : 'Tek Çene'}
                    </p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 mb-0">
                      Teslim: {formatDate(plan.deliveryDate)}
                      {plan.usageInstruction && <> · {plan.usageInstruction}</>}
                    </p>
                  </div>
                  <select
                    className="m-input !h-8 !py-0 text-[12px] w-36"
                    value={plan.status}
                    onChange={e => handleStatusChange(plan, e.target.value)}
                  >
                    {Object.entries(RETENTION_STATUS_LABELS).map(([value, { label }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${statusInfo.style}`}>{statusInfo.label}</span>
                  {scheduleEntries.map((entry, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-bold rounded whitespace-nowrap">
                      {entry.label}: {formatDate(entry.dueDate)}
                    </span>
                  ))}
                  {plan.note && <span className="text-[11px] text-slate-400 dark:text-slate-500">{plan.note}</span>}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setConfirmDeleteId(plan.id)}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title="Sil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        title="Planı Sil"
        message="Bu retansiyon planını silmek istediğinize emin misiniz?"
      />
    </div>
  );
}
