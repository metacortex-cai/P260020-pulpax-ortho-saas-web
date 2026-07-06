const fs = require('fs');

const input = `
## 1. TEŞHİS VE TEDAVİ PLANLAMASI

| Kod | Tedavi Adı | KDV Hariç | KDV Dahil |
|---|---|---|---|
| 1-1 | Dişhekimi Muayenesi | 1.500,00 | 1.650,00 |
| 1-2 | Uzman Dişhekimi Muayenesi | 1.850,00 | 2.035,00 |
| 1-3 | Kontrol Hekim Muayenesi | 1.300,00 | 1.430,00 |
| 1-4 | Konsültasyon | 1.009,09 | 1.110,00 |
| 1-5 | Uzman Dişhekimi Konsültasyonu | 1.313,64 | 1.445,00 |
| 1-6 | Hipnoz (Seans Başına) | 3.049,77 | 3.355,00 |
| 1-7 | Akupunktur Uygulama (Seans Başına) | 2.500,00 | 2.750,00 |
| 1-8 | Teşhis ve Tedavi Planlaması | 1.395,45 | 1.535,00 |
| 1-9 | Oral Hijyen Eğitimi | 1.068,18 | 1.175,00 |
| 1-10 | Tükürük Akış Hızı ve Tamponlama Kapasitesi Tayini | 1.518,18 | 1.670,00 |
| 1-11 | Tükürükte Mikrobiyolojik Analiz | 2.550,00 | 2.805,00 |
| 1-12 | Gnatoloji, T.M.E. Kas Muayenesi (Oklüzyon Kontrolü) | 4.800,00 | 5.280,00 |
| 1-13 | Vitalite Kontrolü (Diş Başına) | 213,64 | 235,00 |
| 1-14 | Diş Röntgen Filmi (Periapikal) | 754,55 | 830,00 |
| 1-15 | Oklüzal Film | 786,36 | 865,00 |
| 1-16 | Bite-Wing Radyografi | 754,55 | 830,00 |
| 1-17 | Ekstra Oral Röntgen Filmi | 868,18 | 955,00 |
| 1-18 | Panaromik Film | 1.854,55 | 2.040,00 |
| 1-19 | Lateral Sefalometrik Film | 1.863,64 | 2.050,00 |
| 1-20 | Antero-Posterior Sefalometrik Film | 1.845,45 | 2.030,00 |
| 1-21 | İntra Oral Dijital Radyografi (RVG veya Fosfor Plak) | 900,00 | 990,00 |
| 1-22 | El Bilek Filmi | 1.845,45 | 2.030,00 |
| 1-23 | Siyalografi | 2.100,00 | 2.310,00 |
| 1-24 | Tomografi (Bölgesel) | 2.500,00 | 2.750,00 |
| 1-25 | Tomografi (Tek Çene) | 4.000,00 | 4.400,00 |
| 1-26 | Tomografi (İki Çene) | 5.400,00 | 5.940,00 |
| 1-27 | Eklem Tomografisi (Çift Taraflı) | 6.054,55 | 6.660,00 |
| 1-28 | Bilgisayarlı Büyük T.M.E. Fonksiyon Testi | 12.000,00 | 13.200,00 |
| 1-29 | Bilgisayarlı Kas Tonus Analizi | 5.450,00 | 5.995,00 |
| 1-30 | T.M.E. Filmi ve Tetkiki | 2.427,27 | 2.670,00 |
| 1-31 | Lokal Anestezi (Enjeksiyon - İnfiltratif) | 336,36 | 370,00 |
| 1-32 | Lokal Anestezi (Rejyonal) | 336,36 | 370,00 |
| 1-33 | Raporlama | 1.818,18 | 2.000,00 |
| 1-34 | Ağız İçi Dijital Tarama | 2.500,00 | 2.750,00 |

---

## 2. TEDAVİ VE ENDODONTİ

| Kod | Tedavi Adı | KDV Hariç | KDV Dahil |
|---|---|---|---|
| 2-1 | Amalgam Dolgu (Bir Yüzlü) | 2.586,36 | 2.845,00 |
| 2-2 | Amalgam Dolgu (İki Yüzlü) | 3.459,09 | 3.805,00 |
| 2-3 | Amalgam Dolgu (Üç Yüzlü) | 4.404,55 | 4.845,00 |
| 2-4 | Kompozit Dolgu (Bir Yüzlü) | 3.068,18 | 3.375,00 |
| 2-5 | Kompozit Dolgu (İki Yüzlü) | 3.850,00 | 4.235,00 |
| 2-6 | Kompozit Dolgu (Üç Yüzlü) | 4.818,18 | 5.300,00 |
| 2-7 | Direkt Kompozit Laminate Restorasyonu | 8.450,00 | 9.295,00 |
| 2-8 | Black V Kole Dolgusu (Kompozit) | 2.472,73 | 2.720,00 |
| 2-9 | Cam İonomer Dolgu | 2.431,82 | 2.675,00 |
| 2-10 | Black V Kole Dolgusu (Cam İonomer) | 1.922,73 | 2.115,00 |
| 2-11 | İnley Dolgu* (Bir Yüzlü) | 5.713,64 | 6.285,00 |
| 2-12 | İnley Dolgu* (İki Yüzlü) | 5.900,00 | 6.490,00 |
| 2-13 | İnley Dolgu* (Üç Yüzlü) | 6.154,55 | 6.770,00 |
| 2-14 | Kompozit İnley Dolgu (Bir Yüzlü) | 5.500,00 | 6.050,00 |
| 2-15 | Kompozit İnley Dolgu (İki Yüzlü) | 5.500,00 | 6.050,00 |
| 2-16 | Kompozit İnley Dolgu (Üç Yüzlü) | 5.500,00 | 6.050,00 |
| 2-17 | Seramik İnley Dolgu (Bir Yüzlü) | 14.200,00 | 15.620,00 |
| 2-18 | Seramik İnley Dolgu (İki Yüzlü) | 14.200,00 | 15.620,00 |
| 2-19 | Seramik İnley Dolgu (Üç Yüzlü) | 14.200,00 | 15.620,00 |
| 2-20 | Onley* | 7.072,73 | 7.780,00 |
| 2-21 | Onley* (Seramik) | 14.200,00 | 15.620,00 |
| 2-22 | Pinley* | 7.150,00 | 7.865,00 |
| 2-23 | Dolgu (Restorasyon) Tamiri | 2.654,55 | 2.920,00 |
| 2-24 | Dolgu Sökümü (Tek Diş) | 1.345,45 | 1.480,00 |
| 2-25 | Kuafaj (Dolgu Hariç) | 400,00 | 440,00 |
| 2-26 | Ekstirpasyon (Her Kanal İçin) | 1.827,27 | 2.010,00 |
| 2-27 | Kanal Tedavisi - Tek Kanal (Dolgu Hariç) | 4.190,91 | 4.610,00 |
| 2-28 | Kanal Tedavisi - İki Kanal (Dolgu Hariç) | 6.563,64 | 7.220,00 |
| 2-29 | Kanal Tedavisi - Üç Kanal (Dolgu Hariç) | 9.409,09 | 10.350,00 |
| 2-30 | Kanal Tedavisi - İlave Her Kanal İçin | 2.272,73 | 2.500,00 |
| 2-31 | Periapikal Lezyonlu Dişte Kanal Ted. - Tek Kanal (Dolgu Hariç) | 4.595,45 | 5.055,00 |
| 2-32 | Periapikal Lezyonlu Dişte Kanal Ted. - İki Kanal (Dolgu Hariç) | 7.000,00 | 7.700,00 |
| 2-33 | Periapikal Lezyonlu Dişte Kanal Ted. - Üç Kanal (Dolgu Hariç) | 9.981,82 | 10.980,00 |
| 2-34 | Kanal Dolgusu Sökümü (Her Kanal İçin) | 1.581,82 | 1.740,00 |
| 2-35 | Kanal Dolgusu Tekrarı - Retreatment (Her Kanal İçin - Dolgu Hariç) | 4.100,00 | 4.510,00 |
| 2-36 | Kanal Pansumanı (Seans Başı) | 1.095,45 | 1.205,00 |
| 2-37 | Kanal İçi Hazır Post Uygulaması (Metal) (Dolgu Ücreti Hariç) | 2.795,45 | 3.075,00 |
| 2-38 | Kanal İçi Fiber Post Uygulaması (Dolgu Ücreti Hariç) | 4.500,00 | 4.950,00 |
| 2-39 | Kanaldan Kırılmış Materyal Çıkartılması | 6.250,00 | 6.875,00 |
| 2-40 | Kanalda Perforasyon Tamiri (MTA vb.) | 2.981,82 | 3.280,00 |
| 2-41 | Dentin Pini Uygulaması (Her Pin Başına) | 504,55 | 555,00 |
| 2-42 | Endokron | 12.500,00 | 13.750,00 |
| 2-43 | Hassasiyet Tedavisi (Tek Diş) | 1.109,09 | 1.220,00 |
| 2-44 | Hassasiyet Tedavisi (Tam Çene) | 3.200,00 | 3.520,00 |
| 2-45 | Diş Ağartma - Vital Tek Diş En Çok 4 Adet (Malzeme Hariç) | 1.950,00 | 2.145,00 |
| 2-46 | Diş Ağartma - Devital Tek Diş (Seans Başına - Dolgu Hariç) | 2.250,00 | 2.475,00 |
| 2-47 | Diş Ağartma - Tek Çene (Malzeme Hariç) | 10.850,00 | 11.935,00 |
| 2-48 | Rubber-Dam Uygulaması | 1.050,00 | 1.155,00 |

---

## 3. PEDODONTİ

| Kod | Tedavi Adı | KDV Hariç | KDV Dahil |
|---|---|---|---|
| 3-1 | Aşındırma ile Sürme Rehberliği (Seans Başına) | 1.490,91 | 1.640,00 |
| 3-2 | Fissür Örtülmesi (Sealant - Tek Diş) | 1.313,64 | 1.445,00 |
| 3-3 | Yüzeysel Flor Uygulaması (Yarım Çene) | 1.250,00 | 1.375,00 |
| 3-4 | Kompomer Dolgu | 3.800,00 | 4.180,00 |
| 3-5 | Rezin İnfilitrasyonu Tedavisi | 6.500,00 | 7.150,00 |
| 3-6 | Amputasyon (Dolgu-Kron Üst Yapı-Biyomateryal Hariç) | 3.500,00 | 3.850,00 |
| 3-7 | Süt Dişi Kanal Tedavisi | 6.150,00 | 6.765,00 |
| 3-8 | Açık Apeksli Dişte Kanal Tedavisi (Her Kanal - Dolgu ve Pansuman Hariç) | 11.618,18 | 12.780,00 |
| 3-9 | Açık Apeksli Dişte Apikal Bariyer (Her Kanal - Dolgu ve Pansuman Hariç) | 5.300,00 | 5.830,00 |
| 3-10 | Yer Tutucu (Sabit) | 6.800,00 | 7.480,00 |
| 3-11 | Yer Tutucu (Hareketli) | 9.100,00 | 10.010,00 |
| 3-12 | Prefabrike Kron* | 3.463,64 | 3.810,00 |
| 3-13 | Strip Kron | 3.250,00 | 3.575,00 |
| 3-14 | Travma Splinti | 7.450,00 | 8.195,00 |
| 3-15 | Çocuk Protezi | 8.500,00 | 9.350,00 |
| 3-16 | Çocuk Protezi (Akrilik - Bölümlü - Tek Çene) | 13.681,82 | 15.050,00 |
| 3-17 | Çocuk Protezi (Akrilik - Tam - Tek Çene) | 15.450,00 | 16.995,00 |
| 3-18 | Avülsiyon Tedavisi | 17.000,00 | 18.700,00 |

---

## 4. PROTEZ

| Kod | Tedavi Adı | KDV Hariç | KDV Dahil |
|---|---|---|---|
| 4-1 | Tam Protez (Akrilik - Tek Çene) | 29.000,00 | 31.900,00 |
| 4-2 | Bölümlü Protez (Akrilik - Tek Çene) | 27.900,00 | 30.690,00 |
| 4-3 | Tam Protez (Döküm Metal ile Güçlendirilmiş - Tek Çene) | 36.000,00 | 39.600,00 |
| 4-4 | Bölümlü Protez (Döküm Metal ile Güçlendirilmiş - Tek Çene) | 35.000,00 | 38.500,00 |
| 4-5 | Hassas Tutuculu Protezler (Hassas Tutucu Hariç - Tek Çene) | 36.500,00 | 40.150,00 |
| 4-6 | İmplant Destekli Hareketli Protezler (Hassas Tutucu Hariç - Tek Çene) | 37.000,00 | 40.700,00 |
| 4-7 | Geçici (İmmediat) Protez (Akrilik - Tek Çene) | 20.259,09 | 22.285,00 |
| 4-8 | Besleme (Tek Çene) | 10.877,27 | 11.965,00 |
| 4-9 | Kaide Yenileme (Rebazaj - Tek Çene) | 11.300,00 | 12.430,00 |
| 4-10 | Proteze Yumuşak Akrilik Uygulaması (Geçici Tek Çene) | 7.336,36 | 8.070,00 |
| 4-11 | Proteze Yumuşak Akrilik Uygulaması (Daimi Tek Çene) | 11.463,64 | 12.610,00 |
| 4-12 | Tamir (Akrilik Protezler, Kırık veya Çatlak) | 3.459,09 | 3.805,00 |
| 4-13 | Kroşe İlavesi | 3.900,00 | 4.290,00 |
| 4-14 | Metal İskelet Tamiri | 3.800,00 | 4.180,00 |
| 4-15 | Diş İlavesi (Tek Diş) | 3.800,00 | 4.180,00 |
| 4-16 | Roach Köprü | 6.950,00 | 7.645,00 |
| 4-17 | Gece Plağı (Yumuşak) | 5.350,00 | 5.885,00 |
| 4-18 | Gece Plağı (Sert Oklüzal Splintleme) | 18.400,00 | 20.240,00 |
| 4-19 | Pinley ve Çeşitleri* | 7.945,45 | 8.740,00 |
| 4-20 | Tek Parça Döküm Kuron | 7.031,82 | 7.735,00 |
| 4-21 | Veneer Kuron (Akrilik) | 10.200,00 | 11.220,00 |
| 4-22 | Veneer Kuron** (Seramik) | 11.000,00 | 12.100,00 |
| 4-23 | İmplant Üstü Veneer Kuron (Seramik) (Abutment Hariç) | 12.436,36 | 13.680,00 |
| 4-24 | Laminate Veneer Kompozit | 8.450,00 | 9.295,00 |
| 4-25 | Laminate Veneer (Akrilik) | 9.804,55 | 10.785,00 |
| 4-26 | Laminate Veneer (Seramik) | 24.000,00 | 26.400,00 |
| 4-27 | Jaket Kuron (Akrilik) | 6.800,00 | 7.480,00 |
| 4-28 | Jaket Kuron (Kompozit) | 6.550,00 | 7.205,00 |
| 4-29 | Tam Seramik Kuron (Metal Desteksiz) | 19.500,00 | 21.450,00 |
| 4-30 | Teleskop Kuron* (Koping) | 8.995,45 | 9.895,00 |
| 4-31 | Kuronlarda Freze Tekniği Farkı | 1.450,00 | 1.595,00 |
| 4-32 | Döküm Post Core (Pivo) (Üst Yapı Hariç) | 6.236,36 | 6.860,00 |
| 4-33 | Adeziv Köprü (Maryland vb.) | 10.500,00 | 11.550,00 |
| 4-34 | Geçici Kuron (Tek Diş İçin) | 2.040,91 | 2.245,00 |
| 4-35 | Kuron Sökümü (Tek Sabit Üye İçin) | 1.704,55 | 1.875,00 |
| 4-36 | Düşmüş Kuron ve Köprü Simantasyonu (Her Sabit Üye İçin) | 1.113,64 | 1.225,00 |
| 4-37 | Kuron Köprü Tamiri* (Her Üye İçin) | 4.550,00 | 5.005,00 |
| 4-38 | Diş Üstü Protezi (Overdenture - Tek Çene)** | 23.686,36 | 26.055,00 |
| 4-39 | Damak Yarığı Protezi (Velum Uzantılı Aparey)** | 23.804,55 | 26.185,00 |
| 4-40 | Yeni Doğanda Preoperatif Aparey (Vida Ücreti Ayrıca Alınır)** | 20.027,27 | 22.030,00 |
| 4-41 | Geçici Obturatörler** | 17.486,36 | 19.235,00 |
| 4-42 | Basit Çene Defektlerinde Protetik Tedavi** | 32.009,09 | 35.210,00 |
| 4-43 | Komplike Çene Defektlerinde Protetik Tedavi** | 38.431,82 | 42.275,00 |
| 4-44 | Yüz Protezleri (Yumuşak Akrilik İle) | 62.500,00 | 68.750,00 |
| 4-45 | Göz Protezi (Oküler) | 66.086,36 | 72.695,00 |
| 4-46 | Oklüzal Aşındırmalar | 6.200,00 | 6.820,00 |
| 4-47 | Oklüzyon Düzeltilmesi | 9.227,27 | 10.150,00 |
| 4-48 | T.M.E. Stabilizasyon Splinti | 18.000,00 | 19.800,00 |
| 4-49 | İmplant Rehberi (Yarım Çene) | 8.850,00 | 9.735,00 |
| 4-50 | İmplant Rehberi (Tam Çene) | 13.000,00 | 14.300,00 |
| 4-51 | Zirkonyum Kron | 12.500,00 | 13.750,00 |

---

## 5. AĞIZ-DİŞ VE ÇENE CERRAHİSİ

| Kod | Tedavi Adı | KDV Hariç | KDV Dahil |
|---|---|---|---|
| 5-1 | Diş Çekimi | 2.250,00 | 2.475,00 |
| 5-2 | Komplikasyonlu Diş Çekimi | 4.500,00 | 4.950,00 |
| 5-3 | Gömülü Diş Operasyonu | 7.250,00 | 7.975,00 |
| 5-4 | Gömülü Diş Operasyonu (Kemik Retansiyonlu) | 10.650,00 | 11.715,00 |
| 5-5 | Tek Kökte Kök Ucu Rezeksiyonu (Kanal Ted. ve Dolgu Hariç) | 9.500,00 | 10.450,00 |
| 5-6 | İki Kökte Kök Ucu Rezeksiyonu (Kanal Ted. ve Dolgu Hariç) | 11.750,00 | 12.925,00 |
| 5-7 | Üç Kökte Kök Ucu Rezeksiyonu (Kanal Ted. ve Dolgu Hariç) | 13.750,00 | 15.125,00 |
| 5-8 | Alveolit Cerrahi Tedavisi | 6.777,27 | 7.455,00 |
| 5-9 | Kanama Müdahalesi (Basit) | 2.327,27 | 2.560,00 |
| 5-10 | Kanama Müdahalesi (Dikişli) | 4.322,73 | 4.755,00 |
| 5-11 | Alveol Plastiği (Yarım Çene) | 9.450,00 | 10.395,00 |
| 5-12 | Alveol Düzeltilmesi (Yarım Çene) | 9.450,00 | 10.395,00 |
| 5-13 | Kist Operasyonu (Küçük) | 10.050,00 | 11.055,00 |
| 5-14 | Kist Operasyonu (1 Cm Büyük) | 15.000,00 | 16.500,00 |
| 5-15 | Epulis Operasyonu | 6.500,00 | 7.150,00 |
| 5-16 | Osteomyelitis veya Osteitis Operasyonu (Tek Çene Basit) | 17.500,00 | 19.250,00 |
| 5-17 | Çene Lüksasyonu | 3.450,00 | 3.795,00 |
| 5-18 | Vestibüloplasti (Yarım Çene) | 19.000,00 | 20.900,00 |
| 5-19 | Sinüs Plastiği | 11.500,00 | 12.650,00 |
| 5-20 | Sert Doku Greftleme (Greft Ücreti Hariç) | 14.500,00 | 15.950,00 |
| 5-21 | Yumuşak Doku Greftleme (Greft Ücreti Hariç) | 12.000,00 | 13.200,00 |
| 5-22 | Sinüs Lifting (Biomateryal Ücreti Hariç) | 13.150,00 | 14.465,00 |
| 5-23 | Biyopsi | 5.800,00 | 6.380,00 |
| 5-24 | Fibrom Operasyonu | 6.040,91 | 6.645,00 |
| 5-25 | Apse Drenajı ve Tedavisi (Extraoral) | 10.150,00 | 11.165,00 |
| 5-26 | Apse Drenajı ve Tedavisi (İntraoral) | 7.990,91 | 8.790,00 |
| 5-27 | Kapişon İzalesi - İmplant Üstü Açılması | 3.309,09 | 3.640,00 |
| 5-28 | Stomatit Tedavisi | 2.177,27 | 2.395,00 |
| 5-29 | Fizik Tedavi (İnfraruj Seansı) | 1.913,64 | 2.105,00 |
| 5-30 | Çene Kırığı (Basit) | 20.500,00 | 22.550,00 |
| 5-31 | Çene Kırığı (Komplike - Materyal Hariç) | 58.000,00 | 63.800,00 |
| 5-32 | Reimplantasyon | 10.500,00 | 11.550,00 |
| 5-33 | Ototransplantasyon | 15.500,00 | 17.050,00 |
| 5-34 | Kemik İçi İmplant (Tek Silindirik İmplant Ücreti Hariç) | 20.400,00 | 22.440,00 |
| 5-35 | Torus Operasyonu (Yarım Çene) | 9.800,00 | 10.780,00 |
| 5-36 | Odontogenik Tümör Operasyonu (Küçük) | 18.500,00 | 20.350,00 |
| 5-37 | Odontogenik Tümör Operasyonu (Büyük) | 24.500,00 | 26.950,00 |
| 5-38 | Nevralji Tedavisi (Alkol Enjeksiyonu) | 3.500,00 | 3.850,00 |
| 5-39 | Nevralji Tedavisi Cerrahi (Nöroktomi vb.) | 9.500,00 | 10.450,00 |
| 5-40 | Tükürük Bezi Kanalından Taş Çıkarma (Basit) | 7.250,00 | 7.975,00 |
| 5-41 | Tükürük Bezi Kanalından Taş Çıkarma (Komplike) | 11.500,00 | 12.650,00 |
| 5-42 | Ortodontik Tedavi Amaçlı Gömük Dişlerin Üzerinin Açılması | 9.500,00 | 10.450,00 |
| 5-43 | T.M.E. Mekonoterapi | 3.250,00 | 3.575,00 |
| 5-44 | T.M.E. İçi Enjeksiyon (Tek Taraflı) | 6.500,00 | 7.150,00 |
| 5-45 | Artrosentez (Tek Taraflı) | 4.468,18 | 4.915,00 |
| 5-46 | Açık Eklem Cerrahisi (Tek Taraflı) | 75.000,00 | 82.500,00 |
| 5-47 | Genioplasti | 75.000,00 | 82.500,00 |
| 5-48 | Segmental Osteotomi | 80.000,00 | 88.000,00 |
| 5-49 | Osteotomi (Tek Çene) | 84.000,00 | 92.400,00 |
| 5-50 | Dişhekimliğinde Botulinum Toksin Uygulaması | 10.500,00 | 11.550,00 |
| 5-51 | İmplant Çıkartılması | 9.500,00 | 10.450,00 |
| 5-52 | Ankraj Amaçlı Plak Yerleştirme (Malzeme Hariç) | 10.200,00 | 11.220,00 |
| 5-53 | Ankraj Amaçlı Plak Çıkarma | 6.000,00 | 6.600,00 |
| 5-54 | Zigoma İmplant (İmplant Ücreti Hariç) | 45.000,00 | 49.500,00 |
| 5-55 | Koronektomi | 9.500,00 | 10.450,00 |

---

## 6. PERİODONTOLOJİ

| Kod | Tedavi Adı | KDV Hariç | KDV Dahil |
|---|---|---|---|
| 6-1 | Detartraj (Diş Taşı Temizliği - Tek Çene) | 3.000,00 | 3.300,00 |
| 6-2 | Subgingival Küretaj (Tek Diş) | 1.700,00 | 1.870,00 |
| 6-3 | Subgingival İlaç Uygulaması | 300,00 | 330,00 |
| 6-4 | Gingivoplasti (Tek Diş) | 2.850,00 | 3.135,00 |
| 6-5 | Gingivektomi (Tek Diş) | 2.950,00 | 3.245,00 |
| 6-6 | Flap Operasyonu (Subgingival Küretaj Dahil - Tek Diş) | 4.750,00 | 5.225,00 |
| 6-7 | Tunnel Operasyonu (Tek Diş) | 4.040,91 | 4.445,00 |
| 6-8 | Hemiseksiyon (Kök Amputasyonu - Kanal Ted. Hariç) | 3.495,45 | 3.845,00 |
| 6-9 | Serbest Diş Eti Grefti (Tek Diş) | 11.950,00 | 13.145,00 |
| 6-10 | Saplı Yumuşak Doku Grefti (Tek Diş) | 10.450,00 | 11.495,00 |
| 6-11 | Periodontal Splint (Daimi) | 5.790,91 | 6.370,00 |
| 6-12 | Periodontal Splint (Geçici) | 7.336,36 | 8.070,00 |
| 6-13 | Periodontal Şine (Splint - Geçici - Yarım Çene) | 3.354,55 | 3.690,00 |
| 6-14 | Biyomateryal Uygulaması (Tek Diş - Flap Op. ve Biomateryal Hariç) | 1.250,00 | 1.375,00 |
| 6-15 | Membran Uygulaması (Tek Diş - Flap Op. ve Membran Hariç) | 1.236,36 | 1.360,00 |
| 6-16 | Vestibül Plak (Diş Eti Protezi - Çene Başına) | 8.200,00 | 9.020,00 |
| 6-17 | Subepitelyal Bağ Dokusu Grefti | 13.500,00 | 14.850,00 |
| 6-18 | Frenektomi - Frenetomi | 7.000,00 | 7.700,00 |
| 6-19 | Peri-İmplantitis Cerrahi (Biomaterial ve Membran Hariç - Tek İmp.) | 6.250,00 | 6.875,00 |
| 6-20 | Peri-İmplantitis (Cerrahi Olmayan - Tek İmp.) | 2.693,86 | 2.965,00 |
| 6-21 | Papil Oluşturma (Cerrahi - Tek Papil) | 2.645,45 | 2.910,00 |
| 6-22 | Papil Oluşturma (Cerrahi Olmayan - Tek Papil) | 2.622,73 | 2.885,00 |
| 6-23 | Fiberotomi | 2.500,00 | 2.750,00 |

---

## 7. ORTODONTİ

| Kod | Tedavi Adı | KDV Hariç | KDV Dahil |
|---|---|---|---|
| 7-1 | Lateral Sefalometrik Film Analizi | 1.522,73 | 1.675,00 |
| 7-2 | Antero Posterior Sefalometrik Film Analizi | 1.700,00 | 1.870,00 |
| 7-3 | Kemik Yaşı Tayini | 586,36 | 645,00 |
| 7-4 | Ortodontik Fotoğraf | 900,00 | 990,00 |
| 7-5 | Ortodontik Fotoğraf Tetkiki | 550,00 | 605,00 |
| 7-6 | Ortodontik Model Yapımı | 1.100,00 | 1.210,00 |
| 7-7 | Ortodontik Model Analizi | 1.345,45 | 1.480,00 |
| 7-8 | Ara Dönem Sefalometrik Film Analizi | 900,00 | 990,00 |
| 7-9 | Ara Dönem Model Yapımı | 1.704,55 | 1.875,00 |
| 7-10 | Angle Sınıf I Anomalilerinin Ortodontik Tedavisi | 37.190,91 | 40.910,00 |
| 7-11 | Angle Sınıf II Anomalilerinin Ortodontik Tedavisi | 46.722,73 | 51.395,00 |
| 7-12 | Angle Sınıf III Anomalilerinin Ortodontik Tedavisi | 56.977,27 | 62.675,00 |
| 7-13 | Sabit Kapanış Yükseltici Tatbiki (Kısa Süreli) | 3.100,00 | 3.410,00 |
| 7-14 | Lingual Teknikle Angle Sınıf I Tedavisi | 38.150,00 | 41.965,00 |
| 7-15 | Lingual Teknikle Angle Sınıf II Tedavisi | 44.000,00 | 48.400,00 |
| 7-16 | Lingual Teknikle Angle Sınıf III Tedavisi | 52.000,00 | 57.200,00 |
| 7-17 | Açık Kapanışın Ortodontik Tedavisi | 55.481,82 | 61.030,00 |
| 7-18 | Önleyici Ortodontik Tedavi | 23.750,00 | 26.125,00 |
| 7-19 | Kısa Süreli Ortodontik Tedavi | 21.172,73 | 23.290,00 |
| 7-20 | Pekiştirme Tedavisi | 8.450,00 | 9.295,00 |
| 7-21 | Pekiştirme Aygıtı (Hawley Aygıtı vb.) | 6.150,00 | 6.765,00 |
| 7-22 | Sabit Pekiştirme Aygıtı (Lingual Retainer) | 8.750,00 | 9.625,00 |
| 7-23 | Dudak Yastıkçığı (Lip Bumper) | 9.750,00 | 10.725,00 |
| 7-24 | Tek Çeneyi İlgilendiren Aparey Yapımı (Vida Hariç) | 6.850,00 | 7.535,00 |
| 7-25 | Çift Çeneyi İlgilendiren Aparey Yapımı (Frankel - Aktivatör - Bionatör) | 11.150,00 | 12.265,00 |
| 7-26 | Vida Uygulaması (Tek Vida) | 1.786,36 | 1.965,00 |
| 7-27 | Sabit Fonksiyonel Aygıt Uygulaması (Jasper - Jumper - Herbest) | 19.000,00 | 20.900,00 |
| 7-28 | Kayıp Apareyin Yeniden Yapımı (Tek Çene) | 5.850,00 | 6.435,00 |
| 7-29 | Aparey Tamiri | 2.750,00 | 3.025,00 |
| 7-30 | Ağız Dışı Aparey Tatbiki (Headgear - Chincap) | 6.250,00 | 6.875,00 |
| 7-31 | Reverse Headgear | 17.850,00 | 19.635,00 |
| 7-32 | Düz Ark Teli Tatbiki (Tek Çene NİTİ Telleri) | 2.050,00 | 2.255,00 |
| 7-33 | Büküm İçeren Tel Tatbiki (Tek Çene) | 2.250,00 | 2.475,00 |
| 7-34 | Segmental Ark veya Tork Arkı Tatbiki | 1.900,00 | 2.090,00 |
| 7-35 | Bant Tatbiki (Tek Diş) | 2.050,00 | 2.255,00 |
| 7-36 | Braket Tatbiki (Tek Diş) | 1.750,00 | 1.925,00 |
| 7-37 | Lingual Braket Tatbiki (Tek Diş) | 1.750,00 | 1.925,00 |
| 7-38 | Düşen Bant Tatbiki (Tek Diş) | 2.050,00 | 2.255,00 |
| 7-39 | Düşen Braket Tatbiki (Tek Diş) | 1.750,00 | 1.925,00 |
| 7-40 | Bant veya Braket Çıkarılması (Tek Diş) | 713,64 | 785,00 |
| 7-41 | Lingual Ataçman Tatbiki | 1.900,00 | 2.090,00 |
| 7-42 | Lingual Ark | 6.750,00 | 7.425,00 |
| 7-43 | Nance Apareyi | 10.250,00 | 11.275,00 |
| 7-44 | Hızlı Maksiller Genişletme Apareyi | 12.500,00 | 13.750,00 |
| 7-45 | Preoperatif Dudak Damak Yarığı (Ortodontik Tedavi) | 30.500,00 | 33.550,00 |
| 7-46 | Postoperatif Dudak Damak Yarığı (Ortodontik Tedavi) | 12.750,00 | 14.025,00 |
| 7-47 | T.M.E. Splint Yapımı | 12.450,00 | 13.695,00 |
| 7-48 | Model Set-Up | 5.850,00 | 6.435,00 |
| 7-49 | Positioner Yapımı | 13.750,00 | 15.125,00 |
| 7-50 | Sefalometrik Cerrahi Planı | 3.050,00 | 3.355,00 |
| 7-51 | Ortodontik Modellerin Face-Bow ile Artikülatöre Taşınması | 6.500,00 | 7.150,00 |
| 7-52 | Model Cerrahisi | 3.700,00 | 4.070,00 |
| 7-53 | Oklüzal Cerrahi Splint (Tek Çene) | 11.045,45 | 12.150,00 |
| 7-54 | Ortodontik Ameliyat Arkı (Tek Çene) | 19.163,64 | 21.080,00 |
| 7-55 | Sürme Rehberliği | 16.150,00 | 17.765,00 |
| 7-56 | Ağız İçi Distalizasyon Apareyi (Pendex vb.) | 14.450,00 | 15.895,00 |
| 7-57 | Gömülü Dişin Diş Dizisinde Yerine Yerleştirilmesi (Tek Diş) | 19.150,00 | 21.065,00 |
| 7-58 | Reserve Curve'li Niti Ark Tatbiki | 3.250,00 | 3.575,00 |
| 7-59 | Ortognatik Cerrahi Ortodontik Tedavisi | 63.163,64 | 69.480,00 |
| 7-60 | Mini Vida Uygulaması | 4.500,00 | 4.950,00 |
| 7-61 | İnterproksimal Aşındırma (Tek Diş) | 1.150,00 | 1.265,00 |
| 7-62 | Şeffaf Plaklar ile Ortodontik Tedavi (Hafif) (Plak Hariç) | 49.000,00 | 53.900,00 |
| 7-63 | Şeffaf Plaklar ile Ortodontik Tedavi (Orta) (Plak Hariç) | 63.000,00 | 69.300,00 |
| 7-64 | Şeffaf Plaklar ile Ortodontik Tedavi (Ağır) (Plak Hariç) | 87.000,00 | 95.700,00 |
| 7-65 | Ağız İçi Koruyucu Aparey | 10.000,00 | 11.000,00 |
`;

const lines = input.split('\n');
const treatments = [];
let currentCategory = '';

const CATEGORY_MAP = {
  '1. TEŞHİS VE TEDAVİ PLANLAMASI': 'Teşhis ve Planlama',
  '2. TEDAVİ VE ENDODONTİ': 'Tedavi & Endodonti',
  '3. PEDODONTİ': 'Pedodonti',
  '4. PROTEZ': 'Protez',
  '5. AĞIZ-DİŞ VE ÇENE CERRAHİSİ': 'Cerrahi',
  '6. PERİODONTOLOJİ': 'Periodontoloji',
  '7. ORTODONTİ': 'Ortodonti'
};

for (const line of lines) {
  if (line.startsWith('## ')) {
    const title = line.replace('## ', '').trim();
    currentCategory = CATEGORY_MAP[title] || title;
  } else if (line.startsWith('|') && !line.includes('---') && !line.includes('Kod')) {
    const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');
    if (parts.length >= 4) {
      const kod = parts[0];
      const name = parts[1];
      const excl = parseFloat(parts[2].replace('.', '').replace(',', '.'));
      const incl = parseFloat(parts[3].replace('.', '').replace(',', '.'));
      
      treatments.push({
        id: 'TDB-' + kod,
        sutCode: kod,
        name: name,
        category: currentCategory,
        vatRate: 10,
        priceExclVat: excl,
        priceInclVat: incl
      });
    }
  }
}

const output = 'export const TDB_2026_TREATMENTS = ' + JSON.stringify(treatments, null, 2) + ';';
fs.writeFileSync('tdb_treatments.js', output);
console.log('Successfully generated ' + treatments.length + ' treatments.');
