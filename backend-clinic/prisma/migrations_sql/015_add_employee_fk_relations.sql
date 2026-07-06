-- Personel/Kullanıcı ayrımı (devamı): employees tablosu dolduktan sonra
-- İK yan tablolarındaki ve doktor referanslarındaki employee_id/doctor_id/assigned_doctor
-- alanlarına gerçek FK kısıtları eklenir. 014_add_employees_table.sql + veri taşıma
-- script'inden SONRA çalıştırılmalıdır.

ALTER TABLE employee_leaves
  ADD CONSTRAINT employee_leaves_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE;

ALTER TABLE employee_leave_entitlements
  ADD CONSTRAINT employee_leave_entitlements_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE;

ALTER TABLE employee_work_hours
  ADD CONSTRAINT employee_work_hours_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE;

ALTER TABLE employee_profiles
  ADD CONSTRAINT employee_profiles_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE;

ALTER TABLE employee_contacts
  ADD CONSTRAINT employee_contacts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE;

ALTER TABLE employee_documents
  ADD CONSTRAINT employee_documents_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE;

ALTER TABLE employee_contracts
  ADD CONSTRAINT employee_contracts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE;

ALTER TABLE prim_records
  ADD CONSTRAINT prim_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE;

ALTER TABLE doctor_target_ledgers
  ADD CONSTRAINT doctor_target_ledgers_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE;

-- Boş string assigned_doctor değerlerini NULL'a çevir (FK kısıtı boş string'i kabul etmez)
UPDATE patients SET assigned_doctor = NULL WHERE assigned_doctor = '';

ALTER TABLE appointments
  ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES employees(id) ON UPDATE CASCADE;

ALTER TABLE patients
  ADD CONSTRAINT patients_assigned_doctor_fkey FOREIGN KEY (assigned_doctor) REFERENCES employees(id) ON UPDATE CASCADE;

ALTER TABLE treatment_items
  ADD CONSTRAINT treatment_items_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES employees(id) ON UPDATE CASCADE;

ALTER TABLE tooth_diagnoses
  ADD CONSTRAINT tooth_diagnoses_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES employees(id) ON UPDATE CASCADE;
