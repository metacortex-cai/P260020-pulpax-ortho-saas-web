-- Personel profil fotoğrafı için kalıcı alan (nullable, mevcut kayıtları etkilemez).

ALTER TABLE employees
  ADD COLUMN photo_url TEXT;
