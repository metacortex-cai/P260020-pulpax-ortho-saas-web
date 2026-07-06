-- Laboratuvar modülü genişletmesi: fatura bilgileri, işlem tanımları, tarifeler,
-- bağımsız laboratuvar kaydı (hasta/hekim/personel) ve revizyon zinciri.

ALTER TABLE labs
  ADD COLUMN IF NOT EXISTS tax_office   text,
  ADD COLUMN IF NOT EXISTS tax_number   text,
  ADD COLUMN IF NOT EXISTS invoice_info text;

CREATE TABLE IF NOT EXISTS lab_procedures (
  id           text PRIMARY KEY,
  clinic_id    text NOT NULL,
  code         text NOT NULL,
  name         text NOT NULL,
  category     text NOT NULL DEFAULT 'Protez',
  default_cost numeric(10,2) NOT NULL DEFAULT 0.00,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS lab_procedures_clinic_id_idx ON lab_procedures(clinic_id);

CREATE TABLE IF NOT EXISTS lab_tariffs (
  id                text PRIMARY KEY,
  clinic_id         text NOT NULL,
  name              text NOT NULL,
  lab_id            text REFERENCES labs(id),
  lab_name          text NOT NULL,
  valid_from        timestamp(3),
  valid_to          timestamp(3),
  included_proc_ids text[] NOT NULL DEFAULT '{}',
  custom_prices     jsonb NOT NULL DEFAULT '{}',
  status            text NOT NULL DEFAULT 'AKTİF',
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS lab_tariffs_clinic_id_idx ON lab_tariffs(clinic_id);

-- Bağımsız laboratuvar kaydı: artık bir tedavi planı kalemine bağlı olmak zorunda değil.
ALTER TABLE lab_orders
  ALTER COLUMN treatment_item_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS patient_id       text REFERENCES patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS doctor_id        text,
  ADD COLUMN IF NOT EXISTS clinic_staff_id  text,
  ADD COLUMN IF NOT EXISTS lab_staff_name   text,
  ADD COLUMN IF NOT EXISTS procedure_id     text REFERENCES lab_procedures(id),
  ADD COLUMN IF NOT EXISTS record_type      text NOT NULL DEFAULT 'GIDEN',
  ADD COLUMN IF NOT EXISTS process_type     text NOT NULL DEFAULT 'YENI',
  ADD COLUMN IF NOT EXISTS parent_id        text REFERENCES lab_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_id    text;

CREATE INDEX IF NOT EXISTS lab_orders_parent_id_idx ON lab_orders(parent_id);
