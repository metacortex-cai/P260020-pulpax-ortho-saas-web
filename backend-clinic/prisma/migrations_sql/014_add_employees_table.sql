-- Personel/Kullanıcı ayrımı: tenant DB'de gerçek bir Employee (İK) tablosu.
-- Bu aşamada child tablolardaki employee_id/doctor_id alanlarına henüz FK eklenmiyor
-- (önce 014b veri taşıma script'i ile employees doldurulmalı, sonra 015 ile FK'lar eklenmeli).

CREATE TABLE IF NOT EXISTS employees (
  id                    text PRIMARY KEY,
  clinic_id             text NOT NULL,
  user_id               text UNIQUE,
  first_name            text NOT NULL,
  last_name             text NOT NULL,
  email                 text NOT NULL,
  email_hash            text NOT NULL UNIQUE,
  phone                 text,
  national_id           text,
  title                 text,
  is_doctor             boolean NOT NULL DEFAULT false,
  is_active             boolean NOT NULL DEFAULT true,
  deactivated_at        timestamp(3),
  deactivation_reason   text,
  created_at            timestamp(3) NOT NULL DEFAULT now(),
  updated_at            timestamp(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS employees_clinic_id_idx ON employees (clinic_id);
