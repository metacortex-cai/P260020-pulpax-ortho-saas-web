// ─── Günlük Randevu Takvimi Yazdırma (PDF / Excel) ─────────────────────────────
// Randevu ve Takvim modülünde "Takvimi Yazdır" akışı için: seçilen tarih ve
// hekim(ler)e ait randevuları PDF (jspdf + jspdf-autotable) veya Excel (exceljs)
// olarak dışa aktarır. Format, exportStatementPDF.ts / exportTreatmentPlan.ts ile
// aynı kurumsal desenle (Roboto font, aynı renk paleti) hizalıdır.

export interface DailyCalendarRow {
  startTime: string;
  endTime: string;
  patientName: string;
  fileNo?: number | null;
  doctorName: string;
  chairName?: string | null;
  statusLabel: string;
  notes?: string | null;
}

export interface DailyCalendarExportData {
  dateLabel: string; // "05 Temmuz 2026"
  clinicName?: string;
  doctorNames: string[]; // yazdırma için seçilen hekim(ler)
  rows: DailyCalendarRow[];
}

function safeFileToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ]+/g, '_').replace(/^_+|_+$/g, '');
}

export async function exportDailyCalendarPDF(data: DailyCalendarExportData): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const { Roboto_Regular_normal } = await import('../fonts/Roboto-Regular-normal');
  const { Roboto_Bold_bold } = await import('../fonts/Roboto-Bold-bold');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.addFileToVFS('Roboto-Regular.ttf', Roboto_Regular_normal);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', Roboto_Bold_bold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 14;
  const marginR = pageW - 14;

  const DARK = [20, 20, 20] as [number, number, number];
  const MUTED = [110, 110, 110] as [number, number, number];
  const PRIMARY = [30, 30, 30] as [number, number, number];

  const clinicName = data.clinicName || 'Pulpax Diş Kliniği';

  let y = 16;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(clinicName, marginL, y);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('GÜNLÜK RANDEVU LİSTESİ', marginR, y, { align: 'right' });

  y += 8;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text(data.dateLabel, marginL, y);

  y += 6;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Hekim(ler): ${data.doctorNames.join(', ') || 'Tümü'}`, marginL, y);
  doc.text(`Toplam Randevu: ${data.rows.length}`, marginR, y, { align: 'right' });

  const tableStartY = y + 6;

  const body = data.rows.map(r => [
    `${r.startTime} - ${r.endTime}`,
    r.patientName,
    r.fileNo != null ? `#${r.fileNo}` : '–',
    r.doctorName,
    r.chairName || '–',
    r.statusLabel,
    r.notes || '',
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['Saat', 'Hasta', 'Dosya No', 'Hekim', 'Ünite', 'Durum', 'Not']],
    body,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      font: 'Roboto',
      textColor: DARK,
      valign: 'top',
    },
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 28 },
      2: { cellWidth: 20 },
      5: { cellWidth: 22 },
    },
    margin: { left: marginL, right: 14, bottom: 18 },
    didDrawPage: () => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(`${new Date().toLocaleDateString('tr-TR')} tarihinde hazırlanmıştır.`, marginL, pageH - 8);
      const pageNum = (doc as any).getNumberOfPages();
      doc.text(`SAYFA ${pageNum}`, marginR, pageH - 8, { align: 'right' });
    },
  });

  doc.save(`Randevu_Listesi_${safeFileToken(data.dateLabel)}.pdf`);
}

export async function exportDailyCalendarXLS(data: DailyCalendarExportData): Promise<void> {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Randevular');

  ws.columns = [
    { width: 16 },
    { width: 28 },
    { width: 12 },
    { width: 24 },
    { width: 16 },
    { width: 14 },
    { width: 30 },
  ];

  ws.addRows([
    ['PULPAX KLİNİK YÖNETİM SİSTEMİ'],
    ['GÜNLÜK RANDEVU LİSTESİ'],
    [],
    ['Tarih', data.dateLabel],
    ['Hekim(ler)', data.doctorNames.join(', ') || 'Tümü'],
    ['Toplam Randevu', data.rows.length],
    [],
    ['Saat', 'Hasta', 'Dosya No', 'Hekim', 'Ünite', 'Durum', 'Not'],
    ...data.rows.map(r => [
      `${r.startTime} - ${r.endTime}`,
      r.patientName,
      r.fileNo != null ? `#${r.fileNo}` : '–',
      r.doctorName,
      r.chairName || '–',
      r.statusLabel,
      r.notes || '',
    ]),
  ]);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Randevu_Listesi_${safeFileToken(data.dateLabel)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
