-- ============================================================
-- Pulpax: DrDentes TDB 2026 Tarifesi Seed SQL
-- Çalıştır: psql -U pulpax_user -h localhost -p 5433 -d pulpax_tenant_a -f seed-treatments.sql
-- ============================================================

-- 1. Kolonları ekle (yoksa)
ALTER TABLE master_treatments ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT 'TDB 2026 Tarifesi';

-- 2. Temizle (CASCADE)
TRUNCATE TABLE treatment_items CASCADE;
TRUNCATE TABLE treatment_plans CASCADE;
TRUNCATE TABLE tariffs CASCADE;
TRUNCATE TABLE master_treatments CASCADE;

-- 3. Klinik ID'sini al (ilk kliniği kullan)
DO $$
DECLARE
  v_clinic_id TEXT;
BEGIN
  -- Varsa ilk klinik id'yi al, yoksa sabit değer kullan
  SELECT COALESCE(
    (SELECT DISTINCT clinic_id FROM tariffs LIMIT 1),
    'default-clinic'
  ) INTO v_clinic_id;
  RAISE NOTICE 'Klinik ID: %', v_clinic_id;
END $$;

-- 4. Tedavileri ekle
-- Format: INSERT INTO master_treatments(id,name,sut_code,category) + tariffs(id,clinic_id,master_treatment_id,price,tax_rate,group_name)
-- Klinik ID için bu değeri güncelle: 'YOUR_CLINIC_ID'
-- SaaS sisteminde klinik ID'yi şuradan bulabilirsiniz: SELECT id FROM clinics LIMIT 1 (master DB'de)

-- Yardımcı fonksiyon ile toplu ekle
CREATE OR REPLACE FUNCTION seed_treatment(
  p_name TEXT, p_sut TEXT, p_category TEXT, p_price NUMERIC, p_clinic_id TEXT
) RETURNS VOID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO master_treatments(id, name, sut_code, category)
    VALUES (gen_random_uuid(), p_name, NULLIF(p_sut,''), p_category)
    RETURNING id INTO v_id;
  INSERT INTO tariffs(id, clinic_id, master_treatment_id, price, tax_rate, group_name)
    VALUES (gen_random_uuid(), p_clinic_id, v_id, p_price, 0, 'TDB 2026 Tarifesi');
END;
$$ LANGUAGE plpgsql;

-- Klinik ID'yi buraya yaz (SaaS master DB'den: SELECT id FROM clinics WHERE name='...')
\set clinic_id 'YOUR_CLINIC_ID'

-- Cerrahi
SELECT seed_treatment('Diş Çekimi','405010','Cerrahi',2475,:'clinic_id');
SELECT seed_treatment('Komplikasyonlu Diş Çekimi','405020','Cerrahi',4950,:'clinic_id');
SELECT seed_treatment('Gömülü Diş Operasyonu','405030','Cerrahi',7975,:'clinic_id');
SELECT seed_treatment('Gömülü Diş Operasyonu (Kemik Retansiyonlu)','405040','Cerrahi',11715,:'clinic_id');
SELECT seed_treatment('Tek Kökte Kök Ucu Rezeksiyonu','405060','Cerrahi',10450,:'clinic_id');
SELECT seed_treatment('İki Kökte Kök Ucu Rezeksiyonu','405060','Cerrahi',12925,:'clinic_id');
SELECT seed_treatment('Üç Kökte Kök Ucu Rezeksiyonu','405060','Cerrahi',15125,:'clinic_id');
SELECT seed_treatment('Çene Kırığı (Basit)','601060','Cerrahi',22550,:'clinic_id');
SELECT seed_treatment('Çene Kırığı (Komplike)','601060','Cerrahi',63800,:'clinic_id');
SELECT seed_treatment('Tek Köklü Dişte Reimplantasyon','405210','Cerrahi',11550,:'clinic_id');
SELECT seed_treatment('Çok Köklü Dişte Reimplantasyon','405210','Cerrahi',11550,:'clinic_id');
SELECT seed_treatment('Kemik İçi İmplant (Silindirik)','405260','Cerrahi',22440,:'clinic_id');
SELECT seed_treatment('Kemik İçi İmplant (Blade)','405260','Cerrahi',22440,:'clinic_id');
SELECT seed_treatment('İmplant Çıkartılması','611340','Cerrahi',10450,:'clinic_id');
SELECT seed_treatment('Alveolit Cerrahi Tedavisi','405070','Cerrahi',7455,:'clinic_id');
SELECT seed_treatment('Kanama Müdahalesi (Basit)','405080','Cerrahi',2560,:'clinic_id');
SELECT seed_treatment('Kanama Müdahalesi (Dikişli)','405080','Cerrahi',4755,:'clinic_id');
SELECT seed_treatment('Alveol Plastiği (Yarım Çene)','405090','Cerrahi',10395,:'clinic_id');
SELECT seed_treatment('Alveol Düzeltilmesi (Yarım Çene)','405100','Cerrahi',10395,:'clinic_id');
SELECT seed_treatment('Kist Operasyonu (Basit)','405110','Cerrahi',11055,:'clinic_id');
SELECT seed_treatment('Kist Operasyonu (Komplike)','405120','Cerrahi',16500,:'clinic_id');
SELECT seed_treatment('Epulis Operasyonu','','Cerrahi',7150,:'clinic_id');
SELECT seed_treatment('Osteomyelitis Operasyonu (Tek Çene Basit)','405130','Cerrahi',19250,:'clinic_id');
SELECT seed_treatment('Çene Lüksasyonu','405140','Cerrahi',3795,:'clinic_id');
SELECT seed_treatment('Frenektomi Operasyonu','406120','Cerrahi',7700,:'clinic_id');
SELECT seed_treatment('Vestibüloplasti Plastiği (Yarım Çene)','405150','Cerrahi',20900,:'clinic_id');
SELECT seed_treatment('Sinüs Plastiği','405160','Cerrahi',12650,:'clinic_id');
SELECT seed_treatment('Sert Doku Greftleme','405170','Cerrahi',15950,:'clinic_id');
SELECT seed_treatment('Yumuşak Doku Greftleme','405170','Cerrahi',13200,:'clinic_id');
SELECT seed_treatment('Sinüs Lifting','','Cerrahi',14465,:'clinic_id');
SELECT seed_treatment('Biyopsi','405180','Cerrahi',6380,:'clinic_id');
SELECT seed_treatment('Fibrom Operasyonu','','Cerrahi',6645,:'clinic_id');
SELECT seed_treatment('Apse Drenajı (Extraoral)','405190','Cerrahi',11165,:'clinic_id');
SELECT seed_treatment('Apse Drenajı (İntraoral)','405190','Cerrahi',8790,:'clinic_id');
SELECT seed_treatment('Kapişon İzalesi','','Cerrahi',3640,:'clinic_id');
SELECT seed_treatment('Stomatit Tedavisi','','Cerrahi',2395,:'clinic_id');
SELECT seed_treatment('Fizik Tedavisi (İnfraruj Seansı)','405200','Cerrahi',2105,:'clinic_id');
SELECT seed_treatment('Tek Köklü Dişte Ototransplantasyon','405220','Cerrahi',17050,:'clinic_id');
SELECT seed_treatment('Çok Köklü Dişte Ototransplantasyon','405220','Cerrahi',17050,:'clinic_id');
SELECT seed_treatment('Supperiostal İmplant','405230','Cerrahi',40115,:'clinic_id');
SELECT seed_treatment('Torus Operasyonu (Yarım Çene)','405270','Cerrahi',10780,:'clinic_id');
SELECT seed_treatment('Odontogenik Tümör Operasyonu (Küçük)','405280','Cerrahi',20350,:'clinic_id');
SELECT seed_treatment('Odontogenik Tümör Operasyonu (Büyük)','405290','Cerrahi',26950,:'clinic_id');
SELECT seed_treatment('Nevralji Tedavisi (Alkol Enjeksiyonu)','405300','Cerrahi',3850,:'clinic_id');
SELECT seed_treatment('Nöroktomi','','Cerrahi',10450,:'clinic_id');
SELECT seed_treatment('Tükürük Bezi Taş Çıkarma (Basit)','','Cerrahi',7975,:'clinic_id');
SELECT seed_treatment('Tükürük Bezi Taş Çıkarma (Komplike)','','Cerrahi',12650,:'clinic_id');
SELECT seed_treatment('Gömük Diş Üzerinin Açılması (Ortodontik)','405380','Cerrahi',10450,:'clinic_id');
SELECT seed_treatment('T.M.E. Mekonoterapi','405390','Cerrahi',3575,:'clinic_id');
SELECT seed_treatment('T.M.E. İçi Enjeksiyon (Tek Taraflı)','405400','Cerrahi',7150,:'clinic_id');
SELECT seed_treatment('Artrosentez (Tek Taraflı)','405410','Cerrahi',4915,:'clinic_id');
SELECT seed_treatment('Açık Eklem Cerrahisi (Tek Taraflı)','','Cerrahi',82500,:'clinic_id');
SELECT seed_treatment('Genioplasti','602780','Cerrahi',82500,:'clinic_id');
SELECT seed_treatment('Segmental Osteotomi','','Cerrahi',88000,:'clinic_id');
SELECT seed_treatment('Osteotomi (Tek Çene)','','Cerrahi',92400,:'clinic_id');
SELECT seed_treatment('Botoks Uygulama','','Cerrahi',11550,:'clinic_id');
SELECT seed_treatment('Ankraj Amaçlı Plak Yerleştirme','','Cerrahi',11220,:'clinic_id');
SELECT seed_treatment('Ankraj Amaçlı Plak Çıkarma','','Cerrahi',6600,:'clinic_id');
SELECT seed_treatment('Zigoma İmplant','','Cerrahi',49500,:'clinic_id');
SELECT seed_treatment('Koronektomi','','Cerrahi',10450,:'clinic_id');

-- Endodonti
SELECT seed_treatment('Kanal Tedavisi - Tek Kanal (Dolgu Hariç)','402150','Tedavi & Endodonti',4610,:'clinic_id');
SELECT seed_treatment('Kanal Tedavisi - İki Kanal (Dolgu Hariç)','402152','Tedavi & Endodonti',7220,:'clinic_id');
SELECT seed_treatment('Kanal Tedavisi - Üç Kanal (Dolgu Hariç)','402153','Tedavi & Endodonti',10350,:'clinic_id');
SELECT seed_treatment('Periapikal Lezyonlu Kanal Tedavisi - Tek Kanal','402271','Tedavi & Endodonti',5055,:'clinic_id');
SELECT seed_treatment('Periapikal Lezyonlu Kanal Tedavisi - İki Kanal','402272','Tedavi & Endodonti',7700,:'clinic_id');
SELECT seed_treatment('Periapikal Lezyonlu Kanal Tedavisi - Üç Kanal','402273','Tedavi & Endodonti',10980,:'clinic_id');
SELECT seed_treatment('Pansuman (Seans Başı)','','Tedavi & Endodonti',640,:'clinic_id');
SELECT seed_treatment('Ekstirpasyon (Her Kanal İçin)','402300','Tedavi & Endodonti',2010,:'clinic_id');
SELECT seed_treatment('Kanal Tedavisi - İlave Her Kanal','402154','Tedavi & Endodonti',2500,:'clinic_id');
SELECT seed_treatment('Aşırı Kole Hassasiyeti Tedavisi (Tam Çene)','406110','Tedavi & Endodonti',3520,:'clinic_id');
SELECT seed_treatment('Aşırı Kole Hassasiyeti Tedavisi (Tek Diş)','406110','Tedavi & Endodonti',1220,:'clinic_id');
SELECT seed_treatment('Dolgu (Restorasyon) Tamiri','','Tedavi & Endodonti',2920,:'clinic_id');
SELECT seed_treatment('Dolgu Sökümü (Tek Diş)','','Tedavi & Endodonti',1480,:'clinic_id');
SELECT seed_treatment('Kanal Dolgusu Sökümü (Her Kanal)','','Tedavi & Endodonti',1740,:'clinic_id');
SELECT seed_treatment('Kanal Dolgusu Tekrarı (Retreatment - Her Kanal)','','Tedavi & Endodonti',4510,:'clinic_id');
SELECT seed_treatment('Kanaldan Kırılmış Materyal Çıkartılması','','Tedavi & Endodonti',6875,:'clinic_id');
SELECT seed_treatment('Kanalda Perforasyon Tamiri (MTA vb.)','','Tedavi & Endodonti',3280,:'clinic_id');
SELECT seed_treatment('Endokron','','Tedavi & Endodonti',13750,:'clinic_id');
SELECT seed_treatment('Kanal Pansumanı (Seans Başı)','','Tedavi & Endodonti',1205,:'clinic_id');
SELECT seed_treatment('Rubber-Dam Uygulaması','','Tedavi & Endodonti',1155,:'clinic_id');
SELECT seed_treatment('Retreatment Çok Köklü (1,2,3 Kanal)','','Tedavi & Endodonti',17500,:'clinic_id');

-- Oral Diyagnoz
SELECT seed_treatment('Dişhekimi Muayenesi','401010','Teşhis ve Planlama',1650,:'clinic_id');
SELECT seed_treatment('Uzman Dişhekimi Muayenesi','401010','Teşhis ve Planlama',2035,:'clinic_id');
SELECT seed_treatment('Diş Röntgen Filmi (Periapikal)','401051','Teşhis ve Planlama',830,:'clinic_id');
SELECT seed_treatment('Oklüzal Film','401060','Teşhis ve Planlama',865,:'clinic_id');
SELECT seed_treatment('Bite-Wing Radyografi','401150','Teşhis ve Planlama',830,:'clinic_id');
SELECT seed_treatment('Ekstra Oral Röntgen Filmi','401070','Teşhis ve Planlama',955,:'clinic_id');
SELECT seed_treatment('Panoramik Film','401080','Teşhis ve Planlama',2040,:'clinic_id');
SELECT seed_treatment('Lateral Sefalometrik Film','401090','Teşhis ve Planlama',2050,:'clinic_id');
SELECT seed_treatment('Antero-Posterior Sefalometrik Film','401100','Teşhis ve Planlama',2030,:'clinic_id');
SELECT seed_treatment('El Bilek Filmi','401110','Teşhis ve Planlama',2030,:'clinic_id');
SELECT seed_treatment('T.M.E. Filmi ve Tetkiki','401120','Teşhis ve Planlama',2670,:'clinic_id');
SELECT seed_treatment('Siyalografi','401130','Teşhis ve Planlama',2310,:'clinic_id');
SELECT seed_treatment('Oral Hijyen Eğitimi','','Teşhis ve Planlama',1175,:'clinic_id');
SELECT seed_treatment('Vitalite Kontrolü (Diş Başına)','','Teşhis ve Planlama',235,:'clinic_id');
SELECT seed_treatment('Lokal Anestezi (İnfiltratif)','405420','Teşhis ve Planlama',370,:'clinic_id');
SELECT seed_treatment('Lokal Anestezi (Rejyonal)','405430','Teşhis ve Planlama',370,:'clinic_id');
SELECT seed_treatment('Radyo Vizyografi (RVG)','','Teşhis ve Planlama',990,:'clinic_id');
SELECT seed_treatment('Konsültasyon','401030','Teşhis ve Planlama',1110,:'clinic_id');
SELECT seed_treatment('Uzman Diş Hekimi Konsültasyonu','401030','Teşhis ve Planlama',1445,:'clinic_id');
SELECT seed_treatment('BT (Tek Çene)','401170','Teşhis ve Planlama',4400,:'clinic_id');
SELECT seed_treatment('BT (Bölgesel)','401170','Teşhis ve Planlama',2750,:'clinic_id');
SELECT seed_treatment('BT (İki Çene)','401170','Teşhis ve Planlama',5940,:'clinic_id');
SELECT seed_treatment('Bilgisayarlı Eklem Tomografisi','','Teşhis ve Planlama',6660,:'clinic_id');
SELECT seed_treatment('Bilgisayarlı Büyük TME Fonksiyon Testi','407040','Teşhis ve Planlama',13200,:'clinic_id');
SELECT seed_treatment('Bilgisayarlı Kas Tonus Analizi','407050','Teşhis ve Planlama',5995,:'clinic_id');
SELECT seed_treatment('Bilinçli Sedasyon','403110','Teşhis ve Planlama',1225,:'clinic_id');
SELECT seed_treatment('Teşhis ve Tedavi Planlaması','','Teşhis ve Planlama',1535,:'clinic_id');
SELECT seed_treatment('Kontrol Hekim Muayenesi','401010','Teşhis ve Planlama',1430,:'clinic_id');
SELECT seed_treatment('Tükürük Akış Hızı Tayini','','Teşhis ve Planlama',1670,:'clinic_id');
SELECT seed_treatment('Tükürük Mikrobiyolojik Analiz','','Teşhis ve Planlama',2805,:'clinic_id');
SELECT seed_treatment('Gnatoloji TME Kas Muayenesi','404130','Teşhis ve Planlama',5280,:'clinic_id');
SELECT seed_treatment('Akupunktur Uygulama (Seans)','','Teşhis ve Planlama',2750,:'clinic_id');
SELECT seed_treatment('Ağız İçi Dijital Tarama','','Teşhis ve Planlama',2750,:'clinic_id');

-- Ortodonti
SELECT seed_treatment('Düz Ark Teli Tatbiki (NİTİ - Tek Çene)','407260','Ortodonti',2255,:'clinic_id');
SELECT seed_treatment('Bant Tatbiki (Tek Diş)','407270','Ortodonti',2255,:'clinic_id');
SELECT seed_treatment('Braket Tatbiki (Tek Diş)','407270','Ortodonti',1925,:'clinic_id');
SELECT seed_treatment('Bant veya Braket Çıkarılması (Tek Diş)','','Ortodonti',785,:'clinic_id');
SELECT seed_treatment('Lateral Sefalometrik Film Analizi','407010','Ortodonti',1675,:'clinic_id');
SELECT seed_treatment('Bilgisayarlı Sefalometrik Film Analizi','407030','Ortodonti',2820,:'clinic_id');
SELECT seed_treatment('Antero Posterior Sefalometrik Film Analizi','407020','Ortodonti',1870,:'clinic_id');
SELECT seed_treatment('Kemik Yaşı Tayini','407060','Ortodonti',645,:'clinic_id');
SELECT seed_treatment('Ortodontik Fotoğraf','407070','Ortodonti',990,:'clinic_id');
SELECT seed_treatment('Ortodontik Model Yapımı','407090','Ortodonti',1210,:'clinic_id');
SELECT seed_treatment('Ortodontik Model Analizi','407100','Ortodonti',1480,:'clinic_id');
SELECT seed_treatment('Angle Sınıf I Ortodontik Tedavisi','407110','Ortodonti',40910,:'clinic_id');
SELECT seed_treatment('Angle Sınıf II Ortodontik Tedavisi','407120','Ortodonti',51395,:'clinic_id');
SELECT seed_treatment('Angle Sınıf III Ortodontik Tedavisi','407130','Ortodonti',62675,:'clinic_id');
SELECT seed_treatment('Açık Kapanışın Ortodontik Tedavisi','407320','Ortodonti',61030,:'clinic_id');
SELECT seed_treatment('Önleyici Ortodontik Tedavi','407150','Ortodonti',26125,:'clinic_id');
SELECT seed_treatment('Kısa Süreli Ortodontik Tedavi','407140','Ortodonti',23290,:'clinic_id');
SELECT seed_treatment('Pekiştirme Tedavisi','407160','Ortodonti',9295,:'clinic_id');
SELECT seed_treatment('Pekiştirme Aygıtı (Hawley)','407170','Ortodonti',6765,:'clinic_id');
SELECT seed_treatment('Sabit Pekiştirme Aygıtı (Lingual Retainer)','407180','Ortodonti',9625,:'clinic_id');
SELECT seed_treatment('Dudak Yastıkçığı (Lip Bumper)','','Ortodonti',10725,:'clinic_id');
SELECT seed_treatment('Tek Çene Aparey Yapımı','407190','Ortodonti',7535,:'clinic_id');
SELECT seed_treatment('Çift Çene Aparey Yapımı (Aktivatör)','407200','Ortodonti',12265,:'clinic_id');
SELECT seed_treatment('Hızlı Maksiller Genişletme Apareyi','407250','Ortodonti',13750,:'clinic_id');
SELECT seed_treatment('Reverse Headgear','407210','Ortodonti',19635,:'clinic_id');
SELECT seed_treatment('Ağız Dışı Aparey (Headgear-Chincap)','407220','Ortodonti',6875,:'clinic_id');
SELECT seed_treatment('Lingual Braket Tatbiki (Tek Diş)','407270','Ortodonti',1925,:'clinic_id');
SELECT seed_treatment('Lingual Ark','','Ortodonti',7425,:'clinic_id');
SELECT seed_treatment('Nance Apareyi','','Ortodonti',11275,:'clinic_id');
SELECT seed_treatment('Aparey Tamiri','407240','Ortodonti',3025,:'clinic_id');
SELECT seed_treatment('Oklüzal Cerrahi Splint (Tek Çene)','407290','Ortodonti',12150,:'clinic_id');
SELECT seed_treatment('Ortodontik Ameliyat Arkı (Tek Çene)','407300','Ortodonti',21080,:'clinic_id');
SELECT seed_treatment('Şeffaf Plaklar ile Ortodontik Tedavi (Hafif)','','Ortodonti',53900,:'clinic_id');
SELECT seed_treatment('Şeffaf Plaklar ile Ortodontik Tedavi (Orta)','','Ortodonti',69300,:'clinic_id');
SELECT seed_treatment('Şeffaf Plaklar ile Ortodontik Tedavi (Ağır)','','Ortodonti',95700,:'clinic_id');
SELECT seed_treatment('Mini Vida Uygulaması','','Ortodonti',4950,:'clinic_id');
SELECT seed_treatment('İnterproksimal Aşındırma (Tek Diş)','','Ortodonti',1265,:'clinic_id');
SELECT seed_treatment('Ağız İçi Koruyucu Aparey','','Ortodonti',11000,:'clinic_id');

-- Pedodonti
SELECT seed_treatment('Amputasyon - VİTAL','402140','Pedodonti',3850,:'clinic_id');
SELECT seed_treatment('Amputasyon (Dolgu Hariç) - MORTAL','402140','Pedodonti',3850,:'clinic_id');
SELECT seed_treatment('Süt Dişi Kanal Tedavisi','402150','Pedodonti',6765,:'clinic_id');
SELECT seed_treatment('Fissür Örtülmesi (Sealant - Tek Diş)','403010','Pedodonti',1445,:'clinic_id');
SELECT seed_treatment('Yüzeysel Flor Uygulaması (Yarım Çene)','403020','Pedodonti',1375,:'clinic_id');
SELECT seed_treatment('Prefabrike Kron','403030','Pedodonti',3810,:'clinic_id');
SELECT seed_treatment('Yer Tutucu (Sabit)','403040','Pedodonti',7480,:'clinic_id');
SELECT seed_treatment('Yer Tutucu (Hareketli)','403050','Pedodonti',10010,:'clinic_id');
SELECT seed_treatment('Çocuk Protezi (Akrilik - Bölümlü - Tek Çene)','403060','Pedodonti',15050,:'clinic_id');
SELECT seed_treatment('Çocuk Protezi (Akrilik - Tam - Tek Çene)','403070','Pedodonti',16995,:'clinic_id');
SELECT seed_treatment('Strip Kron','403080','Pedodonti',3575,:'clinic_id');
SELECT seed_treatment('Kompomer Dolgu','403090','Pedodonti',4180,:'clinic_id');
SELECT seed_treatment('Açık Apeksli Dişte Kanal Tedavisi (Her Kanal)','403100','Pedodonti',12780,:'clinic_id');
SELECT seed_treatment('Açık Apeksli Dişte Apikal Bariyer','','Pedodonti',5830,:'clinic_id');
SELECT seed_treatment('Travma Splinti','','Pedodonti',8195,:'clinic_id');
SELECT seed_treatment('Aşındırma ile Sürme Rehberliği (Seans)','','Pedodonti',1640,:'clinic_id');
SELECT seed_treatment('Rezin İnfilitrasyonu Tedavisi','','Pedodonti',7150,:'clinic_id');

-- Periodontoloji
SELECT seed_treatment('Subgingival Küretaj (Tek Diş)','406030','Periodontoloji',1870,:'clinic_id');
SELECT seed_treatment('Hemiseksiyon (Kök Amputasyonu)','406060','Periodontoloji',3845,:'clinic_id');
SELECT seed_treatment('Periodontal Apse Tedavisi','406010','Periodontoloji',3455,:'clinic_id');
SELECT seed_treatment('Detertraj (Diş Taşı Temizliği - Tek Çene)','406021','Periodontoloji',3300,:'clinic_id');
SELECT seed_treatment('Subgingival İlaç Uygulaması','','Periodontoloji',330,:'clinic_id');
SELECT seed_treatment('Gingivoplasti (Tek Diş)','406130','Periodontoloji',3135,:'clinic_id');
SELECT seed_treatment('Gingivektomi (Tek Diş)','406040','Periodontoloji',3245,:'clinic_id');
SELECT seed_treatment('Flap Operasyonu (Tek Diş)','406050','Periodontoloji',5225,:'clinic_id');
SELECT seed_treatment('Tunnel Operasyonu (Tek Diş)','406150','Periodontoloji',4445,:'clinic_id');
SELECT seed_treatment('Serbest Diş Eti Grefti','406070','Periodontoloji',5380,:'clinic_id');
SELECT seed_treatment('Saplı Yumuşak Doku Grefti','406080','Periodontoloji',4250,:'clinic_id');
SELECT seed_treatment('Periodontal Şine (Daimi)','406100','Periodontoloji',6370,:'clinic_id');
SELECT seed_treatment('Periodontal Şine (Geçici)','406090','Periodontoloji',8070,:'clinic_id');
SELECT seed_treatment('Periodontal Şine (Geçici - Yarım Çene)','406090','Periodontoloji',3690,:'clinic_id');
SELECT seed_treatment('Biyomateryal Uygulaması (Tek Diş)','406140','Periodontoloji',1375,:'clinic_id');
SELECT seed_treatment('Membran Uygulaması (Tek Diş)','406160','Periodontoloji',1360,:'clinic_id');
SELECT seed_treatment('Vestibül Plak (Diş Eti Protezi)','','Periodontoloji',9020,:'clinic_id');
SELECT seed_treatment('Subepitelyal Bağ Dokusu Grefti','406170','Periodontoloji',14850,:'clinic_id');
SELECT seed_treatment('Peri-İmplantitis (Cerrahi) (Tek İmp.)','','Periodontoloji',6875,:'clinic_id');
SELECT seed_treatment('Peri-İmplantitis (Cerrahi Olmayan) (Tek İmp.)','','Periodontoloji',1185,:'clinic_id');
SELECT seed_treatment('Papil Oluşturma (Cerrahi) (Tek Papil)','','Periodontoloji',2910,:'clinic_id');
SELECT seed_treatment('Papil Oluşturma (Cerrahi Olmayan) (Tek Papil)','','Periodontoloji',2885,:'clinic_id');
SELECT seed_treatment('Fiberotomi','','Periodontoloji',2750,:'clinic_id');

-- Protez
SELECT seed_treatment('Tam Protez (Akrilik - Tek Çene)','404010','Protez',31900,:'clinic_id');
SELECT seed_treatment('Bölümlü Protez (Akrilik - Tek Çene)','404020','Protez',30690,:'clinic_id');
SELECT seed_treatment('Tam Protez (Metal - Tek Çene)','404030','Protez',39600,:'clinic_id');
SELECT seed_treatment('İmplant Üstü Tam Protez','404410','Protez',38745,:'clinic_id');
SELECT seed_treatment('Bölümlü Protez (Metal - Tek Çene)','404040','Protez',38500,:'clinic_id');
SELECT seed_treatment('İmplant Üstü Bölümlü Protez','404420','Protez',39260,:'clinic_id');
SELECT seed_treatment('Hassas Tutuculu Protez (Tek Çene)','404360','Protez',40150,:'clinic_id');
SELECT seed_treatment('İmplant Destekli Hareketli Protez (Tek Çene)','404370','Protez',40700,:'clinic_id');
SELECT seed_treatment('Geçici (İmmediat) Protez (Akrilik - Tek Çene)','404050','Protez',22285,:'clinic_id');
SELECT seed_treatment('Diş İlavesi (Tek Diş)','404120','Protez',4180,:'clinic_id');
SELECT seed_treatment('Roach Köprü','404230','Protez',7645,:'clinic_id');
SELECT seed_treatment('Pinley ve Çeşitleri','404160','Protez',8740,:'clinic_id');
SELECT seed_treatment('Tek Parça Döküm Kuron','404170','Protez',7735,:'clinic_id');
SELECT seed_treatment('Veneer Kuron (Akrilik)','404180','Protez',11220,:'clinic_id');
SELECT seed_treatment('Veneer Kuron (Seramik)','404181','Protez',12100,:'clinic_id');
SELECT seed_treatment('İmplant Üstü Veneer Kuron (Seramik)','404181','Protez',13680,:'clinic_id');
SELECT seed_treatment('Laminate Veneer Kuron (Akrilik)','404390','Protez',10785,:'clinic_id');
SELECT seed_treatment('Laminate Veneer Kuron (Seramik)','404390','Protez',26400,:'clinic_id');
SELECT seed_treatment('Jaket Kuron (Akrilik)','404200','Protez',7480,:'clinic_id');
SELECT seed_treatment('Jaket Kuron (Seramik)','404201','Protez',7320,:'clinic_id');
SELECT seed_treatment('Tam Seramik Kuron (Metal Desteksiz)','404201','Protez',21450,:'clinic_id');
SELECT seed_treatment('Tam Seramik Kuron (Metal)','404201','Protez',27595,:'clinic_id');
SELECT seed_treatment('Teleskop Kuron (Koping)','404210','Protez',9895,:'clinic_id');
SELECT seed_treatment('Döküm Post Core (Kuron Hariç)','404190','Protez',6860,:'clinic_id');
SELECT seed_treatment('Adeziv Köprü (Maryland vb.)','404220','Protez',11550,:'clinic_id');
SELECT seed_treatment('Kuron Sökümü (Tek Sabit Üye)','404250','Protez',1875,:'clinic_id');
SELECT seed_treatment('Diş Üstü Protezi (Overdenture - Tek Çene)','404280','Protez',26055,:'clinic_id');
SELECT seed_treatment('Zirkonyum Kuron','404395','Protez',13750,:'clinic_id');
SELECT seed_treatment('Besleme (Tek Çene)','404080','Protez',11965,:'clinic_id');
SELECT seed_treatment('Kaide Yenileme (Rebazaj - Tek Çene)','404060','Protez',12430,:'clinic_id');
SELECT seed_treatment('Proteze Yumuşak Akrilik Uygulaması (Geçici)','404070','Protez',8070,:'clinic_id');
SELECT seed_treatment('Proteze Yumuşak Akrilik Uygulaması (Daimi)','404070','Protez',12610,:'clinic_id');
SELECT seed_treatment('Tamir (Akrilik Protezler)','404090','Protez',3805,:'clinic_id');
SELECT seed_treatment('Kroşe İlavesi','404100','Protez',4290,:'clinic_id');
SELECT seed_treatment('Metal İskelet Tamiri','404110','Protez',4180,:'clinic_id');
SELECT seed_treatment('Gece Plağı (Yumuşak)','404150','Protez',5885,:'clinic_id');
SELECT seed_treatment('Gece Plağı (Sert - Oklüzal Splintleme)','407290','Protez',20240,:'clinic_id');
SELECT seed_treatment('Geçici Kuron (Tek Diş)','404240','Protez',2245,:'clinic_id');
SELECT seed_treatment('Düşmüş Kuron ve Köprü Simantasyonu','404260','Protez',1225,:'clinic_id');
SELECT seed_treatment('Kuron Köprü Tamiri (Her Üye)','404270','Protez',5005,:'clinic_id');
SELECT seed_treatment('Oklüzal Aşındırmalar (Tek Çene)','404140','Protez',6820,:'clinic_id');
SELECT seed_treatment('Oklüzyon Düzeltilmesi (İki Çene)','','Protez',10150,:'clinic_id');
SELECT seed_treatment('T.M.E. Stabilizasyon Splinti','','Protez',19800,:'clinic_id');
SELECT seed_treatment('İmplant Rehberi (Yarım Çene)','','Protez',9735,:'clinic_id');
SELECT seed_treatment('İmplant Rehberi (Tam Çene)','','Protez',14300,:'clinic_id');

-- Restoratif
SELECT seed_treatment('Amalgam Dolgu (Bir Yüzlü) - O','402010','Tedavi & Endodonti',2845,:'clinic_id');
SELECT seed_treatment('Amalgam Dolgu (Bir Yüzlü) - COLE','402160','Tedavi & Endodonti',2845,:'clinic_id');
SELECT seed_treatment('Amalgam Dolgu (İki Yüzlü) - OD','402020','Tedavi & Endodonti',3805,:'clinic_id');
SELECT seed_treatment('Amalgam Dolgu (İki Yüzlü) - OM','402020','Tedavi & Endodonti',3805,:'clinic_id');
SELECT seed_treatment('Amalgam Dolgu (Üç Yüzlü) - MOD','402030','Tedavi & Endodonti',4845,:'clinic_id');
SELECT seed_treatment('İnley Dolgu (Bir Yüzlü) - O','402040','Tedavi & Endodonti',6285,:'clinic_id');
SELECT seed_treatment('İnley Dolgu (Bir Yüzlü) - COLE','402040','Tedavi & Endodonti',6285,:'clinic_id');
SELECT seed_treatment('İnley Dolgu (İki Yüzlü) - OD','402050','Tedavi & Endodonti',6490,:'clinic_id');
SELECT seed_treatment('İnley Dolgu (İki Yüzlü) - OM','402050','Tedavi & Endodonti',6490,:'clinic_id');
SELECT seed_treatment('İnley Dolgu (Üç Yüzlü) - MOD','402060','Tedavi & Endodonti',6770,:'clinic_id');
SELECT seed_treatment('Kompozit Dolgu (Bir Yüzlü) - O','402100','Tedavi & Endodonti',3375,:'clinic_id');
SELECT seed_treatment('Kompozit Dolgu (Bir Yüzlü) - COLE','402180','Tedavi & Endodonti',2720,:'clinic_id');
SELECT seed_treatment('Kompozit Dolgu (İki Yüzlü) - OD','402110','Tedavi & Endodonti',4235,:'clinic_id');
SELECT seed_treatment('Kompozit Dolgu (İki Yüzlü) - OM','402110','Tedavi & Endodonti',4235,:'clinic_id');
SELECT seed_treatment('Kompozit Dolgu (Üç Yüzlü) - MOD','402120','Tedavi & Endodonti',5300,:'clinic_id');
SELECT seed_treatment('Kompozit İnley Dolgu (Tek Yüzlü) - O','402100','Tedavi & Endodonti',6050,:'clinic_id');
SELECT seed_treatment('Kompozit İnley Dolgu (İki Yüzlü) - OD','402110','Tedavi & Endodonti',6050,:'clinic_id');
SELECT seed_treatment('Kompozit İnley Dolgu (Üç Yüzlü) - MOD','402120','Tedavi & Endodonti',6050,:'clinic_id');
SELECT seed_treatment('Seramik İnley Dolgu (Tek Yüzlü) - O','402040','Tedavi & Endodonti',15620,:'clinic_id');
SELECT seed_treatment('Seramik İnley Dolgu (İki Yüzlü) - OD','402050','Tedavi & Endodonti',15620,:'clinic_id');
SELECT seed_treatment('Seramik İnley Dolgu (Üç Yüzlü) - MOD','402060','Tedavi & Endodonti',15620,:'clinic_id');
SELECT seed_treatment('Cam İonomer Dolgu - O','402190','Tedavi & Endodonti',2675,:'clinic_id');
SELECT seed_treatment('Cam İonomer Dolgu - COLE','402170','Tedavi & Endodonti',2115,:'clinic_id');
SELECT seed_treatment('Cam İonomer Dolgu - OD','402190','Tedavi & Endodonti',2675,:'clinic_id');
SELECT seed_treatment('Cam İonomer Dolgu - OM','402190','Tedavi & Endodonti',2675,:'clinic_id');
SELECT seed_treatment('Cam İonomer Dolgu - MOD','402190','Tedavi & Endodonti',2675,:'clinic_id');
SELECT seed_treatment('Kuafaj (Dolgu Hariç)','402130','Tedavi & Endodonti',440,:'clinic_id');
SELECT seed_treatment('Diş Ağartma (Devital Tek Diş)','','Tedavi & Endodonti',2475,:'clinic_id');
SELECT seed_treatment('Diş Ağartma (Tek Çene)','','Tedavi & Endodonti',11935,:'clinic_id');
SELECT seed_treatment('Diş Ağartma (Vital Tek Diş)','','Tedavi & Endodonti',2145,:'clinic_id');
SELECT seed_treatment('Direkt Kompozit Veneer Restorasyon','402340','Tedavi & Endodonti',9295,:'clinic_id');
SELECT seed_treatment('Kanal İçi Hazır Post Uygulaması','402240','Tedavi & Endodonti',3075,:'clinic_id');
SELECT seed_treatment('Kanal İçi Fiber Post Uygulaması','402240','Tedavi & Endodonti',4950,:'clinic_id');
SELECT seed_treatment('Dentin Pimi Uygulaması (Her Pim) - D','402200','Tedavi & Endodonti',555,:'clinic_id');
SELECT seed_treatment('Dentin Pimi Uygulaması (Her Pim) - M','402200','Tedavi & Endodonti',555,:'clinic_id');
SELECT seed_treatment('Onley','402320','Tedavi & Endodonti',7780,:'clinic_id');
SELECT seed_treatment('Onley (Seramik)','402320','Tedavi & Endodonti',15620,:'clinic_id');
SELECT seed_treatment('Pinley (Restoratif)','','Tedavi & Endodonti',7865,:'clinic_id');
SELECT seed_treatment('Laminate Veneer (Kompozit)','404390','Tedavi & Endodonti',9295,:'clinic_id');

-- Fonksiyonu temizle
DROP FUNCTION IF EXISTS seed_treatment(TEXT,TEXT,TEXT,NUMERIC,TEXT);

-- Özet
SELECT category, COUNT(*) as adet FROM master_treatments GROUP BY category ORDER BY category;
