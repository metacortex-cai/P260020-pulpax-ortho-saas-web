'use client';

import { useState, useEffect, useCallback } from 'react';
import { EmployeeService, EmployeeLeave, LeaveEntitlement } from '../../../../../lib/services/employee.service';
import { Plus, Check, X, Pencil, CalendarClock } from 'lucide-react';
import Skeleton from '../../../../../components/ui/Skeleton';
import Modal from '../../../../../components/ui/Modal';
import { useToastStore } from '../../../../../store/toastStore';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Onay Bekliyor', className: 'bg-amber-50 text-amber-600' },
  APPROVED: { label: 'Onaylandı', className: 'bg-metronic-success-light text-metronic-success' },
  REJECTED: { label: 'Reddedildi', className: 'bg-red-50 text-red-500' },
};

const LEAVE_TYPES: Record<string, string> = {
  ANNUAL: 'Yıllık İzin',
  MEDICAL: 'Sağlık Raporu',
  EXCUSE: 'Mazeret İzni',
  UNPAID: 'Ücretsiz İzin',
};

export default function LeavesTab({ employeeId }: { employeeId: string }) {
  const [leaves, setLeaves] = useState<EmployeeLeave[]>([]);
  const [entitlement, setEntitlement] = useState<LeaveEntitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore(state => state.addToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'ANNUAL', startAt: '', endAt: '' });

  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [entitlementModalOpen, setEntitlementModalOpen] = useState(false);
  const [entitlementForm, setEntitlementForm] = useState({ totalDays: 0, carryOverDays: 0 });

  const currentYear = new Date().getFullYear();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const all = await EmployeeService.findAllLeaves();
      setLeaves(all.filter(l => l.employeeId === employeeId));
      const ent = await EmployeeService.getLeaveEntitlement(employeeId, currentYear);
      setEntitlement(ent);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'İzin bilgileri yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [employeeId, currentYear, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/param-change pattern
    fetchData();
  }, [employeeId, fetchData]);

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await EmployeeService.createLeave({ employeeId, ...form });
      addToast({ title: 'Başarılı', message: 'İzin talebi oluşturuldu.', type: 'success' });
      setModalOpen(false);
      setForm({ type: 'ANNUAL', startAt: '', endAt: '' });
      fetchData();
    } catch (err) {
      addToast({ title: 'Hata', message: 'İzin talebi oluşturulamadı.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (leaveId: string) => {
    try {
      await EmployeeService.updateLeaveStatus(leaveId, 'APPROVED');
      addToast({ title: 'Başarılı', message: 'İzin onaylandı.', type: 'success' });
      fetchData();
    } catch (err) {
      addToast({ title: 'Hata', message: 'İzin onaylanamadı.', type: 'error' });
    }
  };

  const handleReject = async () => {
    if (!rejectModalId) return;
    try {
      await EmployeeService.updateLeaveStatus(rejectModalId, 'REJECTED', rejectionReason);
      addToast({ title: 'Başarılı', message: 'İzin reddedildi.', type: 'success' });
      setRejectModalId(null);
      setRejectionReason('');
      fetchData();
    } catch (err) {
      addToast({ title: 'Hata', message: 'İzin reddedilemedi.', type: 'error' });
    }
  };

  const openEntitlementModal = () => {
    setEntitlementForm({
      totalDays: entitlement?.totalDays || 0,
      carryOverDays: entitlement?.carryOverDays || 0,
    });
    setEntitlementModalOpen(true);
  };

  const handleSaveEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await EmployeeService.upsertLeaveEntitlement(employeeId, { year: currentYear, ...entitlementForm });
      setEntitlement(prev => prev ? { ...prev, totalDays: updated.totalDays, carryOverDays: updated.carryOverDays, remainingDays: updated.totalDays + updated.carryOverDays - prev.usedDays } : null);
      setEntitlementModalOpen(false);
      addToast({ title: 'Başarılı', message: 'İzin hak edişi güncellendi.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Hata', message: 'Hak ediş kaydedilemedi.', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">

      {/* Hak Ediş Info Panel */}
      <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-600">
            <CalendarClock size={18} className="text-metronic-primary" />
            <span className="text-[13px] font-bold">{currentYear} Yıllık İzin Hak Edişi</span>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Toplam</p>
              <p className="text-[15px] font-bold text-slate-700">{entitlement?.totalDays ?? 0} gün</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Devir</p>
              <p className="text-[15px] font-bold text-slate-700">{entitlement?.carryOverDays ?? 0} gün</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Kullanılan</p>
              <p className="text-[15px] font-bold text-slate-700">{entitlement?.usedDays ?? 0} gün</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Kalan</p>
              <p className="text-[15px] font-bold text-metronic-primary">{entitlement?.remainingDays ?? 0} gün</p>
            </div>
          </div>
        </div>
        <button onClick={openEntitlementModal} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">
          <Pencil size={13} /> Hak Ediş Tanımla
        </button>
      </div>

      <div className="flex justify-between items-center">
        <h4 className="text-base font-bold text-slate-700">İzin Geçmişi</h4>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[13px] font-bold hover:bg-emerald-100 transition-colors">
          <Plus size={16} /> Yeni İzin Talebi
        </button>
      </div>

      <div className="overflow-hidden border border-slate-100 rounded-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase">Tür</th>
              <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase">Tarih Aralığı</th>
              <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase text-center">Durum</th>
              <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {leaves.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-slate-400 text-sm">İzin kaydı bulunamadı.</td></tr>
            ) : leaves.map((leave) => {
              const statusInfo = STATUS_LABELS[leave.status] || STATUS_LABELS.PENDING;
              return (
                <tr key={leave.id}>
                  <td className="py-3 px-4 text-[13px] font-bold text-slate-700">{LEAVE_TYPES[leave.type] || leave.type}</td>
                  <td className="py-3 px-4 text-[13px] text-slate-600">
                    {new Date(leave.startAt).toLocaleDateString('tr-TR')} - {new Date(leave.endAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                    {leave.status === 'REJECTED' && leave.rejectionReason && (
                      <p className="text-[10px] text-slate-400 mt-1">{leave.rejectionReason}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {leave.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleApprove(leave.id)} className="p-2 text-slate-400 hover:text-metronic-success hover:bg-emerald-50 rounded-lg" title="Onayla"><Check size={16} /></button>
                        <button onClick={() => setRejectModalId(leave.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Reddet"><X size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Yeni İzin Talebi Modalı */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni İzin Talebi" size="sm">
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Tür</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="m-input mt-1">
              {Object.entries(LEAVE_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Başlangıç</label>
              <input required type="date" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="m-input mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Bitiş</label>
              <input required type="date" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} className="m-input mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">İptal</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-[13px] font-bold text-white bg-metronic-primary rounded-lg hover:bg-blue-600 disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : 'Talep Oluştur'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Red Nedeni Modalı */}
      <Modal isOpen={!!rejectModalId} onClose={() => setRejectModalId(null)} title="İzni Reddet" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Red Nedeni (opsiyonel)</label>
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="m-input mt-1" rows={3} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setRejectModalId(null)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">İptal</button>
            <button onClick={handleReject} className="px-5 py-2 text-[13px] font-bold text-white bg-metronic-danger rounded-lg hover:bg-red-600">Reddet</button>
          </div>
        </div>
      </Modal>

      {/* Hak Ediş Tanımlama Modalı */}
      <Modal isOpen={entitlementModalOpen} onClose={() => setEntitlementModalOpen(false)} title={`${currentYear} Hak Ediş Tanımla`} size="sm">
        <form onSubmit={handleSaveEntitlement} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Toplam Yıllık İzin (gün)</label>
            <input required type="number" min={0} value={entitlementForm.totalDays} onChange={(e) => setEntitlementForm({ ...entitlementForm, totalDays: Number(e.target.value) })} className="m-input mt-1" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Önceki Yıldan Devir (gün)</label>
            <input type="number" min={0} value={entitlementForm.carryOverDays} onChange={(e) => setEntitlementForm({ ...entitlementForm, carryOverDays: Number(e.target.value) })} className="m-input mt-1" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEntitlementModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">İptal</button>
            <button type="submit" className="px-5 py-2 text-[13px] font-bold text-white bg-metronic-primary rounded-lg hover:bg-blue-600">Kaydet</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
