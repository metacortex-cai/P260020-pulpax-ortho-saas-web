'use client';

import Image from 'next/image';
import { toothImageUrl, getOverlayUrls, SUT_TO_ADULT } from '@/lib/dentalVisualMap';

// SUT kodu prefix'inden kategori rengi türetme (sutCode: '2-1' → '#8e44ad')
const SUT_PREFIX_TO_COLOR: Record<string, string> = {
  '1': '#3498db', // Teşhis ve Planlama
  '2': '#8e44ad', // Tedavi & Endodonti
  '3': '#e67e22', // Pedodonti
  '4': '#d4a017', // Protez
  '5': '#c0392b', // Cerrahi
  '6': '#16a085', // Periodontoloji
};

const Separator = () => (
  <div className="flex w-full items-center my-1">
    <div className="flex-1 h-[2px] bg-[#d9a0a8]" />
  </div>
);

// ── Sabitler ──────────────────────────────────────────────────────────────────

export const AREA_CODES: Record<string, string> = {
  O: 'Occlusal', B: 'Buccal', P: 'Palatinal', M: 'Mesial',
  D: 'Distal', V: 'Vestibul', L: 'Lingual', S: 'Singulum',
};

export const ADULT_ALLOWED  = [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48];
export const CHILD_ALLOWED  = [51,52,53,54,55,61,62,63,64,65,71,72,73,74,75,81,82,83,84,85];
export const ALL_ALLOWED    = [...ADULT_ALLOWED, ...CHILD_ALLOWED];

export const UPPER_ADULT = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
export const UPPER_CHILD = [55,54,53,52,51,61,62,63,64,65];
export const LOWER_CHILD = [85,84,83,82,81,71,72,73,74,75];
export const LOWER_ADULT = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

export const PROCS = [
  { id: 'diag',       label: 'Teşhis ve Planlama', c: '#3498db' },
  { id: 'endo',       label: 'Tedavi & Endodonti',  c: '#8e44ad' },
  { id: 'pedodonti',  label: 'Pedodonti',            c: '#e67e22' },
  { id: 'prostho',    label: 'Protez',               c: '#d4a017' },
  { id: 'surgery',    label: 'Cerrahi',              c: '#c0392b' },
  { id: 'perio',      label: 'Periodontoloji',       c: '#16a085' },
  { id: 'ortho',      label: 'Ortodonti',            c: '#2980b9' },
  { id: 'missing',    label: 'Eksik Diş',            c: '#bdc3c7' },
];

export function toothName(n: number) {
  const names: Record<number, string> = {
    1: 'Santral Kesici', 2: 'Lateral Kesici', 3: 'Kanin',
    4: '1.Premolar', 5: '2.Premolar',
    6: '1.Molar', 7: '2.Molar', 8: '3.Molar',
  };
  return names[n % 10] || 'Diş';
}

export function toothBaseAreas(n: number) {
  const upperTeeth = [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,51,52,53,54,55,61,62,63,64,65];
  const frontTeeth = [11,12,13,21,22,23,51,52,53,61,62,63,81,82,83,71,72,73,41,42,43,31,32,33];
  const isTop   = upperTeeth.includes(n);
  const isFront = frontTeeth.includes(n);
  if (!isFront && isTop)  return 'OPVMD';
  if (!isFront && !isTop) return 'OLDMB';
  return 'BDMS';
}

// ── Diş boyutları (DrDentes orijinal CSS'den) ────────────────────────────────

const TOOTH_WIDTH: Record<number, number> = {
  11:34, 12:34, 13:33, 14:28, 15:28, 16:40, 17:38, 18:34,
  21:34, 22:34, 23:33, 24:28, 25:28, 26:40, 27:38, 28:34,
  31:23, 32:27, 33:31, 34:28, 35:28, 36:45, 37:43, 38:44,
  41:23, 42:27, 43:31, 44:28, 45:28, 46:45, 47:43, 48:44,
};

function getToothWidth(n: number): number {
  const mapped = SUT_TO_ADULT[n] ?? n;
  return TOOTH_WIDTH[mapped] ?? 32;
}

// ── Props & Bileşen ───────────────────────────────────────────────────────────

interface DentalChartProps {
  onToothClick: (toothNum: number, originalImgSrc: string, selectedImgSrc: string) => void;
  selectedTeeth: Record<number, string>;
  plans: any[];
  dentitionMode?: 'adult' | 'child';
}

export default function DentalChart({
  onToothClick,
  selectedTeeth,
  plans,
  dentitionMode = 'adult',
}: DentalChartProps) {

  function getTreatmentsForTooth(n: number) {
    const items: any[] = [];
    for (const p of plans) {
      for (const item of p.items) {
        if (parseInt(item.tooth) === n) items.push(item);
      }
    }
    return items;
  }

  function getProcColor(treatments: any[]): string | null {
    for (const t of treatments) {
      const byLabel = PROCS.find(p => p.label === t.category);
      if (byLabel) return byLabel.c;
      const prefix = String(t.category ?? '').split('-')[0];
      if (SUT_PREFIX_TO_COLOR[prefix]) return SUT_PREFIX_TO_COLOR[prefix];
    }
    return treatments.length > 0 ? '#3498db' : null;
  }

  function getOverlays(n: number, treatments: any[]): string[] {
    const urls: string[] = [];
    const seen = new Set<string>();
    for (const t of treatments) {
      for (const url of getOverlayUrls(t.name ?? '', n)) {
        if (!seen.has(url)) { seen.add(url); urls.push(url); }
      }
    }
    return urls;
  }

  function renderTooth(n: number, isTop: boolean) {
    const treatments = getTreatmentsForTooth(n);
    const procColor  = getProcColor(treatments);
    const overlays   = getOverlays(n, treatments);
    const isSelected = !!selectedTeeth[n];
    const isMissing  = treatments.some(t => t.category === 'Eksik Diş' || t.name === 'Eksik Diş');

    const toothUrl = toothImageUrl(n);
    const w        = getToothWidth(n);
    const h        = isTop ? 90 : 88;

    const tooltip = treatments.length > 0
      ? `${toothName(n)} (${n})\n${treatments.map(t => `• ${t.name}`).join('\n')}`
      : `${toothName(n)} (${n})`;

    const imgBox = (
      <div
        className="relative cursor-pointer transition-transform hover:scale-105 select-none"
        style={{ width: w, height: h }}
        onClick={() => onToothClick(n, toothUrl, toothUrl)}
        title={tooltip}
        data-tooth={n}
      >
        {(isSelected || procColor) && (
          <div
            className="absolute inset-0 rounded pointer-events-none z-20"
            style={{
              outline: `2px solid ${isSelected ? '#6366f1' : (procColor ?? '#3498db')}`,
              outlineOffset: '1px',
            }}
          />
        )}

        {!isMissing ? (
          <Image
            src={toothUrl}
            alt={`${n}`}
            fill
            sizes="80px"
            className="object-contain"
            draggable={false}
            unoptimized
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[60%] h-[60%] border-2 border-dashed border-slate-300 rounded opacity-40" />
          </div>
        )}

        {overlays.map((url, i) => (
          <Image
            key={i}
            src={url}
            alt=""
            fill
            sizes="80px"
            className="object-contain pointer-events-none z-10"
            draggable={false}
            unoptimized
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ))}

        {treatments.length > 1 && (
          <div className="absolute top-0 right-0 w-2 h-2 bg-violet-500 rounded-full border border-white shadow z-30" />
        )}
      </div>
    );

    const numLabel = (
      <div className="text-[8px] text-slate-400 font-medium text-center leading-tight">
        {n}
      </div>
    );

    return (
      <div
        key={n}
        className="flex flex-col items-center gap-[2px]"
        style={{ minWidth: w }}
      >
        {isTop ? <>{numLabel}{imgBox}</> : <>{imgBox}{numLabel}</>}
      </div>
    );
  }

  function renderRow(nums: number[], isTop: boolean) {
    return (
      <div className="flex justify-center gap-[1px]">
        {nums.map(n => renderTooth(n, isTop))}
      </div>
    );
  }

  return (
    <div className="w-full py-2 px-1 overflow-x-auto">
      <div className="flex flex-col items-center min-w-max mx-auto">
        {dentitionMode === 'adult' ? (
          <>
            {renderRow(UPPER_ADULT, true)}
            <Separator />
            {renderRow(LOWER_ADULT, false)}
          </>
        ) : (
          <>
            {renderRow(UPPER_CHILD, true)}
            <Separator />
            {renderRow(LOWER_CHILD, false)}
          </>
        )}
      </div>
    </div>
  );
}
