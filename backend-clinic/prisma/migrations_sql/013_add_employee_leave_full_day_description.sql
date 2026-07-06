-- Randevu Modülü Sprint 9-10: İzin Ekle modalı (Tam Gün toggle + açıklama)

ALTER TABLE employee_leaves
  ADD COLUMN IF NOT EXISTS is_full_day boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text;
