import { isValidTcKimlikNo } from './tckn.util';

describe('isValidTcKimlikNo', () => {
  it('accepts a checksum-valid number', () => {
    expect(isValidTcKimlikNo('10000000146')).toBe(true);
  });

  it('rejects a number with a wrong check digit', () => {
    expect(isValidTcKimlikNo('10000000145')).toBe(false);
  });

  it('rejects a same-digit number that passes length but fails checksum', () => {
    expect(isValidTcKimlikNo('11111111111')).toBe(false);
  });

  it('rejects numbers starting with 0', () => {
    expect(isValidTcKimlikNo('01000000146')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidTcKimlikNo('1000000014')).toBe(false);
    expect(isValidTcKimlikNo('100000001466')).toBe(false);
  });

  it('rejects non-numeric input', () => {
    expect(isValidTcKimlikNo('1000000014a')).toBe(false);
  });

  it('rejects empty/undefined/null', () => {
    expect(isValidTcKimlikNo('')).toBe(false);
    expect(isValidTcKimlikNo(undefined as unknown as string)).toBe(false);
    expect(isValidTcKimlikNo(null as unknown as string)).toBe(false);
  });
});
