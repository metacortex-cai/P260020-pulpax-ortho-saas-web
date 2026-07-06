'use client';

// Hasta Cari > Tedavi Planları sekmesi, hasta detayındaki ("Hasta İşlemleri") Tedavi
// Planları sekmesiyle birebir aynı veriyi ve aksiyonları kullanır; mantığın iki yerde
// ayrı ayrı bakım gerektirmemesi için aynı bileşen burada yeniden kullanılıyor.
import TreatmentPlansTab from '../../../../patients/[id]/tabs/TreatmentPlansTab';

export default function FinancialPlansTab({ patient }: { patient: any }) {
  return <TreatmentPlansTab patient={patient} />;
}
