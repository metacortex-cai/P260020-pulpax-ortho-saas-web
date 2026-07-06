'use client';
import MetronicLayout from '../../components/layout/MetronicLayout';
import TreatmentsView from '../../components/treatments/TreatmentsView';

export default function TreatmentsPage() {
  return (
    <MetronicLayout title="Tedaviler" breadcrumbs={['Tarife İşlemleri', 'Tedaviler']}>
      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-hidden bg-white dark:bg-[#1c1f2e] h-[calc(100vh-180px)]">
        <TreatmentsView />
      </div>
    </MetronicLayout>
  );
}
