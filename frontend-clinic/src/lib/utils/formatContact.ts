export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  // Remove all non-digit
  const digits = phone.replace(/\D+/g, '');
  if (digits.length === 10) {
    // assume local w/o country
    return `+90 ${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+90 ${digits.slice(1,4)} ${digits.slice(4,7)} ${digits.slice(7)}`;
  }
  if (digits.length === 12 && digits.startsWith('90')) {
    return `+${digits.slice(0,2)} ${digits.slice(2,5)} ${digits.slice(5,8)} ${digits.slice(8)}`;
  }
  // fallback grouped
  return phone;
}

export function isValidEmail(email?: string): boolean {
  if (!email) return false;
  const s = String(email).trim();
  const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return re.test(s);
}

export function formatEmail(email?: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}
