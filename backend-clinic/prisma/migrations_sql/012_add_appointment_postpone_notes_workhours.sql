-- Randevu Modülü Sprint 9-10: ertelendi akışı, randevu notu ve mesai-dışı bayrağı

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS postponed_from text,
  ADD COLUMN IF NOT EXISTS linked_to text,
  ADD COLUMN IF NOT EXISTS is_outside_work_hours boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS appointments_postponed_from_idx ON appointments (postponed_from);
