# ADR-001: Standart Tablo Bileşen Mimarisi

**Tarih:** 2026-06-29
**Durum:** Kabul Edildi
**Etiketler:** frontend, ui, architecture

## Bağlam

Pulpax frontend'inde 30'dan fazla tablo sayfası bulunmaktadır. v1.0.0'da her sayfa farklı arama, filtre ve sayfalama implementasyonlarına sahipti. Bu tutarsızlık:

- Kullanıcı deneyiminde çelişkiler yaratıyordu (her sayfada farklı arayüz)
- Yeni geliştirici onboarding süresini uzatıyordu
- Kod tabanında 30+ farklı pagination pattern mevcuttu

## Karar

Tüm tablo sayfaları için **dosya-içi (file-local) standart bileşen kümesi** tanımlandı. Her sayfa kendi bileşenlerini dosya başında tanımlar.

### Standart Bileşenler

```tsx
// 1. Dropdown — dışa tıklama ile kapanan ref-tabanlı
function Dropdown({ trigger, children, align = 'right' }) { ... }

// 2. DropdownItem — active prop'lu filtre öğesi
function DropdownItem({ icon, label, active, onClick }) { ... }

// 3. FilterItem — danger prop kullanan sayfalar için ayrı bileşen
function FilterItem({ label, active, onClick }) { ... }

// 4. SortableHeader — tıklanabilir <th> ArrowUp/ArrowDown göstergeli
function SortableHeader({ label, column, sortColumn, sortDirection, onSort }) { ... }
```

### Standart State Şeması

```ts
const [searchTerm, setSearchTerm] = useState('');
const [filterX, setFilterX] = useState('');
const [sortColumn, setSortColumn] = useState<string | null>(null);
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
const [currentPage, setCurrentPage] = useState(1);
const [pageLimit, setPageLimit] = useState(25);
```

### Veri Akışı

```
rawData → filtered (search + filter) → sorted (column + direction) → paginated (page + limit)
```

### Toolbar Düzeni

```
[Başlık] [N Kayıt badge] | [🔍 Arama] [Filtrele ▼] [Dışa Aktar ▼] | [+ Yeni Ekle]
```

### Sayfalama Footer

```
[10 ▼ kayıt] [1–25 / 142 kayıt] [«] [‹] [1] [2] [3] [...] [6] [›] [»]
```

## Değerlendirilen Alternatifler

| Alternatif | Neden Reddedildi |
|---|---|
| Global shared component library | Refactoring scope'unu artırır, mevcut sayfaları kırma riski |
| TanStack Table | Ekstra bağımlılık, Metronic tema entegrasyonu zor |
| File-local bileşenler | ✅ Kolay uygulanabilir, sıfır bağımlılık, kademeli geçiş imkânı |

## Sonuçlar

**Olumlu:**
- 30+ sayfada tutarlı kullanıcı deneyimi sağlandı
- Yeni sayfa geliştirme süresi önemli ölçüde azaldı
- Sıfır dış bağımlılık eklendi

**Olumsuz:**
- Kod tekrarı mevcut (her sayfa benzer kodu içeriyor)
- Gelecekte merkezi component library'e taşınması gerekebilir → ADR-003 adayı

## İlgili

- [ADR-002: Ortodonti ICON Skoru](ADR-002-orthodontics-icon-score.md)
