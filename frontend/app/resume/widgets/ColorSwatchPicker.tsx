import { useLanguage } from "../../context/languageContext";
import { colorLabel } from "../colorNames";
import { SettingLabel } from "./SettingLabel";

interface ColorSwatchPickerProps {
  colors: readonly string[];
  value?: string;
  onChange: (color: string) => void;
  label: string;
  /** Ombre portée sur les pastilles non sélectionnées. */
  shadow?: boolean;
}

export function ColorSwatchPicker({ colors, value, onChange, label, shadow = false }: ColorSwatchPickerProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-2">
      <SettingLabel>{label}</SettingLabel>
      <div className="flex gap-2">
        {colors.map((c, i) => (
          <button key={c} type="button" aria-label={colorLabel(t.resume, c, i)} aria-pressed={value === c} onClick={() => onChange(c)}
            className={`w-6 h-6 rounded-full border-2 ${value === c ? 'border-white' : shadow ? 'border-transparent shadow-md' : 'border-transparent'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}
