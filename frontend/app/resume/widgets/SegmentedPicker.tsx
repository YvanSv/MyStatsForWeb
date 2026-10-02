import { SettingLabel } from "./SettingLabel";

interface SegmentedPickerProps<T extends string> {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
}

/** Sélecteur à segments (un seul choix) pour les réglages. */
export function SegmentedPicker<T extends string>({ label, options, value, onChange }: SegmentedPickerProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <SettingLabel>{label}</SettingLabel>
      <div role="group" aria-label={label} className="flex bg-black/20 p-1 rounded-xl border border-white/5">
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
            className={`flex-1 py-1 rounded-lg text-[9px] uppercase font-bold transition-all ${value === o.id ? "bg-white/10 text-white shadow-sm" : "text-gray-500"}`}
          >{o.label}</button>
        ))}
      </div>
    </div>
  );
}
