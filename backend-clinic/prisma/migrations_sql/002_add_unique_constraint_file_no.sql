-- After backfilling file_no for all patients, add unique constraint per (clinic_id, file_no)
ALTER TABLE patients
ADD CONSTRAINT patients_clinic_file_no_unique UNIQUE (clinic_id, file_no);
