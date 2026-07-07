'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import MetronicLayout from '../../../../components/layout/MetronicLayout';
import { EmployeeService, Employee } from '../../../../lib/services/employee.service';
import Skeleton from '../../../../components/ui/Skeleton';
import { User, Calendar, FileText, Clock, FolderOpen } from 'lucide-react';
import { useToastStore } from '../../../../store/toastStore';
import EmployeeHeader from '../../../../components/hr/EmployeeHeader';
import GeneralInfoTab from './tabs/GeneralInfoTab';
import EmployeeDocumentsTab from './tabs/EmployeeDocumentsTab';
import LeavesTab from './tabs/LeavesTab';
import ContractsTab from './tabs/ContractsTab';
import WorkHoursTab from './tabs/WorkHoursTab';

export default function EmployeeDetailsPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore(state => state.addToast);

  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      const data = await EmployeeService.findOne(id as string);
      setEmployee(data);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Personel bilgileri yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/param-change pattern
    if (id) fetchEmployee();
  }, [id, fetchEmployee]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const updated = await EmployeeService.uploadPhoto(id as string, file);
      setEmployee(prev => prev ? { ...prev, photoUrl: updated.photoUrl } : updated);
      addToast({ title: 'Başarılı', message: 'Profil fotoğrafı güncellendi.', type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Hata', message: err.response?.data?.message || 'Fotoğraf yüklenemedi.', type: 'error' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    setUploadingPhoto(true);
    try {
      const updated = await EmployeeService.deletePhoto(id as string);
      setEmployee(prev => prev ? { ...prev, photoUrl: updated.photoUrl } : updated);
      addToast({ title: 'Başarılı', message: 'Profil fotoğrafı kaldırıldı.', type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Hata', message: err.response?.data?.message || 'Fotoğraf kaldırılamadı.', type: 'error' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <MetronicLayout title="Personel Detayı" breadcrumbs={['İnsan Kaynakları', 'Personeller', 'Detay']}>
        <div className="flex gap-4 items-start">
          <div className="w-[18%] min-w-[200px] flex-shrink-0 space-y-3">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <Skeleton className="flex-1 h-96 rounded-xl" />
        </div>
      </MetronicLayout>
    );
  }

  if (!employee) return null;

  const tabs = [
    { id: 'general', label: 'Genel Bilgiler', icon: <User size={18} />, doctorOnly: false },
    { id: 'workhours', label: 'Mesai Ayarları', icon: <Clock size={18} />, doctorOnly: true },
    { id: 'contracts', label: 'Prim Ayarları', icon: <FileText size={18} />, doctorOnly: true },
    { id: 'documents', label: 'Dokümanlar', icon: <FolderOpen size={18} />, doctorOnly: false },
    { id: 'leaves', label: 'İzinler', icon: <Calendar size={18} />, doctorOnly: false },
  ].filter(tab => !tab.doctorOnly || employee.isDoctor);

  return (
    <MetronicLayout title={`${employee.firstName} ${employee.lastName}`} breadcrumbs={['İnsan Kaynakları', 'Personeller', 'Detay']}>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {/* Hasta detay sayfasıyla aynı yapı: sol daraltılabilir menü + sağda sekme içeriği (bkz. patients/[id]/page.tsx) */}
      <div className="flex gap-4 items-start">
        <div className={`${sidebarCollapsed ? 'w-[68px]' : 'w-[18%] min-w-[200px]'} flex-shrink-0 sticky top-0 self-start transition-all duration-300`}>
          <EmployeeHeader
            employee={employee}
            uploadingPhoto={uploadingPhoto}
            onPhotoUploadClick={() => photoInputRef.current?.click()}
            onPhotoDelete={handlePhotoDelete}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          />
        </div>

        <div className="flex-1 min-w-0 bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="p-6">
            {activeTab === 'general' && <GeneralInfoTab employee={employee} onUpdated={fetchEmployee} />}

            {activeTab === 'documents' && <EmployeeDocumentsTab employeeId={employee.id} />}

            {activeTab === 'leaves' && <LeavesTab employeeId={employee.id} />}

            {activeTab === 'contracts' && <ContractsTab employeeId={employee.id} />}

            {activeTab === 'workhours' && <WorkHoursTab employeeId={employee.id} />}
          </div>
        </div>
      </div>
    </MetronicLayout>
  );
}
