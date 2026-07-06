'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { useToastStore } from '../../../store/toastStore';
import { PatientCategories } from '../../../lib/utils/patientCategories';
import { Building2, Users, Home, Plus, Pencil, Trash2, Check, X, Search } from 'lucide-react';

type Tab = 'institutions' | 'groups' | 'families';

const TAB_CONFIG: { id: Tab; label: string; icon: any; description: string }[] = [
  { id: 'institutions', label: 'Kurumlar',  icon: Building2, description: 'Hasta bilgilerinde "Kurum" alanında görünecek kurumlar.' },
  { id: 'groups',       label: 'Gruplar',   icon: Users,     description: 'Hasta bilgilerinde "Grup" alanında görünecek hasta grupları.' },
  { id: 'families',     label: 'Aileler',   icon: Home,      description: 'Hasta bilgilerinde "Aile" alanında görünecek aile grupları.' },
];

export default function PatientCategoriesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);

  const [activeTab, setActiveTab] = useState<Tab>('institutions');
  const [items, setItems] = useState<Record<Tab, string[]>>({
    institutions: [],
    groups: [],
    families: [],
  });

  const [newValue, setNewValue] = useState('');
  const [search, setSearch] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads persisted category lists from the PatientCategories store after the auth check, standard load-on-mount pattern
    setItems({
      institutions: PatientCategories.getInstitutions(),
      groups:       PatientCategories.getGroups(),
      families:     PatientCategories.getFamilies(),
    });
  }, [user, router]);

  // Reset transient UI state (search/new value/editing/delete-confirm) whenever the active tab changes.
  const [prevActiveTab, setPrevActiveTab] = useState(activeTab);
  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab);
    setSearch('');
    setNewValue('');
    setEditingIndex(null);
    setDeleteConfirm(null);
  }

  useEffect(() => {
    if (editingIndex !== null) editInputRef.current?.focus();
  }, [editingIndex]);

  const reload = () => {
    setItems({
      institutions: PatientCategories.getInstitutions(),
      groups:       PatientCategories.getGroups(),
      families:     PatientCategories.getFamilies(),
    });
  };

  const handleAdd = () => {
    const v = newValue.trim();
    if (!v) return;
    if (items[activeTab].includes(v)) {
      addToast({ title: 'Uyarı', message: 'Bu kayıt zaten mevcut.', type: 'warning' });
      return;
    }
    PatientCategories.add(activeTab, v);
    reload();
    setNewValue('');
    addToast({ title: 'Başarılı', message: 'Kayıt eklendi.', type: 'success' });
    newInputRef.current?.focus();
  };

  const handleRename = (index: number) => {
    const v = editValue.trim();
    if (!v) { setEditingIndex(null); return; }
    const original = filtered[index];
    if (v === original) { setEditingIndex(null); return; }
    if (items[activeTab].includes(v)) {
      addToast({ title: 'Uyarı', message: 'Bu isim zaten mevcut.', type: 'warning' });
      return;
    }
    PatientCategories.rename(activeTab, original, v);
    reload();
    setEditingIndex(null);
    addToast({ title: 'Başarılı', message: 'Kayıt güncellendi.', type: 'success' });
  };

  const handleDelete = (index: number) => {
    const value = filtered[index];
    PatientCategories.remove(activeTab, value);
    reload();
    setDeleteConfirm(null);
    addToast({ title: 'Başarılı', message: 'Kayıt silindi.', type: 'success' });
  };

  const filtered = items[activeTab].filter(v =>
    v.toLowerCase().includes(search.toLowerCase())
  );

  const currentTab = TAB_CONFIG.find(t => t.id === activeTab)!;

  if (!user) return null;

  return (
    <MetronicLayout title="Hasta Kategorileri" breadcrumbs={['Ayarlar', 'Hasta Kategorileri']}>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Hasta Kategori Listeleri</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Hasta kayıt formundaki Kurum, Grup ve Aile seçeneklerini yönetin.
            </p>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* Sol: Sekmeler */}
          <div className="w-56 flex-shrink-0 bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
            {TAB_CONFIG.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 ${
                    isActive
                      ? 'bg-metronic-primary/5 text-metronic-primary font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon size={17} className={isActive ? 'text-metronic-primary' : 'text-slate-400'} />
                  <span className="text-[13px]">{tab.label}</span>
                  <span className={`ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-metronic-primary text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                  }`}>
                    {items[tab.id].length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sağ: İçerik */}
          <div className="flex-1 bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
            {/* İçerik başlık */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
              <currentTab.icon size={18} className="text-metronic-primary" />
              <div>
                <h3 className="text-[14px] font-bold text-slate-800 dark:text-white">{currentTab.label}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{currentTab.description}</p>
              </div>
            </div>

            {/* Yeni kayıt ekle */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <input
                  ref={newInputRef}
                  type="text"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                  placeholder={`Yeni ${currentTab.label.slice(0, -2)} adı...`}
                  className="flex-1 px-3 py-2 text-[13px] border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-metronic-primary/30 focus:border-metronic-primary"
                />
                <button
                  onClick={handleAdd}
                  disabled={!newValue.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-metronic-primary text-white text-[13px] font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={15} /> Ekle
                </button>
              </div>
            </div>

            {/* Arama */}
            {items[activeTab].length > 5 && (
              <div className="px-6 py-3 border-b border-slate-100 dark:border-white/5">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Listede ara..."
                    className="w-full pl-8 pr-3 py-2 text-[13px] border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-metronic-primary/30 focus:border-metronic-primary"
                  />
                </div>
              </div>
            )}

            {/* Liste */}
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <currentTab.icon size={32} className="text-slate-200 dark:text-white/10 mx-auto mb-3" />
                  <p className="text-[13px] text-slate-400">
                    {search ? 'Arama sonucu bulunamadı.' : `Henüz ${currentTab.label.toLowerCase()} eklenmemiş.`}
                  </p>
                </div>
              ) : (
                filtered.map((item, idx) => (
                  <div key={item} className="flex items-center gap-3 px-6 py-3 group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
                      {idx + 1}
                    </span>

                    {editingIndex === idx ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(idx);
                          if (e.key === 'Escape') setEditingIndex(null);
                        }}
                        className="flex-1 px-2 py-1 text-[13px] border border-metronic-primary rounded-lg bg-white dark:bg-white/5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-metronic-primary/30"
                      />
                    ) : (
                      <span className="flex-1 text-[13px] font-medium text-slate-700 dark:text-slate-200">{item}</span>
                    )}

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingIndex === idx ? (
                        <>
                          <button
                            onClick={() => handleRename(idx)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                            title="Kaydet"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                            title="İptal"
                          >
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingIndex(idx); setEditValue(item); }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-blue-50 hover:text-metronic-primary dark:hover:bg-metronic-primary/10 transition-colors"
                            title="Düzenle"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(idx)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer sayaç */}
            {filtered.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <span className="text-[11px] text-slate-400 font-medium">
                  Toplam {items[activeTab].length} kayıt
                  {search && ` · "${search}" için ${filtered.length} sonuç`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm !== null && handleDelete(deleteConfirm)}
        title={`${currentTab.label} Kaydını Sil`}
        message={deleteConfirm !== null ? `"${filtered[deleteConfirm]}" kaydını silmek istediğinize emin misiniz?` : ''}
      />
    </MetronicLayout>
  );
}
