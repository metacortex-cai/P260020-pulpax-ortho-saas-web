-- Add `status` column to implant_records (Başarılı / Başarısız)
ALTER TABLE implant_records
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'BASARILI';
