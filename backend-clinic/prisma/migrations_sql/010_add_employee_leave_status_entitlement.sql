-- ADR-003 Faz 2: İzin onay akışı (status) ve yıllık izin hak edişi (bakiye)

ALTER TABLE employee_leaves
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamp(3),
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE TABLE IF NOT EXISTS employee_leave_entitlements (
  id              text PRIMARY KEY,
  clinic_id       text NOT NULL,
  employee_id     text NOT NULL,
  year            integer NOT NULL,
  total_days      numeric(10, 2) NOT NULL DEFAULT 0.00,
  carry_over_days numeric(10, 2) NOT NULL DEFAULT 0.00,
  created_at      timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (clinic_id, employee_id, year)
);
