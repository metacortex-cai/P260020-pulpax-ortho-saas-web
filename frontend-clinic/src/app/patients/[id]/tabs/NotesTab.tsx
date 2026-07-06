'use client';
import { useState, useEffect } from 'react';
import { Plus, Stethoscope, Trash2 } from 'lucide-react';
import { PatientService, PatientNote } from '../../../../lib/services/patient.service';
import { useToastStore } from '../../../../store/toastStore';
import Skeleton from '../../../../components/ui/Skeleton';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function NotesTab({ patient }: { patient: any }) {
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const addToast = useToastStore(state => state.addToast);

  const fetchNotes = async () => {
    if (!patient?.id) return;
    try {
      setLoading(true);
      const data = await PatientService.getNotes(patient.id);
      setNotes(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Notlar yüklenirken hata oluştu.';
      addToast({ title: 'Hata', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!patient?.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern (fetchNotes sets loading state before its async call)
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchNotes is recreated every render; including it would re-trigger the fetch on every render and cause an infinite loop
  }, [patient?.id]);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    try {
      setSaving(true);
      const created = await PatientService.createNote(patient.id, { type: 'CLINICAL', content: newNote });
      setNotes(prev => [created, ...prev]);
      setNewNote('');
      setAdding(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Not kaydedilirken hata oluştu.';
      addToast({ title: 'Hata', message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      setDeletingId(noteId);
      await PatientService.deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Not silinirken hata oluştu.';
      addToast({ title: 'Hata', message: msg, type: 'error' });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd.MM.yyyy HH:mm', { locale: tr });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Not Ekleme Alanı */}
      {adding ? (
        <div className="m-card shadow-none border border-metronic-primary/30 mb-0 bg-metronic-primary-light/10">
          <div className="m-card-body space-y-3 p-4">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-7 h-7 rounded-lg bg-metronic-primary-light flex items-center justify-center text-metronic-primary">
                 <Stethoscope size={14} />
               </div>
               <span className="text-[12px] font-bold text-slate-700">Yeni Klinik Not</span>
            </div>
            <textarea
              rows={4}
              className="m-input resize-none w-full text-[13px]"
              placeholder="Klinik not içeriğini buraya yazın..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setAdding(false); setNewNote(''); }}
                disabled={saving}
                className="px-3 py-1.5 text-[12px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                İptal
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-5 py-1.5 text-[12px] font-bold bg-metronic-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-slate-400" />
            <span className="text-[13px] font-bold text-slate-600">Klinik Notlar</span>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 h-8 px-4 bg-metronic-primary text-white rounded-lg text-[12px] font-bold hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus size={14} /> Yeni Not Ekle
          </button>
        </div>
      )}

      {/* Not Listesi */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="m-card shadow-none border border-slate-200/60 mb-0">
              <div className="m-card-body py-4 px-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-48 h-4" />
                    <Skeleton className="w-full h-4" />
                    <Skeleton className="w-3/4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : notes.length === 0 ? (
          <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Stethoscope size={24} className="mx-auto text-slate-300 mb-3" />
            <p className="text-[13px] text-slate-400">Henüz klinik not eklenmemiş.</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="m-card shadow-none border border-slate-200/60 mb-0 hover:border-metronic-primary/20 transition-colors">
              <div className="m-card-body py-4 px-5">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-metronic-primary-light flex items-center justify-center flex-shrink-0 text-metronic-primary shadow-sm">
                    <Stethoscope size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-slate-800">{note.author}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[12px] text-slate-400 font-medium">{formatDate(note.createdAt)}</span>
                      </div>
                      <button
                        onClick={() => setConfirmDeleteId(note.id)}
                        disabled={deletingId === note.id}
                        className="p-1.5 text-slate-400 hover:text-metronic-danger hover:bg-metronic-danger-light rounded-lg transition-colors disabled:opacity-40"
                        title="Notu Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-[13.5px] text-slate-600 leading-relaxed font-medium">{note.content}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        loading={!!deletingId}
        title="Notu Sil"
        message="Bu notu silmek istediğinize emin misiniz?"
      />
    </div>
  );
}
