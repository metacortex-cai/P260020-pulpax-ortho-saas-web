import * as z from 'zod';
import { isValidTckn } from '@/lib/utils/tckn';

export const patientSchema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur'),
  lastName: z.string().min(1, 'Soyad zorunludur'),
  tckn: z.string().optional().or(z.literal('')).refine((val) => !val || isValidTckn(val), {
    message: 'Geçersiz TC Kimlik Numarası',
  }),
  passport: z.string().min(1, 'Pasaport no zorunludur').optional().or(z.literal('')),
  birthDate: z.string().min(1, 'Doğum tarihi zorunludur'),
  gender: z.string().min(1, 'Cinsiyet zorunludur'),
  nationality: z.string().default('Türkiye'),
  countryCode: z.string().default('+90'),
  phone: z.string().min(5, 'Geçerli bir telefon numarası giriniz').refine((p) => {
    if (!p) return false;
    const digits = String(p).replace(/\D+/g, '');
    // Accept: 10 (5xxxxxxxxx), 11 (0XXXXXXXXXX), 12 (90XXXXXXXXXX), 13 (+90XXXXXXXXXX)
    return [10,11,12,13].includes(digits.length);
  }, { message: 'Geçersiz telefon numarası formatı' }),
  email: z.string().email('Geçersiz e-posta').optional().or(z.literal('')),
  city: z.string().optional(),
  district: z.string().optional(),
  zipCode: z.string().optional(),
  address: z.string().optional(),
  tariff: z.string().optional(),
  clinicBranchId: z.string().optional(),
  institution: z.string().optional(),
  group: z.string().optional(),
  family: z.string().optional(),
  reference: z.string().optional(),
  bloodGroup: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  smsConsent: z.boolean().default(false),
  kvkkConsent: z.boolean().refine(val => val === true, 'KVKK onayı zorunludur'),
  treatmentConsent: z.boolean().refine(val => val === true, 'Onam formu onayı zorunludur'),
}).refine((data) => {
  if (data.nationality === 'Türkiye' && (!data.tckn || data.tckn.length !== 11)) {
    return false;
  }
  if (data.nationality !== 'Türkiye' && !data.passport) {
    return false;
  }
  return true;
}, {
  message: "Uyruğa göre TCKN veya Pasaport alanı doldurulmalıdır",
  path: ["tckn"], // Default path
});

export type PatientFormData = z.infer<typeof patientSchema>;
