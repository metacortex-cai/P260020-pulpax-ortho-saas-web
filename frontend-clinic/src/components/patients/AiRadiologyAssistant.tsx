'use client';

import { Activity, ShieldAlert, Award, Star } from 'lucide-react';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Diagnosis {
  toothNumber: number;
  condition: 'CARIES' | 'CROWN' | 'ROOT_CANAL' | 'IMPLANT';
  confidence: number;
  box: BoundingBox;
}

interface AiRadiologyAssistantProps {
  diagnoses: Diagnosis[];
  notes: string;
  isAnalyzing: boolean;
}

export default function AiRadiologyAssistant({ diagnoses, notes, isAnalyzing }: AiRadiologyAssistantProps) {
  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'CARIES': return 'Çürük (Caries)';
      case 'CROWN': return 'Kron Kaplama (Crown)';
      case 'ROOT_CANAL': return 'Kanal Tedavisi (Root Canal)';
      case 'IMPLANT': return 'İmplant';
      default: return condition;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'CARIES': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'CROWN': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'ROOT_CANAL': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'IMPLANT': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  if (isAnalyzing) {
    return (
      <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
          <Activity size={24} className="absolute inset-0 m-auto text-blue-500 animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Röntgen Görüntüsü Analiz Ediliyor</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">Derin öğrenme modelleri çürük, implant ve anatomik yapıları analiz ediyor...</p>
      </div>
    );
  }

  if (diagnoses.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-sm text-center py-16">
        <div className="w-14 h-14 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Award size={28} />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1.5">Yapay Zeka Analiz Raporu Yok</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">Röntgen üzerinde otomatik patoloji analizi çalıştırmak için yukarıdaki butonuna basın.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-white/5">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
          <Star size={18} className="fill-current" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">AI Radyoloji Teşhis Asistanı</h3>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase">Hazır</span>
        </div>
      </div>

      <div className="space-y-3">
        {diagnoses.map((diag, index) => (
          <div key={index} className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-2xl flex justify-between items-center text-xs">
            <div>
              <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${getConditionColor(diag.condition)}`}>
                Diş {diag.toothNumber}
              </span>
              <p className="font-extrabold text-slate-700 dark:text-slate-200 mt-2">
                {getConditionLabel(diag.condition)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block mb-1">Güven Skoru</span>
              <span className="font-black text-slate-800 dark:text-white text-sm">
                {Math.round(diag.confidence * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {notes && (
        <div className="p-4 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-200/50 dark:border-blue-500/10 text-xs">
          <span className="font-bold text-blue-700 dark:text-blue-300 block mb-1 flex items-center gap-1">
            <ShieldAlert size={14} /> Hekim Değerlendirme Notu (AI)
          </span>
          <p className="text-blue-600 dark:text-blue-400 leading-relaxed font-medium">{notes}</p>
        </div>
      )}
    </div>
  );
}
