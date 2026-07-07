-- Tekrarlı randevu serisi (Google Calendar tarzı) + tek-occurrence istisna izleme.
-- OrthoAdjustmentVisit.appointment_id zaten mevcuttu (kullanılmıyordu), şema değişikliği gerekmez.
-- (ADR-004: sıra 021 backend-clinic'te zaten "021_add_clinic_branch.sql" tarafından
-- kullanıldığı için bu migration 022 olarak numaralandırıldı.)

CREATE TABLE IF NOT EXISTS appointment_series (
  id                 text PRIMARY KEY,
  clinic_id          text NOT NULL,
  patient_id         text NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id          text NOT NULL REFERENCES doctors(id),
  chair_id           text REFERENCES dental_chairs(id) ON DELETE SET NULL,
  type               text,
  notes              text,
  duration_minutes   integer NOT NULL,
  freq               text NOT NULL,
  interval           integer NOT NULL DEFAULT 1,
  count              integer,
  until              timestamp,
  status             text NOT NULL DEFAULT 'ACTIVE',
  created_at         timestamp NOT NULL DEFAULT now(),
  updated_at         timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointment_series_clinic_patient_idx ON appointment_series (clinic_id, patient_id);

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS series_id text REFERENCES appointment_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_seq integer,
  ADD COLUMN IF NOT EXISTS series_exception boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS appointments_series_id_idx ON appointments (series_id);
