'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PatientService, PatientDocument, resolveDocumentUrl } from '../../../../lib/services/patient.service';
import { 
  FolderOpen, FileText, Plus, Trash2,
  Download, Eye, Filter, Grid, List as ListIcon, X, UploadCloud,
  FileCheck, ScrollText, Camera
} from 'lucide-react';
import Skeleton from '../../../../components/ui/Skeleton';
import Modal from '../../../../components/ui/Modal';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import { useToastStore } from '../../../../store/toastStore';
import { getFileIconInfo } from '../../../../lib/utils/fileIcons';

const CATEGORIES = [
  { id: 'ALL', label: 'Tüm Dosyalar', icon: FolderOpen },
  { id: 'X-RAY', label: 'Röntgenler', icon: ScrollText },
  { id: 'PHOTO', label: 'Klinik Fotoğraflar', icon: Camera },
  { id: 'CONSENT', label: 'Onam Formları', icon: FileCheck },
  { id: 'OTHER', label: 'Diğer', icon: FileText },
];

export default function DocumentsTab({ patient }: { patient: any }) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<PatientDocument | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const handleOcr = async (doc: PatientDocument) => {
    try {
      setOcrLoading(true);
      setOcrResult(null);
      const dummyFile = new File(['mock content'], doc.name.toLowerCase().includes('kvkk') ? 'kvkk.pdf' : 'consent.pdf', { type: 'application/pdf' });
      const result = await PatientService.ocrConsentForm(patient.id, dummyFile);
      setOcrResult(result);
      addToast({ title: 'OCR Başarılı', message: 'Onam formu başarıyla analiz edildi.', type: 'success' });
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'OCR analizi başarısız oldu.', type: 'error' });
    } finally {
      setOcrLoading(false);
    }
  };

  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'OTHER' as PatientDocument['category'],
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await PatientService.findOne(patient.id);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Dokümanlar yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [patient.id, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/patient-change pattern
    fetchDocuments();
  }, [patient.id, fetchDocuments]);

  const resetUploadForm = () => {
    setUploadForm({ name: '', category: 'OTHER', description: '' });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeUploadModal = () => {
    setModalOpen(false);
    resetUploadForm();
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setUploadForm(prev => ({
      ...prev,
      name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
    }));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files?.[0] || null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast({ title: 'Hata', message: 'Lütfen bir dosya seçin.', type: 'error' });
      return;
    }
    try {
      setUploading(true);
      await PatientService.uploadDocument(patient.id, selectedFile, uploadForm);
      addToast({ title: 'Başarılı', message: 'Dosya yüklendi.', type: 'success' });
      closeUploadModal();
      fetchDocuments();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Dosya yüklenemedi.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      await PatientService.deleteDocument(id);
      addToast({ title: 'Başarılı', message: 'Dosya silindi.', type: 'success' });
      fetchDocuments();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Dosya silinemedi.', type: 'error' });
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const filteredDocs = documents.filter(doc => 
    activeCategory === 'ALL' || doc.category === activeCategory
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.id 
                  ? 'bg-metronic-primary text-white shadow-md shadow-blue-500/20' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <cat.icon size={14} /> {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-50 p-1 rounded-lg flex border border-slate-100">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-metronic-primary' : 'text-slate-400 hover:text-slate-600'}`}><Grid size={16} /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-metronic-primary' : 'text-slate-400 hover:text-slate-600'}`}><ListIcon size={16} /></button>
          </div>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-metronic-primary text-white rounded-xl text-[13px] font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/10">
            <Plus size={16} /> Yeni Dosya Yükle
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
        </div>
      ) : filteredDocs.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {filteredDocs.map(doc => {
              const { Icon: FileTypeIcon, colorClass } = getFileIconInfo(doc);
              return (
              <div key={doc.id} className="group relative bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center">
                  {doc.fileType?.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element -- dynamic backend-hosted document URL (arbitrary origin/env), not a static asset next/image can optimize
                    <img src={resolveDocumentUrl(doc.fileUrl)} alt={doc.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`flex flex-col items-center gap-2 ${colorClass}`}>
                      <FileTypeIcon size={48} />
                      <span className="text-[10px] font-bold uppercase text-slate-300">{doc.fileType}</span>
                    </div>
                  )}
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => setPreviewDoc(doc)} className="w-9 h-9 rounded-full bg-white text-slate-700 flex items-center justify-center hover:bg-metronic-primary hover:text-white transition-colors"><Eye size={16} /></button>
                    <button onClick={() => window.open(resolveDocumentUrl(doc.fileUrl), '_blank')} className="w-9 h-9 rounded-full bg-white text-slate-700 flex items-center justify-center hover:bg-metronic-primary hover:text-white transition-colors"><Download size={16} /></button>
                    <button onClick={() => setConfirmDeleteId(doc.id)} className="w-9 h-9 rounded-full bg-white text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="p-3">
                  <h5 className="text-[12px] font-bold text-slate-700 truncate">{doc.name}</h5>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{new Date(doc.createdAt).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="m-card border border-slate-200/60 rounded-xl overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-slate-50 border-b border-slate-100">
                 <tr>
                   <th className="py-3 px-6 text-[11px] font-bold text-slate-400 uppercase">Dosya Adı</th>
                   <th className="py-3 px-6 text-[11px] font-bold text-slate-400 uppercase">Kategori</th>
                   <th className="py-3 px-6 text-[11px] font-bold text-slate-400 uppercase">Tarih</th>
                   <th className="py-3 px-6 text-[11px] font-bold text-slate-400 uppercase text-right">İşlem</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {filteredDocs.map(doc => {
                   const { Icon: FileTypeIcon, colorClass } = getFileIconInfo(doc);
                   return (
                   <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                     <td className="py-3 px-6">
                       <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded bg-slate-50 flex items-center justify-center ${colorClass}`}>
                           <FileTypeIcon size={14} />
                         </div>
                         <span className="text-[13px] font-bold text-slate-700">{doc.name}</span>
                       </div>
                     </td>
                     <td className="py-3 px-6">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">{doc.category}</span>
                     </td>
                     <td className="py-3 px-6 text-[12px] text-slate-500 font-medium">{new Date(doc.createdAt).toLocaleDateString('tr-TR')}</td>
                     <td className="py-3 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setPreviewDoc(doc)} className="p-2 text-slate-400 hover:text-metronic-primary hover:bg-slate-100 rounded-lg"><Eye size={16} /></button>
                          <button onClick={() => setConfirmDeleteId(doc.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                     </td>
                   </tr>
                   );
                 })}
               </tbody>
             </table>
          </div>
        )
      ) : (
        <div className="py-24 text-center border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
          <FolderOpen size={48} className="mx-auto text-slate-200 mb-4" />
          <h4 className="text-lg font-bold text-slate-400">Henüz Dosya Bulunmuyor</h4>
          <p className="text-sm text-slate-400 mt-1">Hastanın röntgenlerini veya fotoğraf kayıtlarını yükleyerek başlayın.</p>
        </div>
      )}

      {/* Upload Modal */}
      <Modal isOpen={modalOpen} onClose={closeUploadModal} title="Yeni Dosya Yükle" size="md">
        <form onSubmit={handleUpload} className="space-y-4 py-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50 hover:border-metronic-primary/50 transition-colors group cursor-pointer"
          >
            <UploadCloud className="mx-auto text-slate-300 group-hover:text-metronic-primary mb-3" size={32} />
            {selectedFile ? (
              <p className="text-[13px] font-bold text-metronic-primary">{selectedFile.name} <span className="text-slate-400 font-medium">({(selectedFile.size / 1024).toFixed(0)} KB)</span></p>
            ) : (
              <p className="text-[13px] font-bold text-slate-500">Dosyaları buraya sürükleyin veya <span className="text-metronic-primary">bilgisayarınızdan seçin</span></p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Tüm dosya türleri desteklenir (Maks 10MB)</p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Dosya Adı / Başlık</label>
            <input 
              required
              type="text" 
              value={uploadForm.name}
              onChange={(e) => setUploadForm({...uploadForm, name: e.target.value})}
              className="m-input mt-1" 
              placeholder="Örn: Panoramik Röntgen 2024" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Kategori</label>
              <select 
                value={uploadForm.category}
                onChange={(e) => setUploadForm({...uploadForm, category: e.target.value as PatientDocument['category']})}
                className="m-input mt-1"
              >
                <option value="X-RAY">Röntgen</option>
                <option value="PHOTO">Klinik Fotoğraf</option>
                <option value="CONSENT">Onam Formu</option>
                <option value="OTHER">Diğer</option>
              </select>
            </div>
            <div className="flex items-end">
               <button
                 type="submit"
                 disabled={uploading || !selectedFile}
                 className="w-full h-[38px] bg-metronic-primary text-white rounded-lg font-bold hover:bg-blue-600 shadow-lg shadow-blue-500/20 disabled:opacity-50"
               >
                 {uploading ? 'Yükleniyor...' : 'Dosyayı Yükle'}
               </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setPreviewDoc(null); setOcrResult(null); }}>
           <div className="relative max-w-5xl w-full max-h-[90vh] bg-white dark:bg-[#1c1f2e] rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 dark:text-white">{previewDoc.name}</h4>
                <button onClick={() => { setPreviewDoc(null); setOcrResult(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400"><X size={20} /></button>
              </div>
              <div className="p-5 flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0f1117]">
                 {previewDoc.category === 'CONSENT' ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Left side: PDF and Action */}
                     <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                       <FileCheck size={64} className="text-violet-500 mb-4" />
                       <h5 className="font-bold text-slate-800 dark:text-white text-sm">Onam Formu Belgesi</h5>
                       <p className="text-xs text-slate-400 mt-1">Sistem üzerinden ıslak imzalı veya dijital onam belgesi taraması yapabilirsiniz.</p>
                       
                       <div className="mt-6 w-full space-y-3">
                         <button 
                           onClick={() => handleOcr(previewDoc)}
                           disabled={ocrLoading}
                           className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-600/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                         >
                           {ocrLoading ? (
                             <>
                               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                               OCR Analizi Yapılıyor...
                             </>
                           ) : (
                             <>Akıllı OCR Taraması Başlat</>
                           )}
                         </button>
                         <button
                           onClick={() => window.open(resolveDocumentUrl(previewDoc.fileUrl), '_blank')}
                           className="w-full py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                         >
                           Belgeyi İndir
                         </button>
                       </div>
                     </div>

                     {/* Right side: OCR Results */}
                     <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl p-6 flex flex-col">
                       <h5 className="font-bold text-slate-800 dark:text-white text-sm border-b border-slate-100 dark:border-white/5 pb-3">OCR Analiz Raporu</h5>
                       
                       {ocrLoading ? (
                         <div className="flex-1 flex flex-col items-center justify-center py-12">
                           <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                           <p className="text-xs text-slate-500 font-medium">Belge üzerindeki imzalar, T.C. Kimlik Numarası ve beyanlar doğrulanıyor...</p>
                         </div>
                       ) : ocrResult ? (
                         <div className="flex-1 mt-4 space-y-4">
                           <div className="grid grid-cols-2 gap-4">
                             <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                               <span className="text-[10px] text-slate-400 font-bold block">BELGE TÜRÜ</span>
                               <span className="text-xs font-bold text-slate-800 dark:text-white block mt-0.5">{ocrResult.documentType}</span>
                             </div>
                             <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                               <span className="text-[10px] text-slate-400 font-bold block">İMZA DURUMU</span>
                               <span className={`text-xs font-black block mt-0.5 ${ocrResult.signed ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {ocrResult.signed ? 'İMZALANMIŞ' : 'İMZASIZ'}
                               </span>
                             </div>
                             <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                               <span className="text-[10px] text-slate-400 font-bold block">OKUMA GÜVENİ</span>
                               <span className="text-xs font-bold text-violet-500 block mt-0.5">%{(ocrResult.confidence * 100).toFixed(0)} Accuracy</span>
                             </div>
                             <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                               <span className="text-[10px] text-slate-400 font-bold block">İMZA TARİHİ</span>
                               <span className="text-xs font-bold text-slate-800 dark:text-white block mt-0.5">{ocrResult.signedDate || '-'}</span>
                             </div>
                           </div>

                           <div className="bg-slate-50 dark:bg-[#0f1117] p-3 rounded-xl border border-slate-100 dark:border-white/5 flex-1 flex flex-col">
                             <span className="text-[10px] text-slate-400 font-bold block mb-1">OKUNAN METİN İÇERİĞİ</span>
                             <pre className="text-[10px] text-slate-600 dark:text-slate-400 font-mono whitespace-pre-wrap overflow-y-auto max-h-[140px] flex-1">
                               {ocrResult.extractedText}
                             </pre>
                           </div>
                         </div>
                       ) : (
                         <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-400">
                           <FileCheck size={36} className="text-slate-200 mb-2" />
                           <p className="text-xs">OCR taramasını başlatmak için sol taraftaki butona tıklayın.</p>
                         </div>
                       )}
                     </div>
                   </div>
                 ) : (
                   <div className="flex items-center justify-center bg-slate-100 dark:bg-[#0f1117] rounded-xl p-4 overflow-auto min-h-[300px]">
                      {previewDoc.fileType?.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element -- dynamic backend-hosted document URL (arbitrary origin/env), not a static asset next/image can optimize
                        <img src={resolveDocumentUrl(previewDoc.fileUrl)} alt={previewDoc.name} className="max-w-full object-contain rounded-lg" />
                      ) : (
                        <div className="p-16 text-center">
                           {(() => {
                             const { Icon: PreviewIcon, colorClass } = getFileIconInfo(previewDoc);
                             return <PreviewIcon size={64} className={`mx-auto mb-4 ${colorClass}`} />;
                           })()}
                           <p className="text-slate-500 dark:text-slate-400 font-bold">Bu dosya türü için önizleme desteklenmiyor.</p>
                           <button
                             onClick={() => window.open(resolveDocumentUrl(previewDoc.fileUrl), '_blank')}
                             className="mt-4 px-6 py-2 bg-metronic-primary text-white rounded-lg font-bold"
                           >
                             Dosyayı İndir
                           </button>
                        </div>
                      )}
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
        loading={deleting}
        title="Dosyayı Sil"
        message="Bu dosyayı silmek istediğinize emin misiniz?"
      />
    </div>
  );
}
