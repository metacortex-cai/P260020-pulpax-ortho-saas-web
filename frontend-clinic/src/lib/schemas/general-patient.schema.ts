import * as z from 'zod';

export const generalPatientSchema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur'),
  lastName: z.string().min(1, 'Soyad zorunludur'),
  nationality: z.string().min(1, 'Uyruk zorunludur'),
  countryCode: z.string().default('+90'),
  tckn: z.string().length(11, 'TCKN 11 haneli olmalıdır').optional().or(z.literal('')),
  passport: z.string().min(1, 'Pasaport no zorunludur').optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  phone: z.string().min(5, 'Geçerli bir telefon numarası giriniz').refine((p) => {
    if (!p) return false;
    const digits = String(p).replace(/\D+/g, '');
    return [10,11,12,13].includes(digits.length);
  }, { message: 'Geçersiz telefon numarası formatı' }),
  email: z.string().email('Geçersiz e-posta').optional().or(z.literal('')),
  city: z.string().optional(),
  district: z.string().optional(),
  zipCode: z.string().optional(),
  address: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().optional(),
  tariff: z.string().optional(),
  institution: z.string().optional(),
  group: z.string().optional(),
  family: z.string().optional(),
  referral: z.string().optional(),
  bloodGroup: z.string().optional(),
  assignedDoctor: z.string().optional(),
  clinicBranchId: z.string().optional(),
  notes: z.string().optional(),
  smsConsent: z.boolean().default(false),
  kvkkConsent: z.boolean().default(false),
  treatmentConsent: z.boolean().default(false),
});

export type GeneralPatientFormData = z.infer<typeof generalPatientSchema>;
