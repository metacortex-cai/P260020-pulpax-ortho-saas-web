// ─── Treatment Plan Export Utilities ──────────────────────────────────────────
// Generates PDF (jspdf + jspdf-autotable) and XLS (xlsx) exports
// PDF format matches the reference "Tedavi Planı.pdf" clinical document standard
import { formatCurrency } from './formatCurrency';

export interface ExportPlanItem {
  tooth: string;
  areas: string;
  name: string;
  category: string;
  doctor: string;
  price: number;
  originalPrice: number;
}

export interface ExportPlanData {
  planName: string;
  planDate: string;
  status: string;
  items: ExportPlanItem[];
  total: number;
  discountedTotal: number;
  patient: {
    firstName: string;
    lastName: string;
    id: string;
    fileNo?: number;
    phone?: string;
  };
  clinicName?: string;
  doctorName?: string;
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
export async function exportTreatmentPlanPDF(data: ExportPlanData): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const { Roboto_Regular_normal } = await import('../fonts/Roboto-Regular-normal');
  const { Roboto_Bold_bold } = await import('../fonts/Roboto-Bold-bold');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.addFileToVFS('Roboto-Regular.ttf', Roboto_Regular_normal);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

  doc.addFileToVFS('Roboto-Bold.ttf', Roboto_Bold_bold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const marginR = pageW - 14;

  // ── Renk Paleti (Siyah/Beyaz Çıktı İçin Uygun) ──
  const PRIMARY   = [30, 30, 30]   as [number, number, number];   // Çok koyu gri / Neredeyse Siyah
  const SUCCESS   = [80, 80, 80]   as [number, number, number];   // Orta Gri
  const DARK      = [0, 0, 0]      as [number, number, number];   // Tam Siyah
  const MUTED     = [100, 100, 100] as [number, number, number];  // Gri
  const LIGHT_BG  = [245, 245, 245] as [number, number, number];  // Çok açık gri (Arka planlar)
  const WHITE     = [255, 255, 255] as [number, number, number];  // Beyaz
  const BORDER    = [180, 180, 180] as [number, number, number];  // Belirgin Gri Kenarlık


  // ─── 1. Header Bandı ───────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 28, 'F');

  // Sol: Klinik Adı
  doc.setFontSize(16);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...WHITE);
  doc.text(data.clinicName || 'Pulpax Diş Kliniği', marginL, 13);

  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(200, 220, 255);
  doc.text('Diş Klinik Yönetim Sistemi', marginL, 19);

  // Sağ: Belge Başlığı
  doc.setFontSize(20);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('TEDAVİ PLANI', marginR, 12, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(200, 220, 255);
  const statusLabel = data.status === 'ACTIVE' ? '✓ Sözleşme Oluşturuldu' : 'Taslak Plan';
  doc.text(statusLabel, marginR, 19, { align: 'right' });

  // ─── 2. Dekoratif çizgi ────────────────────────────────────────────────────
  doc.setFillColor(...SUCCESS);
  doc.rect(0, 28, pageW, 2, 'F');

  // ─── 3. Hasta / Plan Bilgi Kartları ───────────────────────────────────────
  let y = 36;

  // Sol Kart: Hasta Bilgileri
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(marginL, y, 85, 32, 2, 2, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginL, y, 85, 32, 2, 2, 'S');

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
  if (data.patient.phone) {
    doc.text(`Tel: ${data.patient.phone}`, marginL + 4, y + 26);
  }

  // Sağ Kart: Plan Bilgileri
  const rx = pageW / 2 + 5;
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(rx, y, 85, 32, 2, 2, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(rx, y, 85, 32, 2, 2, 'S');

  doc.setFontSize(7);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('PLAN BİLGİLERİ', rx + 4, y + 6);

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(rx + 4, y + 7.5, rx + 35, y + 7.5);

  doc.setFontSize(9);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...DARK);
  doc.text(data.planName, rx + 4, y + 14);

  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(`Tarih: ${data.planDate}`, rx + 4, y + 20);
  doc.text(`Toplam Kalem: ${data.items.length}`, rx + 4, y + 26);

  // ─── 4. Tedavi Tablosu ────────────────────────────────────────────────────
  y += 40;

  doc.setFontSize(9);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...DARK);
  doc.text('TEDAVİ KALEMLERİ', marginL, y);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(marginL, y + 1.5, marginR, y + 1.5);
  y += 4;

  const hasDiscount = data.items.some(i => i.price !== i.originalPrice);

  const head = hasDiscount
    ? [['Diş No', 'Tedavi Adı', 'Hekim', 'Liste Fiyatı', 'İndirimli Fiyat']]
    : [['Diş No', 'Tedavi Adı', 'Hekim', 'Ücret']];

  const body = data.items.map((item, idx) => {
    const priceStr = `₺${formatCurrency(item.price)}`;
    const origStr  = `₺${formatCurrency(item.originalPrice)}`;
    const row = hasDiscount
      ? [item.tooth || '—', item.name, item.doctor, origStr, priceStr]
      : [item.tooth || '—', item.name, item.doctor, priceStr];
    return row;
  });

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      font: 'Roboto',
      textColor: DARK,
    },
    headStyles: {
      fillColor: PRIMARY,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 38 },
      3: { cellWidth: hasDiscount ? 30 : 28, halign: 'right' },
      ...(hasDiscount ? { 4: { cellWidth: 32, halign: 'right', textColor: SUCCESS, fontStyle: 'bold' } } : {}),
    },
    margin: { left: marginL, right: 14 },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hasDiscount && hookData.column.index === 3) {
        const item = data.items[hookData.row.index];
        if (item && item.price !== item.originalPrice) {
          hookData.cell.styles.textColor = [80, 80, 80]; // red for strikethrough effect
        }
      }
    },
  });

  // ─── 5. Özet Kutusu ──────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Toplam hesapla
  const origTotal = data.items.reduce((s, i) => s + i.originalPrice, 0);
  const newTotal  = data.items.reduce((s, i) => s + i.price, 0);
  const discount  = origTotal - newTotal;

  const boxW = 80;
  const boxX = marginR - boxW;
  let by = finalY;

  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(boxX, by, boxW, hasDiscount ? 30 : 16, 2, 2, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, by, boxW, hasDiscount ? 30 : 16, 2, 2, 'S');

  by += 6;

  if (hasDiscount) {
    doc.setFontSize(8);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('Liste Toplamı:', boxX + 4, by);
    doc.text(`₺${formatCurrency(origTotal)}`, marginR - 4, by, { align: 'right' });

    by += 6;
    doc.setTextColor([80, 80, 80] as unknown as number);
    doc.text('İndirim:', boxX + 4, by);
    doc.text(`-₺${formatCurrency(discount)}`, marginR - 4, by, { align: 'right' });
    by += 5;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(boxX + 4, by, marginR - 4, by);
    by += 4;
  }

  doc.setFontSize(11);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...DARK);
  doc.text('GENEL TOPLAM', boxX + 4, by);
  doc.setTextColor(...SUCCESS);
  doc.text(`₺${formatCurrency(newTotal)}`, marginR - 4, by, { align: 'right' });

  // ─── 6. İmza Alanları ─────────────────────────────────────────────────────
  const sigY = finalY + (hasDiscount ? 38 : 24);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);

  // Hekim İmzası
  doc.line(marginL, sigY + 18, marginL + 60, sigY + 18);
  doc.setFontSize(7.5);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Hekim / Kaşe', marginL + 30, sigY + 22, { align: 'center' });

  // Hasta İmzası
  doc.line(marginR - 60, sigY + 18, marginR, sigY + 18);
  doc.text('Hasta İmzası', marginR - 30, sigY + 22, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    `Bu belge ${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur. Pulpax Klinik Yönetim Sistemi`,
    pageW / 2, sigY + 28, { align: 'center' }
  );

  // ─── 7. Footer Çizgisi ───────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, pageH - 6, pageW, 6, 'F');

  // ─── İndir ───────────────────────────────────────────────────────────────
  const safeFirst = data.patient.firstName.replace(/\s/g, '_');
  const safeLast  = data.patient.lastName.replace(/\s/g, '_');
  doc.save(`${safeFirst}_${safeLast}_${data.planName.replace(/\s/g, '_')}.pdf`);
}

// ─── XLS Export ───────────────────────────────────────────────────────────────
export async function exportTreatmentPlanXLS(data: ExportPlanData): Promise<void> {
  const ExcelJS = await import('exceljs');

  const wb = new ExcelJS.Workbook();

  // ─── Özet Sayfası ─────────────────────────────────────────────────────────
  const summaryRows: (string | number)[][] = [
    ['PULPAX KLİNİK YÖNETİM SİSTEMİ'],
    ['TEDAVİ PLANI'],
    [],
    ['Hasta Adı', `${data.patient.firstName} ${data.patient.lastName}`],
    ['Hasta No', data.patient.fileNo != null ? String(data.patient.fileNo) : data.patient.id.slice(0, 8).toUpperCase()],
    ...(data.patient.phone ? [['Telefon', data.patient.phone]] as (string | number)[][] : []),
    ['Plan Adı', data.planName],
    ['Tarih', data.planDate],
    ['Durum', data.status === 'ACTIVE' ? 'Sözleşme Oluşturuldu' : 'Taslak'],
    [],
    ['Diş No', 'Tedavi Adı', 'Hekim', 'Liste Fiyatı (₺)', 'Uygulanan Fiyat (₺)', 'İndirim (₺)'],
    ...data.items.map(item => [
      item.tooth || '—',
      item.name,
      item.doctor,
      item.originalPrice,
      item.price,
      item.originalPrice - item.price,
    ]),
    [],
    ['', '', '', 'Liste Toplamı:', data.items.reduce((s, i) => s + i.originalPrice, 0)],
    ['', '', '', 'İndirim Toplamı:', data.items.reduce((s, i) => s + (i.originalPrice - i.price), 0)],
    ['', '', '', 'GENEL TOPLAM:', data.items.reduce((s, i) => s + i.price, 0)],
  ];

  const ws = wb.addWorksheet('Tedavi Planı');
  // Sütun genişlikleri
  ws.columns = [
    { width: 10 },
    { width: 40 },
    { width: 25 },
    { width: 18 },
    { width: 20 },
    { width: 14 },
  ];
  ws.addRows(summaryRows);

  // ─── Detay Sayfası (sadece tablo) ─────────────────────────────────────────
  const detailRows: (string | number)[][] = [
    ['Diş No', 'Tedavi Adı', 'Hekim', 'Liste Fiyatı (₺)', 'Uygulanan Fiyat (₺)', 'İndirim (₺)'],
    ...data.items.map(item => [
      item.tooth || '—',
      item.name,
      item.doctor,
      item.originalPrice,
      item.price,
      item.originalPrice - item.price,
    ]),
  ];

  const ws2 = wb.addWorksheet('Kalemler');
  ws2.columns = [
    { width: 10 },
    { width: 40 },
    { width: 25 },
    { width: 18 },
    { width: 20 },
    { width: 14 },
  ];
  ws2.addRows(detailRows);

  // ─── İndir ───────────────────────────────────────────────────────────────
  const safeFirst = data.patient.firstName.replace(/\s/g, '_');
  const safeLast  = data.patient.lastName.replace(/\s/g, '_');
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFirst}_${safeLast}_${data.planName.replace(/\s/g, '_')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
