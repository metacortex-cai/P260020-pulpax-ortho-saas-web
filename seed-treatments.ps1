# DrDentes → Pulpax Tedavi Seed Script
# Kullanım: .\seed-treatments.ps1 -Token "JWT_TOKEN" -BaseUrl "http://localhost:3001/api/v1" -ClinicId "CLINIC_UUID"

param(
  [string]$Token    = "",
  [string]$BaseUrl  = "https://localhost:7010/api/v1",
  [string]$ClinicId = ""
)

# Self-signed cert için TLS hatalarını yoksay
if ($PSVersionTable.PSVersion.Major -ge 6) {
  # PowerShell 6+ - SkipCertificateCheck parametresini kullan
  $Global:SkipCert = $true
} else {
  Add-Type @"
    using System.Net; using System.Security.Cryptography.X509Certificates;
    public class TrustAll : ICertificatePolicy {
      public bool CheckValidationResult(ServicePoint s, X509Certificate c, WebRequest r, int p) { return true; }
    }
"@
  [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAll
}

# Token ve ClinicId yoksa .env veya kullanıcıdan al
if (-not $Token) {
  $Token    = Read-Host "JWT Token girin"
}
if (-not $ClinicId) {
  $ClinicId = Read-Host "X-Tenant-ID (Klinik UUID) girin"
}

$headers = @{
  "Authorization" = "Bearer $Token"
  "Content-Type"  = "application/json"
  "X-Tenant-ID"   = $ClinicId
}

# ── TÜM DRDENTES TEDAVİLERİ ──────────────────────────────────────────────────
$treatments = @(
  # Cerrahi
  @{ name="Diş Çekimi"; sutCode="405010"; category="Cerrahi"; price=2475 },
  @{ name="Komplikasyonlu Diş Çekimi"; sutCode="405020"; category="Cerrahi"; price=4950 },
  @{ name="Gömülü Diş Operasyonu"; sutCode="405030"; category="Cerrahi"; price=7975 },
  @{ name="Gömülü Diş Operasyonu (Kemik Retansiyonlu)"; sutCode="405040"; category="Cerrahi"; price=11715 },
  @{ name="Tek Kökte Kök Ucu Rezeksiyonu (Kanal Tedavisi Ve Dolgu Hariç)"; sutCode="405060"; category="Cerrahi"; price=10450 },
  @{ name="İki Kökte Kök Ucu Rezeksiyonu (Kanal Tedavisi Ve Dolgu Hariç)"; sutCode="405060"; category="Cerrahi"; price=12925 },
  @{ name="Üç Kökte Kök Ucu Rezeksiyonu (Kanal Tedavisi Ve Dolgu Hariç)"; sutCode="405060"; category="Cerrahi"; price=15125 },
  @{ name="Çene Kırığı (Basit)"; sutCode="601060"; category="Cerrahi"; price=22550 },
  @{ name="Çene Kırığı (Komplike - Materyal Ücreti Hariç)"; sutCode="601060"; category="Cerrahi"; price=63800 },
  @{ name="Tek Köklü Dişte Reimplantasyon"; sutCode="405210"; category="Cerrahi"; price=11550 },
  @{ name="Çok Köklü Dişte Reimplantasyon"; sutCode="405210"; category="Cerrahi"; price=11550 },
  @{ name="Kemik İçi İmplant (Tek Silindirik - İmplant Ücreti Hariç)"; sutCode="405260"; category="Cerrahi"; price=22440 },
  @{ name="Kemik İçi İmplant (Blade - İmplant Ücreti Hariç)"; sutCode="405260"; category="Cerrahi"; price=22440 },
  @{ name="İmplant Çıkartılması"; sutCode="611340"; category="Cerrahi"; price=10450 },
  @{ name="Alveolit Cerrahi Tedavisi"; sutCode="405070"; category="Cerrahi"; price=7455 },
  @{ name="Kanama Müdahalesi (Basit)"; sutCode="405080"; category="Cerrahi"; price=2560 },
  @{ name="Kanama Müdahalesi (Dikişli)"; sutCode="405080"; category="Cerrahi"; price=4755 },
  @{ name="Alveol Plastiği (Yarım Çene)"; sutCode="405090"; category="Cerrahi"; price=10395 },
  @{ name="Alveol Düzeltilmesi (Yarım Çene)"; sutCode="405100"; category="Cerrahi"; price=10395 },
  @{ name="Kist Operasyonu (Basit)"; sutCode="405110"; category="Cerrahi"; price=11055 },
  @{ name="Kist Operasyonu (Komplike)"; sutCode="405120"; category="Cerrahi"; price=16500 },
  @{ name="Epulis Operasyonu"; sutCode=""; category="Cerrahi"; price=7150 },
  @{ name="Osteomyelitis veya Osteitis Operasyonu (Tek Çene Basit)"; sutCode="405130"; category="Cerrahi"; price=19250 },
  @{ name="Çene Lüksasyonu"; sutCode="405140"; category="Cerrahi"; price=3795 },
  @{ name="Frenektomi Operasyonu"; sutCode="406120"; category="Cerrahi"; price=7700 },
  @{ name="Vestibüloplasti Plastiği (Yarım Çene)"; sutCode="405150"; category="Cerrahi"; price=20900 },
  @{ name="Sinüs Plastiği"; sutCode="405160"; category="Cerrahi"; price=12650 },
  @{ name="Sert Doku Greftleme (Greft Ücreti Hariç)"; sutCode="405170"; category="Cerrahi"; price=15950 },
  @{ name="Yumuşak Doku Greftleme (Greft Ücreti Hariç)"; sutCode="405170"; category="Cerrahi"; price=13200 },
  @{ name="Sinüs Lifting (Biomateryal Ücreti Hariç)"; sutCode=""; category="Cerrahi"; price=14465 },
  @{ name="Biyopsi"; sutCode="405180"; category="Cerrahi"; price=6380 },
  @{ name="Fibrom Operasyonu"; sutCode=""; category="Cerrahi"; price=6645 },
  @{ name="Apse Drenajı ve Tedavisi (Extraoral)"; sutCode="405190"; category="Cerrahi"; price=11165 },
  @{ name="Apse Drenajı ve Tedavisi (İntraoral)"; sutCode="405190"; category="Cerrahi"; price=8790 },
  @{ name="Kapişon İzalesi veya İmplant Üstü Açılması"; sutCode=""; category="Cerrahi"; price=3640 },
  @{ name="Stomatit Tedavisi"; sutCode=""; category="Cerrahi"; price=2395 },
  @{ name="Fizik Tedavisi (İnfraruj Seansı)"; sutCode="405200"; category="Cerrahi"; price=2105 },
  @{ name="Tek Köklü Dişte Ototransplantasyon"; sutCode="405220"; category="Cerrahi"; price=17050 },
  @{ name="Çok Köklü Dişte Ototransplantasyon"; sutCode="405220"; category="Cerrahi"; price=17050 },
  @{ name="Supperiostal İmplant (İmplant Ücreti Hariç)"; sutCode="405230"; category="Cerrahi"; price=40115 },
  @{ name="Torus Operasyonu (Yarım Çene)"; sutCode="405270"; category="Cerrahi"; price=10780 },
  @{ name="Odontogenik Tümör Operasyonu (Küçük)"; sutCode="405280"; category="Cerrahi"; price=20350 },
  @{ name="Odontogenik Tümör Operasyonu (Büyük)"; sutCode="405290"; category="Cerrahi"; price=26950 },
  @{ name="Nevralji Tedavisi (Alkol Enjeksiyonu)"; sutCode="405300"; category="Cerrahi"; price=3850 },
  @{ name="Nöroktomi (Nevralji Tedavisi Cerrahi)"; sutCode=""; category="Cerrahi"; price=10450 },
  @{ name="Tükürük Bezi Kanalından Taş Çıkarma (Basit)"; sutCode=""; category="Cerrahi"; price=7975 },
  @{ name="Tükürük Bezi Kanalından Taş Çıkarma (Komplike)"; sutCode=""; category="Cerrahi"; price=12650 },
  @{ name="Ortodontik Tedavi Amaçlı Gömük Dişlerin Üzerinin Açılması"; sutCode="405380"; category="Cerrahi"; price=10450 },
  @{ name="T.M.E. Mekonoterapi"; sutCode="405390"; category="Cerrahi"; price=3575 },
  @{ name="T.M.E. İçi Enjeksiyon (Tek Taraflı)"; sutCode="405400"; category="Cerrahi"; price=7150 },
  @{ name="Artrosentez (Tek Taraflı)"; sutCode="405410"; category="Cerrahi"; price=4915 },
  @{ name="Açık Eklem Cerrahisi (Tek Taraflı)"; sutCode=""; category="Cerrahi"; price=82500 },
  @{ name="Genioplasti"; sutCode="602780"; category="Cerrahi"; price=82500 },
  @{ name="Segmental Osteotomi"; sutCode=""; category="Cerrahi"; price=88000 },
  @{ name="Osteotomi (Tek Çene)"; sutCode=""; category="Cerrahi"; price=92400 },
  @{ name="Botoks Uygulama (İlaç Ücreti Hariç)"; sutCode=""; category="Cerrahi"; price=11550 },
  @{ name="Ankraj Amaçlı Plak Yerleştirme (Malzeme Ücreti Hariç)"; sutCode=""; category="Cerrahi"; price=11220 },
  @{ name="Ankraj Amaçlı Plak Çıkarma"; sutCode=""; category="Cerrahi"; price=6600 },
  @{ name="İyileşme Başlığı"; sutCode=""; category="Cerrahi"; price=0 },
  @{ name="Zigoma İmplant (İmplant Ücreti Hariç)"; sutCode=""; category="Cerrahi"; price=49500 },
  @{ name="Koronektomi"; sutCode=""; category="Cerrahi"; price=10450 },

  # Endodonti
  @{ name="Kanal Tedavisi - Tek Kanal (Dolgu Hariç)"; sutCode="402150"; category="Tedavi & Endodonti"; price=4610 },
  @{ name="Kanal Tedavisi - İki Kanal (Dolgu Hariç)"; sutCode="402152"; category="Tedavi & Endodonti"; price=7220 },
  @{ name="Kanal Tedavisi - Üç Kanal (Dolgu Hariç)"; sutCode="402153"; category="Tedavi & Endodonti"; price=10350 },
  @{ name="Periapikal Lezyonlu Dişte Kanal Tedavisi - Tek Kanal (Dolgu Hariç)"; sutCode="402271"; category="Tedavi & Endodonti"; price=5055 },
  @{ name="Periapikal Lezyonlu Dişte Kanal Tedavisi - İki Kanal (Dolgu Hariç)"; sutCode="402272"; category="Tedavi & Endodonti"; price=7700 },
  @{ name="Periapikal Lezyonlu Dişte Kanal Tedavisi - Üç Kanal (Dolgu Hariç)"; sutCode="402273"; category="Tedavi & Endodonti"; price=10980 },
  @{ name="Pansuman (Seans Başı)"; sutCode=""; category="Tedavi & Endodonti"; price=640 },
  @{ name="Ekstirpasyon (Her Kanal İçin)"; sutCode="402300"; category="Tedavi & Endodonti"; price=2010 },
  @{ name="Kanal Tedavisi - İlave Her Kanal İçin"; sutCode="402154"; category="Tedavi & Endodonti"; price=2500 },
  @{ name="Aşırı Kole Hassasiyeti Tedavisi (Tam Çene)"; sutCode="406110"; category="Tedavi & Endodonti"; price=3520 },
  @{ name="Aşırı Kole Hassasiyeti Tedavisi (Tek Diş)"; sutCode="406110"; category="Tedavi & Endodonti"; price=1220 },
  @{ name="Dolgu (Restorasyon) Tamiri"; sutCode=""; category="Tedavi & Endodonti"; price=2920 },
  @{ name="Dolgu Sökümü (Tek Diş)"; sutCode=""; category="Tedavi & Endodonti"; price=1480 },
  @{ name="Kanal Dolgusu Sökümü (Her Kanal İçin)"; sutCode=""; category="Tedavi & Endodonti"; price=1740 },
  @{ name="Kanal Dolgusu Tekrarı (Retreatment - Her Kanal İçin - Dolgu Hariç)"; sutCode=""; category="Tedavi & Endodonti"; price=4510 },
  @{ name="Kanaldan Kırılmış Materyal Çıkartılması"; sutCode=""; category="Tedavi & Endodonti"; price=6875 },
  @{ name="Kanalda Perforasyon Tamiri (MTA vb.)"; sutCode=""; category="Tedavi & Endodonti"; price=3280 },
  @{ name="Endokron"; sutCode=""; category="Tedavi & Endodonti"; price=13750 },
  @{ name="Kanal Pansumanı (Seans Başı)"; sutCode=""; category="Tedavi & Endodonti"; price=1205 },
  @{ name="Rubber-Dam Uygulaması"; sutCode=""; category="Tedavi & Endodonti"; price=1155 },
  @{ name="Kanal Dolgusu Tekrarı (Retreatment Çok Köklü 1,2,3)"; sutCode=""; category="Tedavi & Endodonti"; price=17500 },

  # Oral Diyagnoz
  @{ name="Dişhekimi Muayenesi"; sutCode="401010"; category="Teşhis ve Planlama"; price=1650 },
  @{ name="Uzman Dişhekimi Muayenesi"; sutCode="401010"; category="Teşhis ve Planlama"; price=2035 },
  @{ name="Diş Röntgen Filmi (Periapikal)"; sutCode="401051"; category="Teşhis ve Planlama"; price=830 },
  @{ name="Oklüzal Film"; sutCode="401060"; category="Teşhis ve Planlama"; price=865 },
  @{ name="Bite-Wing Radyografi"; sutCode="401150"; category="Teşhis ve Planlama"; price=830 },
  @{ name="Ekstra Oral Röntgen Filmi"; sutCode="401070"; category="Teşhis ve Planlama"; price=955 },
  @{ name="Panoramik Film"; sutCode="401080"; category="Teşhis ve Planlama"; price=2040 },
  @{ name="Lateral Sefalometrik Film"; sutCode="401090"; category="Teşhis ve Planlama"; price=2050 },
  @{ name="Antero-Posterior Sefalometrik Film"; sutCode="401100"; category="Teşhis ve Planlama"; price=2030 },
  @{ name="El Bilek Filmi"; sutCode="401110"; category="Teşhis ve Planlama"; price=2030 },
  @{ name="T.M.E. Filmi ve Tetkiki"; sutCode="401120"; category="Teşhis ve Planlama"; price=2670 },
  @{ name="Siyalografi"; sutCode="401130"; category="Teşhis ve Planlama"; price=2310 },
  @{ name="Oral Hijyen Eğitimi"; sutCode=""; category="Teşhis ve Planlama"; price=1175 },
  @{ name="Vitalite Kontrolü (Diş Başına)"; sutCode=""; category="Teşhis ve Planlama"; price=235 },
  @{ name="Lokal Anestezi (Enjeksiyon - İnfiltratif)"; sutCode="405420"; category="Teşhis ve Planlama"; price=370 },
  @{ name="Lokal Anestezi (Rejyonal)"; sutCode="405430"; category="Teşhis ve Planlama"; price=370 },
  @{ name="Radyo Vizyografi (RVG)"; sutCode=""; category="Teşhis ve Planlama"; price=990 },
  @{ name="Konsültasyon"; sutCode="401030"; category="Teşhis ve Planlama"; price=1110 },
  @{ name="Uzman Diş Hekimi Konsültasyonu"; sutCode="401030"; category="Teşhis ve Planlama"; price=1445 },
  @{ name="Bilgisayarlı Tomografi (Tek Çene)"; sutCode="401170"; category="Teşhis ve Planlama"; price=4400 },
  @{ name="Bilgisayarlı Tomografi (Bölgesel)"; sutCode="401170"; category="Teşhis ve Planlama"; price=2750 },
  @{ name="Bilgisayarlı Tomografi (İki Çene)"; sutCode="401170"; category="Teşhis ve Planlama"; price=5940 },
  @{ name="Bilgisayarlı Eklem Tomografisi (Çift Taraflı)"; sutCode=""; category="Teşhis ve Planlama"; price=6660 },
  @{ name="Bilgisayarlı Büyük TME Fonksiyon Testi"; sutCode="407040"; category="Teşhis ve Planlama"; price=13200 },
  @{ name="Bilgisayarlı Kas Tonus Analizi"; sutCode="407050"; category="Teşhis ve Planlama"; price=5995 },
  @{ name="Bilinçli Sedasyon"; sutCode="403110"; category="Teşhis ve Planlama"; price=1225 },
  @{ name="Teşhis ve Tedavi Planlaması"; sutCode=""; category="Teşhis ve Planlama"; price=1535 },
  @{ name="Kontrol Hekim Muayenesi"; sutCode="401010"; category="Teşhis ve Planlama"; price=1430 },
  @{ name="Tükürük Akış Hızı ve Tamponlama Kapasitesi Tayini"; sutCode=""; category="Teşhis ve Planlama"; price=1670 },
  @{ name="Tükürükte Mikrobiyolojik Analiz"; sutCode=""; category="Teşhis ve Planlama"; price=2805 },
  @{ name="Hipnoz"; sutCode=""; category="Teşhis ve Planlama"; price=1580 },
  @{ name="Gnatoloji, TME Kas Muayenesi (Oklüzyon Kontrolü)"; sutCode="404130"; category="Teşhis ve Planlama"; price=5280 },
  @{ name="Akupunktur Uygulama (Seans Başı)"; sutCode=""; category="Teşhis ve Planlama"; price=2750 },
  @{ name="Ağız İçi Dijital Tarama"; sutCode=""; category="Teşhis ve Planlama"; price=2750 },

  # Ortodonti
  @{ name="Düz Ark Teli Tatbiki (Tek Çene NİTİ Telleri)"; sutCode="407260"; category="Ortodonti"; price=2255 },
  @{ name="Ark Teli Çıkarılması"; sutCode=""; category="Ortodonti"; price=0 },
  @{ name="Bant Tatbiki (Tek Diş)"; sutCode="407270"; category="Ortodonti"; price=2255 },
  @{ name="Braket Tatbiki (Tek Diş)"; sutCode="407270"; category="Ortodonti"; price=1925 },
  @{ name="Bant veya Braket Çıkarılması (Tek Diş)"; sutCode=""; category="Ortodonti"; price=785 },
  @{ name="Lateral Sefalometrik Film Analizi"; sutCode="407010"; category="Ortodonti"; price=1675 },
  @{ name="Bilgisayarlı Sefalometrik Film Analizi"; sutCode="407030"; category="Ortodonti"; price=2820 },
  @{ name="Antero Posterior Sefalometrik Film Analizi"; sutCode="407020"; category="Ortodonti"; price=1870 },
  @{ name="Kemik Yaşı Tayini"; sutCode="407060"; category="Ortodonti"; price=645 },
  @{ name="Ortodontik Fotoğraf"; sutCode="407070"; category="Ortodonti"; price=990 },
  @{ name="Ortodontik Fotoğraf Tetkiki"; sutCode="407080"; category="Ortodonti"; price=605 },
  @{ name="Ortodontik Model Yapımı"; sutCode="407090"; category="Ortodonti"; price=1210 },
  @{ name="Ortodontik Model Analizi"; sutCode="407100"; category="Ortodonti"; price=1480 },
  @{ name="Ara Dönem Sefalometrik Film Analizi"; sutCode="407010"; category="Ortodonti"; price=990 },
  @{ name="Ara Dönem Model Yapımı"; sutCode="407090"; category="Ortodonti"; price=1875 },
  @{ name="Angle Sınıf I Anomalilerinin Ortodontik Tedavisi"; sutCode="407110"; category="Ortodonti"; price=40910 },
  @{ name="Angle Sınıf II Anomalilerinin Ortodontik Tedavisi"; sutCode="407120"; category="Ortodonti"; price=51395 },
  @{ name="Angle Sınıf III Anomalilerinin Ortodontik Tedavisi"; sutCode="407130"; category="Ortodonti"; price=62675 },
  @{ name="Sabit Kapanış Yükseltici Tatbiki (Kısa Süreli)"; sutCode=""; category="Ortodonti"; price=3410 },
  @{ name="Lingual Teknikle Sınıf I Ortodontik Tedavisi"; sutCode="407110"; category="Ortodonti"; price=41965 },
  @{ name="Lingual Teknikle Sınıf II Ortodontik Tedavisi"; sutCode="407120"; category="Ortodonti"; price=48400 },
  @{ name="Lingual Teknikle Sınıf III Ortodontik Tedavisi"; sutCode="407130"; category="Ortodonti"; price=57200 },
  @{ name="Açık Kapanışın Ortodontik Tedavisi"; sutCode="407320"; category="Ortodonti"; price=61030 },
  @{ name="Önleyici Ortodontik Tedavi"; sutCode="407150"; category="Ortodonti"; price=26125 },
  @{ name="Kısa Süreli Ortodontik Tedavi"; sutCode="407140"; category="Ortodonti"; price=23290 },
  @{ name="Pekiştirme Tedavisi"; sutCode="407160"; category="Ortodonti"; price=9295 },
  @{ name="Pekiştirme Aygıtı (Hawley Aygıtı vb)"; sutCode="407170"; category="Ortodonti"; price=6765 },
  @{ name="Sabit Pekiştirme Aygıtı (Lingual Retainer)"; sutCode="407180"; category="Ortodonti"; price=9625 },
  @{ name="Dudak Yastıkçığı (Lip Bumper)"; sutCode=""; category="Ortodonti"; price=10725 },
  @{ name="Tek Çeneyi İlgilendiren Aparey Yapımı (Vida Hariç)"; sutCode="407190"; category="Ortodonti"; price=7535 },
  @{ name="Çift Çeneyi İlgilendiren Aparey Yapımı (Aktivatör-Bionator)"; sutCode="407200"; category="Ortodonti"; price=12265 },
  @{ name="Vida Uygulaması (Tek Vida)"; sutCode=""; category="Ortodonti"; price=1965 },
  @{ name="Wilson Arkı Uygulaması"; sutCode=""; category="Ortodonti"; price=27500 },
  @{ name="Sabit Fonksiyonel Aygıt (Jasper-Jumper-Herbest)"; sutCode=""; category="Ortodonti"; price=20900 },
  @{ name="Kayıp Apareyin Yeniden Yapımı (Tek Çene)"; sutCode="407230"; category="Ortodonti"; price=6435 },
  @{ name="Aparey Tamiri"; sutCode="407240"; category="Ortodonti"; price=3025 },
  @{ name="Ağız Dışı Aparey Tatbiki (Headgear-Chincap)"; sutCode="407220"; category="Ortodonti"; price=6875 },
  @{ name="Reverse Headgear"; sutCode="407210"; category="Ortodonti"; price=19635 },
  @{ name="Büküm İçeren Tel Tatbiki (Tek Çene)"; sutCode=""; category="Ortodonti"; price=2475 },
  @{ name="Segmental Ark veya Tork Arkı Tatbiki"; sutCode=""; category="Ortodonti"; price=2090 },
  @{ name="Lingual Braket Tatbiki (Tek Diş)"; sutCode="407270"; category="Ortodonti"; price=1925 },
  @{ name="Düşen Bant Tatbiki (Tek Diş)"; sutCode="407310"; category="Ortodonti"; price=2255 },
  @{ name="Düşen Braket Tatbiki (Tek Diş)"; sutCode="407310"; category="Ortodonti"; price=1925 },
  @{ name="Lingual Ataçman Tatbiki"; sutCode=""; category="Ortodonti"; price=2090 },
  @{ name="Lingual Ark"; sutCode=""; category="Ortodonti"; price=7425 },
  @{ name="Nance Apareyi"; sutCode=""; category="Ortodonti"; price=11275 },
  @{ name="Hızlı Maksiller Genişletme Apareyi"; sutCode="407250"; category="Ortodonti"; price=13750 },
  @{ name="Preoperatif Dudak Damak Yarığı Ortodontik Tedavisi"; sutCode=""; category="Ortodonti"; price=33550 },
  @{ name="Postoperatif Dudak Damak Yarığı Ortodontik Tedavisi"; sutCode=""; category="Ortodonti"; price=14025 },
  @{ name="T.M.E. Splint Yapımı"; sutCode=""; category="Ortodonti"; price=13695 },
  @{ name="Model Set-Up"; sutCode=""; category="Ortodonti"; price=6435 },
  @{ name="Positioner Yapımı"; sutCode=""; category="Ortodonti"; price=15125 },
  @{ name="Sefalometrik Cerrahi Planı"; sutCode="407280"; category="Ortodonti"; price=3355 },
  @{ name="Ortodontik Modellerin Face-Bow ile Artikülatöre Taşınması"; sutCode=""; category="Ortodonti"; price=7150 },
  @{ name="Model Cerrahisi"; sutCode=""; category="Ortodonti"; price=4070 },
  @{ name="Oklüzal Cerrahi Splint (Tek Çene)"; sutCode="407290"; category="Ortodonti"; price=12150 },
  @{ name="Ortodontik Ameliyat Arkı (Tek Çene)"; sutCode="407300"; category="Ortodonti"; price=21080 },
  @{ name="Sürme Rehberliği"; sutCode=""; category="Ortodonti"; price=17765 },
  @{ name="Ağız İçi Distalizasyon Apareyi (Pendex vb.)"; sutCode=""; category="Ortodonti"; price=15895 },
  @{ name="Mini Vida Uygulaması"; sutCode=""; category="Ortodonti"; price=4950 },
  @{ name="İnterproksimal Aşındırma (Tek Diş)"; sutCode=""; category="Ortodonti"; price=1265 },
  @{ name="Gömülü Dişin Diş Dizisinde Yerine Yerleştirilmesi (Tek Diş)"; sutCode=""; category="Ortodonti"; price=21065 },
  @{ name="Reserve Curve'li Niti Ark Tatbiki"; sutCode="407260"; category="Ortodonti"; price=3575 },
  @{ name="Şeffaf Plaklar ile Ortodontik Tedavi (Hafif)"; sutCode=""; category="Ortodonti"; price=53900 },
  @{ name="Şeffaf Plaklar ile Ortodontik Tedavi (Orta)"; sutCode=""; category="Ortodonti"; price=69300 },
  @{ name="Şeffaf Plaklar ile Ortodontik Tedavi (Ağır)"; sutCode=""; category="Ortodonti"; price=95700 },
  @{ name="Sandviç Splint"; sutCode=""; category="Ortodonti"; price=13730 },
  @{ name="Alçı Yüz Maskı"; sutCode=""; category="Ortodonti"; price=4110 },
  @{ name="Ağız İçi Koruyucu Aparey"; sutCode=""; category="Ortodonti"; price=11000 },

  # Pedodonti
  @{ name="Amputasyon - VİTAL"; sutCode="402140"; category="Pedodonti"; price=3850 },
  @{ name="Amputasyon (Dolgu Hariç) - MORTAL"; sutCode="402140"; category="Pedodonti"; price=3850 },
  @{ name="Süt Dişi Kanal Tedavisi"; sutCode="402150"; category="Pedodonti"; price=6765 },
  @{ name="Fissür Örtülmesi (Sealant - Tek Diş)"; sutCode="403010"; category="Pedodonti"; price=1445 },
  @{ name="Yüzeysel Flor Uygulaması (Yarım Çene)"; sutCode="403020"; category="Pedodonti"; price=1375 },
  @{ name="Prefabrike Kron"; sutCode="403030"; category="Pedodonti"; price=3810 },
  @{ name="Yer Tutucu (Sabit)"; sutCode="403040"; category="Pedodonti"; price=7480 },
  @{ name="Yer Tutucu (Hareketli)"; sutCode="403050"; category="Pedodonti"; price=10010 },
  @{ name="Çocuk Protezi (Akrilik - Bölümlü - Tek Çene)"; sutCode="403060"; category="Pedodonti"; price=15050 },
  @{ name="Çocuk Protezi (Akrilik - Tam - Tek Çene)"; sutCode="403070"; category="Pedodonti"; price=16995 },
  @{ name="Strip Kron"; sutCode="403080"; category="Pedodonti"; price=3575 },
  @{ name="Kompomer Dolgu"; sutCode="403090"; category="Pedodonti"; price=4180 },
  @{ name="Açık Apeksli Dişte Kanal Tedavisi (Her Kanal İçin - Dolgu Hariç)"; sutCode="403100"; category="Pedodonti"; price=12780 },
  @{ name="Açık Apeksli Dişte Apikal Bariyer (Her Kanal İçin - Dolgu ve Pansuman Hariç)"; sutCode=""; category="Pedodonti"; price=5830 },
  @{ name="Travma Splinti"; sutCode=""; category="Pedodonti"; price=8195 },
  @{ name="Aşındırma ile Sürme Rehberliği (Seans Başına)"; sutCode=""; category="Pedodonti"; price=1640 },
  @{ name="Rezin İnfilitrasyonu Tedavisi"; sutCode=""; category="Pedodonti"; price=7150 },

  # Periodontoloji
  @{ name="Subgingival Küretaj (Tek Diş)"; sutCode="406030"; category="Periodontoloji"; price=1870 },
  @{ name="Hemiseksiyon (Kök Amputasyonu - Kanal Tedavisi Hariç)"; sutCode="406060"; category="Periodontoloji"; price=3845 },
  @{ name="Periodontal Apse Tedavisi"; sutCode="406010"; category="Periodontoloji"; price=3455 },
  @{ name="Detertraj (Diş Taşı Temizliği - Tek Çene)"; sutCode="406021"; category="Periodontoloji"; price=3300 },
  @{ name="Subgingival İlaç Uygulaması"; sutCode=""; category="Periodontoloji"; price=330 },
  @{ name="Gingivoplasti (Tek Diş)"; sutCode="406130"; category="Periodontoloji"; price=3135 },
  @{ name="Gingivektomi (Tek Diş)"; sutCode="406040"; category="Periodontoloji"; price=3245 },
  @{ name="Flap Operasyonu (Subgingival Küretaj Dahil - Tek Diş)"; sutCode="406050"; category="Periodontoloji"; price=5225 },
  @{ name="Tunnel Operasyonu (Tek Diş)"; sutCode="406150"; category="Periodontoloji"; price=4445 },
  @{ name="Serbest Diş Eti Grefti"; sutCode="406070"; category="Periodontoloji"; price=5380 },
  @{ name="Saplı Yumuşak Doku Grefti (Koronale Kaydırma, Yana Kaydırma)"; sutCode="406080"; category="Periodontoloji"; price=4250 },
  @{ name="Periodontal Şine (Splint - Daimi)"; sutCode="406100"; category="Periodontoloji"; price=6370 },
  @{ name="Periodontal Şine (Splint - Geçici)"; sutCode="406090"; category="Periodontoloji"; price=8070 },
  @{ name="Periodontal Şine (Splint - Geçici - Yarım Çene)"; sutCode="406090"; category="Periodontoloji"; price=3690 },
  @{ name="Biyomateryal Uygulaması (Tek Diş - Flap Op. ve Biomateryal Ücreti Hariç)"; sutCode="406140"; category="Periodontoloji"; price=1375 },
  @{ name="Membran Uygulaması (Tek Diş - Flap Op. ve Membran Ücreti Hariç)"; sutCode="406160"; category="Periodontoloji"; price=1360 },
  @{ name="Vestibül Plak (Diş Eti Protezi - Çene Başına)"; sutCode=""; category="Periodontoloji"; price=9020 },
  @{ name="Subepitelyal Bağ Dokusu Grefti"; sutCode="406170"; category="Periodontoloji"; price=14850 },
  @{ name="Peri-İmplantitis (Cerrahi) (Biomaterial ve Membran Ücreti Hariç) (Tek İmp.)"; sutCode=""; category="Periodontoloji"; price=6875 },
  @{ name="Peri-İmplantitis (Cerrahi Olmayan) (Tek İmp.)"; sutCode=""; category="Periodontoloji"; price=1185 },
  @{ name="Papil Oluşturma (Cerrahi) (Tek Papil)"; sutCode=""; category="Periodontoloji"; price=2910 },
  @{ name="Papil Oluşturma (Cerrahi Olmayan) (Tek Papil)"; sutCode=""; category="Periodontoloji"; price=2885 },
  @{ name="Fiberotomi"; sutCode=""; category="Periodontoloji"; price=2750 },

  # Protez
  @{ name="Tam Protez (Akrilik - Tek Çene)"; sutCode="404010"; category="Protez"; price=31900 },
  @{ name="Bölümlü Protez (Akrilik - Tek Çene)"; sutCode="404020"; category="Protez"; price=30690 },
  @{ name="Tam Protez (Metal - Tek Çene)"; sutCode="404030"; category="Protez"; price=39600 },
  @{ name="İmplant Üstü Tam Protez"; sutCode="404410"; category="Protez"; price=38745 },
  @{ name="Bölümlü Protez (Metal - Tek Çene)"; sutCode="404040"; category="Protez"; price=38500 },
  @{ name="İmplant Üstü Bölümlü Protez"; sutCode="404420"; category="Protez"; price=39260 },
  @{ name="Hassas Tutuculu Protezler (Hassas Tutucu Ücreti Hariç - Tek Çene)"; sutCode="404360"; category="Protez"; price=40150 },
  @{ name="İmplant Destekli Hareketli Protezler (Hassas Tutucu Ücreti Hariç - Tek Çene)"; sutCode="404370"; category="Protez"; price=40700 },
  @{ name="Geçici (İmmediat) Protez (Akrilik - Tek Çene)"; sutCode="404050"; category="Protez"; price=22285 },
  @{ name="Diş İlavesi (Tek Diş)"; sutCode="404120"; category="Protez"; price=4180 },
  @{ name="Roach Köprü"; sutCode="404230"; category="Protez"; price=7645 },
  @{ name="Pinley ve Çeşitleri"; sutCode="404160"; category="Protez"; price=8740 },
  @{ name="Tek Parça Döküm Kuron"; sutCode="404170"; category="Protez"; price=7735 },
  @{ name="Veneer Kuron (Akrilik)"; sutCode="404180"; category="Protez"; price=11220 },
  @{ name="Veneer Kuron (Seramik)"; sutCode="404181"; category="Protez"; price=12100 },
  @{ name="İmplant Üstü Veneer Kuron (Seramik) (Abutment Ücreti Hariç)"; sutCode="404181"; category="Protez"; price=13680 },
  @{ name="Laminate Veneer Kuron (Akrilik)"; sutCode="404390"; category="Protez"; price=10785 },
  @{ name="Laminate Veneer Kuron (Seramik)"; sutCode="404390"; category="Protez"; price=26400 },
  @{ name="Jaket Kuron (Akrilik)"; sutCode="404200"; category="Protez"; price=7480 },
  @{ name="Jaket Kuron (Seramik)"; sutCode="404201"; category="Protez"; price=7320 },
  @{ name="Tam Seramik Kuron (Metal Desteksiz)"; sutCode="404201"; category="Protez"; price=21450 },
  @{ name="Tam Seramik Kuron (Metal)"; sutCode="404201"; category="Protez"; price=27595 },
  @{ name="Teleskop Kuron (Koping)"; sutCode="404210"; category="Protez"; price=9895 },
  @{ name="Döküm Post Core (Pivo) (Kuron Hariç)"; sutCode="404190"; category="Protez"; price=6860 },
  @{ name="Adeziv Köprü (Maryland vb.)"; sutCode="404220"; category="Protez"; price=11550 },
  @{ name="Kuron Sökümü (Tek Sabit Üye İçin)"; sutCode="404250"; category="Protez"; price=1875 },
  @{ name="Diş Üstü Protezi (Overdenture - Tek Çene)"; sutCode="404280"; category="Protez"; price=26055 },
  @{ name="Zirkonyum Kuron"; sutCode="404395"; category="Protez"; price=13750 },
  @{ name="Besleme (Tek Çene)"; sutCode="404080"; category="Protez"; price=11965 },
  @{ name="Kaide Yenileme (Rebazaj - Tek Çene)"; sutCode="404060"; category="Protez"; price=12430 },
  @{ name="Proteze Yumuşak Akrilik Uygulaması (Geçici - Tek Çene)"; sutCode="404070"; category="Protez"; price=8070 },
  @{ name="Proteze Yumuşak Akrilik Uygulaması (Daimi - Tek Çene)"; sutCode="404070"; category="Protez"; price=12610 },
  @{ name="Tamir (Akrilik Protezler, Kırık veya Çatlak)"; sutCode="404090"; category="Protez"; price=3805 },
  @{ name="Kroşe İlavesi"; sutCode="404100"; category="Protez"; price=4290 },
  @{ name="Metal İskelet Tamiri"; sutCode="404110"; category="Protez"; price=4180 },
  @{ name="Gece Plağı (Bruksizm - Yumuşak)"; sutCode="404150"; category="Protez"; price=5885 },
  @{ name="Gece Plağı (Bruksizm - Sert - Oklüzal Splintleme)"; sutCode="407290"; category="Protez"; price=20240 },
  @{ name="Kuronlarda Freze Tekniği Farkı"; sutCode=""; category="Protez"; price=1595 },
  @{ name="Geçici Kuron (Tek Diş İçin)"; sutCode="404240"; category="Protez"; price=2245 },
  @{ name="Düşmüş Kuron ve Köprü Simantasyonu (Her Sabit Üye İçin)"; sutCode="404260"; category="Protez"; price=1225 },
  @{ name="Kuron Köprü Tamiri (Her Üye İçin)"; sutCode="404270"; category="Protez"; price=5005 },
  @{ name="Damak Yarığı Protezi (Velum Uzantılı Aparey)"; sutCode="404280"; category="Protez"; price=26185 },
  @{ name="Oklüzal Aşındırmalar (Tek Çene)"; sutCode="404140"; category="Protez"; price=6820 },
  @{ name="Oklüzyon Düzeltilmesi (İki Çene)"; sutCode=""; category="Protez"; price=10150 },
  @{ name="T.M.E. Stabilizasyon Splinti"; sutCode=""; category="Protez"; price=19800 },
  @{ name="İmplant Rehberi (Yarım Çene)"; sutCode=""; category="Protez"; price=9735 },
  @{ name="İmplant Rehberi (Tam Çene)"; sutCode=""; category="Protez"; price=14300 },

  # Restoratif
  @{ name="Amalgam Dolgu (Bir Yüzlü) - O"; sutCode="402010"; category="Tedavi & Endodonti"; price=2845 },
  @{ name="Amalgam Dolgu (Bir Yüzlü) - COLE"; sutCode="402160"; category="Tedavi & Endodonti"; price=2845 },
  @{ name="Amalgam Dolgu (İki Yüzlü) - OD"; sutCode="402020"; category="Tedavi & Endodonti"; price=3805 },
  @{ name="Amalgam Dolgu (İki Yüzlü) - OM"; sutCode="402020"; category="Tedavi & Endodonti"; price=3805 },
  @{ name="Amalgam Dolgu (Üç Yüzlü) - MOD"; sutCode="402030"; category="Tedavi & Endodonti"; price=4845 },
  @{ name="İnley Dolgu (Bir Yüzlü) - O"; sutCode="402040"; category="Tedavi & Endodonti"; price=6285 },
  @{ name="İnley Dolgu (Bir Yüzlü) - COLE"; sutCode="402040"; category="Tedavi & Endodonti"; price=6285 },
  @{ name="İnley Dolgu (İki Yüzlü) - OD"; sutCode="402050"; category="Tedavi & Endodonti"; price=6490 },
  @{ name="İnley Dolgu (İki Yüzlü) - OM"; sutCode="402050"; category="Tedavi & Endodonti"; price=6490 },
  @{ name="İnley Dolgu (Üç Yüzlü) - MOD"; sutCode="402060"; category="Tedavi & Endodonti"; price=6770 },
  @{ name="Kompozit Dolgu (Bir Yüzlü) - O"; sutCode="402100"; category="Tedavi & Endodonti"; price=3375 },
  @{ name="Kompozit Dolgu (Bir Yüzlü) - COLE"; sutCode="402180"; category="Tedavi & Endodonti"; price=2720 },
  @{ name="Kompozit Dolgu (İki Yüzlü) - OD"; sutCode="402110"; category="Tedavi & Endodonti"; price=4235 },
  @{ name="Kompozit Dolgu (İki Yüzlü) - OM"; sutCode="402110"; category="Tedavi & Endodonti"; price=4235 },
  @{ name="Kompozit Dolgu (Üç Yüzlü) - MOD"; sutCode="402120"; category="Tedavi & Endodonti"; price=5300 },
  @{ name="Kompozit İnley Dolgu (Tek Yüzlü) - O"; sutCode="402100"; category="Tedavi & Endodonti"; price=6050 },
  @{ name="Kompozit İnley Dolgu (Tek Yüzlü) - COLE"; sutCode="402180"; category="Tedavi & Endodonti"; price=6050 },
  @{ name="Kompozit İnley Dolgu (İki Yüzlü) - OD"; sutCode="402110"; category="Tedavi & Endodonti"; price=6050 },
  @{ name="Kompozit İnley Dolgu (İki Yüzlü) - OM"; sutCode="402110"; category="Tedavi & Endodonti"; price=6050 },
  @{ name="Kompozit İnley Dolgu (Üç Yüzlü) - MOD"; sutCode="402120"; category="Tedavi & Endodonti"; price=6050 },
  @{ name="Seramik İnley Dolgu (Tek Yüzlü) - O"; sutCode="402040"; category="Tedavi & Endodonti"; price=15620 },
  @{ name="Seramik İnley Dolgu (Tek Yüzlü) - COLE"; sutCode="402040"; category="Tedavi & Endodonti"; price=15620 },
  @{ name="Seramik İnley Dolgu (İki Yüzlü) - OD"; sutCode="402050"; category="Tedavi & Endodonti"; price=15620 },
  @{ name="Seramik İnley Dolgu (İki Yüzlü) - OM"; sutCode="402050"; category="Tedavi & Endodonti"; price=15620 },
  @{ name="Seramik İnley Dolgu (Üç Yüzlü) - MOD"; sutCode="402060"; category="Tedavi & Endodonti"; price=15620 },
  @{ name="Cam İonomer Dolgu - O"; sutCode="402190"; category="Tedavi & Endodonti"; price=2675 },
  @{ name="Cam İonomer Dolgu - COLE"; sutCode="402170"; category="Tedavi & Endodonti"; price=2115 },
  @{ name="Cam İonomer Dolgu - OD"; sutCode="402190"; category="Tedavi & Endodonti"; price=2675 },
  @{ name="Cam İonomer Dolgu - OM"; sutCode="402190"; category="Tedavi & Endodonti"; price=2675 },
  @{ name="Cam İonomer Dolgu - MOD"; sutCode="402190"; category="Tedavi & Endodonti"; price=2675 },
  @{ name="Kuafaj (Dolgu Hariç)"; sutCode="402130"; category="Tedavi & Endodonti"; price=440 },
  @{ name="Diş Ağartma (Beyazlatma - Devital Tek Diş)"; sutCode=""; category="Tedavi & Endodonti"; price=2475 },
  @{ name="Diş Ağartma (Beyazlatma - Tek Çene)"; sutCode=""; category="Tedavi & Endodonti"; price=11935 },
  @{ name="Direkt Kompozit Veneer Restorasyon"; sutCode="402340"; category="Tedavi & Endodonti"; price=9295 },
  @{ name="Kanal İçi Hazır Post Uygulaması"; sutCode="402240"; category="Tedavi & Endodonti"; price=3075 },
  @{ name="Kanal İçi Fiber Post Uygulaması"; sutCode="402240"; category="Tedavi & Endodonti"; price=4950 },
  @{ name="Dentin Pimi Uygulaması (Her Pim Başına) - D"; sutCode="402200"; category="Tedavi & Endodonti"; price=555 },
  @{ name="Dentin Pimi Uygulaması (Her Pim Başına) - M"; sutCode="402200"; category="Tedavi & Endodonti"; price=555 },
  @{ name="Onley"; sutCode="402320"; category="Tedavi & Endodonti"; price=7780 },
  @{ name="Onley (Seramik)"; sutCode="402320"; category="Tedavi & Endodonti"; price=15620 },
  @{ name="Diş Ağartma (Beyazlatma - Vital Tek Diş)"; sutCode=""; category="Tedavi & Endodonti"; price=2145 },
  @{ name="Pinley"; sutCode=""; category="Tedavi & Endodonti"; price=7865 },
  @{ name="Laminate Veneer (Kompozit)"; sutCode="404390"; category="Tedavi & Endodonti"; price=9295 }
)

$total = $treatments.Count
Write-Host "=== Pulpax Tedavi Seed ===" -ForegroundColor Cyan
Write-Host "Toplam $total tedavi aktarılacak..." -ForegroundColor Yellow

# 1. Önce tümünü sil
Write-Host "`n[1/2] Mevcut tedaviler siliniyor..." -ForegroundColor Yellow
try {
  $skipArgs = if ($Global:SkipCert) { @{ SkipCertificateCheck = $true } } else { @{} }
  $resetResp = Invoke-RestMethod -Method Delete `
    -Uri "$BaseUrl/treatments/admin/reset" `
    -Headers $headers @skipArgs -ErrorAction Stop
  Write-Host "  ✓ Silme başarılı: $($resetResp.message)" -ForegroundColor Green
} catch {
  Write-Host "  ✗ Silme hatası: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "  Backend çalışıyor mu? Devam etmek için Enter..." -ForegroundColor Yellow
  Read-Host
}

# 2. İçe aktar
Write-Host "`n[2/2] $total tedavi aktarılıyor..." -ForegroundColor Yellow
$body = @{
  treatments = $treatments
  groupName  = "TDB 2026 Tarifesi"
} | ConvertTo-Json -Depth 10

try {
  $importResp = Invoke-RestMethod -Method Post `
    -Uri "$BaseUrl/treatments/admin/import" `
    -Headers $headers `
    -Body $body @skipArgs -ErrorAction Stop
  Write-Host "  ✓ İçe aktarma başarılı!" -ForegroundColor Green
  Write-Host "  Aktarılan: $($importResp.imported) tedavi" -ForegroundColor Green
  Write-Host "  Grup: $($importResp.groupName)" -ForegroundColor Green
} catch {
  Write-Host "  ✗ İçe aktarma hatası: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TAMAMLANDI ===" -ForegroundColor Green
