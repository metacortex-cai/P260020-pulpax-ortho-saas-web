-- Add plan_installments table (Sözleşme ödeme planı: peşinat + taksitler)
CREATE TABLE IF NOT EXISTS plan_installments (
  id text PRIMARY KEY,
  plan_id text NOT NULL REFERENCES treatment_plans(id) ON UPDATE CASCADE ON DELETE CASCADE,
  label text NOT NULL,
  due_date timestamp(3) NOT NULL,
  amount numeric(65,30) NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS plan_installments_plan_id_idx ON plan_installments(plan_id);
