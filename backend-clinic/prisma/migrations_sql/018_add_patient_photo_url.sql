-- Hasta profil fotoğrafı için kalıcı alan (nullable, mevcut kayıtları etkilemez).

ALTER TABLE patients
  ADD COLUMN photo_url TEXT;
