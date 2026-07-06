-- Add tooth_diagnoses table (per-tooth diagnosis records for DiagnosisTab)
CREATE TABLE IF NOT EXISTS tooth_diagnoses (
  id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES patients(id) ON UPDATE CASCADE ON DELETE CASCADE,
  tooth_num integer NOT NULL,
  diag_id text NOT NULL,
  diag_name text NOT NULL,
  diag_icd text,
  diag_category text NOT NULL,
  doctor_id text,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS tooth_diagnoses_patient_id_idx ON tooth_diagnoses(patient_id);
