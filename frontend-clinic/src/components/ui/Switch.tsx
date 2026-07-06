'use client';

export default function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-60' : ''}`}>
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-[13px] font-bold text-slate-700">{label}</span>}
          {description && <span className="text-[11px] text-slate-400 mt-0.5">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
          checked ? 'bg-metronic-primary' : 'bg-slate-300'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
