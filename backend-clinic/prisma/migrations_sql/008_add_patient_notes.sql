-- Add patient_notes table (Notlar tab — daha önce yalnızca frontend'de mock veriyle vardı, backend eksikti)
CREATE TABLE IF NOT EXISTS patient_notes (
  id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES patients(id) ON UPDATE CASCADE ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'CLINICAL',
  content text NOT NULL,
  author text NOT NULL,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS patient_notes_patient_id_idx ON patient_notes(patient_id);
