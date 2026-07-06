/**
 * LLD Bölüm 2.5 - Domain Events
 * Tüm sistem genelinde yayımlanan event'lerin tip tanımları.
 * Bu event'ler EventEmitter2 üzerinden fırlatılır ve ilgili modüller dinler.
 */

export class AppointmentCreatedEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly clinicId: string,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly startOn: Date,
    public readonly endOn: Date,
  ) {}
}

export class AppointmentCompletedEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly clinicId: string,
    public readonly patientId: string,
    public readonly doctorId: string,
  ) {}
}

export class AppointmentCancelledEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly clinicId: string,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly reason?: string,
  ) {}
}

/**
 * Randevu 'CONFIRMED' durumuna geçtiğinde fırlatılır.
 * RemindersService bunu dinleyerek bitiş+15dk sonrası için "gelmedi" kontrolü zamanlar (spec §4.4).
 */
export class AppointmentConfirmedEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly clinicId: string,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly endOn: Date,
  ) {}
}

export class TreatmentCompletedEvent {
  constructor(
    public readonly treatmentItemId: string,
    public readonly clinicId: string,
    public readonly employeeId: string,
    public readonly fee: number,
    public readonly idempotencyKey: string,
  ) {}
}

export class PatientCreatedEvent {
  constructor(
    public readonly patientId: string,
    public readonly clinicId: string,
  ) {}
}

/**
 * ADR-003 Faz 3: Bir ödemenin bir tedavi kalemine (FIFO veya kalem bazlı) dağıtıldığı
 * her seferde fırlatılır. Prim hesabı artık tedavi tamamlama anında değil, bu event
 * üzerinden — ödenen tutar bazında — tetiklenir.
 */
export class PaymentDistributedEvent {
  constructor(
    public readonly distributionId: string,
    public readonly treatmentItemId: string,
    public readonly clinicId: string,
    public readonly doctorId: string,
    public readonly amount: number,
    public readonly itemStatus: string,
  ) {}
}

// Event adı sabitleri - yanlış yazımın önüne geçer
export const EVENTS = {
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  TREATMENT_COMPLETED: 'treatment.completed',
  PATIENT_CREATED: 'patient.created',
  INVOICE_CREATED: 'invoice.created',
  PAYMENT_DISTRIBUTED: 'payment.distributed',
} as const;
