-- Add description column to treatment_plans (Sözleşme modalındaki "Açıklama" alanı)
ALTER TABLE treatment_plans
ADD COLUMN IF NOT EXISTS description text;
