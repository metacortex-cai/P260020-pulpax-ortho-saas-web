-- Add patient_prescriptions table (Reçeteler tab — daha önce yalnızca frontend'de vardı, backend eksikti)
CREATE TABLE IF NOT EXISTS patient_prescriptions (
  id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES patients(id) ON UPDATE CASCADE ON DELETE CASCADE,
  protocol_no text NOT NULL UNIQUE,
  date timestamp(3) NOT NULL,
  doctor text NOT NULL,
  drugs text[] NOT NULL DEFAULT '{}',
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS patient_prescriptions_patient_id_idx ON patient_prescriptions(patient_id);
