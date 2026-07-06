// Tedavi adına göre dişin anatomik görselini belirleyen kurallar.
// Kategori alanı (Protez/Cerrahi/Endodonti) tek başına yetersiz olduğu için
// (örn. implant da kron da "Protez" kategorisinde), eşleştirme tedavi ADINA göre yapılır.

export interface ToothVisualState {
  missing: boolean;
  implant: boolean;
  crown: boolean;
  canalCount: number | null; // tedavi edilen kanal sayısı, null = kanal tedavisi yok
  canalFilled: boolean; // true: kalıcı dolgu yapılmış, false: "Dolgu Hariç"
  filling: 'amalgam' | 'composite' | null;
  bridgeLeft: boolean;
  bridgeRight: boolean;
}

const EMPTY_STATE: ToothVisualState = {
  missing: false,
  implant: false,
  crown: false,
  canalCount: null,
  canalFilled: false,
  filling: null,
  bridgeLeft: false,
  bridgeRight: false,
};

const CANAL_WORDS: [RegExp, number][] = [
  [/DÖRT KANAL/, 4],
  [/ÜÇ KANAL/, 3],
  [/İKİ KANAL/, 2],
  [/TEK KANAL/, 1],
];

function up(s: string | undefined | null): string {
  return (s || '').toLocaleUpperCase('tr-TR');
}

interface ClassifiedItem {
  isExtraction: boolean;
  isImplant: boolean;
  isBridgeWord: boolean;
  isCrown: boolean;
  canal: { count: number; filled: boolean } | null;
  filling: 'amalgam' | 'composite' | null;
}

export function classifyTreatmentName(name: string): ClassifiedItem {
  const n = up(name);
  const isImplantWord = n.includes('İMPLANT') && !n.includes('ÇIKART');
  const isExtraction = (n.includes('ÇEKİM') || n.includes('CEKIM')) && !isImplantWord;

  let canal: { count: number; filled: boolean } | null = null;
  if (n.includes('KANAL TEDAVİSİ') || n.includes('KANAL TEDAVISI')) {
    let count = 1;
    for (const [re, c] of CANAL_WORDS) {
      if (re.test(n)) { count = c; break; }
    }
    const filled = !(n.includes('DOLGU HARİÇ') || n.includes('DOLGU HARIC'));
    canal = { count, filled };
  }

  const filling = n.includes('AMALGAM DOLGU') ? 'amalgam' : n.includes('KOMPOZİT DOLGU') || n.includes('KOMPOZIT DOLGU') ? 'composite' : null;

  const isCrown = !isImplantWord && (n.includes('KRON') || n.includes('VENEER') || n.includes('ZİRKONYUM') || n.includes('KÖPRÜ') || n.includes('KOPRU'))
    || (isImplantWord && (n.includes('KRON') || n.includes('VENEER')));

  const isBridgeWord = n.includes('ÜSTÜ') || n.includes('USTU') || n.includes('KÖPRÜ') || n.includes('KOPRU');

  return { isExtraction, isImplant: isImplantWord, isBridgeWord, isCrown, canal, filling };
}

/**
 * Tüm planlardaki tedavileri tek tek dişlere ve köprü gruplarına dağıtır.
 * rowArrays: anatomik sıradaki diş numarası dizileri (örn. UPPER_ADULT) — köprü
 * komşuluğu numara farkına göre değil, bu sıradaki konuma göre belirlenir
 * (11-21 orta hatta yan yana ama numara olarak uzak; 18-17 numara olarak yan yana).
 */
export function computeToothVisualStates(plans: any[], rowArrays: number[][]): Record<number, ToothVisualState> {
  const states: Record<number, ToothVisualState> = {};
  const ensure = (n: number) => states[n] || (states[n] = { ...EMPTY_STATE });

  // Köprü grupları: aynı plan + aynı tedavi adına sahip, "üstü/köprü" geçen kayıtlar
  const bridgeGroups = new Map<string, Set<number>>();

  for (const plan of plans) {
    for (const item of plan.items || []) {
      const toothNum = parseInt(item.tooth, 10);
      if (!toothNum || Number.isNaN(toothNum)) continue;
      const cls = classifyTreatmentName(item.name);
      const st = ensure(toothNum);

      if (cls.isExtraction) st.missing = true;
      if (cls.isImplant) st.implant = true;
      if (cls.isCrown) st.crown = true;
      if (cls.filling && !st.filling) st.filling = cls.filling;
      if (cls.canal && (st.canalCount === null || cls.canal.count > st.canalCount)) {
        st.canalCount = cls.canal.count;
        st.canalFilled = cls.canal.filled;
      }
      if (cls.isBridgeWord) {
        const key = `${plan.id}::${up(item.name)}`;
        if (!bridgeGroups.has(key)) bridgeGroups.set(key, new Set());
        bridgeGroups.get(key)!.add(toothNum);
      }
    }
  }

  for (const group of bridgeGroups.values()) {
    if (group.size < 2) continue;
    for (const row of rowArrays) {
      for (let i = 0; i < row.length; i++) {
        const n = row[i];
        if (!group.has(n)) continue;
        const prev = row[i - 1];
        const next = row[i + 1];
        const st = ensure(n);
        if (prev !== undefined && group.has(prev)) st.bridgeLeft = true;
        if (next !== undefined && group.has(next)) st.bridgeRight = true;
      }
    }
  }

  return states;
}
