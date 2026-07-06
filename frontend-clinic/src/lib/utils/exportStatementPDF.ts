// ─── Hasta Ekstresi (İşlem Dökümü) Export Utility ─────────────────────────────
// Generates a PDF (jspdf + jspdf-autotable) listing every financial movement
// (sözleşme/tedavi planı, tahsilat, iade) for a patient with running balance.
// Format matches the reference "ekstre.pdf" (Paraşüt-style) statement.

export interface StatementItem {
  name: string;
  quantity: number;
  unitPrice: number;
  toothNos: number[];
}

export interface StatementEntry {
  date: string;
  description: string;
  dueDate: string | null;
  debit: number;
  credit: number;
  balance: number;
  items?: StatementItem[];
}

export interface StatementBankAccount {
  bankName?: string | null;
  branch?: string | null;
  iban?: string | null;
  name: string;
  currency: string;
}

export interface StatementData {
  patient: {
    firstName: string;
    lastName: string;
    nationalId?: string | null;
    phone: string;
    address?: string | null;
    city?: string | null;
    district?: string | null;
  };
  entries: StatementEntry[];
  totalDebit: number;
  totalCredit: number;
  balance: number;
  clinicName?: string;
  clinicAddress?: string;
  bankAccounts?: StatementBankAccount[];
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

function formatDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR');
}

export async function exportStatementPDF(data: StatementData): Promise<void> {
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
  const marginL = 14;
  const marginR = pageW - 14;

  const DARK = [20, 20, 20] as [number, number, number];
  const MUTED = [110, 110, 110] as [number, number, number];
  const PRIMARY = [30, 30, 30] as [number, number, number];
  const BORDER = [180, 180, 180] as [number, number, number];
  const LIGHT_BG = [245, 245, 245] as [number, number, number];

  const clinicName = data.clinicName || 'Pulpax Diş Kliniği';
  const clinicAddress = data.clinicAddress || 'Beşiktaş Mah. Ortaköy Cad. No:45, 34349 İstanbul';
  const fullName = `${data.patient.firstName} ${data.patient.lastName}`;
  const patientAddressLine = [data.patient.district, data.patient.city].filter(Boolean).join(' / ');

  // ─── 1. Üst Bilgi Bandı ────────────────────────────────────────────────────
  let y = 16;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(clinicName, marginL, y, { maxWidth: 90 });

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('İLGİLİ FİRMA', marginR, y, { align: 'right' });

  y += 5;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(clinicAddress, marginL, y, { maxWidth: 90 });

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(fullName, marginR, y, { align: 'right' });

  if (patientAddressLine) {
    y += 4.5;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(patientAddressLine, marginR, y, { align: 'right' });
  }

  if (data.patient.nationalId) {
    y += 4.5;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`TCKN ${data.patient.nationalId}`, marginR, y, { align: 'right' });
  }

  // ─── 2. Başlık ─────────────────────────────────────────────────────────────
  y += 12;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.text('İŞLEM DÖKÜMÜ', marginL, y);

  const dateRange = data.entries.length > 0
    ? `${formatDateLong(data.entries[0].date)} — ${formatDateLong(new Date().toISOString())}`
    : formatDateLong(new Date().toISOString());
  y += 5;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(dateRange, marginL, y);

  // ─── 3. İşlem Tablosu ──────────────────────────────────────────────────────
  const tableStartY = y + 6;

  const body = data.entries.map(e => {
    let description = e.description;
    if (e.items && e.items.length > 0) {
      const itemLines = e.items.map(it => {
        const line = `${it.name}   ${it.quantity} Adet × ${formatCurrency(it.unitPrice)}`;
        return it.toothNos.length > 0 ? `${line}\n${it.toothNos.sort((a, b) => a - b).join('-')}` : line;
      });
      description = `${description}\n${itemLines.join('\n')}`;
    }
    return [
      formatDateShort(e.date),
      description,
      e.dueDate ? formatDateShort(e.dueDate) : '–',
      e.debit > 0 ? formatCurrency(e.debit) : '',
      e.credit > 0 ? formatCurrency(e.credit) : '',
      formatCurrency(e.balance),
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [['İşlem Tarihi', 'Açıklama', 'Vade Tarihi', 'Borç', 'Alacak', 'Bakiye ₺']],
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
      0: { cellWidth: 22 },
      2: { cellWidth: 20 },
      3: { halign: 'right', cellWidth: 24 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
    },
    margin: { left: marginL, right: 14, bottom: 22 },
    didDrawPage: () => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(
        `${formatDateShort(new Date().toISOString())} tarihinde hazırlanmıştır.`,
        marginL, pageH - 10,
      );
      const pageNum = (doc as any).getNumberOfPages();
      doc.text(`SAYFA ${pageNum}`, marginR, pageH - 10, { align: 'right' });
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // ─── 4. Banka Hesap Bilgileri + Toplamlar ─────────────────────────────────
  const accounts = data.bankAccounts || [];
  let leftY = finalY;
  if (accounts.length > 0) {
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text('Banka Hesap Bilgileri', marginL, leftY);
    leftY += 6;

    accounts.forEach(acc => {
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      const label = [acc.bankName, acc.branch].filter(Boolean).join(' - ');
      doc.text(`${label || acc.name} (${acc.currency})`, marginL, leftY);
      leftY += 4.5;
      if (acc.iban) {
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(`IBAN ${acc.iban}`, marginL, leftY);
        leftY += 6;
      } else {
        leftY += 2;
      }
    });
  }

  const boxW = 80;
  const boxX = marginR - boxW;
  let by = finalY;

  const summaryRows: [string, number][] = [
    ['TOPLAM ALACAK', data.totalCredit],
    ['TOPLAM BORÇ', data.totalDebit],
  ];
  summaryRows.forEach(([label, val]) => {
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(boxX, by + 5, marginR, by + 5);
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label, boxX, by + 3);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...DARK);
    doc.text(formatCurrency(val), marginR, by + 3, { align: 'right' });
    by += 8;
  });

  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(boxX, by + 2, boxW, 10, 1.5, 1.5, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text('BAKİYE', boxX + 3, by + 8.5);
  doc.text(formatCurrency(data.balance), marginR - 3, by + 8.5, { align: 'right' });

  // ─── İndir ─────────────────────────────────────────────────────────────────
  const safeFirst = data.patient.firstName.replace(/\s/g, '_');
  const safeLast = data.patient.lastName.replace(/\s/g, '_');
  const safeDate = formatDateShort(new Date().toISOString()).replace(/\./g, '-');
  doc.save(`Hasta_Ekstresi_${safeFirst}_${safeLast}_${safeDate}.pdf`);
}
