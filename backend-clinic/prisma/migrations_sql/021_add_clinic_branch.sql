-- Aynı tenant içinde birden fazla fiziksel klinik şubesi desteği: yeni
-- clinic_branches tablosu + Hasta/Randevu/Ünit kayıtlarına opsiyonel şube alanı.
-- Mevcut kayıtlar için varsayılan "Ana Klinik" şubesi ve backfill işlemi
-- scripts/backfill-clinic-branch.ts betiği ile yapılır (bu dosya yalnızca şema geçmişini belgeler).

CREATE TABLE IF NOT EXISTS clinic_branches (
  id          TEXT PRIMARY KEY,
  clinic_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP(3) NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, name)
);

CREATE INDEX IF NOT EXISTS clinic_branches_clinic_id_idx ON clinic_branches(clinic_id);

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS clinic_branch_id TEXT REFERENCES clinic_branches(id) ON DELETE SET NULL;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS clinic_branch_id TEXT REFERENCES clinic_branches(id) ON DELETE SET NULL;

ALTER TABLE dental_chairs
  ADD COLUMN IF NOT EXISTS clinic_branch_id TEXT REFERENCES clinic_branches(id) ON DELETE SET NULL;
