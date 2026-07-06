# seed-via-docker.ps1
# Docker exec ile PostgreSQL container'i uzerinden tedavileri dogrudan DB'ye yazar.
# JWT veya backend rebuild gerektirmez.
#
# Kullanim:
#   .\seed-via-docker.ps1
#   .\seed-via-docker.ps1 -TenantDB pulpax_tenant_b

param(
  [string]$PgContainer = "pulpax-postgres-saas",
  [string]$PgUser      = "pulpax_user",
  [string]$MasterDB    = "pulpax_db",
  [string]$TenantDB    = "pulpax_tenant_a"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Pulpax Tedavi Seed (Docker SQL) ===" -ForegroundColor Cyan

# 1. Klinik UUID'sini master DB'den cek
Write-Host "`n[1/3] Klinik UUID aliniyor ($MasterDB)..." -ForegroundColor Yellow
$rawOutput = docker exec $PgContainer psql -U $PgUser -d $MasterDB -t -c "SELECT id FROM clinics ORDER BY created_at LIMIT 1;" 2>&1
$clinicId  = ($rawOutput | Where-Object { $_ -match '[0-9a-f]{8}-' } | Select-Object -First 1).Trim()

if (-not $clinicId -or $clinicId -notmatch '^[0-9a-f]{8}-') {
  Write-Host "  Otomatik alinamadi. Manuel girin:" -ForegroundColor Yellow
  $clinicId = Read-Host "  Klinik UUID"
}
Write-Host "  Klinik ID: $clinicId" -ForegroundColor Green

# 2. SQL olustur (single-quoted here-string -> $body$ PL/pgSQL, CLINIC_ID placeholder)
Write-Host "`n[2/3] SQL olusturuluyor..." -ForegroundColor Yellow

$sqlTemplate = @'
\encoding UTF8
SET client_encoding = 'UTF8';

ALTER TABLE master_treatments ADD COLUMN IF NOT EXISTS category TEXT;

TRUNCATE TABLE protocols CASCADE;
DELETE FROM treatment_items;
DELETE FROM treatment_plans;
DELETE FROM tariffs WHERE clinic_id = 'CLINIC_ID';
TRUNCATE TABLE master_treatments CASCADE;

CREATE OR REPLACE FUNCTION _seed(nm TEXT, sc TEXT, cat TEXT, pr NUMERIC) RETURNS VOID AS $body$
DECLARE vid UUID;
BEGIN
  INSERT INTO master_treatments(id,name,sut_code,category)
    VALUES(gen_random_uuid(), nm, NULLIF(sc,''), cat) RETURNING id INTO vid;
  INSERT INTO tariffs(id,clinic_id,master_treatment_id,price,tax_rate)
    VALUES(gen_random_uuid(),'CLINIC_ID',vid,pr,0);
END;
$body$ LANGUAGE plpgsql;

-- CERAHİ
SELECT _seed('Diş Çekimi','405010','Cerrahi',2475);
SELECT _seed('Komplikasyonlu Diş Çekimi','405020','Cerrahi',4950);
SELECT _seed('Gömülü Diş Operasyonu','405030','Cerrahi',7975);
SELECT _seed('Gömülü Diş Operasyonu (Kemik Retansiyonlu)','405040','Cerrahi',11715);
SELECT _seed('Tek Kökte Kök Ucu Rezeksiyonu','405060','Cerrahi',10450);
SELECT _seed('İki Kökte Kök Ucu Rezeksiyonu','405060','Cerrahi',12925);
SELECT _seed('Üç Kökte Kök Ucu Rezeksiyonu','405060','Cerrahi',15125);
SELECT _seed('Çene Kırığı (Basit)','601060','Cerrahi',22550);
SELECT _seed('Çene Kırığı (Komplike)','601060','Cerrahi',63800);
SELECT _seed('Tek Köklü Dişte Reimplantasyon','405210','Cerrahi',11550);
SELECT _seed('Çok Köklü Dişte Reimplantasyon','405210','Cerrahi',11550);
SELECT _seed('Kemik İçi İmplant (Tek Silindirik)','405260','Cerrahi',22440);
SELECT _seed('Kemik İçi İmplant (Blade)','405260','Cerrahi',22440);
SELECT _seed('İmplant Çıkartılması','611340','Cerrahi',10450);
SELECT _seed('Alveolit Cerrahi Tedavisi','405070','Cerrahi',7455);
SELECT _seed('Kanama Müdahalesi (Basit)','405080','Cerrahi',2560);
SELECT _seed('Kanama Müdahalesi (Dikişli)','405080','Cerrahi',4755);
SELECT _seed('Alveol Plastiği (Yarım Çene)','405090','Cerrahi',10395);
SELECT _seed('Alveol Düzeltilmesi (Yarım Çene)','405100','Cerrahi',10395);
SELECT _seed('Kist Operasyonu (Basit)','405110','Cerrahi',11055);
SELECT _seed('Kist Operasyonu (Komplike)','405120','Cerrahi',16500);
SELECT _seed('Epulis Operasyonu','','Cerrahi',7150);
SELECT _seed('Osteomyelitis Operasyonu (Tek Çene Basit)','405130','Cerrahi',19250);
SELECT _seed('Çene Lüksasyonu','405140','Cerrahi',3795);
SELECT _seed('Frenektomi Operasyonu','406120','Cerrahi',7700);
SELECT _seed('Vestibüloplasti Plastiği (Yarım Çene)','405150','Cerrahi',20900);
SELECT _seed('Sinüs Plastiği','405160','Cerrahi',12650);
SELECT _seed('Sert Doku Greftleme','405170','Cerrahi',15950);
SELECT _seed('Yumuşak Doku Greftleme','405170','Cerrahi',13200);
SELECT _seed('Sinüs Lifting','','Cerrahi',14465);
SELECT _seed('Biyopsi','405180','Cerrahi',6380);
SELECT _seed('Fibrom Operasyonu','','Cerrahi',6645);
SELECT _seed('Apse Drenajı (Extraoral)','405190','Cerrahi',11165);
SELECT _seed('Apse Drenajı (İntraoral)','405190','Cerrahi',8790);
SELECT _seed('Kapişon İzalesi','','Cerrahi',3640);
SELECT _seed('Stomatit Tedavisi','','Cerrahi',2395);
SELECT _seed('Fizik Tedavisi (İnfraruj Seansı)','405200','Cerrahi',2105);
SELECT _seed('Alveolit Pansümanı (Seans)','','Cerrahi',1305);
SELECT _seed('Tek Köklü Dişte Ototransplantasyon','405220','Cerrahi',17050);
SELECT _seed('Çok Köklü Dişte Ototransplantasyon','405220','Cerrahi',17050);
SELECT _seed('Supperiostal İmplant','405230','Cerrahi',40115);
SELECT _seed('Torus Operasyonu (Yarım Çene)','405270','Cerrahi',10780);
SELECT _seed('Odontogenik Tümör Operasyonu (Küçük)','405280','Cerrahi',20350);
SELECT _seed('Odontogenik Tümör Operasyonu (Büyük)','405290','Cerrahi',26950);
SELECT _seed('Nevralji Tedavisi (Alkol Enjeksiyonu)','405300','Cerrahi',3850);
SELECT _seed('Nöroktomi','','Cerrahi',10450);
SELECT _seed('Tükürük Bezi Taş Çıkarma (Basit)','','Cerrahi',7975);
SELECT _seed('Tükürük Bezi Taş Çıkarma (Komplike)','','Cerrahi',12650);
SELECT _seed('Gömük Diş Üzerinin Açılması (Ortodontik)','405380','Cerrahi',10450);
SELECT _seed('T.M.E. Mekonoterapi','405390','Cerrahi',3575);
SELECT _seed('T.M.E. İçi Enjeksiyon (Tek Taraflı)','405400','Cerrahi',7150);
SELECT _seed('Artrosentez (Tek Taraflı)','405410','Cerrahi',4915);
SELECT _seed('Genioplasti','602780','Cerrahi',82500);
SELECT _seed('Botoks Uygulama','','Cerrahi',11550);
SELECT _seed('Ankraj Amaçlı Plak Yerleştirme','','Cerrahi',11220);
SELECT _seed('Ankraj Amaçlı Plak Çıkarma','','Cerrahi',6600);
SELECT _seed('Zigoma İmplant','','Cerrahi',49500);
SELECT _seed('Koronektomi','','Cerrahi',10450);

-- TEDAVİ & ENDODONTİ (Kanal)
SELECT _seed('Kanal Tedavisi - Tek Kanal','402150','Tedavi & Endodonti',4610);
SELECT _seed('Kanal Tedavisi - İki Kanal','402152','Tedavi & Endodonti',7220);
SELECT _seed('Kanal Tedavisi - Üç Kanal','402153','Tedavi & Endodonti',10350);
SELECT _seed('Periapikal Lezyonlu Kanal Tedavisi - Tek Kanal','402271','Tedavi & Endodonti',5055);
SELECT _seed('Periapikal Lezyonlu Kanal Tedavisi - İki Kanal','402272','Tedavi & Endodonti',7700);
SELECT _seed('Periapikal Lezyonlu Kanal Tedavisi - Üç Kanal','402273','Tedavi & Endodonti',10980);
SELECT _seed('Pansüman (Seans Başı)','','Tedavi & Endodonti',640);
SELECT _seed('Ekstirpasyon (Her Kanal)','402300','Tedavi & Endodonti',2010);
SELECT _seed('Kanal Tedavisi - İlave Her Kanal','402154','Tedavi & Endodonti',2500);
SELECT _seed('Aşırı Kole Hassasiyeti (Tam Çene)','406110','Tedavi & Endodonti',3520);
SELECT _seed('Aşırı Kole Hassasiyeti (Tek Diş)','406110','Tedavi & Endodonti',1220);
SELECT _seed('Dolgu Tamiri','','Tedavi & Endodonti',2920);
SELECT _seed('Dolgu Sökümü (Tek Diş)','','Tedavi & Endodonti',1480);
SELECT _seed('Kanal Dolgusu Sökümü (Her Kanal)','','Tedavi & Endodonti',1740);
SELECT _seed('Retreatment (Her Kanal)','','Tedavi & Endodonti',4510);
SELECT _seed('Kanaldan Kırılmış Materyal Çıkartılması','','Tedavi & Endodonti',6875);
SELECT _seed('Kanalda Perforasyon Tamiri (MTA)','','Tedavi & Endodonti',3280);
SELECT _seed('Endokron','','Tedavi & Endodonti',13750);
SELECT _seed('Kanal Pansümanı (Seans Başı)','','Tedavi & Endodonti',1205);
SELECT _seed('Rubber-Dam Uygulaması','','Tedavi & Endodonti',1155);
SELECT _seed('Retreatment Çok Köklü (1-3 Kanal)','','Tedavi & Endodonti',17500);

-- TEDAVİ & ENDODONTİ (Dolgu / Restoratif)
SELECT _seed('Amalgam Dolgu - Bir Yüzlü (O)','402010','Tedavi & Endodonti',2845);
SELECT _seed('Amalgam Dolgu - Bir Yüzlü (COLE)','402160','Tedavi & Endodonti',2845);
SELECT _seed('Amalgam Dolgu - İki Yüzlü (OD)','402020','Tedavi & Endodonti',3805);
SELECT _seed('Amalgam Dolgu - İki Yüzlü (OM)','402020','Tedavi & Endodonti',3805);
SELECT _seed('Amalgam Dolgu - Üç Yüzlü (MOD)','402030','Tedavi & Endodonti',4845);
SELECT _seed('İnley Dolgu - Bir Yüzlü (O)','402040','Tedavi & Endodonti',6285);
SELECT _seed('İnley Dolgu - Bir Yüzlü (COLE)','402040','Tedavi & Endodonti',6285);
SELECT _seed('İnley Dolgu - İki Yüzlü (OD)','402050','Tedavi & Endodonti',6490);
SELECT _seed('İnley Dolgu - İki Yüzlü (OM)','402050','Tedavi & Endodonti',6490);
SELECT _seed('İnley Dolgu - Üç Yüzlü (MOD)','402060','Tedavi & Endodonti',6770);
SELECT _seed('Kompozit Dolgu - Bir Yüzlü (O)','402100','Tedavi & Endodonti',3375);
SELECT _seed('Kompozit Dolgu - Bir Yüzlü (COLE)','402180','Tedavi & Endodonti',2720);
SELECT _seed('Kompozit Dolgu - İki Yüzlü (OD)','402110','Tedavi & Endodonti',4235);
SELECT _seed('Kompozit Dolgu - İki Yüzlü (OM)','402110','Tedavi & Endodonti',4235);
SELECT _seed('Kompozit Dolgu - Üç Yüzlü (MOD)','402120','Tedavi & Endodonti',5300);
SELECT _seed('Kompozit İnley - Bir Yüzlü (O)','402100','Tedavi & Endodonti',6050);
SELECT _seed('Kompozit İnley - İki Yüzlü (OD)','402110','Tedavi & Endodonti',6050);
SELECT _seed('Kompozit İnley - Üç Yüzlü (MOD)','402120','Tedavi & Endodonti',6050);
SELECT _seed('Seramik İnley - Bir Yüzlü (O)','402040','Tedavi & Endodonti',15620);
SELECT _seed('Seramik İnley - Bir Yüzlü (COLE)','402040','Tedavi & Endodonti',15620);
SELECT _seed('Seramik İnley - İki Yüzlü (OD)','402050','Tedavi & Endodonti',15620);
SELECT _seed('Seramik İnley - İki Yüzlü (OM)','402050','Tedavi & Endodonti',15620);
SELECT _seed('Seramik İnley - Üç Yüzlü (MOD)','402060','Tedavi & Endodonti',15620);
SELECT _seed('Cam İonomer Dolgu - O','402190','Tedavi & Endodonti',2675);
SELECT _seed('Cam İonomer Dolgu - COLE','402170','Tedavi & Endodonti',2115);
SELECT _seed('Cam İonomer Dolgu - OD','402190','Tedavi & Endodonti',2675);
SELECT _seed('Cam İonomer Dolgu - OM','402190','Tedavi & Endodonti',2675);
SELECT _seed('Cam İonomer Dolgu - MOD','402190','Tedavi & Endodonti',2675);
SELECT _seed('Kuafaj (Dolgu Hariç)','402130','Tedavi & Endodonti',440);
SELECT _seed('Diş Ağartma - Devital Tek Diş','','Tedavi & Endodonti',2475);
SELECT _seed('Diş Ağartma - Tek Çene','','Tedavi & Endodonti',11935);
SELECT _seed('Diş Ağartma - Vital Tek Diş','','Tedavi & Endodonti',2145);
SELECT _seed('Direkt Kompozit Veneer Restorasyon','402340','Tedavi & Endodonti',9295);
SELECT _seed('Kanal İçi Hazır Post Uygulaması','402240','Tedavi & Endodonti',3075);
SELECT _seed('Kanal İçi Fiber Post Uygulaması','402240','Tedavi & Endodonti',4950);
SELECT _seed('Dentin Pimi Uygulaması (Her Pim) - D','402200','Tedavi & Endodonti',555);
SELECT _seed('Dentin Pimi Uygulaması (Her Pim) - M','402200','Tedavi & Endodonti',555);
SELECT _seed('Onley','402320','Tedavi & Endodonti',7780);
SELECT _seed('Onley (Seramik)','402320','Tedavi & Endodonti',15620);
SELECT _seed('Pinley','','Tedavi & Endodonti',7865);
SELECT _seed('Laminate Veneer (Kompozit)','404390','Tedavi & Endodonti',9295);

-- TEŞHİS VE PLANLAMA
SELECT _seed('Dişhekimi Muayenesi','401010','Teşhis ve Planlama',1650);
SELECT _seed('Uzman Dişhekimi Muayenesi','401010','Teşhis ve Planlama',2035);
SELECT _seed('Diş Röntgen Filmi (Periapikal)','401051','Teşhis ve Planlama',830);
SELECT _seed('Oklüzal Film','401060','Teşhis ve Planlama',865);
SELECT _seed('Bite-Wing Radyografi','401150','Teşhis ve Planlama',830);
SELECT _seed('Ekstra Oral Röntgen Filmi','401070','Teşhis ve Planlama',955);
SELECT _seed('Panoramik Film','401080','Teşhis ve Planlama',2040);
SELECT _seed('Lateral Sefalometrik Film','401090','Teşhis ve Planlama',2050);
SELECT _seed('Antero-Posterior Sefalometrik Film','401100','Teşhis ve Planlama',2030);
SELECT _seed('El Bilek Filmi','401110','Teşhis ve Planlama',2030);
SELECT _seed('T.M.E. Filmi ve Tetkiki','401120','Teşhis ve Planlama',2670);
SELECT _seed('Siyalografi','401130','Teşhis ve Planlama',2310);
SELECT _seed('Oral Hijyen Eğitimi','','Teşhis ve Planlama',1175);
SELECT _seed('Vitalite Kontrolü (Diş Başına)','','Teşhis ve Planlama',235);
SELECT _seed('Lokal Anestezi (İnfiltratif)','405420','Teşhis ve Planlama',370);
SELECT _seed('Lokal Anestezi (Rejyonal)','405430','Teşhis ve Planlama',370);
SELECT _seed('Radyo Vizyografi (RVG)','','Teşhis ve Planlama',990);
SELECT _seed('Konsültasyon','401030','Teşhis ve Planlama',1110);
SELECT _seed('Uzman Diş Hekimi Konsültasyonu','401030','Teşhis ve Planlama',1445);
SELECT _seed('BT (Tek Çene)','401170','Teşhis ve Planlama',4400);
SELECT _seed('BT (Bölgesel)','401170','Teşhis ve Planlama',2750);
SELECT _seed('BT (İki Çene)','401170','Teşhis ve Planlama',5940);
SELECT _seed('Bilgisayarlı Eklem Tomografisi','','Teşhis ve Planlama',6660);
SELECT _seed('Ağız İçi Dijital Tarama','','Teşhis ve Planlama',2750);
SELECT _seed('Bilinçli Sedasyon','403110','Teşhis ve Planlama',1225);
SELECT _seed('Teşhis ve Tedavi Planlaması','','Teşhis ve Planlama',1535);
SELECT _seed('Kontrol Hekim Muayenesi','401010','Teşhis ve Planlama',1430);

-- ORTODONTİ
SELECT _seed('Düz Ark Teli Tatbiki (NİTİ - Tek Çene)','407260','Ortodonti',2255);
SELECT _seed('Bant Tatbiki (Tek Diş)','407270','Ortodonti',2255);
SELECT _seed('Braket Tatbiki (Tek Diş)','407270','Ortodonti',1925);
SELECT _seed('Bant veya Braket Çıkarılması (Tek Diş)','','Ortodonti',785);
SELECT _seed('Lateral Sefalometrik Film Analizi','407010','Ortodonti',1675);
SELECT _seed('Bilgisayarlı Sefalometrik Film Analizi','407030','Ortodonti',2820);
SELECT _seed('Antero Posterior Sefalometrik Film Analizi','407020','Ortodonti',1870);
SELECT _seed('Kemik Yaşı Tayini','407060','Ortodonti',645);
SELECT _seed('Ortodontik Fotoğraf','407070','Ortodonti',990);
SELECT _seed('Ortodontik Model Yapımı','407090','Ortodonti',1210);
SELECT _seed('Ortodontik Model Analizi','407100','Ortodonti',1480);
SELECT _seed('Angle Sınıf I Ortodontik Tedavisi','407110','Ortodonti',40910);
SELECT _seed('Angle Sınıf II Ortodontik Tedavisi','407120','Ortodonti',51395);
SELECT _seed('Angle Sınıf III Ortodontik Tedavisi','407130','Ortodonti',62675);
SELECT _seed('Açık Kapanış Ortodontik Tedavisi','407320','Ortodonti',61030);
SELECT _seed('Önleyici Ortodontik Tedavi','407150','Ortodonti',26125);
SELECT _seed('Kısa Süreli Ortodontik Tedavi','407140','Ortodonti',23290);
SELECT _seed('Pekiştirme Tedavisi','407160','Ortodonti',9295);
SELECT _seed('Pekiştirme Aygıtı (Hawley)','407170','Ortodonti',6765);
SELECT _seed('Sabit Pekiştirme Aygıtı (Lingual Retainer)','407180','Ortodonti',9625);
SELECT _seed('Tek Çene Aparey Yapımı','407190','Ortodonti',7535);
SELECT _seed('Çift Çene Aparey Yapımı (Aktivatör)','407200','Ortodonti',12265);
SELECT _seed('Hızlı Maksiller Genişletme Apareyi','407250','Ortodonti',13750);
SELECT _seed('Reverse Headgear','407210','Ortodonti',19635);
SELECT _seed('Ağız Dışı Aparey (Headgear-Chincap)','407220','Ortodonti',6875);
SELECT _seed('Lingual Braket Tatbiki (Tek Diş)','407270','Ortodonti',1925);
SELECT _seed('Lingual Ark','','Ortodonti',7425);
SELECT _seed('Nance Apareyi','','Ortodonti',11275);
SELECT _seed('Aparey Tamiri','407240','Ortodonti',3025);
SELECT _seed('Oklüzal Cerrahi Splint (Tek Çene)','407290','Ortodonti',12150);
SELECT _seed('Ortodontik Ameliyat Arkı (Tek Çene)','407300','Ortodonti',21080);
SELECT _seed('Şeffaf Plaklar Ortodontik Tedavi (Hafif)','','Ortodonti',53900);
SELECT _seed('Şeffaf Plaklar Ortodontik Tedavi (Orta)','','Ortodonti',69300);
SELECT _seed('Şeffaf Plaklar Ortodontik Tedavi (Ağır)','','Ortodonti',95700);
SELECT _seed('Mini Vida Uygulaması','','Ortodonti',4950);
SELECT _seed('İnterproksimal Aşındırma (Tek Diş)','','Ortodonti',1265);
SELECT _seed('Ağız İçi Koruyucu Aparey','','Ortodonti',11000);

-- PEDODONTİ
SELECT _seed('Amputasyon - VİTAL','402140','Pedodonti',3850);
SELECT _seed('Amputasyon - MORTAL','402140','Pedodonti',3850);
SELECT _seed('Süt Dişi Kanal Tedavisi','402150','Pedodonti',6765);
SELECT _seed('Fissür Örtülmesi (Sealant)','403010','Pedodonti',1445);
SELECT _seed('Yüzeysel Flor Uygulaması (Yarım Çene)','403020','Pedodonti',1375);
SELECT _seed('Prefabrike Kron','403030','Pedodonti',3810);
SELECT _seed('Yer Tutucu (Sabit)','403040','Pedodonti',7480);
SELECT _seed('Yer Tutucu (Hareketli)','403050','Pedodonti',10010);
SELECT _seed('Çocuk Protezi (Akrilik - Bölümlü - Tek Çene)','403060','Pedodonti',15050);
SELECT _seed('Çocuk Protezi (Akrilik - Tam - Tek Çene)','403070','Pedodonti',16995);
SELECT _seed('Strip Kron','403080','Pedodonti',3575);
SELECT _seed('Kompomer Dolgu','403090','Pedodonti',4180);
SELECT _seed('Açık Apeksli Dişte Kanal Tedavisi (Her Kanal)','403100','Pedodonti',12780);
SELECT _seed('Açık Apeksli Dişte Apikal Bariyer','','Pedodonti',5830);
SELECT _seed('Travma Splinti','','Pedodonti',8195);
SELECT _seed('Aşındırma ile Sürme Rehberliği (Seans)','','Pedodonti',1640);
SELECT _seed('Rezin İnfilitrasyonu Tedavisi','','Pedodonti',7150);

-- PERİODONTOLOJİ
SELECT _seed('Subgingival Küretaj (Tek Diş)','406030','Periodontoloji',1870);
SELECT _seed('Hemiseksiyon (Kök Amputasyonu)','406060','Periodontoloji',3845);
SELECT _seed('Periodontal Apse Tedavisi','406010','Periodontoloji',3455);
SELECT _seed('Detertraj (Diş Taşı Temizliği - Tek Çene)','406021','Periodontoloji',3300);
SELECT _seed('Subgingival İlaç Uygulaması','','Periodontoloji',330);
SELECT _seed('Gingivoplasti (Tek Diş)','406130','Periodontoloji',3135);
SELECT _seed('Gingivektomi (Tek Diş)','406040','Periodontoloji',3245);
SELECT _seed('Flap Operasyonu (Tek Diş)','406050','Periodontoloji',5225);
SELECT _seed('Tunnel Operasyonu (Tek Diş)','406150','Periodontoloji',4445);
SELECT _seed('Serbest Diş Eti Grefti','406070','Periodontoloji',5380);
SELECT _seed('Saplı Yumuşak Doku Grefti','406080','Periodontoloji',4250);
SELECT _seed('Periodontal Şine (Daimi)','406100','Periodontoloji',6370);
SELECT _seed('Periodontal Şine (Geçici)','406090','Periodontoloji',8070);
SELECT _seed('Periodontal Şine (Geçici - Yarım Çene)','406090','Periodontoloji',3690);
SELECT _seed('Biyomateryal Uygulaması (Tek Diş)','406140','Periodontoloji',1375);
SELECT _seed('Membran Uygulaması (Tek Diş)','406160','Periodontoloji',1360);
SELECT _seed('Vestibül Plak (Diş Eti Protezi)','','Periodontoloji',9020);
SELECT _seed('Subepitelyal Bağ Dokusu Grefti','406170','Periodontoloji',14850);
SELECT _seed('Peri-İmplantitis Cerrahi (Tek İmplant)','','Periodontoloji',6875);
SELECT _seed('Peri-İmplantitis Cerrahi Olmayan (Tek İmplant)','','Periodontoloji',1185);
SELECT _seed('Papil Oluşturma Cerrahi (Tek Papil)','','Periodontoloji',2910);
SELECT _seed('Fiberotomi','','Periodontoloji',2750);

-- PROTEZ
SELECT _seed('Tam Protez (Akrilik - Tek Çene)','404010','Protez',31900);
SELECT _seed('Bölümlü Protez (Akrilik - Tek Çene)','404020','Protez',30690);
SELECT _seed('Tam Protez (Metal - Tek Çene)','404030','Protez',39600);
SELECT _seed('İmplant Üstü Tam Protez','404410','Protez',38745);
SELECT _seed('Bölümlü Protez (Metal - Tek Çene)','404040','Protez',38500);
SELECT _seed('İmplant Üstü Bölümlü Protez','404420','Protez',39260);
SELECT _seed('Hassas Tutuculu Protez (Tek Çene)','404360','Protez',40150);
SELECT _seed('İmplant Destekli Hareketli Protez (Tek Çene)','404370','Protez',40700);
SELECT _seed('Geçici (İmmediat) Protez (Akrilik - Tek Çene)','404050','Protez',22285);
SELECT _seed('Diş İlavesi (Tek Diş)','404120','Protez',4180);
SELECT _seed('Roach Köprü','404230','Protez',7645);
SELECT _seed('Pinley ve Çeşitleri','404160','Protez',8740);
SELECT _seed('Tek Parça Döküm Kuron','404170','Protez',7735);
SELECT _seed('Veneer Kuron (Akrilik)','404180','Protez',11220);
SELECT _seed('Veneer Kuron (Seramik)','404181','Protez',12100);
SELECT _seed('İmplant Üstü Veneer Kuron (Seramik)','404181','Protez',13680);
SELECT _seed('Laminate Veneer Kuron (Akrilik)','404390','Protez',10785);
SELECT _seed('Laminate Veneer Kuron (Seramik)','404390','Protez',26400);
SELECT _seed('Jaket Kuron (Akrilik)','404200','Protez',7480);
SELECT _seed('Jaket Kuron (Seramik)','404201','Protez',7320);
SELECT _seed('Tam Seramik Kuron (Metal Desteksiz)','404201','Protez',21450);
SELECT _seed('Tam Seramik Kuron (Metal)','404201','Protez',27595);
SELECT _seed('Teleskop Kuron (Koping)','404210','Protez',9895);
SELECT _seed('Döküm Post Core (Kuron Hariç)','404190','Protez',6860);
SELECT _seed('Adeziv Köprü (Maryland vb)','404220','Protez',11550);
SELECT _seed('Kuron Sökümü (Tek Sabit Üye)','404250','Protez',1875);
SELECT _seed('Diş Üstü Protezi (Overdenture - Tek Çene)','404280','Protez',26055);
SELECT _seed('Zirkonyum Kuron','404395','Protez',13750);
SELECT _seed('Besleme (Tek Çene)','404080','Protez',11965);
SELECT _seed('Kaide Yenileme (Rebazaj - Tek Çene)','404060','Protez',12430);
SELECT _seed('Proteze Yumuşak Akrilik Uygulaması (Geçici)','404070','Protez',8070);
SELECT _seed('Proteze Yumuşak Akrilik Uygulaması (Daimi)','404070','Protez',12610);
SELECT _seed('Tamir (Akrilik Protezler)','404090','Protez',3805);
SELECT _seed('Kroşe İlavesi','404100','Protez',4290);
SELECT _seed('Metal İskelet Tamiri','404110','Protez',4180);
SELECT _seed('Gece Plağı (Yumuşak)','404150','Protez',5885);
SELECT _seed('Gece Plağı (Sert - Oklüzal Splintleme)','407290','Protez',20240);
SELECT _seed('Geçici Kuron (Tek Diş)','404240','Protez',2245);
SELECT _seed('Düşmüş Kuron ve Köprü Simantasyonu','404260','Protez',1225);
SELECT _seed('Kuron Köprü Tamiri (Her Üye)','404270','Protez',5005);
SELECT _seed('Oklüzal Aşındırmalar (Tek Çene)','404140','Protez',6820);
SELECT _seed('T.M.E. Stabilizasyon Splinti','','Protez',19800);
SELECT _seed('İmplant Rehberi (Yarım Çene)','','Protez',9735);
SELECT _seed('İmplant Rehberi (Tam Çene)','','Protez',14300);

-- Fonksiyonu temizle
DROP FUNCTION IF EXISTS _seed(TEXT,TEXT,TEXT,NUMERIC);

-- Ozet
SELECT category, COUNT(*) as adet FROM master_treatments GROUP BY category ORDER BY category;
'@

# Turkce karakterleri PostgreSQL U& unicode escape'e donustur -> encoding bagimsiz calisir
function ConvertTo-PgUnicode([string]$s) {
    # String replace - cift tirnak string olarak tanimlayarak overload sorununu onle
    $s = $s -creplace [regex]::Escape([System.Text.Encoding]::UTF8.GetString([byte[]](0xC5,0x9F))), '\015F'
    $s = $s -creplace [regex]::Escape([System.Text.Encoding]::UTF8.GetString([byte[]](0xC5,0x9E))), '\015E'
    $s = $s -creplace [regex]::Escape([System.Text.Encoding]::UTF8.GetString([byte[]](0xC3,0xA7))), '\00E7'
    $s = $s -creplace [regex]::Escape([System.Text.Encoding]::UTF8.GetString([byte[]](0xC3,0x87))), '\00C7'
    $s = $s -creplace [regex]::Escape([System.Text.Encoding]::UTF8.GetString([byte[]](0xC4,0x9F))), '\011F'
    $s = $s -creplace [regex]::Escape([System.Text.Encoding]::UTF8.GetString([byte[]](0xC4,0x9E))), '\011E'
    $s = $s -creplace [regex]::Escape([System.Text.Encoding]::UTF8.GetString([byte[]](0xC4,0xB1))), '\0131'
    $s = $s -creplace [regex]::Escape([System.Text.Encoding]::UTF8.GetString([byte[]](0xC4,0xB0))), '\0130'
    $s = $s -creplace [regex]::Escape([System.Text.Encoding]::UTF8.GetString([byte[]](0xC3,0xB6))), '\00F6'
    $s = $s -creplace [regex]::Escape([System.Text.Encoding]::UTF8.GetString([byte[]](0xC3,0x96))), '\00D6'
    $s = $s -creplace [regex]::Escape([System.Text.Encoding]::UTF8.GetString([byte[]](0xC3,0xBC))), '\00FC'
    $s = $s -creplace [regex]::Escape([System.Text.Encoding]::UTF8.GetString([byte[]](0xC3,0x9C))), '\00DC'
    # U& prefix ekle: 'metin\XXXX...' -> U&'metin\XXXX...'
    $s = [System.Text.RegularExpressions.Regex]::Replace(
        $s, "'([^']*\\[0-9A-Fa-f]{4}[^']*)'", "U&'`$1'")
    return $s
}

$sql = ConvertTo-PgUnicode ($sqlTemplate.Replace('CLINIC_ID', $clinicId))

# Pure ASCII olarak yaz (encoding tamamen sorunsuz)
$tmpPath = "$env:TEMP\pulpax_seed_$([System.Guid]::NewGuid().ToString('N').Substring(0,8)).sql"
$ascii = New-Object System.Text.ASCIIEncoding
[System.IO.File]::WriteAllText($tmpPath, $sql, $ascii)
Write-Host "  SQL dosyasi olusturuldu (ASCII/U-escape): $tmpPath" -ForegroundColor Gray

# 3. Docker container'a kopyala ve calistir
Write-Host "`n[3/3] Docker uzerinden DB'ye yaziliyor..." -ForegroundColor Yellow

docker cp $tmpPath "${PgContainer}:/tmp/pulpax_seed.sql"
if ($LASTEXITCODE -ne 0) {
  Write-Host "HATA: docker cp basarisiz! Container calisiyor mu? ($PgContainer)" -ForegroundColor Red
  Remove-Item $tmpPath -ErrorAction SilentlyContinue
  exit 1
}

# bash -c ile env degiskenini set edip psql calistir (Windows'ta -e flag calismayabiliyor)
docker exec $PgContainer bash -c "PGCLIENTENCODING=UTF8 psql -U $PgUser -d $TenantDB -f /tmp/pulpax_seed.sql"
$exitCode = $LASTEXITCODE

# Temizlik
Remove-Item $tmpPath -ErrorAction SilentlyContinue
docker exec $PgContainer rm -f /tmp/pulpax_seed.sql 2>$null

if ($exitCode -ne 0) {
  Write-Host "HATA: SQL calistirma basarisiz! Yukaridaki hata mesajina bakin." -ForegroundColor Red
  exit 1
}

Write-Host "`n=== TAMAMLANDI ===" -ForegroundColor Green
Write-Host "Tedaviler DB'ye basariyla yazildi!" -ForegroundColor Cyan
Write-Host "Pulpax 'Tedaviler' sayfasini yenileyin." -ForegroundColor White
