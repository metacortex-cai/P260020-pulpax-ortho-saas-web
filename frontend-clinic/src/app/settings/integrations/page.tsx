'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import api from '../../../lib/api';
import {
  Link2, Link2Off, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle,
  TrendingUp, Pill, Receipt, ChevronRight, ArrowUpRight, Wifi, WifiOff,
  Activity, Calendar, BarChart3, ExternalLink, Info, Play, Save, Plus
} from 'lucide-react';


function StatusBadge({ status }: { status: string }) {
  if (status === 'connected' || status === 'SUCCESS' || status === 'SIGNED' || status === 'REGISTERED')
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Aktif / Bağlı
      </span>
    );
  if (status === 'error' || status === 'FAILED' || status === 'ERROR')
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">
        <XCircle size={12} />
        Hata
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
      <WifiOff size={12} />
      Bağlı Değil
    </span>
  );
}

type Section = 'tcmb' | 'medications' | 'parasut' | 'uss' | 'erecete' | 'efatura';

export default function IntegrationsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [section, setSection] = useState<Section>('uss');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Real backend dynamic integration states
  const [ussTransmissions, setUssTransmissions] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // e-Reçete form state
  const [receteForm, setReceteForm] = useState({
    patientName: '',
    doctorName: '',
    medications: '',
    type: 'Normal'
  });

  // e-Fatura form state
  const [faturaForm, setFaturaForm] = useState({
    patientName: '',
    taxId: '',
    amount: 1000,
    type: 'E-SMM' as 'E-FATURA' | 'E-ARSIV' | 'E-SMM'
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Load USS transmissions
    api.get('/uss/transmissions')
      .then(res => setUssTransmissions(res.data))
      .catch(err => console.error('USS load error', err));

    // Load prescriptions
    api.get('/erecete')
      .then(res => setPrescriptions(res.data))
      .catch(err => console.error('e-Reçete load error', err));

    // Load invoices
    api.get('/efatura')
      .then(res => setInvoices(res.data))
      .catch(err => console.error('e-Fatura load error', err));
  }, [user, router]);

  if (!user) return null;

  const triggerUssSync = () => {
    setIsSyncing(true);
    api.post('/uss/sync/visit', {
      patientId: 'pat-99',
      patientName: 'Kamil Veli',
      nationalId: '38192847592'
    })
      .then(res => {
        setUssTransmissions(prev => [res.data, ...prev]);
        setIsSyncing(false);
      })
      .catch(() => setIsSyncing(false));
  };

  const submitRecete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receteForm.patientName || !receteForm.doctorName || !receteForm.medications) return;

    api.post('/erecete', {
      patientName: receteForm.patientName,
      doctorName: receteForm.doctorName,
      medications: receteForm.medications.split(',').map(m => m.trim()),
      type: receteForm.type
    })
      .then(res => {
        setPrescriptions(prev => [res.data, ...prev]);
        setReceteForm({ patientName: '', doctorName: '', medications: '', type: 'Normal' });
      });
  };

  const submitFatura = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faturaForm.patientName || !faturaForm.amount) return;

    api.post('/efatura', faturaForm)
      .then(res => {
        setInvoices(prev => [res.data, ...prev]);
        setFaturaForm({ patientName: '', taxId: '', amount: 1000, type: 'E-SMM' });
      });
  };

  const SIDEBAR = [
    {
      id: 'uss' as Section,
      label: 'e-Nabız / USS',
      icon: Activity,
      status: ussTransmissions.length > 0 ? 'connected' : 'disconnected',
      color: 'text-rose-500',
    },
    {
      id: 'erecete' as Section,
      label: 'e-Reçete (SGK)',
      icon: Pill,
      status: prescriptions.length > 0 ? 'connected' : 'disconnected',
      color: 'text-sky-500',
    },
    {
      id: 'efatura' as Section,
      label: 'e-Fatura (GİB)',
      icon: Receipt,
      status: invoices.length > 0 ? 'connected' : 'disconnected',
      color: 'text-violet-500',
    },
    {
      id: 'tcmb' as Section,
      label: 'TCMB Döviz Kuru',
      icon: TrendingUp,
      status: 'disconnected',
      color: 'text-blue-500',
    },
    {
      id: 'medications' as Section,
      label: 'İlaç Rehberi',
      icon: Pill,
      status: 'disconnected',
      color: 'text-violet-500',
    },
  ];

  return (
    <MetronicLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f1219] p-6">
        <div className="max-w-7xl mx-auto">
          {/* HEADER */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1.5">
              Entegrasyonlar ve E-Devlet Kapıları
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              e-Nabız, SGK Reçetem ve GİB e-Fatura/e-SMM entegrasyon servislerini yönetin.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* SIDEBAR TABS */}
            <div className="lg:col-span-1 space-y-2">
              {SIDEBAR.map(item => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all border ${
                      active
                        ? 'bg-metronic-primary text-white shadow-lg border-metronic-primary'
                        : 'bg-white dark:bg-[#1c1f2e] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 border-slate-200 dark:border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={active ? 'text-white' : item.color} />
                      <span className="text-sm font-bold">{item.label}</span>
                    </div>
                    <ChevronRight size={14} className={active ? 'text-white/70' : 'text-slate-400'} />
                  </button>
                );
              })}
            </div>

            {/* CONTENT AREA */}
            <div className="lg:col-span-3 space-y-6">
              {/* e-NABIZ / USS */}
              {section === 'uss' && (
                <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">e-Nabız / USS Entegrasyon Paneli</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">T.C. Sağlık Bakanlığı USS veri paketi gönderim kaydı.</p>
                    </div>
                    <button
                      onClick={triggerUssSync}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                    >
                      <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                      {isSyncing ? 'Senkronize Ediliyor...' : 'Manuel Test Visit Sync'}
                    </button>
                  </div>
                  <div className="p-6">
                    <h3 className="text-sm font-bold mb-3 text-slate-800 dark:text-slate-200">İletim Günlüğü (USS Logs)</h3>
                    <div className="space-y-2">
                      {ussTransmissions.map((tx) => (
                        <div key={tx.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-700 dark:text-slate-200">{tx.patientName} ({tx.nationalId})</p>
                            <p className="text-slate-400 block mt-0.5">{tx.message} | Kod: {tx.responseCode}</p>
                          </div>
                          <div className="text-right">
                            <StatusBadge status={tx.status} />
                            <span className="text-slate-400 block mt-1">{new Date(tx.sentAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* e-REÇETE (SGK) */}
              {section === 'erecete' && (
                <div className="space-y-6">
                  {/* Yeni Reçete Yaz */}
                  <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">SGK Reçetem Sistemi - Yeni Reçete Yaz</h2>
                    <form onSubmit={submitRecete} className="space-y-4 text-xs font-semibold text-slate-500">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Hasta Adı Soyadı</label>
                          <input
                            type="text"
                            value={receteForm.patientName}
                            onChange={e => setReceteForm({ ...receteForm, patientName: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none text-slate-800 dark:text-white"
                            placeholder="Örn: Enver Nehir"
                          />
                        </div>
                        <div className="space-y-1">
                          <label>Hekim Adı Soyadı</label>
                          <input
                            type="text"
                            value={receteForm.doctorName}
                            onChange={e => setReceteForm({ ...receteForm, doctorName: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none text-slate-800 dark:text-white"
                            placeholder="Dr. Ömer Çiftçi"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label>İlaçlar (Virgülle Ayırın)</label>
                        <input
                          type="text"
                          value={receteForm.medications}
                          onChange={e => setReceteForm({ ...receteForm, medications: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none text-slate-800 dark:text-white"
                          placeholder="Augmentin 1000mg (1x1), Parol 500mg (3x1)"
                        />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex gap-4 items-center">
                          <label className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <input type="radio" name="type" checked={receteForm.type === 'Normal'} onChange={() => setReceteForm({ ...receteForm, type: 'Normal' })} /> Normal
                          </label>
                          <label className="flex items-center gap-1 text-rose-500">
                            <input type="radio" name="type" checked={receteForm.type === 'Kırmızı'} onChange={() => setReceteForm({ ...receteForm, type: 'Kırmızı' })} /> Kırmızı Reçete
                          </label>
                          <label className="flex items-center gap-1 text-emerald-500">
                            <input type="radio" name="type" checked={receteForm.type === 'Yeşil'} onChange={() => setReceteForm({ ...receteForm, type: 'Yeşil' })} /> Yeşil Reçete
                          </label>
                        </div>
                        <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold">
                          <Plus size={14} /> SGK Sisteme Kaydet
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Reçete Listesi */}
                  <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm p-6">
                    <h3 className="text-sm font-bold mb-4 text-slate-800 dark:text-slate-200">Kayıtlı SGK Reçeteleri</h3>
                    <div className="space-y-3">
                      {prescriptions.map(p => (
                        <div key={p.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-extrabold text-sky-600 text-sm">{p.ereceteNo}</p>
                            <p className="font-bold text-slate-700 dark:text-slate-200 mt-1">Hasta: {p.patientName} | Hekim: {p.doctorName}</p>
                            <p className="text-slate-400 block mt-0.5">İlaçlar: {p.medications.join(', ')}</p>
                          </div>
                          <div className="text-right">
                            <StatusBadge status={p.status} />
                            <span className="text-[10px] text-slate-400 block mt-1">{p.type} Reçete</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* e-FATURA (GİB) */}
              {section === 'efatura' && (
                <div className="space-y-6">
                  {/* Yeni Fatura/SMM Kes */}
                  <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">GİB Portalı - e-Fatura / e-Arşiv / e-SMM Oluştur</h2>
                    <form onSubmit={submitFatura} className="space-y-4 text-xs font-semibold text-slate-500">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label>Hasta Adı Soyadı</label>
                          <input
                            type="text"
                            value={faturaForm.patientName}
                            onChange={e => setFaturaForm({ ...faturaForm, patientName: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none text-slate-800 dark:text-white"
                            placeholder="Hasta Adı"
                          />
                        </div>
                        <div className="space-y-1">
                          <label>T.C. Kimlik / Vergi No</label>
                          <input
                            type="text"
                            value={faturaForm.taxId}
                            onChange={e => setFaturaForm({ ...faturaForm, taxId: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none text-slate-800 dark:text-white"
                            placeholder="11111111111"
                          />
                        </div>
                        <div className="space-y-1">
                          <label>Hizmet Tutarı (₺ - KDV Hariç)</label>
                          <input
                            type="number"
                            value={faturaForm.amount}
                            onChange={e => setFaturaForm({ ...faturaForm, amount: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex gap-4 items-center">
                          <label className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <input type="radio" checked={faturaForm.type === 'E-SMM'} onChange={() => setFaturaForm({ ...faturaForm, type: 'E-SMM' })} /> e-SMM (Serbest Meslek Makbuzu)
                          </label>
                          <label className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <input type="radio" checked={faturaForm.type === 'E-FATURA'} onChange={() => setFaturaForm({ ...faturaForm, type: 'E-FATURA' })} /> e-Fatura
                          </label>
                          <label className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <input type="radio" checked={faturaForm.type === 'E-ARSIV'} onChange={() => setFaturaForm({ ...faturaForm, type: 'E-ARSIV' })} /> e-Arşiv Fatura
                          </label>
                        </div>
                        <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold">
                          <Plus size={14} /> Faturayı Kes ve İmzala
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Fatura Listesi */}
                  <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm p-6">
                    <h3 className="text-sm font-bold mb-4 text-slate-800 dark:text-slate-200">GİB Onaylı Faturalar</h3>
                    <div className="space-y-3">
                      {invoices.map(inv => (
                        <div key={inv.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-violet-600 text-sm">{inv.invoiceNo}</span>
                              <span className="px-2 py-0.5 bg-slate-200 dark:bg-white/10 rounded text-[9px] font-bold text-slate-600 dark:text-slate-400">{inv.type}</span>
                            </div>
                            <p className="font-bold text-slate-700 dark:text-slate-200 mt-1">Müşteri/Hasta: {inv.patientName} | VKN: {inv.taxId}</p>
                            <p className="text-slate-400 block mt-0.5">Tutar: {inv.amount} ₺ + KDV: {inv.taxAmount} ₺ | <strong>Toplam: {inv.total} ₺</strong></p>
                            <p className="text-[10px] font-mono text-slate-400 mt-1">ETTN: {inv.ettn}</p>
                          </div>
                          <div className="text-right">
                            <StatusBadge status={inv.status} />
                            <span className="text-slate-400 block mt-1">{new Date(inv.signedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TCMB DÖVİZ KURU */}
              {section === 'tcmb' && (
                <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm p-6">
                  <h2 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">TCMB Döviz Kuru Entegrasyonu</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Döviz kuru verileri henüz yüklenmedi.</p>
                </div>
              )}

              {/* İLAÇ REHBERİ */}
              {section === 'medications' && (
                <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm p-6">
                  <h2 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">İlaç Rehberi Entegrasyonu</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">İlaç rehberi verileri henüz yüklenmedi.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MetronicLayout>
  );
}
