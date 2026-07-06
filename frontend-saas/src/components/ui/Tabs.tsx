'use client';

import { ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number | string;
  restricted?: boolean; // Yetkiye bağlı sekme
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex items-end gap-1 border-b border-slate-200 px-6 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-all -mb-px
            ${activeTab === tab.id
              ? 'border-metronic-primary text-metronic-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          {tab.icon && <span className="opacity-70">{tab.icon}</span>}
          {tab.label}
          {tab.badge !== undefined && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold
              ${activeTab === tab.id ? 'bg-metronic-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
