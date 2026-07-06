'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Trash2, FileText, Check, CheckSquare, Plus, Loader2, Calendar, ChevronDown } from 'lucide-react';
import DentalChart, { toothName } from '../../../../components/patients/DentalChart';
import Modal from '../../../../components/ui/Modal';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import { useToastStore } from '../../../../store/toastStore';
import { Employee, EmployeeService } from '../../../../lib/services/employee.service';
import api from '../../../../lib/api';

// ── DrDentes'ten çekilen tam diyagnoz listesi ─────────────────────
interface DiagItem { id: string; name: string; icd: string; category: string; }

const DIAG_LIST: DiagItem[] = [
  // Cerrahi
  { id: 'cer_kret',         name: 'KRET',                              icd: 'K08.1', category: 'Cerrahi' },
  { id: 'cer_kayip',        name: 'KAYIP DİŞ',                         icd: 'K08.1', category: 'Cerrahi' },
  { id: 'cer_implant',      name: 'İMPLANT',                           icd: '',      category: 'Cerrahi' },
  { id: 'cer_cenekir',      name: 'ÇENE KIRIĞI',                       icd: 'S02.6', category: 'Cerrahi' },
  { id: 'cer_apikalkist',   name: 'APİKAL KİST',                       icd: 'K04.8', category: 'Cerrahi' },
  { id: 'cer_minecatlagi',  name: 'MİNE ÇATLAĞI',                      icd: '',      category: 'Cerrahi' },
  { id: 'cer_luxedis',      name: 'LÜXE DİŞ',                          icd: '',      category: 'Cerrahi' },
  { id: 'cer_radix',        name: 'RADİX',                             icd: 'K08.3', category: 'Cerrahi' },
  { id: 'cer_gomuludis',    name: 'GÖMÜLÜ DİŞ',                        icd: 'K01',   category: 'Cerrahi' },
  { id: 'cer_apikalrez',    name: 'APİKAL REZEKSİYON',                 icd: '',      category: 'Cerrahi' },
  { id: 'cer_reimplant',    name: 'REİMPLANTASYON',                    icd: '',      category: 'Cerrahi' },
  { id: 'cer_kokrezorb',    name: 'KÖK REZORBSİYONU',                  icd: 'K03.3', category: 'Cerrahi' },
  { id: 'cer_operasyon',    name: 'OPERASYON',                         icd: '',      category: 'Cerrahi' },
  { id: 'cer_alveolit',     name: 'ALVEOLİTİS',                        icd: 'K10.3', category: 'Cerrahi' },
  { id: 'cer_yumdoku',      name: 'YUMUŞAK DOKU LEZYONU',              icd: 'K12',   category: 'Cerrahi' },
  { id: 'cer_eklempath',    name: 'EKLEM PATOLOJİSİ',                  icd: '',      category: 'Cerrahi' },
  // Endodonti
  { id: 'end_kanal',        name: 'KANAL TEDAVİ',                      icd: '',      category: 'Endodonti' },
  { id: 'end_kotukanal',    name: 'KÖTÜ KANAL TEDAVİSİ',               icd: '',      category: 'Endodonti' },
  { id: 'end_granulom',     name: 'GRANÜLOM',                          icd: 'K13.4', category: 'Endodonti' },
  { id: 'end_perfore',      name: 'PERFORE PULPA (KIRIK NEDENİYLE)',    icd: 'K04',   category: 'Endodonti' },
  { id: 'end_kalsifiye',    name: 'KALSİFİYE KANAL',                   icd: '',      category: 'Endodonti' },
  { id: 'end_fistul',       name: 'ENDODONTİK FİSTÜL',                 icd: '',      category: 'Endodonti' },
  { id: 'end_pulpitis',     name: 'PULPİTİS',                          icd: 'K04.0', category: 'Endodonti' },
  { id: 'end_apikalapse',   name: 'APİKAL APSE',                       icd: 'K04.7', category: 'Endodonti' },
  { id: 'end_disetapse',    name: 'DİŞETİ APSESİ',                     icd: 'K12.2', category: 'Endodonti' },
  { id: 'end_gangren',      name: 'GANGREN',                           icd: 'R02',   category: 'Endodonti' },
  // Oral Diyagnoz
  { id: 'ord_panoramik',    name: 'PANAROMİK FİLM',                    icd: '',      category: 'Oral Diyagnoz' },
  // Ortodonti
  { id: 'ort_bant',         name: 'BANT',                              icd: '',      category: 'Ortodonti' },
  { id: 'ort_braket',       name: 'BRAKET',                            icd: '',      category: 'Ortodonti' },
  { id: 'ort_arktel',       name: 'ARK TELİ',                          icd: '',      category: 'Ortodonti' },
  { id: 'ort_tedavi',       name: 'ORTODONTİK TEDAVİ',                 icd: '',      category: 'Ortodonti' },
  { id: 'ort_acikbite',     name: 'AÇIK KAPANIŞ (OPEN-BITE)',           icd: 'K07.4', category: 'Ortodonti' },
  { id: 'ort_deepbite',     name: 'DERİN KAPANIŞ (OVER/DEEP-BITE)',     icd: 'K07.4', category: 'Ortodonti' },
  { id: 'ort_crossbite',    name: 'ÇAPRAZ KAPANIŞ (CROSS-BITE)',        icd: 'K07.4', category: 'Ortodonti' },
  { id: 'ort_overjet',      name: 'OVERJET',                           icd: 'K07.4', category: 'Ortodonti' },
  { id: 'ort_deviasyon',    name: 'DEVİASYON',                         icd: '',      category: 'Ortodonti' },
  { id: 'ort_maxdarlik',    name: 'MAKSİLLER DARLIK',                   icd: 'K07',   category: 'Ortodonti' },
  { id: 'ort_mandarlik',    name: 'MANDİBULAR DARLIK',                  icd: 'K07',   category: 'Ortodonti' },
  { id: 'ort_diastema',     name: 'DİASTEMA',                          icd: 'K07.3', category: 'Ortodonti' },
  // Pedodonti
  { id: 'ped_amputasyon',   name: 'AMPUTASYON (Dolgu Hariç)',           icd: '',      category: 'Pedodonti' },
  { id: 'ped_sabityer',     name: 'SABİT YER TUTUCU',                  icd: '',      category: 'Pedodonti' },
  { id: 'ped_haryer',       name: 'HAREKETLİ YER TUTUCU',              icd: '',      category: 'Pedodonti' },
  { id: 'ped_sutkanal',     name: 'SÜT DİŞİNDE KANAL TEDAVİSİ',        icd: '',      category: 'Pedodonti' },
  { id: 'ped_apekskanal',   name: 'APEKSİ KAPANMAMIŞ DİŞTE KANAL',     icd: '',      category: 'Pedodonti' },
  { id: 'ped_fissur',       name: 'FİSSÜR ÖRTÜLMESİ',                  icd: '',      category: 'Pedodonti' },
  { id: 'ped_prefkuron',    name: 'PREFABRİKE KURON',                  icd: '',      category: 'Pedodonti' },
  { id: 'ped_cocukprot1',   name: 'ÇOCUK PROTEZİ (Akrilik-Bölümlü)',   icd: '',      category: 'Pedodonti' },
  { id: 'ped_cocukprot2',   name: 'ÇOCUK PROTEZİ (Akrilik-Tam)',       icd: '',      category: 'Pedodonti' },
  { id: 'ped_stripkuron',   name: 'STRİP KURON',                       icd: '',      category: 'Pedodonti' },
  // Periodontoloji
  { id: 'per_gingivitis',   name: 'GINGİVİTİS',                        icd: 'K05.0', category: 'Periodontoloji' },
  { id: 'per_periodontit',  name: 'PERİODONTİTİS',                     icd: 'K05.3', category: 'Periodontoloji' },
  { id: 'per_distasi',      name: 'DİŞ TAŞI',                          icd: 'K03.6', category: 'Periodontoloji' },
  { id: 'per_fistul',       name: 'PERİODONTAL FİSTÜL',                icd: '',      category: 'Periodontoloji' },
  { id: 'per_apse',         name: 'PERİODONTAL APSE',                  icd: 'K12.2', category: 'Periodontoloji' },
  { id: 'per_splint_s',     name: 'PERİODONTAL SPLINT (Sabit)',        icd: '',      category: 'Periodontoloji' },
  { id: 'per_splint_h',     name: 'PERİODONTAL SPLINT (Hareketli)',    icd: '',      category: 'Periodontoloji' },
  // Protez
  { id: 'pro_tamprot_ak',   name: 'TAM PROTEZ (AKRİLİK)',              icd: '',      category: 'Protez' },
  { id: 'pro_tamprot_me',   name: 'TAM PROTEZ (METAL)',                 icd: '',      category: 'Protez' },
  { id: 'pro_bolprot_ak',   name: 'BÖLÜMLÜ PROTEZ (AKRİLİK)',          icd: '',      category: 'Protez' },
  { id: 'pro_bolprot_me',   name: 'BÖLÜMLÜ PROTEZ (METAL)',             icd: '',      category: 'Protez' },
  { id: 'pro_dokumpost',    name: 'DÖKÜM POST CORE',                   icd: '',      category: 'Protez' },
  { id: 'pro_kuron_fm',     name: 'KURON FULL METAL',                  icd: '',      category: 'Protez' },
  { id: 'pro_kuron_ak',     name: 'KURON AKRİLİK',                     icd: '',      category: 'Protez' },
  { id: 'pro_kuron_se',     name: 'KURON SERAMİK',                     icd: '',      category: 'Protez' },
  { id: 'pro_laminate',     name: 'LAMİNATE VENEER SERAMİK KURON',     icd: '',      category: 'Protez' },
  { id: 'pro_maryland',     name: 'MARYLAND KÖPRÜ',                    icd: '',      category: 'Protez' },
  { id: 'pro_hassas',       name: 'HASSAS TUTUCULU PROTEZ',             icd: '',      category: 'Protez' },
  { id: 'pro_impl_har',     name: 'İMPLANT DESTEKLİ HAREKETLİ PROTEZ',icd: '',      category: 'Protez' },
  { id: 'pro_roch',         name: 'ROCH KÖPRÜ',                        icd: '',      category: 'Protez' },
  { id: 'pro_gece_yum',     name: 'GECE PLAĞI (Yumuşak)',              icd: '',      category: 'Protez' },
  { id: 'pro_gece_sert',    name: 'GECE PLAĞI - Okluzal Splint (Sert)',icd: '',      category: 'Protez' },
  // Restoratif
  { id: 'res_amalgam_o',    name: 'AMALGAM (O)',                        icd: '',      category: 'Restoratif' },
  { id: 'res_amalgam_do',   name: 'AMALGAM (DO)',                       icd: '',      category: 'Restoratif' },
  { id: 'res_amalgam_mo',   name: 'AMALGAM (MO)',                       icd: '',      category: 'Restoratif' },
  { id: 'res_amalgam_mod',  name: 'AMALGAM (MOD)',                      icd: '',      category: 'Restoratif' },
  { id: 'res_amalgam_cole', name: 'AMALGAM (COLE)',                     icd: '',      category: 'Restoratif' },
  { id: 'res_inley_o',      name: 'İNLEY (O)',                          icd: '',      category: 'Restoratif' },
  { id: 'res_inley_do',     name: 'İNLEY (DO)',                         icd: '',      category: 'Restoratif' },
  { id: 'res_inley_mo',     name: 'İNLEY (MO)',                         icd: '',      category: 'Restoratif' },
  { id: 'res_inley_mod',    name: 'İNLEY (MOD)',                        icd: '',      category: 'Restoratif' },
  { id: 'res_inley_cole',   name: 'İNLEY (COLE)',                       icd: '',      category: 'Restoratif' },
  { id: 'res_komp_o',       name: 'KOMPOZİT (O)',                       icd: '',      category: 'Restoratif' },
  { id: 'res_komp_do',      name: 'KOMPOZİT (DO)',                      icd: '',      category: 'Restoratif' },
  { id: 'res_komp_mo',      name: 'KOMPOZİT (MO)',                      icd: '',      category: 'Restoratif' },
  { id: 'res_komp_mod',     name: 'KOMPOZİT (MOD)',                     icd: '',      category: 'Restoratif' },
  { id: 'res_komp_cole',    name: 'KOMPOZİT (COLE)',                    icd: '',      category: 'Restoratif' },
  { id: 'res_cam_o',        name: 'CAMİONOMER DOLGU (O)',               icd: '',      category: 'Restoratif' },
  { id: 'res_cam_do',       name: 'CAMİONOMER DOLGU (DO)',              icd: '',      category: 'Restoratif' },
  { id: 'res_cam_mo',       name: 'CAMİONOMER DOLGU (MO)',              icd: '',      category: 'Restoratif' },
  { id: 'res_cam_mod',      name: 'CAMİONOMER DOLGU (MOD)',             icd: '',      category: 'Restoratif' },
  { id: 'res_cam_cole',     name: 'CAMİONOMER DOLGU (COLE)',            icd: '',      category: 'Restoratif' },
  { id: 'res_komplam',      name: 'KOMPOZİT LAMİNATE VENEER',          icd: '',      category: 'Restoratif' },
  { id: 'res_kanalpost',    name: 'KANAL İÇİ POST UYGULAMASI',          icd: '',      category: 'Restoratif' },
  { id: 'res_kirildis',     name: 'KIRIK DİŞ',                          icd: 'K02.4', category: 'Restoratif' },
  { id: 'res_caries_o',     name: 'CARİES (O)',                         icd: 'K02.1', category: 'Restoratif' },
  { id: 'res_caries_d',     name: 'CARİES (D)',                         icd: 'K02.1', category: 'Restoratif' },
  { id: 'res_caries_m',     name: 'CARİES (M)',                         icd: 'K02.1', category: 'Restoratif' },
  { id: 'res_caries_do',    name: 'CARİES (DO)',                        icd: 'K02.1', category: 'Restoratif' },
  { id: 'res_caries_mo',    name: 'CARİES (MO)',                        icd: 'K02.1', category: 'Restoratif' },
  { id: 'res_caries_mod',   name: 'CARİES (MOD)',                       icd: 'K02.1', category: 'Restoratif' },
  { id: 'res_cole_car',     name: 'COLE CARİES',                        icd: 'K02.0', category: 'Restoratif' },
  { id: 'res_sec_car',      name: 'SEKONDER CARİES',                    icd: 'K02.2', category: 'Restoratif' },
  { id: 'res_kuafaj',       name: 'KUAFAJ',                             icd: '',      category: 'Restoratif' },
  { id: 'res_dentin_d',     name: 'DENTİN PİMİ (D)',                    icd: '',      category: 'Restoratif' },
  { id: 'res_dentin_m',     name: 'DENTİN PİMİ (M)',                    icd: '',      category: 'Restoratif' },
  { id: 'res_minehipo',     name: 'MİNE HİPOPLAZİSİ',                  icd: 'K00.4', category: 'Restoratif' },
  { id: 'res_disrenk',      name: 'DİŞ RENKLENMESİ',                   icd: 'K00.3', category: 'Restoratif' },
  { id: 'res_kirildolgu',   name: 'KIRIK VEYA DÜŞMÜŞ DOLGU',           icd: '',      category: 'Restoratif' },
  { id: 'res_abrazyon',     name: 'ABRAZYON',                           icd: 'K03.1', category: 'Restoratif' },
];

const CATEGORIES = ['Cerrahi', 'Endodonti', 'Oral Diyagnoz', 'Ortodonti', 'Pedodonti', 'Periodontoloji', 'Protez', 'Restoratif'];

// ── Kayıt modeli ──────────────────────────────────────────────────
interface DiagRecord {
  id: string;
  date: string;
  toothNum: number;
  diagId: string;
  diagName: string;
  diagIcd: string;
  diagCategory: string;
  doctorId: string;
}

export default function DiagnosisTab({ patient }: { patient: any }) {
  const { addToast } = useToastStore();

  const [doctors, setDoctors]               = useState<Employee[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [loading, setLoading]               = useState(true);
  const [dentitionMode, setDentitionMode]   = useState<'adult' | 'child'>('adult');

  // Çoklu seçim
  const [multipleMode, setMultipleMode]           = useState(false);
  const [multiSelectedTeeth, setMultiSelectedTeeth] = useState<Record<number, string>>({});

  // Modal
  const [modalOpen, setModalOpen]       = useState(false);
  const [pendingTooth, setPendingTooth] = useState<number | null>(null);
  const [modalSearch, setModalSearch]   = useState('');
  const [modalCat, setModalCat]         = useState('Cerrahi');

  // Kayıtlar
  const [records, setRecords]     = useState<DiagRecord[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    EmployeeService.findAll()
      .then(emps => {
        const docs = emps.filter(e => e.isDoctor && e.isActive);
        setDoctors(docs);
        if (docs.length) setSelectedDoctor(docs[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const mapRecord = (r: any): DiagRecord => ({
    id: r.id,
    date: new Date(r.createdAt).toLocaleDateString('tr-TR'),
    toothNum: r.toothNum,
    diagId: r.diagId,
    diagName: r.diagName,
    diagIcd: r.diagIcd || '',
    diagCategory: r.diagCategory,
    doctorId: r.doctorId || '',
  });

  const fetchDiagnoses = useCallback(async () => {
    if (!patient?.id) return;
    try {
      const res = await api.get(`/patients/${patient.id}/diagnoses`);
      if (Array.isArray(res.data)) setRecords(res.data.map(mapRecord));
    } catch (e) {
      console.warn('Diyagnoz verileri alınamadı', e);
    }
  }, [patient?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/patient-change pattern
    fetchDiagnoses();
  }, [patient?.id, fetchDiagnoses]);

  const getDoctorName = (id: string) => {
    const d = doctors.find(x => x.id === id);
    return d ? `Dt. ${d.firstName} ${d.lastName}` : 'Belirtilmemiş';
  };

  const filteredDiags = DIAG_LIST.filter(d => {
    const matchCat    = d.category === modalCat;
    const matchSearch = !modalSearch ||
      d.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
      d.icd.toLowerCase().includes(modalSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // Diş tıklama
  const handleToothClick = (toothNum: number, imgSrc: string, _sel: string) => {
    if (multipleMode) {
      setMultiSelectedTeeth(prev => {
        const next = { ...prev };
        if (next[toothNum]) delete next[toothNum]; else next[toothNum] = imgSrc;
        return next;
      });
    } else {
      setPendingTooth(toothNum);
      setModalSearch('');
      setModalOpen(true);
    }
  };

  const openMultiModal = () => {
    if (Object.keys(multiSelectedTeeth).length === 0) {
      addToast({ type: 'warning', title: 'Diş Seçilmedi', message: 'Önce şemadan diş seçin.' });
      return;
    }
    setPendingTooth(null);
    setModalSearch('');
    setModalOpen(true);
  };

  const assignDiag = async (diag: DiagItem) => {
    const toothNums = pendingTooth !== null ? [pendingTooth] : Object.keys(multiSelectedTeeth).map(Number);
    if (toothNums.length === 0) return;
    try {
      await api.post(`/patients/${patient.id}/diagnoses`, {
        toothNums,
        diagId: diag.id,
        diagName: diag.name,
        diagIcd: diag.icd,
        diagCategory: diag.category,
        doctorId: selectedDoctor,
      });
      await fetchDiagnoses();
      if (pendingTooth !== null) {
        addToast({ type: 'success', title: `Diş ${pendingTooth} — ${toothName(pendingTooth)}`, message: `${diag.name} atandı.` });
      } else {
        addToast({ type: 'success', title: 'Diyagnoz Atandı', message: `${diag.name} — ${toothNums.length} dişe eklendi.` });
        setMultiSelectedTeeth({});
      }
    } catch (e) {
      console.error('Diyagnoz kaydedilemedi', e);
      addToast({ type: 'error', title: 'Hata', message: 'Diyagnoz kaydedilirken bir hata oluştu.' });
    }
    setModalOpen(false);
  };

  const toggleMultiple = () => { setMultipleMode(m => !m); setMultiSelectedTeeth({}); };
  const multiNums = Object.keys(multiSelectedTeeth).map(Number);

  // Tablo
  const allIds    = records.map(r => r.id);
  const allCheck  = allIds.length > 0 && allIds.every(id => checkedIds.has(id));
  const someCheck = allIds.some(id => checkedIds.has(id)) && !allCheck;
  const toggleAll = () => setCheckedIds(allCheck ? new Set() : new Set(allIds));
  const toggleRow = (id: string) => setCheckedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const deleteChecked = async () => {
    try {
      setDeleting(true);
      await Promise.all(Array.from(checkedIds).map(id => api.delete(`/patients/diagnoses/${id}`)));
      setCheckedIds(new Set());
      await fetchDiagnoses();
      addToast({ type: 'info', title: 'Silindi', message: 'Seçili diyagnozlar kaldırıldı.' });
    } catch (e) {
      console.error('Silme işlemi başarısız', e);
      addToast({ type: 'error', title: 'Hata', message: 'Silme işlemi sırasında bir hata oluştu.' });
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const diagnosedTeeth: Record<number, string> = {};
  records.forEach(r => { diagnosedTeeth[r.toothNum] = r.diagId; });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Yükleniyor...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── DİŞ ŞEMASI ── */}
      <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-100">
          <div className="flex items-center h-8 bg-slate-100 rounded-lg p-1">
            <button onClick={() => { setDentitionMode('adult'); setMultiSelectedTeeth({}); }}
              className={`px-3 h-6 rounded-md text-[12px] font-bold transition-all ${dentitionMode === 'adult' ? 'bg-white text-metronic-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Daimi Dişler
            </button>
            <button onClick={() => { setDentitionMode('child'); setMultiSelectedTeeth({}); }}
              className={`px-3 h-6 rounded-md text-[12px] font-bold transition-all ${dentitionMode === 'child' ? 'bg-white text-metronic-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Süt Dişleri
            </button>
          </div>
          <button onClick={toggleMultiple}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-bold transition-colors whitespace-nowrap ${multipleMode ? 'bg-metronic-primary text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {multipleMode ? <Check size={14} /> : <CheckSquare size={14} className="text-slate-400" />}
            Çoklu Seçim
            {multipleMode && multiNums.length > 0 && (
              <span className="ml-1 bg-white/20 text-white text-[11px] font-bold px-1.5 rounded-full">{multiNums.length}</span>
            )}
          </button>
          {multipleMode && multiNums.length > 0 && (
            <>
              <button onClick={openMultiModal}
                className="flex items-center gap-1.5 h-8 px-3 bg-metronic-primary text-white rounded-lg text-[12px] font-bold hover:bg-blue-600 transition-colors shadow-sm">
                <Plus size={14} /> Diyagnoz Ekle ({multiNums.length} diş)
              </button>
              <button onClick={() => setMultiSelectedTeeth({})}
                className="flex items-center gap-1.5 h-8 px-3 bg-white border border-metronic-danger/30 text-metronic-danger rounded-lg text-[12px] font-bold hover:bg-metronic-danger hover:text-white transition-colors">
                <X size={13} /> Temizle
              </button>
            </>
          )}
        </div>
        <div className="w-full overflow-auto flex items-center justify-center bg-white" style={{ minHeight: 380 }}>
          <DentalChart
            onToothClick={handleToothClick}
            selectedTeeth={multipleMode ? multiSelectedTeeth : diagnosedTeeth}
            plans={[]}
            dentitionMode={dentitionMode}
          />
        </div>
      </div>

      {/* ── DİYAGNOZ TABLOSU ── */}
      <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-[13px] font-bold text-slate-800">Diyagnoz Kayıtları</h3>
          <div className="flex items-center gap-2">
            {checkedIds.size > 0 && (
              <button onClick={() => setDeleteConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 text-[12px] font-bold rounded-lg hover:bg-rose-100 transition-colors">
                <Trash2 size={13} /> {checkedIds.size} Sil
              </button>
            )}
            <span className="text-[11px] font-semibold text-slate-400">{records.length} kayıt</span>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="p-10 text-center text-slate-400 flex flex-col items-center">
            <FileText size={28} className="mb-2 opacity-20" />
            <p className="text-[12px] font-medium">Henüz diyagnoz kaydı yok.</p>
            <p className="text-[11px] mt-1">Diş şemasından bir dişe tıklayın.</p>
          </div>
        ) : (
          <>
          {/* MOBİL */}
          <div className="md:hidden divide-y divide-slate-100">
            {records.map(r => (
              <div key={r.id} onClick={() => toggleRow(r.id)}
                className={`px-4 py-3 transition-colors active:bg-slate-50 ${checkedIds.has(r.id) ? 'bg-metronic-primary-light/40' : ''}`}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={checkedIds.has(r.id)} onChange={() => toggleRow(r.id)}
                    onClick={e => e.stopPropagation()} className="w-5 h-5 rounded accent-metronic-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono font-bold text-white bg-slate-600 px-1.5 py-0.5 rounded flex-shrink-0">{r.toothNum}</span>
                      <span className="text-[13px] font-semibold text-slate-900 truncate">{r.diagName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><Calendar size={10} />{r.date}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold">{r.diagCategory}</span>
                      {r.diagIcd && <span className="font-mono">{r.diagIcd}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* MASAÜSTÜ */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-3 pl-5 pr-3 w-10">
                    <input type="checkbox" checked={allCheck}
                      ref={el => { if (el) el.indeterminate = someCheck; }}
                      onChange={toggleAll} className="w-4 h-4 rounded accent-metronic-primary cursor-pointer" />
                  </th>
                  <th className="py-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Tarih</th>
                  <th className="py-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Diş</th>
                  <th className="py-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Diyagnoz</th>
                  <th className="py-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Kategori</th>
                  <th className="py-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Dişhekimi</th>
                  <th className="py-3 pl-3 pr-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">ICD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(r => {
                  const isChecked = checkedIds.has(r.id);
                  return (
                    <tr key={r.id} onClick={() => toggleRow(r.id)}
                      className={`transition-colors cursor-pointer ${isChecked ? 'bg-metronic-primary-light/40' : 'hover:bg-slate-50'}`}>
                      <td className="py-3 pl-5 pr-3 w-10">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleRow(r.id)}
                          onClick={e => e.stopPropagation()} className="w-4 h-4 rounded accent-metronic-primary cursor-pointer" />
                      </td>
                      <td className="py-3 px-3 text-[12px] text-slate-600 whitespace-nowrap">{r.date}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-mono font-bold text-slate-700">{r.toothNum}</span>
                          <span className="text-[11px] text-slate-400">{toothName(r.toothNum)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[13px] font-semibold text-slate-800">{r.diagName}</span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{r.diagCategory}</span>
                      </td>
                      <td className="py-3 px-3 text-[12px] text-slate-600 whitespace-nowrap">{getDoctorName(r.doctorId)}</td>
                      <td className="py-3 pl-3 pr-5 text-[11px] font-mono text-slate-400">{r.diagIcd || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* ── DİYAGNOZ MODAL ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setModalSearch(''); }}
        title={pendingTooth ? `Diş ${pendingTooth} — ${toothName(pendingTooth)}` : `${multiNums.length} Diş — Toplu Diyagnoz`}
        subtitle="Diyagnoz seçin"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hekim</span>
              <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                className="h-9 px-3 text-[13px] font-medium text-slate-700 border border-slate-200 rounded-lg outline-none focus:border-metronic-primary bg-white cursor-pointer">
                {doctors.map(d => <option key={d.id} value={d.id}>{`Dt. ${d.firstName} ${d.lastName}`}</option>)}
              </select>
            </div>
            <button onClick={() => { setModalOpen(false); setModalSearch(''); }}
              className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              İptal
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 h-[420px]">
          {/* Filtreler */}
          <div className="flex gap-2 flex-shrink-0">
            {/* Kategori dropdown */}
            <div className="relative flex-shrink-0">
              <select value={modalCat} onChange={e => setModalCat(e.target.value)}
                className="h-9 pl-3 pr-8 text-[12px] font-bold text-slate-700 border border-slate-200 rounded-lg outline-none focus:border-metronic-primary bg-white cursor-pointer appearance-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {/* Arama */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" autoFocus placeholder="Diyagnoz adı veya ICD kodu ara..."
                value={modalSearch} onChange={e => setModalSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-metronic-primary focus:ring-1 focus:ring-metronic-primary/10 placeholder:text-slate-400" />
            </div>
          </div>

          {/* Kategori chip'leri (hızlı geçiş) */}
          <div className="flex flex-wrap gap-1 flex-shrink-0">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setModalCat(c)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${modalCat === c ? 'bg-metronic-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {c}
              </button>
            ))}
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg min-h-0">
            {filteredDiags.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400">
                <Search size={24} className="mb-2 opacity-30" />
                <p className="text-[13px] font-medium">Sonuç bulunamadı</p>
              </div>
            ) : filteredDiags.map(d => (
              <button key={d.id} onClick={() => assignDiag(d)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-yellow-50 hover:border-yellow-200 transition-colors text-left group last:border-b-0">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-[13px] font-semibold text-slate-900 group-hover:text-metronic-primary truncate transition-colors leading-tight">{d.name}</p>
                  {d.icd && <p className="text-[11px] text-slate-400 font-mono mt-0.5">{d.icd}</p>}
                </div>
                <span className="w-7 h-7 rounded-full bg-metronic-primary/10 group-hover:bg-metronic-primary flex items-center justify-center transition-colors flex-shrink-0">
                  <Plus size={13} className="text-metronic-primary group-hover:text-white transition-colors" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteChecked}
        loading={deleting}
        title="Diyagnoz Kayıtlarını Sil"
        message={`${checkedIds.size} diyagnoz kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
      />
    </div>
  );
}
