'use client';

import { useState } from 'react';
import { Save, Trash2, Smile } from 'lucide-react';
import ConfirmModal from '../../../../components/ui/ConfirmModal';

// ─── ICON Scoring System ─────────────────────────────────────────────────────

const SCORE_SECTIONS = [
  {
    key: 'aesthetic',
    label: 'Estetik Komponent',
    weight: 7,
    options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => ({ value: n, label: String(n) })),
    isAesthetic: true,
  },
  {
    key: 'upperCrowding',
    label: 'Üst Ark Çapraşıklığı',
    weight: 5,
    options: [
      { value: 0, label: '<2 mm' },
      { value: 1, label: '2.1-5 mm' },
      { value: 2, label: '5.1-9 mm' },
      { value: 3, label: '9.1-13 mm' },
      { value: 4, label: '13.1-17 mm' },
      { value: 5, label: '>17 mm / Gömülü Diş' },
    ],
  },
  {
    key: 'upperSpacing',
    label: 'Üst Ark Boşluğu',
    weight: 5,
    options: [
      { value: 0, label: '<2 mm' },
      { value: 1, label: '2.1-5 mm' },
      { value: 2, label: '5.1-9 mm' },
      { value: 3, label: '>9 mm' },
    ],
  },
  {
    key: 'crossbite',
    label: 'Çapraz Kapanış',
    weight: 5,
    options: [
      { value: 0, label: 'Mevcut Değil' },
      { value: 1, label: 'Mevcut' },
    ],
  },
  {
    key: 'openBite',
    label: 'Ön Açık Kapanış',
    weight: 4,
    options: [
      { value: 0, label: 'Tam Kapanış' },
      { value: 1, label: '<1 mm' },
      { value: 2, label: '1.1-2 mm' },
      { value: 3, label: '2.1-4 mm' },
      { value: 4, label: '>4 mm' },
    ],
  },
  {
    key: 'deepBite',
    label: 'Ön Derin Kapanış',
    weight: 4,
    options: [
      { value: 0, label: "Alt kesicinin 1/3'den daha az örtmüş" },
      { value: 1, label: "1/3'den 2/3'üne kadar örtmüş" },
      { value: 2, label: "2/3'ünden tamamına kadar örtmüş" },
      { value: 3, label: 'Tamamen örtmüş' },
    ],
  },
  {
    key: 'molarLeft',
    label: 'Bukkal Bölge Ön-Arka Yön İlişkisi (Sol)',
    weight: 3,
    options: [
      { value: 0, label: 'Tüberkül fossa ilişkisi sadece Sınıf I, II yada III ilişki' },
      { value: 1, label: 'Tüberkül fossa ilişkisi ile Tüberkül tüberküle ilişki arasında bir ilişki' },
      { value: 2, label: 'Tüberkül tüberküle ilişki' },
    ],
  },
  {
    key: 'molarRight',
    label: 'Bukkal Bölge Ön-Arka Yön İlişkisi (Sağ)',
    weight: 3,
    options: [
      { value: 0, label: 'Tüberkül fossa ilişkisi sadece Sınıf I, II yada III ilişki' },
      { value: 1, label: 'Tüberkül fossa ilişkisi ile Tüberkül tüberküle ilişki arasında bir ilişki' },
      { value: 2, label: 'Tüberkül tüberküle ilişki' },
    ],
  },
] as const;

type SectionKey = 'aesthetic' | 'upperCrowding' | 'upperSpacing' | 'crossbite' | 'openBite' | 'deepBite' | 'molarLeft' | 'molarRight';

// ─── Default form ─────────────────────────────────────────────────────────────

const defaultForm = {
  appointmentId: '',
  performedAt: new Date().toISOString().slice(0, 10),
  performedTime: '09:00',
  examinedBy: '',
  note: '',
  aesthetic: 0,
  upperCrowding: -1,
  upperSpacing: -1,
  crossbite: -1,
  openBite: -1,
  deepBite: -1,
  molarLeft: -1,
  molarRight: -1,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcTotal(form: typeof defaultForm): number {
  let total = 0;
  if (form.aesthetic >= 1) total += form.aesthetic * 7;
  if (form.upperCrowding >= 0) total += form.upperCrowding * 5;
  if (form.upperSpacing >= 0) total += form.upperSpacing * 5;
  if (form.crossbite >= 0) total += form.crossbite * 5;
  if (form.openBite >= 0) total += form.openBite * 4;
  if (form.deepBite >= 0) total += form.deepBite * 4;
  if (form.molarLeft >= 0) total += form.molarLeft * 3;
  if (form.molarRight >= 0) total += form.molarRight * 3;
  return total;
}

function getInterpretation(score: number): { label: string; style: string } {
  if (score <= 29) return { label: 'Tedavi Gerekmez', style: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
  if (score <= 43) return { label: 'Az Tedavi İhtiyacı', style: 'bg-blue-100 text-blue-700 border border-blue-200' };
  if (score <= 67) return { label: 'Orta Tedavi İhtiyacı', style: 'bg-amber-100 text-amber-700 border border-amber-200' };
  return { label: 'Yüksek Tedavi İhtiyacı', style: 'bg-red-100 text-red-700 border border-red-200' };
}

// ─── Score entry type ─────────────────────────────────────────────────────────

interface ScoreEntry {
  id: string;
  date: string;
  time: string;
  examinedBy: string;
  note: string;
  aesthetic: number;
  upperCrowding: number;
  upperSpacing: number;
  crossbite: number;
  openBite: number;
  deepBite: number;
  molarLeft: number;
  molarRight: number;
  total: number;
  interpretation: string;
  interpretationStyle: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrthodonticsTab({ patient }: { patient: any }) {
  const [innerTab, setInnerTab] = useState<'scores' | 'new'>('scores');
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });

  const totalScore = calcTotal(form);
  const { label: interpretation, style: interpretationStyle } = getInterpretation(totalScore);

  const handleSave = () => {
    if (totalScore === 0) return;
    const { label, style } = getInterpretation(totalScore);
    const newEntry: ScoreEntry = {
      id: Date.now().toString(),
      date: form.performedAt,
      time: form.performedTime,
      examinedBy: form.examinedBy || (patient ? `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() : ''),
      note: form.note,
      aesthetic: form.aesthetic,
      upperCrowding: form.upperCrowding,
      upperSpacing: form.upperSpacing,
      crossbite: form.crossbite,
      openBite: form.openBite,
      deepBite: form.deepBite,
      molarLeft: form.molarLeft,
      molarRight: form.molarRight,
      total: totalScore,
      interpretation: label,
      interpretationStyle: style,
    };
    setScores(prev => [newEntry, ...prev]);
    setForm({ ...defaultForm });
    setInnerTab('scores');
  };

  const handleDelete = (id: string) => {
    setScores(prev => prev.filter(s => s.id !== id));
    setConfirmDeleteId(null);
  };

  const getSectionScore = (key: SectionKey): number => {
    return (form as any)[key] as number;
  };

  const getSectionDisplayScore = (section: typeof SCORE_SECTIONS[number]): string => {
    const val = getSectionScore(section.key as SectionKey);
    if (section.key === 'aesthetic') {
      return val >= 1 ? String(val * section.weight) : '—';
    }
    return val >= 0 ? String(val * section.weight) : '—';
  };

  return (
    <div className="space-y-6">
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div className="m-card overflow-visible shadow-sm border border-slate-200/60 dark:border-white/5">
        {/* ── Inner Tab Header ─────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-100 dark:border-white/5">
          <button
            onClick={() => setInnerTab('scores')}
            className={`px-6 py-4 text-[13px] font-bold transition-colors border-b-2 ${
              innerTab === 'scores'
                ? 'border-metronic-primary text-metronic-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Skorlar
          </button>
          <button
            onClick={() => setInnerTab('new')}
            className={`px-6 py-4 text-[13px] font-bold transition-colors border-b-2 ${
              innerTab === 'new'
                ? 'border-metronic-primary text-metronic-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            + Yeni Skor
          </button>
        </div>

        {/* ── Scores List Tab ───────────────────────────────────────────────── */}
        {innerTab === 'scores' && (
          <div className="p-6">
            {scores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                  <Smile size={26} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-[14px] font-bold text-slate-500 dark:text-slate-400">Henüz ortodonti skoru girilmemiş</p>
                <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1">
                  Yeni Skor sekmesinden ICON değerlendirmesi ekleyebilirsiniz.
                </p>
                <button
                  onClick={() => setInnerTab('new')}
                  className="mt-5 flex items-center gap-2 px-5 py-2 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors shadow-sm"
                >
                  + Yeni Skor Ekle
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/[0.02]">
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tarih</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hekim</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Estetik</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Toplam Puan</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Değerlendirme</th>
                      <th className="py-3 px-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {scores.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 text-[13px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {entry.date} <span className="text-slate-400 font-normal text-[12px]">{entry.time}</span>
                        </td>
                        <td className="py-3 px-4 text-[13px] text-slate-600 dark:text-slate-300">
                          {entry.examinedBy || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200">
                            {entry.aesthetic >= 1 ? entry.aesthetic : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[16px] font-black text-metronic-primary">{entry.total}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${entry.interpretationStyle}`}>
                            {entry.interpretation}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setConfirmDeleteId(entry.id)}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── New Entry Tab ─────────────────────────────────────────────────── */}
        {innerTab === 'new' && (
          <div className="p-6 space-y-6">
            {/* Header fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  İşlem Tarihi
                </label>
                <input
                  type="date"
                  className="m-input"
                  value={form.performedAt}
                  onChange={e => setForm(f => ({ ...f, performedAt: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  İşlem Saati
                </label>
                <input
                  type="time"
                  className="m-input"
                  value={form.performedTime}
                  onChange={e => setForm(f => ({ ...f, performedTime: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Kontrol Eden
                </label>
                <input
                  type="text"
                  className="m-input"
                  placeholder="Hekim adı..."
                  value={form.examinedBy}
                  onChange={e => setForm(f => ({ ...f, examinedBy: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Açıklama
              </label>
              <textarea
                className="m-input resize-none"
                rows={2}
                placeholder="Notlar veya açıklamalar..."
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>

            {/* Score table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02]">
                    <th className="py-3 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      Bölüm
                    </th>
                    <th className="py-3 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      Seçenekler
                    </th>
                    <th className="py-3 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                      Ağırlık
                    </th>
                    <th className="py-3 pr-4 pl-2 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Puan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SCORE_SECTIONS.map(section => {
                    const currentVal = getSectionScore(section.key as SectionKey);
                    const displayScore = getSectionDisplayScore(section);
                    return (
                      <tr key={section.key} className="border-t border-slate-100 dark:border-white/5">
                        {/* Section label */}
                        <td className="py-4 pl-4 pr-2 text-[13px] font-semibold text-metronic-primary min-w-[160px] align-top">
                          {section.label}
                        </td>

                        {/* Options */}
                        <td className="py-4 px-2">
                          <div className="flex flex-wrap gap-2">
                            {section.options.map(opt => {
                              const isSelected = currentVal === opt.value;
                              return (
                                <label
                                  key={opt.value}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-[12px] font-medium transition-all select-none ${
                                    isSelected
                                      ? 'border-metronic-primary bg-metronic-primary/5 text-metronic-primary dark:bg-metronic-primary/10'
                                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-metronic-primary/50 hover:text-metronic-primary/70'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    className="sr-only"
                                    name={section.key}
                                    value={opt.value}
                                    checked={isSelected}
                                    onChange={() => setForm(f => ({ ...f, [section.key]: opt.value }))}
                                  />
                                  {opt.label}
                                </label>
                              );
                            })}
                          </div>
                        </td>

                        {/* Weight */}
                        <td className="py-4 px-4 text-center align-top">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-bold rounded">
                            &times;{section.weight}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="py-4 pr-4 pl-2 text-right font-bold text-[14px] text-slate-700 dark:text-slate-200 align-top">
                          {displayScore}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total score card */}
            <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/10">
              <div>
                <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider">
                  Ortodonti ICON Skoru (Genel Toplam)
                </p>
                <p className="text-3xl font-black text-metronic-primary mt-1">{totalScore}</p>
              </div>
              <div className={`px-4 py-2 rounded-xl text-[13px] font-bold ${interpretationStyle}`}>
                {interpretation}
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={totalScore === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-metronic-primary hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-bold transition-colors shadow-sm"
              >
                <Save size={16} /> Kaydet
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        title="Skoru Sil"
        message="Bu skoru silmek istediğinize emin misiniz?"
      />
    </div>
  );
}
