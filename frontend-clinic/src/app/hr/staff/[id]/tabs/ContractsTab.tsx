'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { EmployeeService, EmployeeContract, ContractPayload, PrimModel } from '../../../../../lib/services/employee.service';
import { TreatmentService, Tariff } from '../../../../../lib/services/treatment.service';
import { Plus, Trash2, Target, Pencil } from 'lucide-react';
import Skeleton from '../../../../../components/ui/Skeleton';
import Modal from '../../../../../components/ui/Modal';
import ConfirmModal from '../../../../../components/ui/ConfirmModal';
import { useToastStore } from '../../../../../store/toastStore';

const MODEL_INFO: Record<PrimModel, { label: string; description: string }> = {
  MODEL_1: { label: 'Model-1', description: 'Sabit Maaş + Yüzde Bazlı Prim' },
  MODEL_2: { label: 'Model-2', description: 'Yüzde Bazlı Prim − Laboratuvar Masrafı Düşülerek' },
  MODEL_3: { label: 'Model-3', description: 'Yüzde Bazlı Prim − Laboratuvar + Tedavi Maliyeti Düşülerek' },
  MODEL_4: { label: 'Model-4', description: 'Kalem Başına Sabit Ücret' },
};

const emptyForm = (employeeId: string): ContractPayload => ({
  employeeId,
  type: 'MODEL_1',
  rate: 0,
  validFrom: new Date().toISOString().slice(0, 10),
  fixedSalary: 0,
  rateMode: 'BULK',
  targetEnabled: false,
  targetCarryOver: false,
  categoryRates: [],
  itemFees: [],
});

export default function ContractsTab({ employeeId }: { employeeId: string }) {
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore(state => state.addToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ContractPayload>(emptyForm(employeeId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(tariffs.map(t => t.masterTreatment.category).filter(Boolean))) as string[],
    [tariffs],
  );
  const masterTreatments = useMemo(() => {
    const map = new Map<string, string>();
    tariffs.forEach(t => map.set(t.masterTreatment.id, t.masterTreatment.name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tariffs]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const employee = await EmployeeService.findOne(employeeId);
      setContracts(employee.contracts || []);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Sözleşme bilgileri yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [employeeId, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/param-change pattern
    fetchData();
    TreatmentService.getTariffs().then(setTariffs).catch(() => {});
  }, [employeeId, fetchData]);

  const openModal = () => {
    setEditingId(null);
    setForm(emptyForm(employeeId));
    setModalOpen(true);
  };

  const openEditModal = (contract: EmployeeContract) => {
    setEditingId(contract.id);
    setForm({
      employeeId,
      type: contract.type,
      rate: contract.rate,
      validFrom: contract.validFrom.slice(0, 10),
      validUntil: contract.validUntil ? contract.validUntil.slice(0, 10) : undefined,
      conditions: contract.conditions || undefined,
      fixedSalary: contract.fixedSalary,
      rateMode: contract.rateMode,
      targetEnabled: contract.targetEnabled,
      targetAmount: contract.targetAmount || undefined,
      targetCarryOver: contract.targetCarryOver,
      categoryRates: contract.categoryRates.map((c) => ({ category: c.category, rate: c.rate })),
      itemFees: contract.itemFees.map((f) => ({ masterTreatmentId: f.masterTreatmentId, fixedFee: f.fixedFee })),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingId) {
        await EmployeeService.updateContract(editingId, form);
        addToast({ title: 'Başarılı', message: 'Sözleşme / prim ayarı güncellendi.', type: 'success' });
      } else {
        await EmployeeService.createContract(form);
        addToast({ title: 'Başarılı', message: 'Sözleşme / prim ayarı oluşturuldu.', type: 'success' });
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Sözleşme kaydedilemedi.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await EmployeeService.deleteContract(deleteId);
      addToast({ title: 'Başarılı', message: 'Sözleşme / prim ayarı silindi.', type: 'success' });
      setDeleteId(null);
      fetchData();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Sözleşme silinemedi.', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const addCategoryRate = () => {
    setForm(prev => ({ ...prev, categoryRates: [...(prev.categoryRates || []), { category: categories[0] || '', rate: 0 }] }));
  };
  const updateCategoryRate = (idx: number, patch: Partial<{ category: string; rate: number }>) => {
    setForm(prev => ({
      ...prev,
      categoryRates: (prev.categoryRates || []).map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  };
  const removeCategoryRate = (idx: number) => {
    setForm(prev => ({ ...prev, categoryRates: (prev.categoryRates || []).filter((_, i) => i !== idx) }));
  };

  const addItemFee = () => {
    setForm(prev => ({ ...prev, itemFees: [...(prev.itemFees || []), { masterTreatmentId: masterTreatments[0]?.id || '', fixedFee: 0 }] }));
  };
  const updateItemFee = (idx: number, patch: Partial<{ masterTreatmentId: string; fixedFee: number }>) => {
    setForm(prev => ({
      ...prev,
      itemFees: (prev.itemFees || []).map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    }));
  };
  const removeItemFee = (idx: number) => {
    setForm(prev => ({ ...prev, itemFees: (prev.itemFees || []).filter((_, i) => i !== idx) }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center">
        <h4 className="text-base font-bold text-slate-700">Prim & Sözleşme Bilgileri</h4>
        <button onClick={openModal} className="flex items-center gap-1.5 px-4 py-2 bg-metronic-primary text-white rounded-lg text-[13px] font-bold hover:bg-blue-600 transition-colors">
          <Plus size={16} /> Yeni Sözleşme Tanımla
        </button>
      </div>

      <div className="overflow-hidden border border-slate-100 rounded-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase">Model</th>
              <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase">Detay</th>
              <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase">Geçerlilik</th>
              <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase">Durum</th>
              <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {contracts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">Aktif sözleşme bulunamadı.</td>
              </tr>
            ) : contracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-slate-50 transition-colors align-top">
                <td className="py-3 px-4">
                  <div className="text-[13px] font-bold text-slate-800">{MODEL_INFO[contract.type]?.label || contract.type}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{MODEL_INFO[contract.type]?.description}</div>
                </td>
                <td className="py-3 px-4 text-[12px] text-slate-500">
                  <p>
                    Sabit Maaş: {contract.fixedSalary?.toLocaleString('tr-TR')} ₺
                    {contract.type !== 'MODEL_4' && ` • Oran: %${contract.rate} (${contract.rateMode === 'CATEGORY' ? 'Kategori Bazlı' : 'Toplu'})`}
                  </p>
                  {contract.targetEnabled && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded">
                      <Target size={11} /> Hedef: {contract.targetAmount?.toLocaleString('tr-TR')} ₺
                    </span>
                  )}
                  {contract.rateMode === 'CATEGORY' && contract.categoryRates?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {contract.categoryRates.map((c) => (
                        <span key={c.category} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-600">
                          {c.category}: %{c.rate}
                        </span>
                      ))}
                    </div>
                  )}
                  {contract.type === 'MODEL_4' && contract.itemFees?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {contract.itemFees.map((f) => (
                        <span key={f.masterTreatmentId} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-600">
                          {masterTreatments.find(m => m.id === f.masterTreatmentId)?.name || f.masterTreatmentId}: {f.fixedFee} ₺
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-[12px] text-slate-500">
                  {new Date(contract.validFrom).toLocaleDateString('tr-TR')} - {contract.validUntil ? new Date(contract.validUntil).toLocaleDateString('tr-TR') : 'Süresiz'}
                </td>
                <td className="py-3 px-4">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded-full border border-emerald-100">AKTİF</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEditModal(contract)}
                      className="p-2 text-slate-400 hover:text-metronic-primary hover:bg-slate-100 rounded-lg transition-colors"
                      title="Düzenle"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteId(contract.id)}
                      className="p-2 text-slate-400 hover:text-metronic-danger hover:bg-red-50 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Sözleşmeyi Sil"
        message="Bu sözleşme / prim ayarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Sözleşme / Prim Ayarını Düzenle' : 'Yeni Sözleşme / Prim Ayarı Tanımla'} size="lg">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Prim Modeli</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(Object.keys(MODEL_INFO) as PrimModel[]).map((model) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => setForm({ ...form, type: model })}
                  className={`text-left p-3 rounded-lg border text-[12px] transition-colors ${
                    form.type === model ? 'border-metronic-primary bg-metronic-primary-light text-metronic-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">{MODEL_INFO[model].label}</div>
                  <div className="text-[11px] opacity-80">{MODEL_INFO[model].description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Sabit Maaş (₺)</label>
              <input type="number" min={0} value={form.fixedSalary} onChange={(e) => setForm({ ...form, fixedSalary: Number(e.target.value) })} className="m-input mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Geçerlilik Başlangıcı</label>
              <input required type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="m-input mt-1" />
            </div>
          </div>

          {form.type !== 'MODEL_4' ? (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Oran Türü</label>
                <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
                  {(['BULK', 'CATEGORY'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm({ ...form, rateMode: mode })}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors ${form.rateMode === mode ? 'bg-metronic-primary text-white' : 'text-slate-500'}`}
                    >
                      {mode === 'BULK' ? 'Toplu' : 'Kategori Bazlı'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  {form.rateMode === 'CATEGORY' ? 'Varsayılan Oran (%) — kategori tanımsızsa kullanılır' : 'Prim Oranı (%)'}
                </label>
                <input required type="number" min={0} max={100} step={0.1} value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} className="m-input mt-1" />
              </div>

              {form.rateMode === 'CATEGORY' && (
                <div className="space-y-2">
                  {(form.categoryRates || []).map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select value={c.category} onChange={(e) => updateCategoryRate(idx, { category: e.target.value })} className="m-input flex-1">
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <input type="number" min={0} max={100} step={0.1} value={c.rate} onChange={(e) => updateCategoryRate(idx, { rate: Number(e.target.value) })} className="m-input w-24" placeholder="%" />
                      <button type="button" onClick={() => removeCategoryRate(idx)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={addCategoryRate} className="flex items-center gap-1 text-[12px] font-bold text-metronic-primary">
                    <Plus size={13} /> Kategori Oranı Ekle
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Kalem Bazlı Sabit Ücretler</label>
              {(form.itemFees || []).map((f, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select value={f.masterTreatmentId} onChange={(e) => updateItemFee(idx, { masterTreatmentId: e.target.value })} className="m-input flex-1">
                    {masterTreatments.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input type="number" min={0} value={f.fixedFee} onChange={(e) => updateItemFee(idx, { fixedFee: Number(e.target.value) })} className="m-input w-28" placeholder="₺" />
                  <button type="button" onClick={() => removeItemFee(idx)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" onClick={addItemFee} className="flex items-center gap-1 text-[12px] font-bold text-metronic-primary">
                <Plus size={13} /> Kalem Ücreti Ekle
              </button>
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            <label className="flex items-center gap-2 text-[12px] font-bold text-slate-600">
              <input type="checkbox" checked={form.targetEnabled} onChange={(e) => setForm({ ...form, targetEnabled: e.target.checked })} />
              Hedef Bazlı Prim Sistemi Aktif
            </label>
            {form.targetEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Aylık Ciro Hedefi (₺)</label>
                  <input type="number" min={0} value={form.targetAmount || 0} onChange={(e) => setForm({ ...form, targetAmount: Number(e.target.value) })} className="m-input mt-1" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-[12px] font-bold text-slate-600">
                    <input type="checkbox" checked={form.targetCarryOver} onChange={(e) => setForm({ ...form, targetCarryOver: e.target.checked })} />
                    Hedefe ulaşılamazsa fark sonraki aya devretsin
                  </label>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Açıklama</label>
            <textarea value={form.conditions || ''} onChange={(e) => setForm({ ...form, conditions: e.target.value })} className="m-input mt-1" rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">İptal</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-[13px] font-bold text-white bg-metronic-primary rounded-lg hover:bg-blue-600 disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
