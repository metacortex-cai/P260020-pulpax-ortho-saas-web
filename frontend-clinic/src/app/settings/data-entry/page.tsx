'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import { SettingsService, ImportValidateResult, ImportExecuteResult } from '../../../lib/services/settings.service';
import {
  Users, Stethoscope, UserCircle, FlaskConical, CreditCard,
  Wallet, Upload, Download, FileSpreadsheet, CheckCircle2,
  AlertTriangle, ChevronRight, ChevronLeft, Check, ShieldAlert
} from 'lucide-react';

const MODULES = [
  { id: 'patients', name: 'Hastalar', icon: Users, desc: 'Hasta temel bilgileri ve iletişim detayları.', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { id: 'treatments', name: 'Tedaviler', icon: Stethoscope, desc: 'Kliniğe ait tedavi katalogları ve fiyatları.', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { id: 'staff', name: 'Personeller', icon: UserCircle, desc: 'Hekim ve klinik çalışanlarının kayıtları.', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  { id: 'lab', name: 'Laboratuvar', icon: FlaskConical, desc: 'Dış lab işlemleri ve tetkik listesi.', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10' },
  { id: 'finance', name: 'Muhasebe', icon: CreditCard, desc: 'Kasa, banka ve cari tanımlamaları.', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { id: 'payments', name: 'Hasta Ödemeleri', icon: Wallet, desc: 'Geçmiş hasta tahsilatları ve ödeme planları.', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
];

export default function DataEntryPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidateResult | null>(null);
  const [importResult, setImportResult] = useState<ImportExecuteResult | null>(null);

  // Dosya Sürükle Bırak İşlemleri
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
  }, [user, router]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = async (e: React.MouseEvent, moduleId: string) => {
    e.stopPropagation();
    try {
      const blob = await SettingsService.downloadImportTemplate(moduleId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${moduleId}-sablon.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Şablon indirilemedi.' });
    }
  };

  const handleNextStep = async () => {
    if (step === 1 && selectedModule) {
      setStep(2);
    } else if (step === 2 && file && selectedModule) {
      setIsUploading(true);
      try {
        const result = await SettingsService.validateImport(selectedModule, file);
        setValidationResult(result);
        setStep(3);
      } catch {
        addToast({ type: 'error', title: 'Hata', message: 'Dosya doğrulanamadı. Lütfen şablona uygun bir dosya yükleyin.' });
      } finally {
        setIsUploading(false);
      }
    } else if (step === 3 && validationResult && file && selectedModule) {
      setIsUploading(true);
      try {
        const result = await SettingsService.executeImport(selectedModule, file);
        setImportResult(result);
        setIsCompleted(true);
      } catch {
        addToast({ type: 'error', title: 'Hata', message: 'İçe aktarım başarısız oldu.' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedModule(null);
    setFile(null);
    setIsCompleted(false);
    setValidationResult(null);
    setImportResult(null);
  };

  if (!user) return null;

  // Compute preview column count from first row
  const previewColCount = Math.min(validationResult?.rows[0]?.data?.length || 6, 6);
  const columnHeaders = Array.from({ length: previewColCount }, (_, i) => `Sütun ${i + 1}`);

  return (
    <MetronicLayout title="Veri Girişi (İçe Aktarım)" breadcrumbs={['Ayarlar', 'Veri Girişi']}>

      <div className="flex flex-col gap-6 p-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Upload className="text-metronic-primary" size={24} />
              Toplu Veri İçe Aktarım
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sistem dışındaki verilerinizi Excel şablonları aracılığıyla hızlıca sisteme aktarın.</p>
          </div>
        </div>

        {/* STEPPER */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
          <div className="flex items-center justify-between relative max-w-2xl mx-auto">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-white/5 -z-10 rounded-full" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-metronic-primary -z-10 rounded-full transition-all duration-500"
              style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
            />

            {/* Adım 1 */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-4 ${
                step >= 1 ? 'bg-metronic-primary text-white border-white dark:border-[#1c1f2e]' : 'bg-slate-100 text-slate-400 border-white'
              }`}>
                {step > 1 ? <Check size={18} /> : '1'}
              </div>
              <span className={`text-xs font-bold ${step >= 1 ? 'text-metronic-primary' : 'text-slate-400'}`}>Modül Seçimi</span>
            </div>

            {/* Adım 2 */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-4 ${
                step >= 2 ? 'bg-metronic-primary text-white border-white dark:border-[#1c1f2e]' : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-white dark:border-[#1c1f2e]'
              }`}>
                {step > 2 ? <Check size={18} /> : '2'}
              </div>
              <span className={`text-xs font-bold ${step >= 2 ? 'text-metronic-primary' : 'text-slate-400'}`}>Dosya Yükleme</span>
            </div>

            {/* Adım 3 */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-4 ${
                step >= 3 ? 'bg-metronic-primary text-white border-white dark:border-[#1c1f2e]' : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-white dark:border-[#1c1f2e]'
              }`}>
                3
              </div>
              <span className={`text-xs font-bold ${step >= 3 ? 'text-metronic-primary' : 'text-slate-400'}`}>Önizleme & Onay</span>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col min-h-[400px]">

          {/* ADIM 1: MODÜL SEÇİMİ */}
          {step === 1 && (
            <div className="p-8">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Aktarmak İstediğiniz Veri Türünü Seçin</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULES.map(mod => {
                  const Icon = mod.icon;
                  const isSelected = selectedModule === mod.id;
                  return (
                    <div
                      key={mod.id}
                      onClick={() => setSelectedModule(mod.id)}
                      className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-metronic-primary bg-metronic-primary/5'
                          : 'border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${mod.bg}`}>
                          <Icon size={24} className={mod.color} />
                        </div>
                        <div>
                          <h4 className="text-[15px] font-bold text-slate-800 dark:text-white mb-1">{mod.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{mod.desc}</p>
                        </div>
                      </div>

                      {/* Şablon İndir */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sistem formatına uygun excel indirin</span>
                          <button
                            onClick={(e) => handleDownloadTemplate(e, mod.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                          >
                            <Download size={14} className="text-metronic-primary" /> Şablon İndir
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ADIM 2: DOSYA YÜKLEME */}
          {step === 2 && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">

              <div
                className={`w-full max-w-2xl border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-metronic-primary bg-metronic-primary/5'
                    : file ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-slate-300 dark:border-white/20 hover:border-metronic-primary/50 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                {file ? (
                  <>
                    <FileSpreadsheet size={48} className="text-emerald-500 mb-4" />
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{file.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(2)} KB • Tıklayarak değiştirebilirsiniz</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                      <Upload size={28} className="text-slate-400" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Excel Dosyanızı Buraya Sürükleyin</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">veya bilgisayarınızdan seçmek için tıklayın (.xlsx, .xls)</p>
                    <button className="px-6 py-2.5 bg-metronic-primary text-white font-bold text-sm rounded-lg hover:bg-blue-600 transition-colors pointer-events-none">
                      Dosya Seç
                    </button>
                  </>
                )}
              </div>

              {isUploading && (
                <div className="mt-6 flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-metronic-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Dosya okunuyor, veriler kontrol ediliyor...</span>
                </div>
              )}
            </div>
          )}

          {/* ADIM 3: ÖNİZLEME VE ONAY */}
          {step === 3 && !isCompleted && validationResult && (
            <div className="flex flex-col h-full">

              <div className="p-6 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Veri Önizlemesi</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {validationResult.validCount} kayıt başarılı
                      {validationResult.invalidCount > 0 && (
                        <>, <span className="text-red-500 font-bold">{validationResult.invalidCount} hatalı kayıt</span> bulundu</>
                      )}.
                    </p>
                  </div>
                  {validationResult.invalidCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-[13px] font-medium">
                      <ShieldAlert size={16} />
                      Hatalı kayıtlar atlanacak ve sisteme eklenmeyecektir.
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white dark:bg-[#1c1f2e] border-b border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 pl-6 pr-4">Durum</th>
                      {columnHeaders.map((h, i) => (
                        <th key={i} className="py-4 px-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {validationResult.rows.map((row, idx) => (
                      <tr key={idx} className={row.status === 'invalid' ? 'bg-red-50/50 dark:bg-red-500/5' : ''}>
                        <td className="py-3 pl-6 pr-4">
                          {row.status === 'valid' ? (
                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                              <CheckCircle2 size={14} /> Başarılı
                            </span>
                          ) : (
                            <div className="group relative flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-bold cursor-help">
                              <AlertTriangle size={14} /> Hatalı
                              {row.error && (
                                <div className="absolute left-full ml-2 w-48 p-2 bg-slate-800 text-white text-[11px] font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                                  {row.error}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        {row.data.slice(0, previewColCount).map((cell, i) => (
                          <td key={i} className={`py-3 px-4 text-[13px] font-medium ${
                            row.status === 'invalid' && !cell ? 'text-red-500 font-bold' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {validationResult.rows.length === 0 && (
                      <tr>
                        <td colSpan={previewColCount + 1} className="py-8 text-center text-slate-400 text-sm">
                          Önizlenecek kayıt bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ADIM 3: TAMAMLANDI */}
          {isCompleted && (
            <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">İçe Aktarım Başarılı!</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 text-center max-w-md">
                {importResult
                  ? `${importResult.importedCount} kayıt sisteme başarıyla aktarıldı.${importResult.skippedCount > 0 ? ` Hatalı olan ${importResult.skippedCount} kayıt atlandı.` : ''}`
                  : 'Veriler sisteme başarıyla aktarıldı.'}
              </p>
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-lg transition-colors"
              >
                Yeni Aktarım Yap
              </button>
            </div>
          )}

          {/* FOOTER - NAVIGATION BUTTONS */}
          {!isCompleted && (
            <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#1c1f2e] flex items-center justify-between mt-auto">
              <button
                onClick={() => setStep(p => Math.max(1, p - 1))}
                disabled={step === 1 || isUploading}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={16} /> Geri
              </button>

              <button
                onClick={handleNextStep}
                disabled={(step === 1 && !selectedModule) || (step === 2 && !file) || isUploading}
                className="flex items-center gap-2 px-6 py-2.5 bg-metronic-primary hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    İşleniyor...
                  </>
                ) : step === 3 ? (
                  <>Aktarımı Başlat <CheckCircle2 size={16} /></>
                ) : (
                  <>İleri <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </MetronicLayout>
  );
}
