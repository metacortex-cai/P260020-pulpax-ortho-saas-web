// ─── Sözleşme (Tedavi + Ödeme Planı) Export Utility ───────────────────────────
// Generates a PDF (jspdf + jspdf-autotable) listing the treatment items and the
// payment (installment) plan of an activated treatment plan / contract, together
// with the patient's identifying information. Visual style matches
// exportTreatmentPlan.ts's "Tedavi Planı" document.
import { formatCurrency } from './formatCurrency';

// Asgari düzeyde hukuki olarak gerekli sözleşme maddeleri: tedavi sürecinin ve
// ücretlendirmenin açık biçimde anlatıldığını ve hastanın tedaviyi onayladığını
// (aydınlatılmış onam) gösteren maddeler.
const CONTRACT_CLAUSES: { title: string; text: string }[] = [
  {
    title: 'TEDAVİ SÜRECİ HAKKINDA BİLGİLENDİRME',
    text: 'Hastaya; mevcut ağız ve diş sağlığı durumu, uygulanacak tedavinin kapsamı, aşamaları, tahmini süresi, tedavi sırasında ve sonrasında dikkat edilmesi gereken hususlar ile tedavinin uygulanmaması halinde ortaya çıkabilecek sonuçlar hakkında hekim tarafından anlaşılır şekilde bilgi verilmiştir.',
  },
  {
    title: 'RİSKLER VE ALTERNATİF TEDAVİ SEÇENEKLERİ',
    text: 'Hasta; tedavi sürecinde karşılaşılabilecek olası komplikasyon ve riskler ile varsa alternatif tedavi yöntemleri konusunda bilgilendirildiğini, sorularının hekim tarafından yanıtlandığını kabul eder.',
  },
  {
    title: 'ÜCRETLENDİRME',
    text: 'Yukarıda yer alan tedavi kalemlerine ait ücretler hastaya kalem bazında ve toplam tutar olarak ayrı ayrı bildirilmiş olup, hasta işbu tutarı ve varsa ödeme planını (taksitlendirmeyi) kabul etmektedir. Tedavi planında öngörülmeyen ek bir işlem gerekmesi halinde hasta ayrıca bilgilendirilecek ve ek ücret ancak hastanın onayı alındıktan sonra uygulanacaktır.',
  },
  {
    title: 'HASTANIN ONAYI (AYDINLATILMIŞ ONAM)',
    text: 'Hasta; yukarıda belirtilen tedavilerin kendisine veya kanuni temsilcisine anlaşılır şekilde anlatıldığını, tedavi içeriği, riskleri ve ücretlendirmesi hakkında tam olarak bilgilendirildiğini, tüm sorularının cevaplandığını ve bu bilgiler ışığında söz konusu tedavilerin uygulanmasını özgür iradesiyle kabul ettiğini beyan eder.',
  },
  {
    title: 'ÖDEME KOŞULLARI',
    text: 'Belirlenen ödeme planına uyulmaması halinde klinik, doğmuş ve doğacak alacaklarını yasal yollardan tahsil etme hakkını saklı tutar. Tedavinin hastanın kendi isteğiyle yarıda bırakılması halinde, o ana kadar uygulanmış olan tedavi kalemlerinin bedeli hastadan tahsil edilir.',
  },
  {
    title: 'KİŞİSEL VERİLERİN KORUNMASI',
    text: 'Hastaya ait kimlik, iletişim ve sağlık verileri, 6698 sayılı Kişisel Verilerin Korunması Kanunu ve ilgili mevzuat kapsamında yalnızca tedavi sürecinin yürütülmesi, randevu/iletişim faaliyetleri ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenmekte ve saklanmaktadır.',
  },
  {
    title: 'YÜRÜRLÜK',
    text: 'İşbu sözleşme, hasta ve hekim/klinik yetkilisi tarafından imzalandığı tarihte yürürlüğe girer ve tedavinin tamamlanmasına veya taraflarca sona erdirilmesine kadar geçerlidir.',
  },
];

export interface ExportContractItem {
  name: string;
  toothNo?: number;
  price: number;
  taxRate: number;
}

export interface ExportContractInstallment {
  label: string;
  dueDate: string;
  amount: number;
}

export interface ExportContractData {
  title: string;
  date: string;
  finalAmount: number;
  paid: number;
  balance: number;
  items: ExportContractItem[];
  installments?: ExportContractInstallment[];
  patient: {
    firstName: string;
    lastName: string;
    id: string;
    fileNo?: number;
    phone?: string;
    nationalId?: string;
  };
  clinicName?: string;
}

export async function exportContractPDF(data: ExportContractData): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const { Roboto_Regular_normal } = await import('../fonts/Roboto-Regular-normal');
  const { Roboto_Bold_bold } = await import('../fonts/Roboto-Bold-bold');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.addFileToVFS('Roboto-Regular.ttf', Roboto_Regular_normal);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', Roboto_Bold_bold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const marginR = pageW - 14;

  const PRIMARY  = [30, 30, 30]    as [number, number, number];
  const SUCCESS  = [80, 80, 80]    as [number, number, number];
  const DARK     = [0, 0, 0]       as [number, number, number];
  const MUTED    = [100, 100, 100] as [number, number, number];
  const LIGHT_BG = [245, 245, 245] as [number, number, number];
  const WHITE    = [255, 255, 255] as [number, number, number];
  const BORDER   = [180, 180, 180] as [number, number, number];

  const addHeader = () => {
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, pageW, 28, 'F');

    doc.setFontSize(16);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(data.clinicName || 'Pulpax Diş Kliniği', marginL, 13);

    doc.setFontSize(8);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(200, 220, 255);
    doc.text('Diş Klinik Yönetim Sistemi', marginL, 19);

    doc.setFontSize(20);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('SÖZLEŞME', marginR, 12, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(200, 220, 255);
    doc.text(data.title, marginR, 19, { align: 'right' });

    doc.setFillColor(...SUCCESS);
    doc.rect(0, 28, pageW, 2, 'F');
  };

  addHeader();

  // ─── Hasta / Sözleşme Bilgi Kartları ───────────────────────────────────────
  let y = 36;

  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(marginL, y, 85, 36, 2, 2, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginL, y, 85, 36, 2, 2, 'S');

  doc.setFontSize(7);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('HASTA BİLGİLERİ', marginL + 4, y + 6);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(marginL + 4, y + 7.5, marginL + 35, y + 7.5);

  doc.setFontSize(11);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...DARK);
  doc.text(`${data.patient.firstName} ${data.patient.lastName}`, marginL + 4, y + 14);

  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...MUTED);
  const patientNo = data.patient.fileNo != null ? String(data.patient.fileNo) : data.patient.id.slice(0, 8).toUpperCase();
  doc.text(`Hasta No: ${patientNo}`, marginL + 4, y + 20);
  if (data.patient.nationalId) {
    doc.text(`TC Kimlik No: ${data.patient.nationalId}`, marginL + 4, y + 26);
  }
  if (data.patient.phone) {
    doc.text(`Tel: ${data.patient.phone}`, marginL + 4, y + 32);
  }

  const rx = pageW / 2 + 5;
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(rx, y, 85, 36, 2, 2, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(rx, y, 85, 36, 2, 2, 'S');

  doc.setFontSize(7);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('SÖZLEŞME BİLGİLERİ', rx + 4, y + 6);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(rx + 4, y + 7.5, rx + 35, y + 7.5);

  doc.setFontSize(9);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...DARK);
  doc.text(data.title, rx + 4, y + 14);

  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(`Tarih: ${data.date}`, rx + 4, y + 20);
  doc.text(`Toplam Kalem: ${data.items.length}`, rx + 4, y + 26);
  doc.text(`Taksit Sayısı: ${data.installments?.length || 0}`, rx + 4, y + 32);

  // ─── Tedavi Kalemleri Tablosu ──────────────────────────────────────────────
  y += 44;

  doc.setFontSize(9);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...DARK);
  doc.text('TEDAVİ KALEMLERİ', marginL, y);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(marginL, y + 1.5, marginR, y + 1.5);
  y += 4;

  doc.setFontSize(7);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Fiyatlar KDV hariçtir; KDV tutarı ve KDV dahil toplam ayrı sütunlarda gösterilmiştir.', marginL, y + 3);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Diş No', 'Tedavi / İşlem', 'Fiyat\n(KDV Hariç)', 'KDV', 'Toplam\n(KDV Dahil)']],
    body: data.items.map(item => {
      const vatAmount = item.price * (item.taxRate / 100);
      return [
        item.toothNo != null ? String(item.toothNo) : '—',
        item.name,
        `₺${formatCurrency(item.price)}`,
        `%${item.taxRate} · ₺${formatCurrency(vatAmount)}`,
        `₺${formatCurrency(item.price + vatAmount)}`,
      ];
    }),
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }, font: 'Roboto', textColor: DARK },
    headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 34, halign: 'right' },
      4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: marginL, right: 14 },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // ─── Ödeme Planı (Taksitler) Tablosu ───────────────────────────────────────
  if (data.installments && data.installments.length > 0) {
    if (finalY > pageH - 60) {
      doc.addPage();
      addHeader();
      finalY = 36;
    }

    doc.setFontSize(9);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...DARK);
    doc.text('ÖDEME PLANI (TAKSİTLER)', marginL, finalY);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(marginL, finalY + 1.5, marginR, finalY + 1.5);
    finalY += 4;

    autoTable(doc, {
      startY: finalY,
      head: [['Taksit', 'Vade Tarihi', 'Tutar']],
      body: data.installments.map(inst => [
        inst.label,
        new Date(inst.dueDate).toLocaleDateString('tr-TR'),
        `₺${formatCurrency(inst.amount)}`,
      ]),
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }, font: 'Roboto', textColor: DARK },
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 45 },
        2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: marginL, right: 14 },
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ─── Sözleşme Şartları (Hukuki Maddeler) ───────────────────────────────────
  if (finalY > pageH - 40) {
    doc.addPage();
    addHeader();
    finalY = 36;
  }

  doc.setFontSize(9);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...DARK);
  doc.text('SÖZLEŞME ŞARTLARI', marginL, finalY);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(marginL, finalY + 1.5, marginR, finalY + 1.5);
  finalY += 6;

  const clauseFontSize = 8;
  const clauseLineHeight = 4;
  const clauseWidth = marginR - marginL;

  CONTRACT_CLAUSES.forEach((clause, idx) => {
    doc.setFontSize(clauseFontSize);
    doc.setFont('Roboto', 'normal');
    const lines = doc.splitTextToSize(clause.text, clauseWidth) as string[];
    const neededHeight = 4.5 + lines.length * clauseLineHeight + 3;

    if (finalY + neededHeight > pageH - 16) {
      doc.addPage();
      addHeader();
      finalY = 36;
    }

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(`${idx + 1}. ${clause.title}`, marginL, finalY);
    finalY += 4.5;

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(clauseFontSize);
    doc.setTextColor(...MUTED);
    doc.text(lines, marginL, finalY);
    finalY += lines.length * clauseLineHeight + 3;
  });

  finalY += 2;

  // ─── Özet Kutusu ────────────────────────────────────────────────────────────
  if (finalY > pageH - 60) {
    doc.addPage();
    addHeader();
    finalY = 36;
  }

  const boxW = 80;
  const boxX = marginR - boxW;
  let by = finalY;

  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(boxX, by, boxW, 30, 2, 2, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, by, boxW, 30, 2, 2, 'S');

  by += 6;
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('SÖZLEŞME TOPLAMI:', boxX + 4, by);
  doc.setTextColor(...DARK);
  doc.text(`₺${formatCurrency(data.finalAmount)}`, marginR - 4, by, { align: 'right' });

  by += 6;
  doc.setTextColor(...MUTED);
  doc.text('ÖDENEN:', boxX + 4, by);
  doc.setTextColor(...SUCCESS);
  doc.text(`₺${formatCurrency(data.paid)}`, marginR - 4, by, { align: 'right' });

  by += 5;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(boxX + 4, by, marginR - 4, by);
  by += 6;

  doc.setFontSize(11);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...DARK);
  doc.text('KALAN BAKİYE', boxX + 4, by);
  doc.setTextColor(180, 30, 30);
  doc.text(`₺${formatCurrency(data.balance)}`, marginR - 4, by, { align: 'right' });

  // ─── Hasta Onay Beyanı + İmza Alanları ──────────────────────────────────────
  const consentText = 'Hasta; işbu sözleşmede yer alan tedavi süreci, uygulanacak işlemler, olası riskler ve ücretlendirme koşulları hakkında hekim tarafından bilgilendirildiğini, tüm sorularının yanıtlandığını ve yukarıda belirtilen tedavilerin kendisine uygulanmasını özgür iradesiyle kabul ettiğini beyan ederek işbu sözleşmeyi imzalamıştır.';
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  const consentLines = doc.splitTextToSize(consentText, marginR - marginL) as string[];
  const consentHeight = consentLines.length * 4;

  let tailY = finalY + 30 + 10; // below the summary box (30mm tall) plus gap
  if (tailY + consentHeight + 28 > pageH - 10) {
    doc.addPage();
    addHeader();
    tailY = 36;
  }

  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...DARK);
  doc.text(consentLines, marginL, tailY);

  const sigY = tailY + consentHeight + 14;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);

  doc.line(marginL, sigY, marginL + 60, sigY);
  doc.setFontSize(7.5);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Hekim / Kaşe', marginL + 30, sigY + 4, { align: 'center' });

  doc.line(marginR - 60, sigY, marginR, sigY);
  doc.text('Hasta İmzası', marginR - 30, sigY + 4, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    `Bu belge ${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur. Pulpax Klinik Yönetim Sistemi`,
    pageW / 2, sigY + 10, { align: 'center' }
  );

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(...PRIMARY);
    doc.rect(0, pageH - 6, pageW, 6, 'F');
  }

  const safeFirst = data.patient.firstName.replace(/\s/g, '_');
  const safeLast = data.patient.lastName.replace(/\s/g, '_');
  doc.save(`${safeFirst}_${safeLast}_${data.title.replace(/\s/g, '_')}_Sozlesme.pdf`);
}
