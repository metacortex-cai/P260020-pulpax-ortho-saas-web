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

// Event adı sabitleri - yanlış yazımın önüne geçer
export const EVENTS = {
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  TREATMENT_COMPLETED: 'treatment.completed',
  PATIENT_CREATED: 'patient.created',
} as const;
