-- Add `file_no` column to patients (nullable)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS file_no integer;

-- Initialize null values to 0 (optional)
UPDATE patients SET file_no = 0 WHERE file_no IS NULL;
