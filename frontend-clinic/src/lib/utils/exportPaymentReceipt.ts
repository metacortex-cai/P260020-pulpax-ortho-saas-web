// ─── Tahsilat Makbuzu Export Utility ──────────────────────────────────────────
// Generates a PDF (jspdf + jspdf-autotable) for a single payment record.
// Format matches the reference "tahsilat.pdf" (Paraşüt-style) collection receipt.

export interface ReceiptData {
  date: string; // ISO tarih
  amount: number;
  method: string; // CASH | CREDIT_CARD | TRANSFER | OTHER
  description?: string;
  patient: {
    firstName: string;
    lastName: string;
  };
  clinicName?: string;
  clinicAddress?: string;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Nakit',
  CREDIT_CARD: 'Kredi Kartı',
  TRANSFER: 'Havale/EFT',
  OTHER: 'Diğer',
};

// ─── Sayıyı Türkçe Yazıya Çevirme (Tutar İçin) ────────────────────────────────
const ONES = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
const TENS = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
const SCALES = ['', 'Bin', 'Milyon', 'Milyar', 'Trilyon'];

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const tensDigit = Math.floor(remainder / 10);
  const onesDigit = remainder % 10;

  let result = '';
  if (hundreds > 0) {
    result += hundreds === 1 ? 'Yüz' : ONES[hundreds] + 'Yüz';
  }
  result += TENS[tensDigit];
  result += ONES[onesDigit];
  return result;
}

function integerToWords(n: number): string {
  if (n === 0) return 'Sıfır';

  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.unshift(rest % 1000);
    rest = Math.floor(rest / 1000);
  }

  let words = '';
  const groupCount = groups.length;
  groups.forEach((groupVal, idx) => {
    if (groupVal === 0) return;
    const scaleIdx = groupCount - 1 - idx;
    const scaleWord = SCALES[scaleIdx];
    if (scaleIdx === 1 && groupVal === 1) {
      words += scaleWord; // "Bin" değil "BirBin"
    } else {
      words += threeDigitsToWords(groupVal) + scaleWord;
    }
  });
  return words;
}

function amountToWords(amount: number): string {
  const lira = Math.floor(amount);
  const kurus = Math.round((amount - lira) * 100);
  return `${integerToWords(lira)}TürkLirası${integerToWords(kurus)}Kuruş`;
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}₺`;
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
export async function exportPaymentReceiptPDF(data: ReceiptData): Promise<void> {
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
  const marginL = 14;
  const marginR = pageW - 14;

  const PRIMARY = [30, 30, 30] as [number, number, number];
  const SUCCESS = [80, 80, 80] as [number, number, number];
  const DARK = [0, 0, 0] as [number, number, number];
  const MUTED = [100, 100, 100] as [number, number, number];
  const LIGHT_BG = [245, 245, 245] as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];
  const BORDER = [180, 180, 180] as [number, number, number];

  const clinicName = data.clinicName || 'Pulpax Dental Clinic';
  const clinicAddress = data.clinicAddress || 'Besiktas Mah. Ortakoy Cad. No:45, 34349 Istanbul';
  const fullName = `${data.patient.firstName} ${data.patient.lastName}`;
  const dateStr = new Date(data.date).toLocaleDateString('tr-TR');

  // ─── 1. Header Bandı ───────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setFontSize(16);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...WHITE);
  doc.text(clinicName, marginL, 13);

  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(200, 220, 255);
  doc.text(clinicAddress, marginL, 19);

  doc.setFontSize(20);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('TAHSİLAT MAKBUZU', marginR, 16, { align: 'right' });

  doc.setFillColor(...SUCCESS);
  doc.rect(0, 28, pageW, 2, 'F');

  // ─── 2. Tarih / Müşteri Bilgisi ────────────────────────────────────────────
  let y = 40;

  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Tahsilat Tarihi', marginL, y);
  doc.setFontSize(8);
  doc.text('Müşteri', marginR, y, { align: 'right' });

  y += 6;
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...DARK);
  doc.text(dateStr, marginL, y);
  doc.text(fullName, marginR, y, { align: 'right' });

  // ─── 3. Tahsilat Tablosu ───────────────────────────────────────────────────
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Tahsilat Tipi', 'Banka', 'Çek No', 'Vade Tarihi', 'Tutar']],
    body: [[METHOD_LABELS[data.method] || data.method, '–', '–', '–', formatCurrency(data.amount)]],
    theme: 'grid',
    styles: {
      fontSize: 9,
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
    columnStyles: {
      4: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: marginL, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // ─── 4. Toplam Tutar Kutusu ────────────────────────────────────────────────
  const boxW = 80;
  const boxX = marginR - boxW;
  let by = finalY;

  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(boxX, by, boxW, 16, 2, 2, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, by, boxW, 16, 2, 2, 'S');

  by += 10;
  doc.setFontSize(11);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...DARK);
  doc.text('TOPLAM TUTAR', boxX + 4, by);
  doc.setTextColor(...SUCCESS);
  doc.text(formatCurrency(data.amount), marginR - 4, by, { align: 'right' });

  // ─── 5. Yazıyla Toplam Tutar ───────────────────────────────────────────────
  let wy = finalY + 24;
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Yazıyla Toplam Tutar', marginL, wy);
  wy += 5;
  doc.setFontSize(10);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...DARK);
  doc.text(amountToWords(data.amount), marginL, wy);

  // ─── 6. Açıklama ───────────────────────────────────────────────────────────
  let ay = wy + 12;
  doc.setFontSize(8);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...MUTED);
  doc.text('Açıklama', marginL, ay);
  ay += 5;
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...DARK);
  if (data.description) {
    doc.text(data.description, marginL, ay);
    ay += 6;
  }
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  for (let i = 0; i < 2; i++) {
    doc.setLineDashPattern([0.5, 0.5], 0);
    doc.line(marginL, ay, marginR, ay);
    ay += 6;
  }
  doc.setLineDashPattern([], 0);

  // ─── 7. İmza Alanları ──────────────────────────────────────────────────────
  const sigY = ay + 16;

  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Ödemeyi Yapan', marginL, sigY);
  doc.text('Tahsil Eden', marginR / 2 + 10, sigY);

  doc.setFontSize(10);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...DARK);
  doc.text(fullName, marginL, sigY + 6);
  doc.text(clinicName, marginR / 2 + 10, sigY + 6, { maxWidth: 75 });

  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Kaşe / İmza', marginL, sigY + 16);
  doc.text('Kaşe / İmza', marginR / 2 + 10, sigY + 16);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.rect(marginL, sigY + 19, 50, 18);
  doc.rect(marginR / 2 + 10, sigY + 19, 50, 18);

  // ─── 8. Footer ─────────────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(
    `Bu tahsilat makbuzu "${clinicName}" adına Pulpax Klinik Yönetim Sistemi tarafından oluşturulmuştur.`,
    pageW / 2, 285, { align: 'center' }
  );

  // ─── İndir ───────────────────────────────────────────────────────────────
  const safeFirst = data.patient.firstName.replace(/\s/g, '_');
  const safeLast = data.patient.lastName.replace(/\s/g, '_');
  const safeDate = dateStr.replace(/\./g, '-');
  doc.save(`Tahsilat_Makbuzu_${safeFirst}_${safeLast}_${safeDate}.pdf`);
}
