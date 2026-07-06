-- ADR-003 Faz 3: Prim Motoru v2 — 4 model, hedef sistemi, ödeme bazlı hesaplama
-- Not: employee_contracts / prim_records tabloları migration anında boştu (0 satır),
-- bu yüzden `type` kolonunun anlam değişikliği (PCT/FIXED/SVC -> MODEL_1..4) veri
-- dönüşümü gerektirmiyor.

ALTER TABLE tariffs
  ADD COLUMN IF NOT EXISTS cost numeric(10, 2);

ALTER TABLE employee_contracts
  ADD COLUMN IF NOT EXISTS fixed_salary numeric(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS rate_mode text NOT NULL DEFAULT 'BULK',
  ADD COLUMN IF NOT EXISTS target_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_amount numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_carry_over boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS employee_contract_category_rates (
  id          text PRIMARY KEY,
  contract_id text NOT NULL REFERENCES employee_contracts(id) ON UPDATE CASCADE ON DELETE CASCADE,
  category    text NOT NULL,
  rate        numeric(10, 2) NOT NULL,
  UNIQUE (contract_id, category)
);

CREATE TABLE IF NOT EXISTS employee_contract_item_fees (
  id                   text PRIMARY KEY,
  contract_id          text NOT NULL REFERENCES employee_contracts(id) ON UPDATE CASCADE ON DELETE CASCADE,
  master_treatment_id  text NOT NULL,
  fixed_fee            numeric(10, 2) NOT NULL,
  UNIQUE (contract_id, master_treatment_id)
);

ALTER TABLE prim_records
  ADD COLUMN IF NOT EXISTS period text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN IF NOT EXISTS payment_distribution_id text;

CREATE INDEX IF NOT EXISTS prim_records_clinic_id_employee_id_period_idx ON prim_records(clinic_id, employee_id, period);

CREATE TABLE IF NOT EXISTS doctor_target_ledgers (
  id                text PRIMARY KEY,
  clinic_id         text NOT NULL,
  employee_id       text NOT NULL,
  period            text NOT NULL,
  target_amount     numeric(10, 2) NOT NULL,
  actual_revenue    numeric(10, 2) NOT NULL DEFAULT 0.00,
  achieved          boolean NOT NULL DEFAULT false,
  carried_from_prev numeric(10, 2) NOT NULL DEFAULT 0.00,
  carried_to_next   numeric(10, 2) NOT NULL DEFAULT 0.00,
  reconciled_at     timestamp(3),
  UNIQUE (clinic_id, employee_id, period)
);
