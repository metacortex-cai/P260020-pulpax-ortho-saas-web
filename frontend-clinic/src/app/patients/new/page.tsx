'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '../../../store/uiStore';

// Bu sayfa cinsiyet/doğum tarihi gibi alanları içermeyen eski bir kısa formdu.
// Artık tüm zorunlu alanları içeren AddPatientModal'ı açıp listeye yönlendiriyor.
export default function NewPatientPage() {
  const router = useRouter();
  const openAddPatientModal = useUIStore(state => state.openAddPatientModal);

  useEffect(() => {
    openAddPatientModal();
    router.replace('/patients');
  }, [openAddPatientModal, router]);

  return null;
}
