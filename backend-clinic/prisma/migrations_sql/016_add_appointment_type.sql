-- Randevu türü (Muayene / Kontrol / Tedavi) artık kalıcı olarak saklanıyor.
-- Nullable: mevcut kayıtlar ve tür seçilmeden oluşturulan randevular etkilenmez.

ALTER TABLE appointments
  ADD COLUMN type TEXT;
