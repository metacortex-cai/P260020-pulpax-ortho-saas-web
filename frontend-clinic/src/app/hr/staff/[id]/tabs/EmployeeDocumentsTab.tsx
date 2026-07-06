'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { EmployeeService, EmployeeDocument, resolveDocumentUrl } from '../../../../../lib/services/employee.service';
import { FolderOpen, FileText, Plus, Trash2, Download, UploadCloud } from 'lucide-react';
import Skeleton from '../../../../../components/ui/Skeleton';
import Modal from '../../../../../components/ui/Modal';
import ConfirmModal from '../../../../../components/ui/ConfirmModal';
import { useToastStore } from '../../../../../store/toastStore';

const CATEGORY_LABELS: Record<string, string> = {
  DIPLOMA: 'Diploma',
  SOZLESME: 'Sözleşme',
  KIMLIK: 'Kimlik',
  SERTIFIKA: 'Sertifika',
  DIGER: 'Diğer',
};

export default function EmployeeDocumentsTab({ employeeId }: { employeeId: string }) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const [uploadForm, setUploadForm] = useState<{ name: string; category: string; description: string }>({ name: '', category: 'DIGER', description: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await EmployeeService.listDocuments(employeeId);
      setDocuments(data);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Dokümanlar yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [employeeId, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/param-change pattern
    fetchDocuments();
  }, [employeeId, fetchDocuments]);

  const resetUploadForm = () => {
    setUploadForm({ name: '', category: 'DIGER', description: '' });
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
    setUploadForm(prev => ({ ...prev, name: prev.name || file.name.replace(/\.[^/.]+$/, '') }));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast({ title: 'Hata', message: 'Lütfen bir dosya seçin.', type: 'error' });
      return;
    }
    try {
      setUploading(true);
      await EmployeeService.uploadDocument(employeeId, selectedFile, uploadForm);
      addToast({ title: 'Başarılı', message: 'Doküman yüklendi.', type: 'success' });
      closeUploadModal();
      fetchDocuments();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Doküman yüklenemedi.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setDeleting(true);
      await EmployeeService.deleteDocument(employeeId, confirmDeleteId);
      addToast({ title: 'Başarılı', message: 'Doküman silindi.', type: 'success' });
      fetchDocuments();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Doküman silinemedi.', type: 'error' });
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center">
        <h4 className="text-base font-bold text-slate-700">Personel Dokümanları</h4>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-metronic-primary text-white rounded-xl text-[13px] font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/10">
          <Plus size={16} /> Yeni Dosya Yükle
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : documents.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <FolderOpen size={40} className="mx-auto text-slate-200 mb-3" />
          <h4 className="text-sm font-bold text-slate-400">Henüz Doküman Bulunmuyor</h4>
          <p className="text-xs text-slate-400 mt-1">Diploma, sözleşme veya sertifika gibi belgeleri yükleyerek başlayın.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-100 rounded-xl">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase">Dosya Adı</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase">Kategori</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase">Tarih</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-400"><FileText size={14} /></div>
                      <span className="text-[13px] font-bold text-slate-700">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">{CATEGORY_LABELS[doc.category] || doc.category}</span>
                  </td>
                  <td className="py-3 px-4 text-[12px] text-slate-500 font-medium">{new Date(doc.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => window.open(resolveDocumentUrl(doc.fileUrl), '_blank')} className="p-2 text-slate-400 hover:text-metronic-primary hover:bg-slate-100 rounded-lg"><Download size={16} /></button>
                      <button onClick={() => setConfirmDeleteId(doc.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeUploadModal} title="Yeni Doküman Yükle" size="md">
        <form onSubmit={handleUpload} className="space-y-4 py-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files?.[0] || null); }}
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
            <input required type="text" value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} className="m-input mt-1" placeholder="Örn: Diploma - 2018" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Kategori</label>
              <select value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })} className="m-input mt-1">
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={uploading || !selectedFile} className="w-full h-[38px] bg-metronic-primary text-white rounded-lg font-bold hover:bg-blue-600 shadow-lg shadow-blue-500/20 disabled:opacity-50">
                {uploading ? 'Yükleniyor...' : 'Dosyayı Yükle'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Dokümanı Sil"
        message="Bu dokümanı silmek istediğinize emin misiniz?"
      />
    </div>
  );
}
