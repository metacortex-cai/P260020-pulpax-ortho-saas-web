// DrDentes görsel sistemi eşleme
// Kaynak: https://static.drdentes.com/css/teeth.css

const CDN = 'https://static.drdentes.com/img';

// Süt dişi → anatomik görselde kullanılan kalıcı diş numarası
export const SUT_TO_ADULT: Record<number, number> = {
  51: 11, 52: 12, 53: 13, 54: 17, 55: 18,
  61: 21, 62: 22, 63: 23, 64: 27, 65: 28,
  71: 41, 72: 42, 73: 43, 74: 47, 75: 48,
  81: 31, 82: 32, 83: 33, 84: 37, 85: 38,
};

export function toothImageUrl(toothNum: number): string {
  const n = SUT_TO_ADULT[toothNum] ?? toothNum;
  return `${CDN}/teeth/dis-${n}.png?v=7`;
}

interface OverlayDef {
  prefix: string;
  layers: number;   // number of overlay layers (1-3)
  noLayer?: boolean; // true → filename: {prefix}-{dis}.png  (no layer suffix)
}

// Tedavi adı → overlay görsel kuralları (öncelik sırasıyla)
const VISUAL_RULES: Array<{ test: (n: string) => boolean; overlay: OverlayDef }> = [

  // ─── KANAL TEDAVİSİ ────────────────────────────────────────────────
  { test: n => /kanal.*tek|tek.*kanal/i.test(n),                overlay: { prefix: '02-013-001', layers: 1 } },
  { test: n => /kanal.*iki|iki.*kanal/i.test(n),                overlay: { prefix: '02-014-001', layers: 2 } },
  { test: n => /kanal.*üç|üç.*kanal/i.test(n),                 overlay: { prefix: '02-015-001', layers: 3 } },
  { test: n => /periapikal.*tek/i.test(n),                      overlay: { prefix: '02-017-001', layers: 1 } },
  { test: n => /periapikal.*iki/i.test(n),                      overlay: { prefix: '02-018-001', layers: 2 } },
  { test: n => /periapikal.*üç/i.test(n),                      overlay: { prefix: '02-019-001', layers: 3 } },
  { test: n => /periapikal/i.test(n),                           overlay: { prefix: '02-017-001', layers: 1 } },
  { test: n => /kök.*ucu.*rezeks/i.test(n),                    overlay: { prefix: '05-005-001', layers: 2 } },
  { test: n => /kanal.*post|fiber.*post/i.test(n),             overlay: { prefix: '08-021-001', layers: 1, noLayer: true } },
  { test: n => /kuafaj/i.test(n),                               overlay: { prefix: '08-017-001', layers: 1, noLayer: true } },
  { test: n => /amputasyon/i.test(n),                           overlay: { prefix: '03-008-001', layers: 1, noLayer: true } },
  { test: n => /reimplantasyon/i.test(n),                       overlay: { prefix: '05-031-001', layers: 1, noLayer: true } },

  // ─── DOLGU ──────────────────────────────────────────────────────────
  // Seramik İnley
  { test: n => /seramik.*inley|inley.*seramik/i.test(n) && /bir|tek/i.test(n), overlay: { prefix: '08-013-001', layers: 1, noLayer: true } },
  { test: n => /seramik.*inley|inley.*seramik/i.test(n) && /iki/i.test(n),    overlay: { prefix: '08-014-001', layers: 1, noLayer: true } },
  { test: n => /seramik.*inley|inley.*seramik/i.test(n) && /üç/i.test(n),    overlay: { prefix: '08-015-001', layers: 1, noLayer: true } },
  // Kompozit İnley
  { test: n => /kompozit.*inley|inley.*kompozit/i.test(n) && /bir|tek/i.test(n), overlay: { prefix: '08-010-001', layers: 1, noLayer: true } },
  { test: n => /kompozit.*inley|inley.*kompozit/i.test(n) && /iki/i.test(n),    overlay: { prefix: '08-011-001', layers: 1, noLayer: true } },
  { test: n => /kompozit.*inley|inley.*kompozit/i.test(n) && /üç/i.test(n),    overlay: { prefix: '08-012-001', layers: 1, noLayer: true } },
  // İnley (plain)
  { test: n => /inley/i.test(n) && /bir|tek/i.test(n), overlay: { prefix: '08-004-001', layers: 1, noLayer: true } },
  { test: n => /inley/i.test(n) && /iki/i.test(n),    overlay: { prefix: '08-005-001', layers: 1, noLayer: true } },
  { test: n => /inley/i.test(n) && /üç/i.test(n),    overlay: { prefix: '08-006-001', layers: 1, noLayer: true } },
  // Onley
  { test: n => /onley.*seramik|seramik.*onley/i.test(n), overlay: { prefix: '08-025-001', layers: 1, noLayer: true } },
  { test: n => /onley/i.test(n),                         overlay: { prefix: '08-024-001', layers: 1, noLayer: true } },
  // Amalgam
  { test: n => /amalgam/i.test(n) && /bir/i.test(n),   overlay: { prefix: '08-001-001', layers: 1, noLayer: true } },
  { test: n => /amalgam/i.test(n) && /iki/i.test(n),   overlay: { prefix: '08-002-001', layers: 1, noLayer: true } },
  { test: n => /amalgam/i.test(n) && /üç/i.test(n),   overlay: { prefix: '08-003-001', layers: 1, noLayer: true } },
  // Cam İonomer
  { test: n => /cam.*iyonomer|cam.*ionomer/i.test(n) && /iki/i.test(n), overlay: { prefix: '08-016-003', layers: 1, noLayer: true } },
  { test: n => /cam.*iyonomer|cam.*ionomer/i.test(n) && /üç/i.test(n), overlay: { prefix: '08-016-005', layers: 1, noLayer: true } },
  { test: n => /cam.*iyonomer|cam.*ionomer/i.test(n),                   overlay: { prefix: '08-016-001', layers: 1, noLayer: true } },
  // Black V / Kole
  { test: n => /black.*v|kole/i.test(n),                overlay: { prefix: '08-007-002', layers: 1, noLayer: true } },
  // Direkt Kompozit Laminate Veneer
  { test: n => /direkt.*kompozit.*laminate|kompozit.*laminate/i.test(n), overlay: { prefix: '08-020-001', layers: 1, noLayer: true } },
  // Kompozit/Komposit
  { test: n => /kom[pb]osit/i.test(n) && /bir/i.test(n), overlay: { prefix: '08-007-001', layers: 1, noLayer: true } },
  { test: n => /kom[pb]osit/i.test(n) && /iki/i.test(n), overlay: { prefix: '08-008-001', layers: 1, noLayer: true } },
  { test: n => /kom[pb]osit/i.test(n) && /üç/i.test(n), overlay: { prefix: '08-009-001', layers: 1, noLayer: true } },
  // Dentin Pimi
  { test: n => /dentin.*pim/i.test(n),                  overlay: { prefix: '08-023-001', layers: 1, noLayer: true } },
  // Ağartma
  { test: n => /ağartma|beyazlatma/i.test(n),           overlay: { prefix: '08-018-001', layers: 1, noLayer: true } },

  // ─── KURON ──────────────────────────────────────────────────────────
  { test: n => /zirkony/i.test(n),                                                overlay: { prefix: '04-047-001', layers: 1, noLayer: true } },
  { test: n => /tam.*seramik/i.test(n),                                           overlay: { prefix: '04-027-001', layers: 1, noLayer: true } },
  { test: n => /laminate.*veneer.*seramik|seramik.*laminate/i.test(n),            overlay: { prefix: '04-025-001', layers: 1, noLayer: true } },
  { test: n => /laminate.*veneer.*akrilik|akrilik.*laminate/i.test(n),            overlay: { prefix: '04-024-001', layers: 1, noLayer: true } },
  { test: n => /veneer.*kuron.*seramik|seramik.*veneer.*kuron/i.test(n),          overlay: { prefix: '04-023-001', layers: 1, noLayer: true } },
  { test: n => /veneer.*kuron.*akrilik|akrilik.*veneer.*kuron/i.test(n),          overlay: { prefix: '04-022-001', layers: 1, noLayer: true } },
  { test: n => /jaket.*kuron.*seramik|seramik.*jaket/i.test(n),                  overlay: { prefix: '04-026-002', layers: 1, noLayer: true } },
  { test: n => /jaket.*kuron.*akrilik|akrilik.*jaket/i.test(n),                  overlay: { prefix: '04-026-001', layers: 1, noLayer: true } },
  { test: n => /teleskop/i.test(n),                                               overlay: { prefix: '04-028-001', layers: 1, noLayer: true } },
  { test: n => /döküm.*post.*core|post.*core/i.test(n),                          overlay: { prefix: '04-030-001', layers: 1, noLayer: true } },
  { test: n => /döküm.*kuron|tek.*parça.*döküm/i.test(n),                        overlay: { prefix: '04-021-001', layers: 1, noLayer: true } },

  // ─── KÖPRÜ ──────────────────────────────────────────────────────────
  { test: n => /maryland.*köprü/i.test(n),              overlay: { prefix: '04-031-001', layers: 1, noLayer: true } },
  { test: n => /roch.*köprü|köprü.*roch/i.test(n),      overlay: { prefix: '04-017-001', layers: 1, noLayer: true } },

  // ─── PROTEZ ─────────────────────────────────────────────────────────
  { test: n => /tam.*protez/i.test(n),                  overlay: { prefix: '04-003-001', layers: 1, noLayer: true } },
  { test: n => /bölümlü.*protez/i.test(n),              overlay: { prefix: '04-004-001', layers: 1, noLayer: true } },
  { test: n => /hassas.*tutucu/i.test(n),               overlay: { prefix: '04-004-001', layers: 1, noLayer: true } },
  { test: n => /implant.*destekli.*hareketli/i.test(n), overlay: { prefix: '04-004-001', layers: 1, noLayer: true } },

  // ─── CERRAHİ ────────────────────────────────────────────────────────
  { test: n => /implant/i.test(n),                      overlay: { prefix: '05-035-001', layers: 1, noLayer: true } },
  { test: n => /hemiseksiyon/i.test(n),                 overlay: { prefix: '06-009-001', layers: 1 } },

  // ─── PERİODONTOLOJİ ─────────────────────────────────────────────────
  { test: n => /subgingival|küretaj/i.test(n),          overlay: { prefix: '06-003-001', layers: 1, noLayer: true } },
  { test: n => /gingivit/i.test(n),                     overlay: { prefix: '19', layers: 1, noLayer: true } },
  { test: n => /periodontit/i.test(n),                  overlay: { prefix: '39', layers: 1, noLayer: true } },

  // ─── ORTODONTİ ──────────────────────────────────────────────────────
  { test: n => /ark.*teli|niti/i.test(n),               overlay: { prefix: '07-034-001', layers: 1, noLayer: true } },
  { test: n => /bant.*tatbik/i.test(n),                 overlay: { prefix: '07-037-001', layers: 1, noLayer: true } },
  { test: n => /braket/i.test(n),                       overlay: { prefix: '07-038-001', layers: 1, noLayer: true } },

  // ─── TEŞHİS/BULGU ────────────────────────────────────────────────────
  { test: n => /apikal.*kist/i.test(n),                 overlay: { prefix: '4', layers: 1, noLayer: true } },
  { test: n => /mine.*çatl/i.test(n),                   overlay: { prefix: '5', layers: 1, noLayer: true } },
  { test: n => /lüxe|luxe/i.test(n),                   overlay: { prefix: '6', layers: 1, noLayer: true } },
  { test: n => /radix|kök.*kalınt/i.test(n),            overlay: { prefix: '7', layers: 1, noLayer: true } },
  { test: n => /çürük|karies|caries/i.test(n),          overlay: { prefix: '88', layers: 1, noLayer: true } },
  { test: n => /kırık.*diş|diş.*kırık/i.test(n),        overlay: { prefix: '87', layers: 1, noLayer: true } },
];

export function getOverlayUrls(treatmentName: string, toothNum: number): string[] {
  const dis = SUT_TO_ADULT[toothNum] ?? toothNum;

  for (const rule of VISUAL_RULES) {
    if (rule.test(treatmentName)) {
      const { prefix, layers, noLayer } = rule.overlay;
      const urls: string[] = [];
      for (let l = 1; l <= layers; l++) {
        const fname = noLayer
          ? `${prefix}-${dis}.png`
          : `${prefix}-${dis}-${l}.png`;
        urls.push(`${CDN}/dis-islemler/${fname}?v=20141021`);
      }
      return urls;
    }
  }
  return [];
}
