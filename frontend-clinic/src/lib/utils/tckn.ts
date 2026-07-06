/**
 * Official TC Kimlik No checksum algorithm (Nüfus ve Vatandaşlık İşleri).
 * Verifies format + both check digits — does NOT confirm the number belongs
 * to a real registered citizen (that requires official KPS access).
 */
export function isValidTckn(value?: string): boolean {
  if (!value || !/^[1-9][0-9]{10}$/.test(value)) return false;

  const digits = value.split('').map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

  const digit10 = (((oddSum * 7 - evenSum) % 10) + 10) % 10;
  if (digit10 !== digits[9]) return false;

  const sumFirstTen = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  const digit11 = sumFirstTen % 10;
  return digit11 === digits[10];
}
