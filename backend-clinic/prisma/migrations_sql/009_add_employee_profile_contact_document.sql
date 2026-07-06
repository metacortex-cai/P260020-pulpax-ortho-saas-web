-- ADR-003: İK modülü — genişletilmiş personel profili, çoklu iletişim ve dokümanlar
-- employee_id, master DB'deki User.id'ye zayıf referanstır (çapraz-DB FK yok).

CREATE TABLE IF NOT EXISTS employee_profiles (
  id                text PRIMARY KEY,
  clinic_id         text NOT NULL,
  employee_id       text NOT NULL UNIQUE,
  personnel_type    text NOT NULL DEFAULT 'OTHER',
  birth_date        text,
  blood_type        text,
  school            text,
  education_field   text,
  education_level   text,
  graduation_year   integer,
  diploma_no        text,
  department        text,
  position          text,
  hire_date         timestamp(3),
  employment_type   text,
  sgk_registry_no   text,
  calendar_color    text,
  created_at        timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS employee_profiles_clinic_id_idx ON employee_profiles(clinic_id);

CREATE TABLE IF NOT EXISTS employee_contacts (
  id                  text PRIMARY KEY,
  clinic_id           text NOT NULL,
  employee_id         text NOT NULL,
  type                text NOT NULL,
  value               text NOT NULL,
  label               text,
  emergency_name      text,
  emergency_relation  text,
  created_at          timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS employee_contacts_clinic_id_employee_id_idx ON employee_contacts(clinic_id, employee_id);

CREATE TABLE IF NOT EXISTS employee_documents (
  id            text PRIMARY KEY,
  clinic_id     text NOT NULL,
  employee_id   text NOT NULL,
  name          text NOT NULL,
  file_type     text NOT NULL,
  category      text NOT NULL,
  file_url      text NOT NULL,
  file_size     integer,
  description   text,
  uploaded_by   text,
  created_at    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS employee_documents_clinic_id_employee_id_idx ON employee_documents(clinic_id, employee_id);
